$ErrorActionPreference = 'Continue'
$log = "E:\GaChoiVietNB\WebApp\cleanup_wsl.log"
"=== WSL cleanup $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ===" | Out-File $log -Encoding utf8

function Log($msg, $color = 'White') {
    Write-Host $msg -ForegroundColor $color
    $msg | Out-File $log -Append -Encoding utf8
}

Log "[1/5] Disabling Microsoft-Windows-Subsystem-Linux..." Cyan
$r1 = Disable-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux -NoRestart -ErrorAction SilentlyContinue
if ($r1) {
    Log ("      RestartNeeded: {0}" -f $r1.RestartNeeded) Green
} else {
    Log "      (feature already disabled or not present)" Yellow
}

Log "[2/5] Disabling VirtualMachinePlatform..." Cyan
$r2 = Disable-WindowsOptionalFeature -Online -FeatureName VirtualMachinePlatform -NoRestart -ErrorAction SilentlyContinue
if ($r2) {
    Log ("      RestartNeeded: {0}" -f $r2.RestartNeeded) Green
} else {
    Log "      (feature already disabled or not present)" Yellow
}

Log "[3/5] Removing C:\Program Files\WSL ..." Cyan
if (Test-Path "C:\Program Files\WSL") {
    Remove-Item -Path "C:\Program Files\WSL" -Recurse -Force -ErrorAction SilentlyContinue
    if (Test-Path "C:\Program Files\WSL") {
        Log "      Folder locked, will be removed after restart" Yellow
    } else {
        Log "      Removed successfully" Green
    }
} else {
    Log "      Folder not found (OK)" Green
}

Log "[4/5] Checking optional features status..." Cyan
$f1 = Get-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux -ErrorAction SilentlyContinue
$f2 = Get-WindowsOptionalFeature -Online -FeatureName VirtualMachinePlatform -ErrorAction SilentlyContinue
$f3 = Get-WindowsOptionalFeature -Online -FeatureName HypervisorPlatform -ErrorAction SilentlyContinue
Log ("      Microsoft-Windows-Subsystem-Linux : {0}" -f ($f1.State)) Gray
Log ("      VirtualMachinePlatform            : {0}" -f ($f2.State)) Gray
Log ("      HypervisorPlatform                : {0}" -f ($f3.State)) Gray

Log "[5/5] C: drive free space..." Cyan
$c = Get-WmiObject -Class Win32_LogicalDisk -Filter "DeviceID='C:'"
$freeGB = [math]::Round($c.FreeSpace/1GB, 2)
$totalGB = [math]::Round($c.Size/1GB, 2)
Log ("      {0} GB free / {1} GB total" -f $freeGB, $totalGB) Green

Log ""
Log "=== DONE. Please RESTART your machine to finalize. ===" Yellow
Log ("Log saved to: {0}" -f $log) Gray
Log ""
Write-Host "Press any key to close this window..." -ForegroundColor Gray
$null = $host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
