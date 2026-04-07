param(
  [string]$Message = ""
)

$ErrorActionPreference = "Stop"

$repoRoot = $PSScriptRoot

if (-not (Test-Path -LiteralPath $repoRoot)) {
  throw "Repository path not found: $repoRoot"
}

Push-Location $repoRoot
try {
  if (-not (Test-Path -LiteralPath ".git")) {
    throw "Current path is not a Git repository: $repoRoot"
  }

  $statusShort = git status --short
  if (-not $statusShort) {
    Write-Host "No changes to commit, skip commit and push directly..."
    git push origin main
    Write-Host "Push completed -> origin/main"
    exit 0
  }

  if ([string]::IsNullOrWhiteSpace($Message)) {
    $Message = "chore: sync repo-translate"
  }

  git add .
  git commit -m $Message
  git push origin main

  Write-Host "Commit and push completed -> origin/main"
} finally {
  Pop-Location
}
