# Sync releases.json + INLINE_FALLBACK in index.html from production API
# Download URLs → GitHub Releases (работает без VPS)
$ErrorActionPreference = "Stop"
$ApiBase = "https://132-243-234-162.nip.io"
$GithubRepo = "silentvpn3/silentvpn3.github.io"
$RepoDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $RepoDir

function Get-GithubDownloadUrl($version, $filename) {
    $tag = if ($version -match '^v') { $version } else { "v$version" }
    $encoded = [uri]::EscapeDataString($filename)
    return "https://github.com/$GithubRepo/releases/download/$tag/$encoded"
}

function Resolve-GithubDownloadUrl($data) {
    foreach ($key in @('github_download_url', 'download_url')) {
        $url = [string]$data.$key
        if ($url -match '^https://github\.com/.+/releases/download/') {
            return $url
        }
    }
    return Get-GithubDownloadUrl $data.version $data.filename
}

function Get-FilenameFromGithubUrl($url) {
    if ($url -match '/releases/download/[^/]+/(.+?)(?:\?|$)') {
        return [uri]::UnescapeDataString($matches[1])
    }
    return $null
}

function Get-Release($platform) {
    $url = "$ApiBase/api/updates/check?platform=$platform&version=0.0.0"
    $data = Invoke-RestMethod -Uri $url
    if (-not $data.available) { throw "No release for $platform" }
    $downloadUrl = Resolve-GithubDownloadUrl $data
    $filename = Get-FilenameFromGithubUrl $downloadUrl
    if (-not $filename) { $filename = $data.filename }
    return @{
        version = $data.version
        size = [int]$data.size
        filename = $filename
        uploaded_at = $data.uploaded_at
        download_url = $downloadUrl
    }
}

$pc = Get-Release "pc"
$android = Get-Release "android"
$updatedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")

$releases = @{
    updated_at = $updatedAt
    api_base = $ApiBase
    github_repo = $GithubRepo
    pc = @{
        version = $pc.version
        size = $pc.size
        filename = $pc.filename
        download_url = $pc.download_url
    }
    android = @{
        version = $android.version
        size = $android.size
        filename = $android.filename
        download_url = $android.download_url
    }
}
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText(
    (Join-Path $RepoDir "releases.json"),
    (($releases | ConvertTo-Json -Depth 5) + "`n"),
    $utf8NoBom
)

$inline = @"
    const INLINE_FALLBACK = {
      pc: {
        version: "$($pc.version)",
        size: $($pc.size),
        filename: "$($pc.filename)",
        download_url: "$($pc.download_url)",
      },
      android: {
        version: "$($android.version)",
        size: $($android.size),
        filename: "$($android.filename)",
        download_url: "$($android.download_url)",
      },
    };
"@

$html = Get-Content "index.html" -Raw -Encoding UTF8
$html = [regex]::Replace(
    $html,
    '(?s)const INLINE_FALLBACK = \{.*?\};',
    $inline.TrimEnd()
)

function Format-Size([int]$bytes) {
    $mb = $bytes / 1MB
    if ($mb -ge 1) { return "{0:N1} MB" -f $mb }
    return "{0} KB" -f [math]::Round($bytes / 1KB)
}

$html = [regex]::Replace($html, 'id="pcDownload" href="[^"]*"', "id=`"pcDownload`" href=`"$($pc.download_url)`"")
$html = [regex]::Replace($html, 'id="androidDownload" href="[^"]*"', "id=`"androidDownload`" href=`"$($android.download_url)`"")
$html = [regex]::Replace($html, 'id="pcVersion" data-version="[^"]*">v[^<]*</span>', "id=`"pcVersion`" data-version=`"$($pc.version)`">v$($pc.version)</span>")
$html = [regex]::Replace($html, 'id="androidVersion" data-version="[^"]*">v[^<]*</span>', "id=`"androidVersion`" data-version=`"$($android.version)`">v$($android.version)</span>")
$html = [regex]::Replace($html, 'id="pcMeta">[^<]* ', "id=`"pcMeta`">$(Format-Size $pc.size) ")
$html = [regex]::Replace($html, 'id="androidMeta">[^<]* ', "id=`"androidMeta`">$(Format-Size $android.size) ")

[System.IO.File]::WriteAllText((Join-Path $RepoDir "index.html"), $html, $utf8NoBom)

Write-Host "Synced: PC v$($pc.version), Android v$($android.version) (GitHub Releases URLs)"
