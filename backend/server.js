const express = require('express');
const cors = require('cors');
const https = require('https');
const http = require('http');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Cobalt API endpoint
const COBALT_API = 'https://api.cobalt.tools/api/json';

// Helper function to make API request to Cobalt
function cobaltRequest(url, quality = 'max') {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({
            url: url,
            vQuality: quality,
            filenamePattern: 'basic',
            isAudioOnly: false,
            isNoTTWatermark: true,
            isTTFullAudio: false,
            disableMetadata: false
        });

        const options = {
            hostname: 'api.cobalt.tools',
            path: '/api/json',
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Content-Length': data.length,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Origin': 'https://cobalt.tools',
                'Referer': 'https://cobalt.tools/'
            }
        };

        const req = https.request(options, (res) => {
            let responseData = '';

            res.on('data', (chunk) => {
                responseData += chunk;
            });

            res.on('end', () => {
                try {
                    const parsed = JSON.parse(responseData);
                    resolve(parsed);
                } catch (error) {
                    console.error('Cobalt API Raw Response:', responseData);
                    reject(new Error('Invalid response from Cobalt API'));
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.write(data);
        req.end();
    });
}

// Helper function for audio-only request
function cobaltAudioRequest(url) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({
            url: url,
            isAudioOnly: true,
            filenamePattern: 'basic',
            isNoTTWatermark: true,
            isTTFullAudio: true,
            disableMetadata: false
        });

        const options = {
            hostname: 'api.cobalt.tools',
            path: '/api/json',
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Content-Length': data.length,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Origin': 'https://cobalt.tools',
                'Referer': 'https://cobalt.tools/'
            }
        };

        const req = https.request(options, (res) => {
            let responseData = '';

            res.on('data', (chunk) => {
                responseData += chunk;
            });

            res.on('end', () => {
                try {
                    const parsed = JSON.parse(responseData);
                    resolve(parsed);
                } catch (error) {
                    console.error('Cobalt API Raw Response:', responseData);
                    reject(new Error('Invalid response from Cobalt API'));
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.write(data);
        req.end();
    });
}

// API Routes

// Health check
app.get('/', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Video Downloader API is running',
        version: '2.0.0',
        powered_by: 'Cobalt API'
    });
});

// Get video info
app.post('/api/info', async (req, res) => {
    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        // Cobalt doesn't provide info endpoint, so we just validate the URL
        res.json({
            url: url,
            supported: true,
            message: 'URL is ready for download'
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
        const { url, quality = 'max' } = req.body;

        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        console.log('Requesting download from Cobalt:', url, 'quality:', quality);

        // Map our quality to Cobalt's format
        let cobaltQuality = quality;
        if (quality === 'best') cobaltQuality = 'max';
        else if (quality === '2160') cobaltQuality = '2160';
        else if (quality === '1080') cobaltQuality = '1080';
        else if (quality === '720') cobaltQuality = '720';
        else if (quality === '480') cobaltQuality = '480';
        else if (quality === '360') cobaltQuality = '360';
        else cobaltQuality = 'max';

        const result = await cobaltRequest(url, cobaltQuality);

        console.log('Cobalt response:', result);

        if (result.status === 'error' || result.status === 'rate-limit') {
            return res.status(400).json({
                error: result.text || 'Download failed',
                message: result.text
            });
        }

        // Return the download URL from Cobalt
        res.json({
            status: 'success',
            url: result.url,
            filename: result.filename || 'video.mp4'
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

        console.log('Requesting audio from Cobalt:', url);

        const result = await cobaltAudioRequest(url);

        console.log('Cobalt audio response:', result);

        if (result.status === 'error' || result.status === 'rate-limit') {
            return res.status(400).json({
                error: result.text || 'Audio download failed',
                message: result.text
            });
        }

        // Return the download URL from Cobalt
        res.json({
            status: 'success',
            url: result.url,
            filename: result.filename || 'audio.mp3'
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
    console.log(`⚡ Powered by Cobalt API - No Python required!`);
});
