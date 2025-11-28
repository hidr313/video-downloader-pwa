const https = require('https');

const data = JSON.stringify({
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
});

const options = {
    hostname: 'lessdowcgreater-production.up.railway.app',
    path: '/api/info',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

console.log('Testing deployed API...');

const req = https.request(options, (res) => {
    let responseData = '';

    res.on('data', (chunk) => {
        responseData += chunk;
    });

    res.on('end', () => {
        console.log('Status:', res.statusCode);
        try {
            const parsed = JSON.parse(responseData);
            if (parsed.qualities && parsed.qualities.length > 0) {
                console.log('✅ Success! Found qualities:', parsed.qualities.length);
                console.log('Sample quality:', parsed.qualities[0]);
            } else {
                console.log('❌ Response missing qualities array:', parsed);
            }
        } catch (e) {
            console.log('❌ Failed to parse response:', responseData);
        }
    });
});

req.on('error', (e) => {
    console.error('❌ Request failed:', e);
});

req.write(data);
req.end();
