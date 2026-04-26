$ErrorActionPreference = 'SilentlyContinue'
$log = "E:\GaChoiVietNB\WebApp\scan_deep.log"
"=== Deep scan $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ===" | Out-File $log -Encoding utf8

function Log($msg) {
    Write-Host $msg
    $msg | Out-File $log -Append -Encoding utf8
}

function SizeOf($path) {
    if (-not (Test-Path $path)) { return 0 }
    return [int64]((Get-ChildItem -Path $path -Recurse -Force -ErrorAction SilentlyContinue |
            Measure-Object -Property Length -Sum).Sum)
}

function FormatGB($b) { return "{0,7:N2} GB" -f ($b / 1GB) }
function FormatMB($b) { return "{0,7:N1} MB" -f ($b / 1MB) }

function ScanDir($path, $label, $topN = 15) {
    if (-not (Test-Path $path)) { Log "`n[$label] not found"; return }
    Log "`n=== $label ($path) ==="
    $items = Get-ChildItem $path -Directory -Force -ErrorAction SilentlyContinue | ForEach-Object {
        [PSCustomObject]@{ Path = $_.FullName; Size = (SizeOf $_.FullName) }
    } | Sort-Object Size -Descending | Select-Object -First $topN
    foreach ($item in $items) {
        Log ("  {0}  {1}" -f (FormatGB $item.Size), $item.Path)
    }
}

ScanDir "C:\Users\PHU\AppData\Local" "AppData\Local (TOP 15)"
ScanDir "C:\Users\PHU\AppData\Roaming" "AppData\Roaming (TOP 15)"
ScanDir "C:\Users\PHU\.android" ".android (contents)" 20
ScanDir "C:\Users\PHU\.gradle" ".gradle (contents)" 15

# AVD details
Log "`n=== .android\avd — from Android emulators ==="
$avdDir = "C:\Users\PHU\.android\avd"
if (Test-Path $avdDir) {
    Get-ChildItem $avdDir -Directory -Force -ErrorAction SilentlyContinue | ForEach-Object {
        $s = SizeOf $_.FullName
        Log ("  {0}  {1}" -f (FormatGB $s), $_.Name)
    }
}

# Gradle caches
Log "`n=== .gradle\caches — per-version caches ==="
$gcDir = "C:\Users\PHU\.gradle\caches"
if (Test-Path $gcDir) {
    Get-ChildItem $gcDir -Directory -Force -ErrorAction SilentlyContinue | ForEach-Object {
        $s = SizeOf $_.FullName
        Log ("  {0}  {1}" -f (FormatGB $s), $_.Name)
    }
}

# Android SDK detection
Log "`n=== Android SDK location (if env set) ==="
if ($env:ANDROID_HOME) { Log "  ANDROID_HOME = $env:ANDROID_HOME" }
if ($env:ANDROID_SDK_ROOT) { Log "  ANDROID_SDK_ROOT = $env:ANDROID_SDK_ROOT" }
$sdkDefault = "C:\Users\PHU\AppData\Local\Android\Sdk"
if (Test-Path $sdkDefault) {
    Log ("  Default SDK at: {0}  size={1}" -f $sdkDefault, (FormatGB (SizeOf $sdkDefault)))
}

Log "`n=== DONE ==="
Log "Log: $log"
