const express = require('express');
const cors = require('cors');
const ytdlp = require('youtube-dl-exec');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    exposedHeaders: ['Content-Length', 'Content-Disposition']
}));
app.use(express.json());

// Create temp directory for downloads
const TEMP_DIR = path.join(__dirname, 'temp');
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR);
}

// Helper function to generate random filename
function generateFilename(ext = 'mp4') {
    return `download_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${ext}`;
}

// Helper function to clean up temp files
function cleanupFile(filepath) {
    setTimeout(() => {
        if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
            console.log('Cleaned up:', filepath);
        }
    }, 60000); // Delete after 1 minute
}

// API Routes

// Health check
app.get('/', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Video Downloader API is running',
        version: '3.0.0',
        powered_by: 'yt-dlp'
    });
});

// Get video info
app.post('/api/info', async (req, res) => {
    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        console.log('Fetching info for:', url);

        // Get video info without downloading
        const info = await ytdlp(url, {
            dumpSingleJson: true,
            noWarnings: true,
            noCheckCertificate: true,
            preferFreeFormats: true,
        });

        // Extract available qualities with file sizes
        const qualityMap = {};

        // Find best audio filesize to add to video-only formats (for accurate size estimation)
        let bestAudioSize = 0;
        let bestAudioSizeApprox = 0;
        if (info.formats) {
            const audioFormats = info.formats.filter(f => f.vcodec === 'none' && f.acodec !== 'none');
            if (audioFormats.length > 0) {
                // Sort by filesize desc to find best audio
                audioFormats.sort((a, b) => (b.filesize || 0) - (a.filesize || 0));
                bestAudioSize = audioFormats[0].filesize || 0;
                bestAudioSizeApprox = audioFormats[0].filesize_approx || 0;
            }
        }

        if (info.formats) {
            info.formats.forEach(format => {
                // Skip audio-only or video-only formats if they don't help us build a complete file
                // We want formats that have video. Audio can be merged.
                if (!format.height || format.vcodec === 'none') return;

                const height = format.height;
                const resolution = `${height}p`;

                // Check if this format has both video and audio
                const hasAudio = format.acodec && format.acodec !== 'none';
                const hasVideo = format.vcodec && format.vcodec !== 'none';

                // Calculate total size
                let totalSize = format.filesize || 0;
                let totalSizeApprox = format.filesize_approx || 0;

                // If video-only, add estimated audio size
                if (!hasAudio && hasVideo) {
                    if (totalSize > 0) totalSize += bestAudioSize;
                    if (totalSizeApprox > 0) totalSizeApprox += bestAudioSizeApprox;
                }

                // We want to find the best representative format for this resolution
                // Logic:
                // 1. If we don't have this resolution yet, add it.
                // 2. If we have it, but the new one has both audio+video and the old one didn't, take the new one.
                // 3. If both have (or don't have) audio, take the one with larger filesize (likely better quality).

                if (!qualityMap[resolution] ||
                    (hasAudio && hasVideo && !qualityMap[resolution].hasAudio) ||
                    (totalSize > (qualityMap[resolution].filesize || 0))) {

                    qualityMap[resolution] = {
                        resolution: resolution,
                        height: height,
                        filesize: totalSize || null,
                        filesizeApprox: totalSizeApprox || null,
                        format_id: format.format_id,
                        ext: format.ext || 'mp4',
                        hasAudio: hasAudio,
                        hasVideo: hasVideo,
                        fps: format.fps,
                        vcodec: format.vcodec,
                        acodec: format.acodec
                    };
                }
            });
        }

        // Convert to array and sort by resolution (highest first)
        const qualities = Object.values(qualityMap)
            .sort((a, b) => b.height - a.height)
            .map(q => ({
                resolution: q.resolution,
                filesize: q.filesize || q.filesizeApprox || null,
                filesizeMB: q.filesize ? Math.round(q.filesize / 1024 / 1024) :
                    q.filesizeApprox ? Math.round(q.filesizeApprox / 1024 / 1024) : null,
                format_id: q.format_id,
                ext: q.ext,
                fps: q.fps
            }));

        res.json({
            title: info.title || 'Unknown',
            duration: info.duration || null,
            thumbnail: info.thumbnail || null,
            uploader: info.uploader || null,
            view_count: info.view_count || null,
            qualities: qualities,
            platform: info.extractor || 'unknown'
        });

    } catch (error) {
        console.error('Error fetching video info:', error);
        res.status(500).json({
            error: 'Failed to fetch video information',
            message: error.message
        });
    }
});

// Download video
app.post('/api/download', async (req, res) => {
    try {
        const { url, quality = 'best' } = req.body;

        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        const filename = generateFilename('mp4');
        const outputPath = path.join(TEMP_DIR, filename);

        console.log(`Downloading ${url} to ${outputPath}`);

        // Prepare yt-dlp options
        let formatSelection = 'bestvideo+bestaudio/best';

        if (quality !== 'best') {
            // Format: bestvideo[height<=720]+bestaudio/best[height<=720]
            formatSelection = `bestvideo[height<=${quality}]+bestaudio/best[height<=${quality}]`;
        }

        // Download video
        await ytdlp(url, {
            output: outputPath,
            format: formatSelection,
            mergeOutputFormat: 'mp4',
            ffmpegLocation: '/usr/bin/ffmpeg',
            noWarnings: true,
            noCheckCertificate: true,
            addMetadata: true,
        });

        // Check if file exists
        if (!fs.existsSync(outputPath)) {
            throw new Error('Download failed - file not created');
        }

        // Get file stats
        const stats = fs.statSync(outputPath);

        // Send file with unique timestamp
        const timestamp = Date.now();
        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Content-Disposition', `attachment; filename="video_${quality}_${timestamp}.mp4"`);
        res.setHeader('Content-Length', stats.size);

        const fileStream = fs.createReadStream(outputPath);
        fileStream.pipe(res);

        // Cleanup after sending
        fileStream.on('end', () => {
            cleanupFile(outputPath);
        });

    } catch (error) {
        console.error('Error downloading video:', error);
        res.status(500).json({
            error: 'Failed to download video',
            message: error.message
        });
    }
});

// Download audio only
app.post('/api/audio', async (req, res) => {
    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        const filename = generateFilename('mp3');
        const outputPath = path.join(TEMP_DIR, filename);

        console.log(`Downloading audio from ${url} to ${outputPath}`);

        // Download audio only
        await ytdlp(url, {
            output: outputPath,
            extractAudio: true,
            audioFormat: 'mp3',
            audioQuality: 0,
            noWarnings: true,
            noCheckCertificate: true,
            addMetadata: true,
            embedThumbnail: true,
        });

        // Check if file exists
        if (!fs.existsSync(outputPath)) {
            // Sometimes yt-dlp appends the extension automatically
            if (fs.existsSync(outputPath + '.mp3')) {
                fs.renameSync(outputPath + '.mp3', outputPath);
            } else {
                throw new Error('Download failed - file not created');
            }
        }

        // Get file stats
        const stats = fs.statSync(outputPath);

        // Send file with unique timestamp
        const timestamp = Date.now();
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Disposition', `attachment; filename="audio_${timestamp}.mp3"`);
        res.setHeader('Content-Length', stats.size);

        const fileStream = fs.createReadStream(outputPath);
        fileStream.pipe(res);

        // Cleanup after sending
        fileStream.on('end', () => {
            cleanupFile(outputPath);
        });

    } catch (error) {
        console.error('Error downloading audio:', error);
        res.status(500).json({
            error: 'Failed to download audio',
            message: error.message
        });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({
        error: 'Internal server error',
        message: error.message
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📥 Video Downloader API ready`);
    console.log(`🐍 Powered by yt-dlp (Python)`);
});
