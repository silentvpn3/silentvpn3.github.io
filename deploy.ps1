# Deploy Silent VPN landing to GitHub Pages (silentvpn3.github.io)
# Usage:
#   $env:GITHUB_TOKEN = "<PAT with Contents + Pages write on silentvpn3.github.io>"
#   .\deploy.ps1

$ErrorActionPreference = "Stop"
$RepoDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $RepoDir

if (-not $env:GITHUB_TOKEN) {
    Write-Error "Set GITHUB_TOKEN environment variable (fine-grained PAT: Contents + Pages on silentvpn3.github.io)."
}

& "$RepoDir\sync-releases.ps1"

$remote = "https://silentvpn3:$($env:GITHUB_TOKEN)@github.com/silentvpn3/silentvpn3.github.io.git"
git remote set-url origin $remote
git push -u origin main
git remote set-url origin "https://github.com/silentvpn3/silentvpn3.github.io.git"

$headers = @{
    Authorization = "Bearer $($env:GITHUB_TOKEN)"
    "X-GitHub-Api-Version" = "2022-11-28"
    Accept = "application/vnd.github+json"
}
$body = '{"source":{"branch":"main","path":"/"}}'
try {
    Invoke-RestMethod -Method Post -Uri "https://api.github.com/repos/silentvpn3/silentvpn3.github.io/pages" -Headers $headers -ContentType "application/json" -Body $body | Out-Null
    Write-Host "GitHub Pages enabled: https://silentvpn3.github.io"
} catch {
    Write-Host "Pages API: $($_.Exception.Message) (enable manually: Settings -> Pages -> main / root)"
}

Write-Host "Done."
