# Sync releases.json + INLINE_FALLBACK in index.html from production API
$ErrorActionPreference = "Stop"
$ApiBase = "https://132-243-234-162.nip.io"
$RepoDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $RepoDir

function Get-Release($platform) {
    $url = "$ApiBase/api/updates/check?platform=$platform&version=0.0.0"
    $data = Invoke-RestMethod -Uri $url
    if (-not $data.available) { throw "No release for $platform" }
    return @{
        version = $data.version
        size = [int]$data.size
        filename = $data.filename
        uploaded_at = $data.uploaded_at
    }
}

$pc = Get-Release "pc"
$android = Get-Release "android"
$updatedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")

$releases = @{
    updated_at = $updatedAt
    api_base = $ApiBase
    pc = @{ version = $pc.version; size = $pc.size; filename = $pc.filename }
    android = @{ version = $android.version; size = $android.size; filename = $android.filename }
}
($releases | ConvertTo-Json -Depth 4) + "`n" | Out-File -FilePath "releases.json" -Encoding utf8

$inline = @"
    const INLINE_FALLBACK = {
      pc: {
        version: "$($pc.version)",
        size: $($pc.size),
        filename: "$($pc.filename)",
      },
      android: {
        version: "$($android.version)",
        size: $($android.size),
        filename: "$($android.filename)",
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

$pcUrl = [uri]::EscapeUriString("$ApiBase/update/pc/$($pc.filename)")
$androidUrl = [uri]::EscapeUriString("$ApiBase/update/android/$($android.filename)")

$html = [regex]::Replace($html, 'id="pcDownload" href="[^"]*"', "id=`"pcDownload`" href=`"$pcUrl`"")
$html = [regex]::Replace($html, 'id="androidDownload" href="[^"]*"', "id=`"androidDownload`" href=`"$androidUrl`"")
$html = [regex]::Replace($html, 'id="pcVersion" data-version="[^"]*">v[^<]*</span>', "id=`"pcVersion`" data-version=`"$($pc.version)`">v$($pc.version)</span>")
$html = [regex]::Replace($html, 'id="androidVersion" data-version="[^"]*">v[^<]*</span>', "id=`"androidVersion`" data-version=`"$($android.version)`">v$($android.version)</span>")
$html = [regex]::Replace($html, 'id="pcMeta">[^<]*</p>', "id=`"pcMeta`">$(Format-Size $pc.size)</p>")
$html = [regex]::Replace($html, 'id="androidMeta">[^<]*</p>', "id=`"androidMeta`">$(Format-Size $android.size)</p>")

$buildTag = "<!-- site-build: $(Get-Date -Format 'yyyyMMdd-HHmm') -->"
$html = [regex]::Replace($html, '<!-- site-build: \d+-[\d]+ -->', $buildTag)
Set-Content -Path "index.html" -Value $html -Encoding utf8

Write-Host "Synced: PC v$($pc.version), Android v$($android.version)"
