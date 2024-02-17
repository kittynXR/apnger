param (
    [string]$name,
    [string]$fps = "16",  # Output frame rate
    [int]$originalFps = 60, # Original frame rate of the video
    [int]$seqnum = 57600,
    [int]$seqlen = 8,
    [int]$colors = 256,
    [int]$sizew = 160,
    [int]$sizeh = 160,
    [int]$targetSizeKB = 512,
    [switch]$gif,  # Optional parameter for GIF conversion
    [switch]$tgif  # Optional parameter for Twitch-optimized GIF conversion
)

function ShowHelp {
    Write-Host "Usage: .\scriptname.ps1 -name <name> [-fps <fps>] [-originalFps <originalFps>] [-seqnum <seqnum>] [-seqlen <seqlen>] [-colors <colors>] [-sizew <sizew>] [-sizeh <sizeh>] [-targetSizeKB <targetSizeKB>]"
    Write-Host "`nParameters:"
    Write-Host "  -name           Name of the input file series (required)"
    Write-Host "  -fps            Output frame rate (default 16)"
    Write-Host "  -originalFps    Original frame rate of the video (default 60)"
    Write-Host "  -seqnum         Starting sequence number for files (default 57600)"
    Write-Host "  -seqlen         Length of the sequence number (default 8)"
    Write-Host "  -colors         Number of colors in the palette (default 256)"
    Write-Host "  -sizew          Width of the output image (default 160)"
    Write-Host "  -sizeh          Height of the output image (default 160)"
    Write-Host "  -targetSizeKB   Target file size in KB (default 512)"
    Write-Host "  -gif            Output an animated gif alongside your png"
    
    Write-Host "`nExample: .\scriptname.ps1 -name 'cookie' -fps 24 -originalFps 60 -seqnum 1000 -seqlen 4 -colors 128 -sizew 120 -sizeh 120 -targetSizeKB 400"
    exit
}

# Check if the script is run without required parameters or with a help command
if (-not $name -or $args[0] -eq "help") {
    ShowHelp
}

# Regex pattern to match the file naming convention
$regexPattern = "^${name}\d{${seqlen}}\.png$"

# Check if the files matching the provided name exist
if (-not (Get-ChildItem -Filter "${name}*.png" | Where-Object { $_.Name -match $regexPattern })) {
    Write-Host "BRUH: Probably a typo..."
    Write-Host "Check file name and sequence pattern - try again!"
    exit
}




function GenerateImage {
    param (
        [int]$width,
        [int]$height,
        [int]$compressionLevel
    )

    $speedupFactor = $originalFps / $fps

    # Speed up the video and then set the frame rate to the desired fps
    ffmpeg -y -thread_queue_size 512 -start_number $seqnum -i "${name}%0${seqlen}d.png" -vf "scale=${width}:${height},setpts=(1/${speedupFactor})*PTS,fps=$fps,palettegen=max_colors=$colors" palette.png
    ffmpeg -y -thread_queue_size 512 -start_number $seqnum -i "${name}%0${seqlen}d.png" -i palette.png -filter_complex "[0:v]scale=${width}:${height},setpts=(1/${speedupFactor})*PTS,fps=$fps[vtemp];[vtemp][1:v]paletteuse" -compression_level $compressionLevel -plays 0 "${name}.apng"

    $newFileName = "${name}.png"
    if (Test-Path $newFileName) {
        Remove-Item $newFileName
    }

    Rename-Item -Path "${name}.apng" -NewName $newFileName
}


# Initial compression level
$compressionLevel = 9

# Main loop
do {
    # Generate image with current dimensions and compression
    GenerateImage -width $sizew -height $sizeh -compressionLevel $compressionLevel

    # Check the file size
    $fileSizeKB = (Get-Item "${name}.png").length / 1KB

    if ($fileSizeKB -gt $targetSizeKB) {
        # Reduce dimensions by 5% and increase compression if needed
        $sizew = [math]::Round($sizew * 0.95)
        $sizeh = [math]::Round($sizeh * 0.95)
        $compressionLevel++
    }
} while ($fileSizeKB -gt $targetSizeKB)

# Final image is now within the target size

# Check if GIF conversion is requested
if ($gif) {
    Write-Host "Converting APNG to GIF..."
    ffmpeg -i "${name}.png" -vf "fps=$fps,scale=${sizew}:${sizeh}:flags=lanczos,palettegen" -y palette.png
    ffmpeg -i "${name}.png" -i palette.png -lavfi "fps=$fps,scale=${sizew}:${sizeh}:flags=lanczos[x];[x][1:v]paletteuse" -y "${name}.gif"
    Write-Host "GIF conversion completed: ${name}.gif"
}

# Check if Twitch-optimized GIF conversion is requested
if ($tgif) {
    Write-Host "Converting APNG to Twitch-optimized GIF..."

    # Calculate the total number of frames in the source
    $totalFrames = Get-ChildItem -Filter "${name}*png" | Measure-Object | Select-Object -ExpandProperty Count

    # Calculate the total duration of the original video in seconds
    $totalDurationSeconds = $totalFrames / $originalFps

    # Now, for the GIF, we want exactly 60 frames to span this total duration
    # This means we need to calculate the playback rate (fps) for these 60 frames
    # to maintain the original duration as closely as possible
    $gifFps = 60 / $totalDurationSeconds

    # Step 1: Generate a palette that includes transparency
    ffmpeg -i "${name}.png" -vf "fps=1/($totalDurationSeconds/60),scale=${sizew}:${sizeh}:flags=lanczos,palettegen=stats_mode=diff" -y palette.png

    # Step 2: Use the generated palette to create the GIF, targeting exactly 60 frames
    ffmpeg -i "${name}.png" -i palette.png -lavfi "fps=1/($totalDurationSeconds/60),scale=${sizew}:${sizeh}:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle" -frames:v 60 -y "${name}_twitch.gif"



    Write-Host "Twitch-optimized GIF conversion completed: ${name}_twitch.gif"

    # Check the number of frames in the output GIF
    $frameCount = & ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=nb_read_frames -of default=nokey=1:noprint_wrappers=1 "${name}_twitch.gif"
    Write-Host "The GIF contains $frameCount frames."
}
