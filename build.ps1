[CmdletBinding()]
param(
    [string]$Version = "",
    [string]$Repo = "",
    [switch]$SkipInstall,
    [switch]$SkipTests
)

$ErrorActionPreference = "Stop"
$RootDir = $PSScriptRoot
Push-Location $RootDir

try {
    foreach ($p in @(
        (Join-Path $env:ProgramFiles "nodejs"),
        (Join-Path $env:ProgramFiles "Go\bin"),
        (Join-Path $env:USERPROFILE "go\bin"),
        (Join-Path $env:LOCALAPPDATA "Programs\Go\bin")
    )) {
        if ($p -and (Test-Path $p) -and -not ($env:Path -split ';' -contains $p)) {
            $env:Path = "$p;$env:Path"
        }
    }

    function Assert-Command {
        param([string]$Name, [string]$Hint)
        if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
            throw "Command '$Name' not found. $Hint"
        }
    }

    Assert-Command "node" "Install Node.js 20+: winget install OpenJS.NodeJS.LTS"
    Assert-Command "npm"  "Install Node.js 20+: winget install OpenJS.NodeJS.LTS"
    Assert-Command "go"   "Install Go 1.22+: winget install GoLang.Go"

    if (-not $Version) {
        $pkg = Get-Content -Path (Join-Path $RootDir "package.json") -Raw -Encoding UTF8 | ConvertFrom-Json
        $Version = if ($pkg.version) { [string]$pkg.version } else { "1.0.0" }
    }

    Write-Host "==> Mod Optimizer Windows Build (v$Version)" -ForegroundColor Cyan

    if (-not $SkipInstall) {
        Write-Host "[1/5] Installing npm dependencies..." -ForegroundColor Yellow
        npm install --legacy-peer-deps --no-audit --no-fund
        if ($LASTEXITCODE -ne 0) { throw "npm install failed" }
    } else {
        Write-Host "[1/5] Skipping npm install (-SkipInstall)" -ForegroundColor DarkGray
    }

    Write-Host "[2/5] Syncing mod database bundle..." -ForegroundColor Yellow
    npm run sync:data
    if ($LASTEXITCODE -ne 0) { throw "npm run sync:data failed" }

    if (-not $SkipTests) {
        Write-Host "[3/5] Running unit tests and TypeScript check..." -ForegroundColor Yellow
        npm test
        if ($LASTEXITCODE -ne 0) { throw "npm test failed" }
        npm run lint
        if ($LASTEXITCODE -ne 0) { throw "npm run lint failed" }
    } else {
        Write-Host "[3/5] Skipping tests and lint (-SkipTests)" -ForegroundColor DarkGray
    }

    Write-Host "[4/5] Building frontend bundle (Vite)..." -ForegroundColor Yellow
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "npm run build failed" }

    $WebUIDir = Join-Path $RootDir "desktop\webui"
    foreach ($sub in @("assets", "data", "index.html")) {
        $target = Join-Path $WebUIDir $sub
        if (Test-Path $target) {
            Remove-Item -Path $target -Recurse -Force
        }
    }
    Copy-Item -Path (Join-Path $RootDir "dist\*") -Destination $WebUIDir -Recurse -Force

    $ReleaseDir = Join-Path $RootDir "release"
    New-Item -ItemType Directory -Force -Path $ReleaseDir | Out-Null

    Write-Host "[5/5] Building Go WebView2 GUI & CLI executables..." -ForegroundColor Yellow
    Push-Location (Join-Path $RootDir "desktop")
    try {
        go mod tidy
        if ($LASTEXITCODE -ne 0) { throw "go mod tidy failed" }

        $env:CGO_ENABLED = "0"
        $env:GOOS = "windows"
        $env:GOARCH = "amd64"

        $ldGui = "-H windowsgui -s -w -X main.appVersion=$Version"
        $ldCli = "-s -w -X main.appVersion=$Version"
        if ($Repo) {
            $ldGui += " -X main.githubRepo=$Repo"
            $ldCli += " -X main.githubRepo=$Repo"
        }

        $guiExe = Join-Path $ReleaseDir "ModOptimizer-win-x64.exe"
        $cliExe = Join-Path $ReleaseDir "modopt-cli-win-x64.exe"

        go build -ldflags $ldGui -o $guiExe .
        if ($LASTEXITCODE -ne 0) { throw "GUI build failed" }

        go build -tags cli -ldflags $ldCli -o $cliExe .
        if ($LASTEXITCODE -ne 0) { throw "CLI build failed" }

        $guiMb = [math]::Round((Get-Item $guiExe).Length / 1MB, 2)
        $cliMb = [math]::Round((Get-Item $cliExe).Length / 1MB, 2)

        Write-Host ""
        Write-Host "Build completed successfully:" -ForegroundColor Green
        Write-Host "  GUI: $guiExe ($guiMb MB)"
        Write-Host "  CLI: $cliExe ($cliMb MB)"
    }
    finally {
        Pop-Location
    }
}
finally {
    Pop-Location
}
