param (
    [Parameter(Mandatory = $false)]
    [string]$Stage,

    [Parameter(Mandatory = $false)]
    [string]$BaseUrl
)

# Strict parameter validation
if ([string]::IsNullOrWhiteSpace($Stage) -or ($Stage -ne "preview" -and $Stage -ne "production")) {
    Write-Error "Invalid or missing -Stage. Must be 'preview' or 'production'."
    exit 1
}

if ($Stage -eq "preview" -and [string]::IsNullOrWhiteSpace($BaseUrl)) {
    Write-Error "-BaseUrl is required when -Stage is 'preview'."
    exit 1
}

$ErrorActionPreference = "Stop"

$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ReportDir = Resolve-Path (Join-Path $PSScriptRoot "..\..\..\plqa-reports") -ErrorAction SilentlyContinue
if (-not $ReportDir) {
    $ReportDir = Join-Path $PSScriptRoot "..\..\..\plqa-reports"
    New-Item -ItemType Directory -Path $ReportDir -Force | Out-Null
}
$LogFile = Join-Path $ReportDir "deploy-$Timestamp.txt"

function Log-Message {
    param ([string]$Message)
    $Formatted = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Message"
    Write-Output $Formatted
    Add-Content -Path $LogFile -Value $Formatted -Encoding utf8
}

Log-Message "Starting deploy script. Stage: $Stage"

# 1. Environment & Working Directory Guards
if (-not (Test-Path "package.json") -or -not (Test-Path "vite.config.ts")) {
    Log-Message "REFUSED: Must run from the repository root."
    exit 1
}

$CurrentBranch = (git branch --show-current).Trim()
if ($CurrentBranch -ne "main") {
    Log-Message "REFUSED: Must run on branch 'main' (currently on '$CurrentBranch')."
    exit 1
}

$StatusOutput = (git status --short)
if (-not [string]::IsNullOrWhiteSpace($StatusOutput)) {
    Log-Message "REFUSED: Working tree is not clean:"
    Log-Message $StatusOutput
    exit 1
}

$LocalMain = (git rev-parse main).Trim()
$OriginMain = (git rev-parse origin/main).Trim()
if ($LocalMain -ne $OriginMain) {
    Log-Message "REFUSED: Local main ($LocalMain) does not match origin/main ($OriginMain)."
    exit 1
}

$HeadCommit = (git rev-parse HEAD).Trim()
Log-Message "Target commit: $HeadCommit"

# 2. Dependency installation and build
Log-Message "Running npm ci..."
& npm ci
if ($LASTEXITCODE -ne 0) {
    Log-Message "ERROR: npm ci failed with exit code $LASTEXITCODE"
    exit 1
}

Log-Message "Running npm run build..."
& npm run build
if ($LASTEXITCODE -ne 0) {
    Log-Message "ERROR: npm run build failed with exit code $LASTEXITCODE"
    exit 1
}

# 3. Verify generated .output/server/wrangler.json
$WranglerConfigPath = ".output/server/wrangler.json"
if (-not (Test-Path $WranglerConfigPath)) {
    Log-Message "ERROR: Generated wrangler config not found at $WranglerConfigPath"
    exit 1
}

$ConfigRaw = Get-Content -Raw -Path $WranglerConfigPath
$ConfigObj = ConvertFrom-Json $ConfigRaw

if ($ConfigObj.name -ne "prelaunchqa") {
    Log-Message "ERROR: Expected worker name 'prelaunchqa', got '$($ConfigObj.name)'"
    exit 1
}

if ($ConfigObj.compatibility_date -ne "2026-09-25") {
    Log-Message "ERROR: Expected compatibility_date '2026-09-25', got '$($ConfigObj.compatibility_date)'"
    exit 1
}

if (-not ($ConfigObj.compatibility_flags -contains "nodejs_compat")) {
    Log-Message "ERROR: compatibility_flags does not contain 'nodejs_compat'"
    exit 1
}

# 4. Prepare deployment config based on stage
$DeployConfigFile = ""
$TargetUrl = ""

if ($Stage -eq "preview") {
    Log-Message "Preparing preview deployment configuration..."
    $PreviewConfigPath = ".output/server/wrangler.preview.json"
    
    # Copy and modify config: remove routes, enable workers_dev
    $PreviewObj = ConvertFrom-Json $ConfigRaw
    if ($PreviewObj.PSObject.Properties['routes']) {
        $PreviewObj.PSObject.Properties.Remove('routes')
    }
    $PreviewObj | Add-Member -MemberType NoteProperty -Name "workers_dev" -Value $true -Force
    $PreviewJson = ConvertTo-Json $PreviewObj -Depth 10
    Set-Content -Path $PreviewConfigPath -Value $PreviewJson -Encoding utf8
    
    $DeployConfigFile = $PreviewConfigPath
    $TargetUrl = $BaseUrl.TrimEnd('/')
} else {
    Log-Message "Preparing production deployment configuration..."
    # Verify custom domain route for production
    $HasCustomRoute = $false
    if ($ConfigObj.routes) {
        foreach ($r in $ConfigObj.routes) {
            if ($r.pattern -eq "prelaunchqa.com" -and $r.custom_domain -eq $true) {
                $HasCustomRoute = $true
                break
            }
        }
    }
    if (-not $HasCustomRoute) {
        Log-Message "ERROR: Production config missing prelaunchqa.com custom domain route"
        exit 1
    }

    $DeployConfigFile = $WranglerConfigPath
    $TargetUrl = "https://prelaunchqa.com"
}

# 5. Execute Cloudflare deployment
Log-Message "Deploying with config $DeployConfigFile to $TargetUrl..."
if ($Stage -eq "preview") {
    & npx wrangler deploy --config .output/server/wrangler.preview.json
} else {
    & npx wrangler deploy --config .output/server/wrangler.json
}

if ($LASTEXITCODE -ne 0) {
    Log-Message "ERROR: wrangler deploy failed with exit code $LASTEXITCODE"
    exit 1
}

# 6. Poll /api/public/version until active
Log-Message "Polling $TargetUrl/api/public/version for commit $HeadCommit (max 10 tries, 10s delay)..."
$Success = $false
for ($i = 1; $i -le 10; $i++) {
    Log-Message "Poll attempt $i of 10..."
    try {
        $VersionResp = Invoke-RestMethod -Uri "$TargetUrl/api/public/version" -Method Get -TimeoutSec 10 -ErrorAction Stop
        if ($VersionResp -and $VersionResp.commit -eq $HeadCommit) {
            Log-Message "SUCCESS: Deployment verified on attempt $i with commit $($VersionResp.commit)."
            $Success = $true
            break
        } else {
            Log-Message "Received commit '$($VersionResp.commit)', waiting for '$HeadCommit'..."
        }
    } catch {
        Log-Message "Attempt $i request failed: $($_.Exception.Message)"
    }
    Start-Sleep -Seconds 10
}

if (-not $Success) {
    Log-Message "ERROR: Timed out waiting for deployment to update to $HeadCommit."
    exit 1
}

# 7. Run smoke test
Log-Message "Running smoke test against $TargetUrl..."
& node scripts/deploy/smoke.mjs $TargetUrl $HeadCommit true
if ($LASTEXITCODE -ne 0) {
    Log-Message "ERROR: Smoke test failed with exit code $LASTEXITCODE"
    exit 1
}

Log-Message "Deployment and verification completed successfully."
exit 0
