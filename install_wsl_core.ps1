$ErrorActionPreference = 'Continue'
$log = "E:\GaChoiVietNB\WebApp\install_wsl_core.log"
"=== Install WSL core $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ===" | Out-File $log -Encoding utf8

function Log($msg, $color = 'White') {
    Write-Host $msg -ForegroundColor $color
    $msg | Out-File $log -Append -Encoding utf8
}

function RunCapture($exe, $args, $label) {
    Log ">>> $label" Cyan
    $out = & $exe $args 2>&1 | Out-String
    # wsl outputs UTF-16 sometimes; clean it
    $clean = $out -replace "`0", ""
    Log $clean.Trim() Gray
    return $LASTEXITCODE
}

# ====== 1. INSTALL MSI ======
Log "[1/6] Installing WSL core MSI (may take 1-2 min)..." Cyan
$msi = "E:\WSL\wsl-installer.msi"
$msiLog = "E:\WSL\wsl-msi-install.log"
$proc = Start-Process -FilePath "msiexec.exe" -ArgumentList "/i `"$msi`" /quiet /norestart /log `"$msiLog`"" -Wait -PassThru
Log ("      Exit code: {0}" -f $proc.ExitCode) $(if ($proc.ExitCode -eq 0) { 'Green' } else { 'Red' })
if ($proc.ExitCode -ne 0) {
    Log "      MSI install FAILED. See $msiLog for details." Red
    Log "      Stopping here. Check log and try again." Red
    Write-Host "Press any key to close..." -ForegroundColor Gray
    $null = $host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
    exit 1
}

Start-Sleep -Seconds 3

# ====== 2. VERIFY WSL ======
Log "[2/6] Verifying wsl --version..." Cyan
$null = RunCapture "wsl.exe" @("--version") "wsl --version"

# ====== 3. UPDATE WSL ======
Log "[3/6] Updating WSL kernel (wsl --update)..." Cyan
$null = RunCapture "wsl.exe" @("--update") "wsl --update"

# ====== 4. SET DEFAULT VERSION 2 ======
Log "[4/6] Setting default version to 2..." Cyan
$null = RunCapture "wsl.exe" @("--set-default-version", "2") "wsl --set-default-version 2"

# ====== 5. IMPORT UBUNTU from E: ======
Log "[5/6] Importing Ubuntu from E:\WSL\ubuntu-24.04.tar.gz to E:\WSL\Ubuntu..." Cyan
if (-not (Test-Path "E:\WSL\ubuntu-24.04.tar.gz")) {
    Log "      ERROR: Ubuntu tarball not found at E:\WSL\ubuntu-24.04.tar.gz" Red
    Write-Host "Press any key to close..." -ForegroundColor Gray
    $null = $host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
    exit 1
}
if (-not (Test-Path "E:\WSL\Ubuntu")) {
    New-Item -ItemType Directory -Path "E:\WSL\Ubuntu" -Force | Out-Null
}
$null = RunCapture "wsl.exe" @("--import", "Ubuntu", "E:\WSL\Ubuntu", "E:\WSL\ubuntu-24.04.tar.gz", "--version", "2") "wsl --import"

# ====== 6. LIST & DEFAULT ======
Log "[6/6] Listing distros..." Cyan
$null = RunCapture "wsl.exe" @("-l", "-v") "wsl -l -v"

Log ""
Log "=== INSTALL DONE ===" Yellow
$c = Get-WmiObject -Class Win32_LogicalDisk -Filter "DeviceID='C:'"
$e = Get-WmiObject -Class Win32_LogicalDisk -Filter "DeviceID='E:'"
Log ("C: free = {0:N2} GB  |  E: free = {1:N2} GB" -f ($c.FreeSpace/1GB), ($e.FreeSpace/1GB)) Green
Log ""
Log "NEXT: Claude will run `wsl -d Ubuntu -u root` to set up a non-root user + default." Yellow
Log "Log: $log" Gray

Write-Host ""
Write-Host "Press any key to close..." -ForegroundColor Gray
$null = $host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
