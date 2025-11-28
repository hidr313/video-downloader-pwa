const express = require('express');
const cors = require('cors');
const ytdlp = require('youtube-dl-exec');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
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

        // Get video info without downloading
        const info = await ytdlp(url, {
            dumpSingleJson: true,
            noWarnings: true,
            noCallHome: true,
            noCheckCertificate: true,
            preferFreeFormats: true,
        });

        res.json({
            title: info.title,
            duration: info.duration,
            thumbnail: info.thumbnail,
            formats: info.formats ? info.formats.map(f => ({
                format_id: f.format_id,
                ext: f.ext,
                quality: f.quality,
                filesize: f.filesize,
                resolution: f.resolution,
            })) : [],
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
            noWarnings: true,
            noCallHome: true,
            noCheckCertificate: true,
            addMetadata: true,
        });

        // Check if file exists
        if (!fs.existsSync(outputPath)) {
            throw new Error('Download failed - file not created');
        }

        // Get file stats
        const stats = fs.statSync(outputPath);

        // Send file
        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Content-Disposition', `attachment; filename="video_${quality}.mp4"`);
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
            audioQuality: 0, // Best quality
            noWarnings: true,
            noCallHome: true,
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

        // Send file
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Disposition', `attachment; filename="audio.mp3"`);
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
