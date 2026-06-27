Add-Type -AssemblyName System.Drawing

$sourceDir = "E:\DOWNLOADS\download"
$targetBase = "E:\dev\reddit-confession-factory\packages\composer\assets\backgrounds"

# Hardcoded mapping: filename keyword -> mood. First match wins.
# Order matters — more specific patterns must come before generic ones.
$rules = @(
    @{ Mood = "dark-hallway";      Pattern = "hallway" },
    @{ Mood = "dark-hallway";      Pattern = "stairwell" },
    @{ Mood = "dark-hallway";      Pattern = "service_corridor" },
    @{ Mood = "dark-hallway";      Pattern = "hotel_hallway" },
    @{ Mood = "dark-hallway";      Pattern = "basement" },
    @{ Mood = "dark-hallway";      Pattern = "residential_corridor" },
    @{ Mood = "rainy-window";      Pattern = "windsh" },
    @{ Mood = "rainy-window";      Pattern = "foggy" },
    @{ Mood = "rainy-window";      Pattern = "balcony" },
    @{ Mood = "rainy-window";      Pattern = "rain" },
    @{ Mood = "rainy-window";      Pattern = "window" },
    @{ Mood = "liminal-corridor";  Pattern = "lobby" },
    @{ Mood = "liminal-corridor";  Pattern = "hospital_corridor" },
    @{ Mood = "liminal-corridor";  Pattern = "school_corridor" },
    @{ Mood = "liminal-corridor";  Pattern = "mall_corridor" },
    @{ Mood = "liminal-corridor";  Pattern = "underground_parking" },
    @{ Mood = "liminal-corridor";  Pattern = "underground_tunnel" },
    @{ Mood = "case-file-desk";    Pattern = "corkboard" },
    @{ Mood = "case-file-desk";    Pattern = "detective" },
    @{ Mood = "case-file-desk";    Pattern = "evidence" },
    @{ Mood = "case-file-desk";    Pattern = "manila" },
    @{ Mood = "case-file-desk";    Pattern = "notebook" },
    @{ Mood = "case-file-desk";    Pattern = "desktop" },
    @{ Mood = "case-file-desk";    Pattern = "storage_shelf" },
    @{ Mood = "case-file-desk";    Pattern = "file_boxes" },
    @{ Mood = "phone-dark-room";   Pattern = "phone_on_dark" },
    @{ Mood = "empty-street";      Pattern = "alley" },
    @{ Mood = "empty-street";      Pattern = "street" },
    @{ Mood = "empty-street";      Pattern = "road" },
    @{ Mood = "empty-street";      Pattern = "parking_lot" },
    @{ Mood = "empty-street";      Pattern = "bus_stop" },
    @{ Mood = "empty-street";      Pattern = "gas_station" },
    @{ Mood = "empty-street";      Pattern = "industrial" },
    @{ Mood = "empty-street";      Pattern = "train_platform" },
    @{ Mood = "eerie-room";        Pattern = "bedroom" },
    @{ Mood = "eerie-room";        Pattern = "kitchen" },
    @{ Mood = "eerie-room";        Pattern = "attic" },
    @{ Mood = "eerie-room";        Pattern = "motel" },
    @{ Mood = "eerie-room";        Pattern = "laundry" },
    @{ Mood = "eerie-room";        Pattern = "interrogation" },
    @{ Mood = "eerie-room";        Pattern = "living_room" },
    @{ Mood = "eerie-room";        Pattern = "abandoned_storage" },
    @{ Mood = "eerie-room";        Pattern = "office_room" },
    @{ Mood = "eerie-room";        Pattern = "office_cubicle" }
)

$moodDirs = @("dark-hallway", "rainy-window", "eerie-room", "empty-street", "liminal-corridor", "case-file-desk", "phone-dark-room", "vhs-glitch")
foreach ($mood in $moodDirs) {
    $dir = Join-Path $targetBase $mood
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
}

function Get-Mood($name) {
    $lower = $name.ToLower()
    foreach ($rule in $rules) {
        if ($lower.Contains($rule.Pattern)) { return $rule.Mood }
    }
    return $null
}

$targetRatio = 9.0 / 16.0
$counters = @{}
$processed = 0
$skipped = 0

$files = Get-ChildItem $sourceDir -Filter "*.jpeg" | Sort-Object Name
foreach ($file in $files) {
    $mood = Get-Mood $file.Name
    if ($null -eq $mood) {
        Write-Host "SKIP (no mood): $($file.Name)"
        $skipped++
        continue
    }

    if (-not $counters.ContainsKey($mood)) { $counters[$mood] = 0 }
    $counters[$mood]++
    $num = "{0:D2}" -f $counters[$mood]

    $img = [System.Drawing.Image]::FromFile($file.FullName)
    $w = $img.Width
    $h = $img.Height
    $currentRatio = [double]$w / [double]$h

    $cropX = 0
    $cropY = 0
    $cropW = $w
    $cropH = $h

    if ([Math]::Abs($currentRatio - $targetRatio) -gt 0.01) {
        if ($currentRatio -gt $targetRatio) {
            $cropW = [int]([Math]::Round($h * $targetRatio))
            $cropX = [int]([Math]::Floor(($w - $cropW) / 2))
        } else {
            $cropH = [int]([Math]::Round($w / $targetRatio))
            $cropY = [int]([Math]::Floor(($h - $cropH) / 2))
        }
    }

    $outName = "$mood-$num.png"
    $outPath = Join-Path (Join-Path $targetBase $mood) $outName

    $needsCrop = ($cropX -ne 0) -or ($cropY -ne 0) -or ($cropW -ne $w) -or ($cropH -ne $h)
    if ($needsCrop) {
        $bmp = New-Object System.Drawing.Bitmap($cropW, $cropH)
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $srcRect = New-Object System.Drawing.Rectangle($cropX, $cropY, $cropW, $cropH)
        $destRect = New-Object System.Drawing.Rectangle(0, 0, $cropW, $cropH)
        $g.DrawImage($img, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
        $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
        $g.Dispose()
        $bmp.Dispose()
    } else {
        $img.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    }

    $img.Dispose()
    Write-Host "OK: $($file.Name) -> $mood/$outName (${w}x${h})"
    $processed++
}

Write-Host ""
Write-Host "=== Summary ==="
Write-Host "Processed: $processed"
Write-Host "Skipped:   $skipped"
foreach ($mood in $moodDirs) {
    $count = 0
    if ($counters.ContainsKey($mood)) { $count = $counters[$mood] }
    Write-Host "  $mood : $count"
}
