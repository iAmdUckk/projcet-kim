# Simple HTTP Server for Wizard's Rhythm Tower
# Run this, then open http://localhost:8080 in your browser

$port = 8080
$rootPath = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $rootPath) { $rootPath = $PSScriptRoot }
if (-not $rootPath) { $rootPath = (Get-Location).Path }

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Wizard s Rhythm Tower  Local Server" -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Server running!  Open browser at:" -ForegroundColor Green
Write-Host "  http://localhost:$port" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Press Ctrl+C to stop." -ForegroundColor Gray
Write-Host ""

Start-Process "http://localhost:$port"

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css"
    ".js"   = "application/javascript"
    ".mp3"  = "audio/mpeg"
    ".wav"  = "audio/wav"
    ".ogg"  = "audio/ogg"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".ico"  = "image/x-icon"
    ".json" = "application/json"
}

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        $response.Headers.Add("Access-Control-Allow-Origin", "*")

        $localPath = $request.Url.LocalPath
        if ($localPath -eq "/" -or $localPath -eq "") { $localPath = "/index.html" }

        $filePath = Join-Path $rootPath ($localPath.TrimStart("/").Replace("/", "\"))

        if (Test-Path $filePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $mime = $mimeTypes[$ext]
            if (-not $mime) { $mime = "application/octet-stream" }
            $response.ContentType = $mime
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
            Write-Host "  200  $localPath" -ForegroundColor Green
        } else {
            $response.StatusCode = 404
            $msg = [Text.Encoding]::UTF8.GetBytes("404 Not Found")
            $response.ContentLength64 = $msg.Length
            $response.OutputStream.Write($msg, 0, $msg.Length)
            Write-Host "  404  $localPath" -ForegroundColor Red
        }
        $response.OutputStream.Close()
    } catch {}
}
