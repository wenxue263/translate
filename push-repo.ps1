param(
  [string]$Message = ""
)

$ErrorActionPreference = "Stop"

$repoRoot = $PSScriptRoot

if (-not (Test-Path -LiteralPath $repoRoot)) {
  throw "仓库目录不存在: $repoRoot"
}

Push-Location $repoRoot
try {
  if (-not (Test-Path -LiteralPath ".git")) {
    throw "当前目录不是 Git 仓库: $repoRoot"
  }

  $statusShort = git status --short
  if (-not $statusShort) {
    Write-Host "没有可提交的变更，跳过提交，直接推送..."
    git push origin main
    Write-Host "已完成 push -> origin/main"
    exit 0
  }

  if ([string]::IsNullOrWhiteSpace($Message)) {
    $Message = "chore: sync repo-translate"
  }

  git add .
  git commit -m $Message
  git push origin main

  Write-Host "提交并推送完成 -> origin/main"
} finally {
  Pop-Location
}
