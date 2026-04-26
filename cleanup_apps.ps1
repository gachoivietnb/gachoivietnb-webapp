$ErrorActionPreference = 'SilentlyContinue'
$log = "E:\GaChoiVietNB\WebApp\cleanup_apps.log"
"=== App cache cleanup $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ===" | Out-File $log -Encoding utf8

function Log($msg, $color = 'White') {
    Write-Host $msg -ForegroundColor $color
    $msg | Out-File $log -Append -Encoding utf8
}

function SizeOf($path) {
    if (-not (Test-Path $path)) { return 0 }
    return [int64]((Get-ChildItem -Path $path -Recurse -Force -ErrorAction SilentlyContinue |
            Measure-Object -Property Length -Sum).Sum)
}

function FormatMB($b) { return "{0,8:N1} MB" -f ($b / 1MB) }

function ClearTarget($path, $label) {
    if (-not (Test-Path $path)) {
        Log ("  [{0,-32}] skip (not exists)" -f $label) Gray
        return 0
    }
    $before = SizeOf $path
    if ($before -eq 0) {
        Log ("  [{0,-32}] empty already" -f $label) Gray
        return 0
    }
    Get-ChildItem -Path $path -Force -ErrorAction SilentlyContinue | ForEach-Object {
        try { Remove-Item $_.FullName -Recurse -Force -ErrorAction SilentlyContinue } catch {}
    }
    $after = SizeOf $path
    $freed = $before - $after
    $color = if ($freed -gt 100MB) { 'Green' } elseif ($freed -gt 10MB) { 'Cyan' } else { 'Gray' }
    Log ("  [{0,-32}] {1} -> {2}  freed {3}" -f $label, (FormatMB $before), (FormatMB $after), (FormatMB $freed)) $color
    return $freed
}

$cBefore = (Get-WmiObject -Class Win32_LogicalDisk -Filter "DeviceID='C:'").FreeSpace
Log ("Baseline C: free = {0:N2} GB`n" -f ($cBefore / 1GB)) Cyan

# ===== CURSOR IDE =====
Log "[CURSOR IDE] Clearing cache/storage (keeps settings, extensions, keybindings)..." Yellow
$cursor = "C:\Users\PHU\AppData\Roaming\Cursor"
$cursorTotal = 0
$cursorTotal += ClearTarget "$cursor\Cache" "Cursor/Cache"
$cursorTotal += ClearTarget "$cursor\Code Cache" "Cursor/Code Cache"
$cursorTotal += ClearTarget "$cursor\GPUCache" "Cursor/GPUCache"
$cursorTotal += ClearTarget "$cursor\blob_storage" "Cursor/blob_storage"
$cursorTotal += ClearTarget "$cursor\Service Worker" "Cursor/Service Worker"
$cursorTotal += ClearTarget "$cursor\WebStorage" "Cursor/WebStorage"
$cursorTotal += ClearTarget "$cursor\logs" "Cursor/logs"
$cursorTotal += ClearTarget "$cursor\CachedExtensionVSIXs" "Cursor/CachedExtensionVSIXs"
$cursorTotal += ClearTarget "$cursor\CachedData" "Cursor/CachedData"
$cursorTotal += ClearTarget "$cursor\CachedProfilesData" "Cursor/CachedProfilesData"
$cursorTotal += ClearTarget "$cursor\Crashpad" "Cursor/Crashpad"
$cursorTotal += ClearTarget "$cursor\IndexedDB" "Cursor/IndexedDB"
Log ("  -> Cursor subtotal: {0:N1} MB`n" -f ($cursorTotal / 1MB)) Yellow

# ===== CHROME =====
Log "[CHROME] Clearing cache in all profiles (keeps history, bookmarks, passwords, cookies)..." Yellow
$chromeBase = "C:\Users\PHU\AppData\Local\Google\Chrome\User Data"
$chromeTotal = 0
if (Test-Path $chromeBase) {
    Get-ChildItem $chromeBase -Directory -Force -ErrorAction SilentlyContinue | Where-Object {
        $_.Name -eq 'Default' -or $_.Name -match '^Profile \d+$' -or $_.Name -eq 'Guest Profile' -or $_.Name -eq 'System Profile'
    } | ForEach-Object {
        $p = $_.FullName
        $profName = $_.Name
        Log ("  -- profile: $profName --") Cyan
        $chromeTotal += ClearTarget "$p\Cache" "Chrome/$profName/Cache"
        $chromeTotal += ClearTarget "$p\Code Cache" "Chrome/$profName/Code Cache"
        $chromeTotal += ClearTarget "$p\GPUCache" "Chrome/$profName/GPUCache"
        $chromeTotal += ClearTarget "$p\Service Worker\CacheStorage" "Chrome/$profName/SW-Cache"
        $chromeTotal += ClearTarget "$p\Service Worker\ScriptCache" "Chrome/$profName/SW-Script"
        $chromeTotal += ClearTarget "$p\Media Cache" "Chrome/$profName/Media Cache"
    }
    # Shared
    $chromeTotal += ClearTarget "$chromeBase\GrShaderCache" "Chrome/GrShaderCache"
    $chromeTotal += ClearTarget "$chromeBase\ShaderCache" "Chrome/ShaderCache"
    $chromeTotal += ClearTarget "$chromeBase\GraphiteDawnCache" "Chrome/GraphiteDawnCache"
} else {
    Log "  Chrome not found" Gray
}
Log ("  -> Chrome subtotal: {0:N1} MB`n" -f ($chromeTotal / 1MB)) Yellow

# ===== EDGE =====
Log "[EDGE] Clearing cache (small, keeps bookmarks/history)..." Yellow
$edgeBase = "C:\Users\PHU\AppData\Local\Microsoft\Edge\User Data"
$edgeTotal = 0
if (Test-Path $edgeBase) {
    Get-ChildItem $edgeBase -Directory -Force -ErrorAction SilentlyContinue | Where-Object {
        $_.Name -eq 'Default' -or $_.Name -match '^Profile \d+$'
    } | ForEach-Object {
        $p = $_.FullName
        $profName = $_.Name
        $edgeTotal += ClearTarget "$p\Cache" "Edge/$profName/Cache"
        $edgeTotal += ClearTarget "$p\Code Cache" "Edge/$profName/Code Cache"
        $edgeTotal += ClearTarget "$p\GPUCache" "Edge/$profName/GPUCache"
    }
} else {
    Log "  Edge not found" Gray
}
Log ("  -> Edge subtotal: {0:N1} MB`n" -f ($edgeTotal / 1MB)) Yellow

# ===== NPM CACHE =====
Log "[NPM] Clearing npm cache..." Yellow
$npmTotal = ClearTarget "C:\Users\PHU\AppData\Local\npm-cache" "npm-cache"
Log ("  -> npm subtotal: {0:N1} MB`n" -f ($npmTotal / 1MB)) Yellow

# ===== PIP CACHE =====
Log "[PIP] Clearing pip cache..." Yellow
$pipTotal = ClearTarget "C:\Users\PHU\AppData\Local\pip\Cache" "pip cache"
Log ("  -> pip subtotal: {0:N1} MB`n" -f ($pipTotal / 1MB)) Yellow

# ===== SUMMARY =====
Start-Sleep -Seconds 1
$cAfter = (Get-WmiObject -Class Win32_LogicalDisk -Filter "DeviceID='C:'").FreeSpace
$recovered = $cAfter - $cBefore

Log "=== SUMMARY ===" Yellow
Log ("Before   : {0,7:N2} GB" -f ($cBefore / 1GB)) White
Log ("After    : {0,7:N2} GB" -f ($cAfter / 1GB)) White
Log ("Recovered: {0,7:N2} GB" -f ($recovered / 1GB)) Green
Log ""
Log ("Cursor   : {0,7:N1} MB" -f ($cursorTotal / 1MB)) Gray
Log ("Chrome   : {0,7:N1} MB" -f ($chromeTotal / 1MB)) Gray
Log ("Edge     : {0,7:N1} MB" -f ($edgeTotal / 1MB)) Gray
Log ("npm      : {0,7:N1} MB" -f ($npmTotal / 1MB)) Gray
Log ("pip      : {0,7:N1} MB" -f ($pipTotal / 1MB)) Gray
Log ""
Log "Log: $log" Gray
