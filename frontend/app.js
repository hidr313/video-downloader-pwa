// Configuration
const API_BASE_URL = 'https://lessdowcgreater-production.up.railway.app/api'; // Backend على Railway

// Elements
const urlInput = document.getElementById('videoUrl');
const pasteBtn = document.getElementById('pasteBtn');
const qualitySelect = document.getElementById('quality');
const audioOnlyCheckbox = document.getElementById('audioOnly');
const downloadBtn = document.getElementById('downloadBtn');
const loadingState = document.getElementById('loadingState');
const errorMessage = document.getElementById('errorMessage');
const errorText = document.getElementById('errorText');
const successMessage = document.getElementById('successMessage');

// Check if shared URL exists (from share target)
window.addEventListener('DOMContentLoaded', async () => {
    // Register service worker
    if ('serviceWorker' in navigator) {
        try {
            await navigator.serviceWorker.register('service-worker.js');
            console.log('Service Worker registered successfully');
        } catch (error) {
            console.error('Service Worker registration failed:', error);
        }
    }

    // Check for shared URL
    const urlParams = new URLSearchParams(window.location.search);
    const sharedUrl = urlParams.get('url');

    if (sharedUrl) {
        urlInput.value = sharedUrl;
        // Clear URL parameter
        window.history.replaceState({}, document.title, window.location.pathname);
    }
});

// Paste button handler
pasteBtn.addEventListener('click', async () => {
    try {
        const text = await navigator.clipboard.readText();
        urlInput.value = text;
        hideMessages();
    } catch (error) {
        showError('لا يمكن الوصول للحافظة');
    }
});

// Download button handler
downloadBtn.addEventListener('click', async () => {
    const url = urlInput.value.trim();

    if (!url) {
        showError('الرجاء إدخال رابط الفيديو');
        return;
    }

    if (!isValidUrl(url)) {
        showError('الرابط غير صالح');
        return;
    }

    hideMessages();
    setLoading(true);

    try {
        const quality = qualitySelect.value;
        const audioOnly = audioOnlyCheckbox.checked;

        if (audioOnly) {
            await downloadAudio(url);
        } else {
            await downloadVideo(url, quality);
        }

        showSuccess();
    } catch (error) {
        showError(error.message || 'حدث خطأ أثناء التحميل');
    } finally {
        setLoading(false);
    }
});

// Download video function
async function downloadVideo(url, quality) {
    const endpoint = `${API_BASE_URL}/download`;

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url, quality }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'فشل التحميل');
    }

    // Get filename from Content-Disposition header
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = 'video.mp4';

    if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
            filename = filenameMatch[1].replace(/['"]/g, '');
        }
    }

    // Download file
    const blob = await response.blob();
    downloadBlob(blob, filename);
}

// Download audio function
async function downloadAudio(url) {
    const endpoint = `${API_BASE_URL}/audio`;

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'فشل تحميل الصوت');
    }

    // Get filename
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = 'audio.mp3';

    if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
            filename = filenameMatch[1].replace(/['"]/g, '');
        }
    }

    // Download file
    const blob = await response.blob();
    downloadBlob(blob, filename);
}

// Helper function to download blob
function downloadBlob(blob, filename) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

// Validate URL
function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

// UI Helper Functions
function setLoading(loading) {
    downloadBtn.disabled = loading;
    if (loading) {
        loadingState.classList.remove('hidden');
    } else {
        loadingState.classList.add('hidden');
    }
}

function showError(message) {
    errorText.textContent = message;
    errorMessage.classList.remove('hidden');
    setTimeout(() => {
        errorMessage.classList.add('hidden');
    }, 5000);
}

function showSuccess() {
    successMessage.classList.remove('hidden');
    setTimeout(() => {
        successMessage.classList.add('hidden');
    }, 3000);
}

function hideMessages() {
    errorMessage.classList.add('hidden');
    successMessage.classList.add('hidden');
}

// Disable quality select when audio-only is checked
audioOnlyCheckbox.addEventListener('change', (e) => {
    qualitySelect.disabled = e.target.checked;
});
