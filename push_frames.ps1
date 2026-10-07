$files = Get-ChildItem -Path "portfolio_frames_30fps\frame_*.jpg" | Sort-Object Name
$batchSize = 50
for ($i = 0; $i -lt $files.Count; $i += $batchSize) {
    $endIdx = [Math]::Min($i + $batchSize - 1, $files.Count - 1)
    $batch = $files[$i..$endIdx]
    $start = $i + 1
    $end = $endIdx + 1
    Write-Host "Processing batch: frames $start to $end"
    foreach ($f in $batch) {
        git add $f.FullName
    }
    $msg = "feat: add portfolio sequence frames $start to $end"
    git commit -m $msg
    git push origin main
}
Write-Host "All frames pushed successfully!"
