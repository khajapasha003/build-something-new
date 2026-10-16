$ErrorActionPreference = "Continue"

$tests = @(
  @{ Name = "Homepage (/)"; Url = "https://prelaunchqa.com/"; ExpectText = "PreLaunch" },
  @{ Name = "Auth Page (/auth)"; Url = "https://prelaunchqa.com/auth"; ExpectText = "Sign In" },
  @{ Name = "Preorder (/preorder)"; Url = "https://prelaunchqa.com/preorder"; ExpectText = "Launch Check" },
  @{ Name = "Guides (/guides)"; Url = "https://prelaunchqa.com/guides"; ExpectText = "Next.js" },
  @{ Name = "Support (/support)"; Url = "https://prelaunchqa.com/support"; ExpectText = "Support" },
  @{ Name = "Status (/status)"; Url = "https://prelaunchqa.com/status"; ExpectText = "Status" },
  @{ Name = "Terms (/terms)"; Url = "https://prelaunchqa.com/terms"; ExpectText = "Terms" },
  @{ Name = "Privacy (/privacy)"; Url = "https://prelaunchqa.com/privacy"; ExpectText = "Privacy" },
  @{ Name = "Version API"; Url = "https://prelaunchqa.com/api/public/version"; ExpectText = "13f4498" }
)

$passed = 0
$total = $tests.Count

Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "🌐 PRELAUNCHQA LIVE GLOBAL AUDIT (https://prelaunchqa.com)" -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan

foreach ($t in $tests) {
  try {
    $resp = Invoke-WebRequest -Uri $t.Url -UseBasicParsing -TimeoutSec 10
    $code = $resp.StatusCode
    $body = $resp.Content
    $hasText = $body -match $t.ExpectText
    if ($code -eq 200 -and $hasText) {
      Write-Host ("[PASS] " + $t.Name + " (HTTP 200, Content Verified)") -ForegroundColor Green
      $passed++
    } else {
      Write-Host ("[FAIL] " + $t.Name + " (HTTP " + $code + ", Text Match: " + $hasText + ")") -ForegroundColor Red
    }
  } catch {
    Write-Host ("[FAIL] " + $t.Name + " (Exception: " + $_.Exception.Message + ")") -ForegroundColor Red
  }
}

Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ("Live Audit Result: " + $passed + " / " + $total + " Endpoints Verified & Passing") -ForegroundColor Green
Write-Host "=====================================================" -ForegroundColor Cyan
