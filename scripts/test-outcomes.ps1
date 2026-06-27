Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
Start-Sleep 1
Start-Process -FilePath "cmd.exe" -ArgumentList "/c","cd /d E:\dev\reddit-confession-factory && pnpm --filter @rcf/dashboard start > E:\dev\reddit-confession-factory\.dash-prod.log 2>&1" -WindowStyle Hidden
Start-Sleep 7
Write-Host "--- outcomes ---"
try {
    $resp = Invoke-WebRequest -Uri "http://127.0.0.1:3001/outcomes" -UseBasicParsing -TimeoutSec 10
    Write-Host "HTTP $($resp.StatusCode)"
    if ($resp.StatusCode -ne 200) {
        Write-Host $resp.Content.Substring(0, [Math]::Min(800, $resp.Content.Length))
    }
} catch {
    Write-Host "REQUEST FAILED: $($_.Exception.Message)"
}
Write-Host "--- log ---"
Get-Content "E:\dev\reddit-confession-factory\.dash-prod.log" -Tail 30
