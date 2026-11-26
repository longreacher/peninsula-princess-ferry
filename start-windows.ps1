$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$port = 8080
$prefix = "http://localhost:$port/"
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)

$mime = @{
  '.html'='text/html; charset=utf-8'; '.js'='text/javascript; charset=utf-8'; '.mjs'='text/javascript; charset=utf-8';
  '.css'='text/css; charset=utf-8'; '.json'='application/json; charset=utf-8'; '.webmanifest'='application/manifest+json';
  '.svg'='image/svg+xml'; '.png'='image/png'; '.pdf'='application/pdf'; '.txt'='text/plain; charset=utf-8'
}

try {
  $listener.Start()
  Start-Process $prefix
  Write-Host "Peninsula Princess Ferry Timer is running at $prefix" -ForegroundColor Cyan
  Write-Host "Leave this window open. Press Ctrl+C to stop." -ForegroundColor DarkGray
  while ($listener.IsListening) {
    $context = $listener.GetContext()
    $relative = [Uri]::UnescapeDataString($context.Request.Url.AbsolutePath.TrimStart('/'))
    if ([string]::IsNullOrWhiteSpace($relative)) { $relative = 'index.html' }
    $candidate = [IO.Path]::GetFullPath((Join-Path $root $relative))
    if (-not $candidate.StartsWith([IO.Path]::GetFullPath($root))) { $context.Response.StatusCode = 403; $context.Response.Close(); continue }
    if (Test-Path $candidate -PathType Leaf) {
      $bytes = [IO.File]::ReadAllBytes($candidate)
      $extension = [IO.Path]::GetExtension($candidate).ToLowerInvariant()
      $context.Response.ContentType = $(if ($mime.ContainsKey($extension)) { $mime[$extension] } else { 'application/octet-stream' })
      $context.Response.ContentLength64 = $bytes.Length
      $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $context.Response.StatusCode = 404
    }
    $context.Response.OutputStream.Close()
  }
} catch {
  Write-Host "Could not start the local server: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "Alternative: install Python, open this folder in Command Prompt, and run: py -m http.server 8080"
  Read-Host "Press Enter to close"
} finally {
  if ($listener.IsListening) { $listener.Stop() }
  $listener.Close()
}
