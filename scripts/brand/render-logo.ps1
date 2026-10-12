param (
    [string]$OutDir = "$PSScriptRoot\..\..\public\brand"
)

Add-Type -AssemblyName System.Drawing

function Create-LogoBitmap {
    param (
        [int]$Scale = 4, # 4x supersampling
        [bool]$Transparent = $true
    )

    $BaseWidth = 212
    $BaseHeight = 44
    $Width = $BaseWidth * $Scale
    $Height = $BaseHeight * $Scale

    $Bmp = New-Object System.Drawing.Bitmap($Width, $Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $G = [System.Drawing.Graphics]::FromImage($Bmp)
    $G.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $G.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
    $G.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $G.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    if ($Transparent) {
        $G.Clear([System.Drawing.Color]::Transparent)
    } else {
        # Seamlessly match dark app theme: oklch(0.187 0.045 285) ~ rgb(16, 20, 36)
        $BgColor = [System.Drawing.Color]::FromArgb(255, 16, 20, 36)
        $G.Clear($BgColor)
    }

    $G.ScaleTransform($Scale, $Scale)

    # 1. Back Layer: Violet Squircle
    $State = $G.Save()
    $G.TranslateTransform(24, 20)
    $G.RotateTransform(7)
    $G.TranslateTransform(-24, -20)
    $VioletBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(220, 139, 92, 246)) # #8B5CF6
    $VioletPath = New-Object System.Drawing.Drawing2D.GraphicsPath
    $VioletPath.AddArc(9, 5, 16, 16, 180, 90)
    $VioletPath.AddArc(23, 5, 16, 16, 270, 90)
    $VioletPath.AddArc(23, 19, 16, 16, 0, 90)
    $VioletPath.AddArc(9, 19, 16, 16, 90, 90)
    $VioletPath.CloseFigure()
    $G.FillPath($VioletBrush, $VioletPath)
    $G.Restore($State)

    # 2. Middle Layer: Coral Squircle
    $State = $G.Save()
    $G.TranslateTransform(20, 22)
    $G.RotateTransform(-4)
    $G.TranslateTransform(-20, -22)
    $CoralBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(235, 244, 63, 94)) # #F43F5E
    $CoralPath = New-Object System.Drawing.Drawing2D.GraphicsPath
    $CoralPath.AddArc(5, 7, 16, 16, 180, 90)
    $CoralPath.AddArc(19, 7, 16, 16, 270, 90)
    $CoralPath.AddArc(19, 21, 16, 16, 0, 90)
    $CoralPath.AddArc(5, 21, 16, 16, 90, 90)
    $CoralPath.CloseFigure()
    $G.FillPath($CoralBrush, $CoralPath)
    $G.Restore($State)

    # 3. Front Layer: Deep Navy Card
    $CardBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 19, 23, 46)) # #13172E
    $BorderPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 60, 75, 110), 1.2)
    $CardPath = New-Object System.Drawing.Drawing2D.GraphicsPath
    $CardPath.AddArc(3, 8, 18, 18, 180, 90)
    $CardPath.AddArc(17, 8, 18, 18, 270, 90)
    $CardPath.AddArc(17, 22, 18, 18, 0, 90)
    $CardPath.AddArc(3, 22, 18, 18, 90, 90)
    $CardPath.CloseFigure()
    $G.FillPath($CardBrush, $CardPath)
    $G.DrawPath($BorderPen, $CardPath)

    # 4. Checkmark: Mint Green
    $CheckPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 16, 185, 129), 3.8) # #10B981
    $CheckPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $CheckPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $CheckPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
    $CheckPoints = @(
        (New-Object System.Drawing.PointF(10.5, 24.5)),
        (New-Object System.Drawing.PointF(17.0, 30.5)),
        (New-Object System.Drawing.PointF(26.5, 16.5))
    )
    $G.DrawLines($CheckPen, $CheckPoints)

    # 5. Amber Accent Dot
    $AmberBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 245, 158, 11)) # #F59E0B
    $G.FillEllipse($AmberBrush, 25.5, 14.5, 4.0, 4.0)

    # 6. Text: "PreLaunch" in Pure White
    $FontFamily = "Segoe UI"
    try {
        $TestFont = New-Object System.Drawing.Font("Sora", 16, [System.Drawing.FontStyle]::Bold)
        if ($TestFont.FontFamily.Name -eq "Sora") { $FontFamily = "Sora" }
    } catch {}

    $TextFont = New-Object System.Drawing.Font($FontFamily, 15.5, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $WhiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 255, 255))
    $G.DrawString("PreLaunch", $TextFont, $WhiteBrush, 45, 12)

    # 7. Badge: "QA" in Vibrant Mint Green Pill
    $BadgeBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 16, 185, 129)) # #10B981
    $BadgePath = New-Object System.Drawing.Drawing2D.GraphicsPath
    $BadgePath.AddArc(164, 10, 12, 12, 180, 90)
    $BadgePath.AddArc(192, 10, 12, 12, 270, 90)
    $BadgePath.AddArc(192, 22, 12, 12, 0, 90)
    $BadgePath.AddArc(164, 22, 12, 12, 90, 90)
    $BadgePath.CloseFigure()
    $G.FillPath($BadgeBrush, $BadgePath)

    # Badge Text "QA"
    $QaFont = New-Object System.Drawing.Font($FontFamily, 10.5, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $QaBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 10, 15, 25))
    $StringFormat = New-Object System.Drawing.StringFormat
    $StringFormat.Alignment = [System.Drawing.StringAlignment]::Center
    $StringFormat.LineAlignment = [System.Drawing.StringAlignment]::Center
    $BadgeRect = New-Object System.Drawing.RectangleF(164, 10, 40, 24)
    $G.DrawString("QA", $QaFont, $QaBrush, $BadgeRect, $StringFormat)

    $G.Dispose()
    return $Bmp
}

# Ensure output directory exists
$ResolvedOutDir = Resolve-Path $OutDir -ErrorAction SilentlyContinue
if (-not $ResolvedOutDir) {
    New-Item -ItemType Directory -Path $OutDir -Force | Out-Null
    $ResolvedOutDir = Resolve-Path $OutDir
}

# 1. Output logo.png (transparent)
$LogoPng = Create-LogoBitmap -Scale 4 -Transparent $true
$LogoPngPath = Join-Path $ResolvedOutDir "logo.png"
$LogoPng.Save($LogoPngPath, [System.Drawing.Imaging.ImageFormat]::Png)
$LogoPng.Dispose()
Write-Output "Generated: $LogoPngPath"

# 2. Output logo.jpg (with dark background matching app)
$LogoJpg = Create-LogoBitmap -Scale 4 -Transparent $false
$LogoJpgPath = Join-Path $ResolvedOutDir "logo.jpg"
$JpgEncoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.FormatDescription -eq "JPEG" }
$EncoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
$EncoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]100)
$LogoJpg.Save($LogoJpgPath, $JpgEncoder, $EncoderParams)
$LogoJpg.Dispose()
Write-Output "Generated: $LogoJpgPath"

# 3. Update brand/source/prelaunchqa-logo.jpg
$SourceJpgPath = Resolve-Path "$PSScriptRoot\..\..\brand\source\prelaunchqa-logo.jpg" -ErrorAction SilentlyContinue
if ($SourceJpgPath) {
    $SrcJpg = Create-LogoBitmap -Scale 4 -Transparent $false
    $SrcJpg.Save($SourceJpgPath.Path, $JpgEncoder, $EncoderParams)
    $SrcJpg.Dispose()
    Write-Output "Updated: $SourceJpgPath"
}

# 4. Generate Favicon and App Icon
function Create-IconBitmap {
    param ([int]$Size = 180)
    $Bmp = New-Object System.Drawing.Bitmap($Size, $Size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $G = [System.Drawing.Graphics]::FromImage($Bmp)
    $G.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $G.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $G.Clear([System.Drawing.Color]::Transparent)

    $Scale = $Size / 44.0
    $G.ScaleTransform($Scale, $Scale)

    # 1. Back Violet Squircle
    $State = $G.Save()
    $G.TranslateTransform(22, 20)
    $G.RotateTransform(7)
    $G.TranslateTransform(-22, -20)
    $VioletBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(230, 139, 92, 246))
    $VioletPath = New-Object System.Drawing.Drawing2D.GraphicsPath
    $VioletPath.AddArc(8, 6, 16, 16, 180, 90)
    $VioletPath.AddArc(20, 6, 16, 16, 270, 90)
    $VioletPath.AddArc(20, 18, 16, 16, 0, 90)
    $VioletPath.AddArc(8, 18, 16, 16, 90, 90)
    $VioletPath.CloseFigure()
    $G.FillPath($VioletBrush, $VioletPath)
    $G.Restore($State)

    # 2. Middle Coral Squircle
    $State = $G.Save()
    $G.TranslateTransform(19, 22)
    $G.RotateTransform(-4)
    $G.TranslateTransform(-19, -22)
    $CoralBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(240, 244, 63, 94))
    $CoralPath = New-Object System.Drawing.Drawing2D.GraphicsPath
    $CoralPath.AddArc(6, 8, 16, 16, 180, 90)
    $CoralPath.AddArc(18, 8, 16, 16, 270, 90)
    $CoralPath.AddArc(18, 20, 16, 16, 0, 90)
    $CoralPath.AddArc(6, 20, 16, 16, 90, 90)
    $CoralPath.CloseFigure()
    $G.FillPath($CoralBrush, $CoralPath)
    $G.Restore($State)

    # 3. Front Navy Card
    $CardBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 19, 23, 46))
    $BorderPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 60, 75, 110), 1.2)
    $CardPath = New-Object System.Drawing.Drawing2D.GraphicsPath
    $CardPath.AddArc(5, 9, 18, 18, 180, 90)
    $CardPath.AddArc(19, 9, 18, 18, 270, 90)
    $CardPath.AddArc(19, 23, 18, 18, 0, 90)
    $CardPath.AddArc(5, 23, 18, 18, 90, 90)
    $CardPath.CloseFigure()
    $G.FillPath($CardBrush, $CardPath)
    $G.DrawPath($BorderPen, $CardPath)

    # Checkmark
    $CheckPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 16, 185, 129), 3.8)
    $CheckPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $CheckPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $CheckPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
    $CheckPoints = @(
        (New-Object System.Drawing.PointF(11.5, 24.5)),
        (New-Object System.Drawing.PointF(17.5, 30.5)),
        (New-Object System.Drawing.PointF(27.0, 16.5))
    )
    $G.DrawLines($CheckPen, $CheckPoints)

    # Amber Dot
    $AmberBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 245, 158, 11))
    $G.FillEllipse($AmberBrush, 26.0, 14.5, 4.0, 4.0)

    $G.Dispose()
    return $Bmp
}

# Generate apple-touch-icon.png (180x180)
$AppleIcon = Create-IconBitmap -Size 180
$AppleIconPath = Join-Path $ResolvedOutDir "apple-touch-icon.png"
$AppleIcon.Save($AppleIconPath, [System.Drawing.Imaging.ImageFormat]::Png)
$AppleIcon.Dispose()

# Generate icon-120.png (120x120)
$Icon120 = Create-IconBitmap -Size 120
$Icon120Path = Join-Path $ResolvedOutDir "icon-120.png"
$Icon120.Save($Icon120Path, [System.Drawing.Imaging.ImageFormat]::Png)
$Icon120.Dispose()

# Generate favicon.png (64x64)
$Favicon = Create-IconBitmap -Size 64
$FaviconPath = Resolve-Path "$PSScriptRoot\..\..\public\favicon.png"
$Favicon.Save($FaviconPath.Path, [System.Drawing.Imaging.ImageFormat]::Png)
$Favicon.Dispose()

# 5. Generate og-image.png (1200x630)
$OgBmp = New-Object System.Drawing.Bitmap(1200, 630, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$Gog = [System.Drawing.Graphics]::FromImage($OgBmp)
$Gog.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$Gog.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$BgColor = [System.Drawing.Color]::FromArgb(255, 16, 20, 36)
$Gog.Clear($BgColor)

$HiResLogo = Create-LogoBitmap -Scale 4 -Transparent $true
$LogoW = 680
$LogoH = [int]($LogoW * (44.0 / 212.0))
$LogoX = [int]((1200 - $LogoW) / 2)
$LogoY = [int]((630 - $LogoH) / 2)
$Gog.DrawImage($HiResLogo, $LogoX, $LogoY, $LogoW, $LogoH)
$Gog.Dispose()
$OgPath = Join-Path $ResolvedOutDir "og-image.png"
$OgBmp.Save($OgPath, [System.Drawing.Imaging.ImageFormat]::Png)
$OgBmp.Dispose()
Write-Output "Generated: $OgPath"

# 6. Generate email-header.png (600x160)
$EmailBmp = New-Object System.Drawing.Bitmap(600, 160, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$Gem = [System.Drawing.Graphics]::FromImage($EmailBmp)
$Gem.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$Gem.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$Gem.Clear($BgColor)
$ELogoW = 340
$ELogoH = [int]($ELogoW * (44.0 / 212.0))
$ELogoX = [int]((600 - $ELogoW) / 2)
$ELogoY = [int]((160 - $ELogoH) / 2)
$Gem.DrawImage($HiResLogo, $ELogoX, $ELogoY, $ELogoW, $ELogoH)
$Gem.Dispose()
$EmailPath = Join-Path $ResolvedOutDir "email-header.png"
$EmailBmp.Save($EmailPath, [System.Drawing.Imaging.ImageFormat]::Png)
$EmailBmp.Dispose()
Write-Output "Generated: $EmailPath"

$HiResLogo.Dispose()

Write-Output "All brand icons and logos generated successfully."
