$ErrorActionPreference = 'SilentlyContinue'
$log = "E:\GaChoiVietNB\WebApp\cleanup_disk.log"
"=== Disk cleanup $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ===" | Out-File $log -Encoding utf8

function Log($msg, $color = 'White') {
    Write-Host $msg -ForegroundColor $color
    $msg | Out-File $log -Append -Encoding utf8
}

function GetFolderSize($path) {
    if (-not (Test-Path $path)) { return 0 }
    try {
        $sum = (Get-ChildItem -Path $path -Recurse -Force -ErrorAction SilentlyContinue |
                Measure-Object -Property Length -Sum).Sum
        return [int64]($sum | ForEach-Object { if ($_ -eq $null) { 0 } else { $_ } })
    } catch { return 0 }
}

function FormatMB($bytes) { return "{0:N1} MB" -f ($bytes / 1MB) }
function FormatGB($bytes) { return "{0:N2} GB" -f ($bytes / 1GB) }

function ClearFolder($path, $label) {
    if (-not (Test-Path $path)) {
        Log ("  [{0}] skip (not exists)" -f $label) Gray
        return 0
    }
    $before = GetFolderSize $path
    Get-ChildItem -Path $path -Force -ErrorAction SilentlyContinue | ForEach-Object {
        try { Remove-Item $_.FullName -Recurse -Force -ErrorAction SilentlyContinue } catch {}
    }
    $after = GetFolderSize $path
    $freed = $before - $after
    Log ("  [{0}] {1} -> {2}  (freed {3})" -f $label, (FormatMB $before), (FormatMB $after), (FormatMB $freed)) Green
    return $freed
}

# Baseline
$cBefore = (Get-WmiObject -Class Win32_LogicalDisk -Filter "DeviceID='C:'").FreeSpace
Log ("Baseline C: free = {0}" -f (FormatGB $cBefore)) Cyan
Log ""

Log "[STEP 1/7] Windows Update cache (stopping service first)..." Cyan
Stop-Service -Name wuauserv -Force -ErrorAction SilentlyContinue
Stop-Service -Name bits -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
$null = ClearFolder "C:\Windows\SoftwareDistribution\Download" "WU-Download"
$null = ClearFolder "C:\Windows\SoftwareDistribution\DeliveryOptimization" "DeliveryOpt"
Start-Service -Name wuauserv -ErrorAction SilentlyContinue
Start-Service -Name bits -ErrorAction SilentlyContinue

Log ""
Log "[STEP 2/7] Windows Temp folder..." Cyan
$null = ClearFolder "C:\Windows\Temp" "Win-Temp"

Log ""
Log "[STEP 3/7] User Temp folders..." Cyan
$null = ClearFolder $env:TEMP "User-Temp"
$null = ClearFolder "C:\Users\PHU\AppData\Local\Temp" "PHU-Temp"

Log ""
Log "[STEP 4/7] Thumbnail caches..." Cyan
$null = ClearFolder "C:\Users\PHU\AppData\Local\Microsoft\Windows\Explorer" "Thumbs"

Log ""
Log "[STEP 5/7] Windows error reporting queue..." Cyan
$null = ClearFolder "C:\ProgramData\Microsoft\Windows\WER\ReportQueue" "WER-Queue"
$null = ClearFolder "C:\ProgramData\Microsoft\Windows\WER\ReportArchive" "WER-Archive"

Log ""
Log "[STEP 6/7] Windows CBS (Component-Based Servicing) logs..." Cyan
$null = ClearFolder "C:\Windows\Logs\CBS" "CBS-Logs"

Log ""
Log "[STEP 7/7] Empty Recycle Bin on all drives..." Cyan
try {
    Clear-RecycleBin -Force -ErrorAction SilentlyContinue
    Log "  [RecycleBin] emptied" Green
} catch {
    Log "  [RecycleBin] skip (nothing to empty or error)" Gray
}

# Report
Start-Sleep -Seconds 2
$cAfter = (Get-WmiObject -Class Win32_LogicalDisk -Filter "DeviceID='C:'").FreeSpace
$recovered = $cAfter - $cBefore

Log ""
Log "=== SUMMARY ===" Yellow
Log ("Before : {0}" -f (FormatGB $cBefore)) White
Log ("After  : {0}" -f (FormatGB $cAfter)) White
Log ("Freed  : {0}" -f (FormatGB $recovered)) Green
Log ""

# Top space consumers for next step
Log "=== TOP 10 largest folders in C:\Users\PHU (for next manual cleanup) ===" Yellow
try {
    Get-ChildItem "C:\Users\PHU" -Directory -Force -ErrorAction SilentlyContinue | ForEach-Object {
        $size = (Get-ChildItem $_.FullName -Recurse -Force -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
        [PSCustomObject]@{ Path = $_.FullName; SizeGB = [math]::Round($size/1GB, 2) }
    } | Sort-Object SizeGB -Descending | Select-Object -First 10 | ForEach-Object {
        Log ("  {0,8} GB  {1}" -f $_.SizeGB, $_.Path) Gray
    }
} catch {}

Log ""
Log "=== TOP 15 largest apps in Program Files (cannot delete automatically) ===" Yellow
try {
    @("C:\Program Files", "C:\Program Files (x86)") | ForEach-Object {
        Get-ChildItem $_ -Directory -Force -ErrorAction SilentlyContinue
    } | ForEach-Object {
        $size = (Get-ChildItem $_.FullName -Recurse -Force -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
        [PSCustomObject]@{ Path = $_.FullName; SizeGB = [math]::Round($size/1GB, 2) }
    } | Sort-Object SizeGB -Descending | Select-Object -First 15 | ForEach-Object {
        Log ("  {0,8} GB  {1}" -f $_.SizeGB, $_.Path) Gray
    }
} catch {}

Log ""
Log "Log saved to: $log" Gray
Write-Host ""
Write-Host "Press any key to close..." -ForegroundColor Gray
$null = $host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
