$ErrorActionPreference = 'Continue'
$log = "E:\GaChoiVietNB\WebApp\install_wsl_fix.log"
"=== Install WSL (fix mode) $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ===" | Out-File $log -Encoding utf8

function Log($msg, $color = 'White') {
    Write-Host $msg -ForegroundColor $color
    $msg | Out-File $log -Append -Encoding utf8
}

function RunCapture($exe, $args, $label) {
    Log ">>> $label" Cyan
    $out = & $exe $args 2>&1 | Out-String
    $clean = $out -replace "`0", ""
    Log ("    " + $clean.Trim()) Gray
    return $LASTEXITCODE
}

$productCode = "{B637A6A6-5591-4503-AFD8-776164EB837A}"
$msi = "E:\WSL\wsl-installer.msi"
$msiLog = "E:\WSL\wsl-msi-install2.log"

# ===== 1. FORCE UNINSTALL residual =====
Log "[1/7] Uninstalling residual WSL registration..." Cyan
$uninst = Start-Process -FilePath "msiexec.exe" `
    -ArgumentList "/x $productCode /quiet /norestart /log `"$msiLog.uninstall`"" `
    -Wait -PassThru
Log ("      Uninstall exit: {0}" -f $uninst.ExitCode) Gray

Start-Sleep -Seconds 2

# ===== 2. FRESH INSTALL =====
Log "[2/7] Installing WSL 2.6.3 fresh..." Cyan
$inst = Start-Process -FilePath "msiexec.exe" `
    -ArgumentList "/i `"$msi`" /quiet /norestart /log `"$msiLog`"" `
    -Wait -PassThru
Log ("      Install exit: {0}" -f $inst.ExitCode) $(if ($inst.ExitCode -eq 0) { 'Green' } else { 'Red' })

if ($inst.ExitCode -ne 0) {
    Log "      Fresh install failed. Trying REINSTALL=ALL mode..." Yellow
    $inst2 = Start-Process -FilePath "msiexec.exe" `
        -ArgumentList "/i `"$msi`" REINSTALL=ALL REINSTALLMODE=amus /quiet /norestart /log `"$msiLog.v3`"" `
        -Wait -PassThru
    Log ("      REINSTALL exit: {0}" -f $inst2.ExitCode) $(if ($inst2.ExitCode -eq 0) { 'Green' } else { 'Red' })
    if ($inst2.ExitCode -ne 0) {
        Log "      Both attempts failed. Check logs:" Red
        Log ("        $msiLog") Gray
        Log ("        $msiLog.v3") Gray
        Write-Host "Press any key to close..." -ForegroundColor Gray
        $null = $host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
        exit 1
    }
}

Start-Sleep -Seconds 3

# ===== 3. VERIFY =====
Log "[3/7] Verifying wsl.exe works..." Cyan
$null = RunCapture "wsl.exe" @("--version") "wsl --version"

# ===== 4. UPDATE KERNEL =====
Log "[4/7] Updating WSL kernel..." Cyan
$null = RunCapture "wsl.exe" @("--update") "wsl --update"

# ===== 5. DEFAULT VERSION =====
Log "[5/7] Set default version 2..." Cyan
$null = RunCapture "wsl.exe" @("--set-default-version", "2") "wsl --set-default-version 2"

# ===== 6. IMPORT UBUNTU =====
Log "[6/7] Importing Ubuntu from E:\WSL\ubuntu-24.04.tar.gz ..." Cyan
if (-not (Test-Path "E:\WSL\Ubuntu")) {
    New-Item -ItemType Directory -Path "E:\WSL\Ubuntu" -Force | Out-Null
}
# If previous import partially happened, unregister first
$list = & wsl.exe -l -q 2>&1 | Out-String
if ($list -match "Ubuntu") {
    Log "      Found previous Ubuntu registration, unregistering..." Yellow
    & wsl.exe --unregister Ubuntu 2>&1 | Out-Null
    Start-Sleep -Seconds 2
}
$null = RunCapture "wsl.exe" @("--import", "Ubuntu", "E:\WSL\Ubuntu", "E:\WSL\ubuntu-24.04.tar.gz", "--version", "2") "wsl --import"

# ===== 7. LIST =====
Log "[7/7] Listing distros..." Cyan
$null = RunCapture "wsl.exe" @("-l", "-v") "wsl -l -v"

Log ""
Log "=== DONE ===" Yellow
$c = Get-WmiObject -Class Win32_LogicalDisk -Filter "DeviceID='C:'"
$e = Get-WmiObject -Class Win32_LogicalDisk -Filter "DeviceID='E:'"
Log ("C: free = {0:N2} GB  |  E: free = {1:N2} GB" -f ($c.FreeSpace/1GB), ($e.FreeSpace/1GB)) Green

Write-Host ""
Write-Host "Press any key to close..." -ForegroundColor Gray
$null = $host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
