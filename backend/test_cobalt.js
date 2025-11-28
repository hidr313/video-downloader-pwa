const https = require('https');

const data = JSON.stringify({
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    vQuality: '720',
    filenamePattern: 'basic',
    isAudioOnly: false,
    isNoTTWatermark: true,
    isTTFullAudio: false,
    disableMetadata: false
});

const options = {
    hostname: 'co.wuk.sh',
    path: '/api/json',
    method: 'POST',
    headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Origin': 'https://wuk.sh',
        'Referer': 'https://wuk.sh/'
    }
};

console.log('Sending request to Cobalt API...');

const req = https.request(options, (res) => {
    let responseData = '';

    res.on('data', (chunk) => {
        responseData += chunk;
    });

    res.on('end', () => {
        console.log('Status Code:', res.statusCode);
        console.log('Headers:', res.headers);
        console.log('Raw Response:', responseData);
        try {
            const parsed = JSON.parse(responseData);
            console.log('Parsed JSON:', parsed);
        } catch (error) {
            console.error('Failed to parse JSON');
        }
    });
});

req.on('error', (error) => {
    console.error('Error:', error);
});

req.write(data);
req.end();
