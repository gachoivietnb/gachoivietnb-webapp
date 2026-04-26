$ErrorActionPreference = 'Continue'
$log = "E:\GaChoiVietNB\WebApp\enable_wsl.log"
"=== Enable WSL $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ===" | Out-File $log -Encoding utf8

function Log($msg, $color = 'White') {
    Write-Host $msg -ForegroundColor $color
    $msg | Out-File $log -Append -Encoding utf8
}

Log "[1/3] Enabling Microsoft-Windows-Subsystem-Linux..." Cyan
$r1 = Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux -All -NoRestart -ErrorAction SilentlyContinue
if ($r1) {
    Log ("      RestartNeeded: {0}" -f $r1.RestartNeeded) Green
}

Log "[2/3] Enabling VirtualMachinePlatform..." Cyan
$r2 = Enable-WindowsOptionalFeature -Online -FeatureName VirtualMachinePlatform -All -NoRestart -ErrorAction SilentlyContinue
if ($r2) {
    Log ("      RestartNeeded: {0}" -f $r2.RestartNeeded) Green
}

Log "[3/3] Verifying..." Cyan
$f1 = Get-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux
$f2 = Get-WindowsOptionalFeature -Online -FeatureName VirtualMachinePlatform
Log ("      Microsoft-Windows-Subsystem-Linux : {0}" -f $f1.State) Gray
Log ("      VirtualMachinePlatform            : {0}" -f $f2.State) Gray

$c = Get-WmiObject -Class Win32_LogicalDisk -Filter "DeviceID='C:'"
Log ""
Log ("C: free space : {0:N2} GB" -f ($c.FreeSpace / 1GB)) Green

Log ""
Log "=== NEXT: Restart your machine to finalize feature activation ===" Yellow
Log "After restart:" Yellow
Log "  1. Open terminal in E:\GaChoiVietNB\WebApp"
Log "  2. Run: claude --continue"
Log "  3. Claude will install WSL core + import Ubuntu from E:\WSL\ubuntu-24.04.tar.gz"

Log ""
Log "Log saved to: $log" Gray
Write-Host ""
Write-Host "Press any key to close..." -ForegroundColor Gray
$null = $host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
