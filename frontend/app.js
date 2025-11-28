// Configuration
const API_BASE_URL = 'https://lessdowcgreater-production.up.railway.app/api'; // Backend على Railway

// Elements
const urlInput = document.getElementById('videoUrl');
const qualitySelect = document.getElementById('quality');
const audioOnlyCheckbox = document.getElementById('audioOnly');
const downloadBtn = document.getElementById('downloadBtn');
const messageDiv = document.getElementById('message');
const pasteBtn = document.getElementById('pasteBtn');
a.href = url;
a.download = filename;
document.body.appendChild(a);
a.click();
window.URL.revokeObjectURL(url);
document.body.removeChild(a);
}

// Check for shared URL
window.addEventListener('DOMContentLoaded', async () => {
    // Register service worker
    if ('serviceWorker' in navigator) {
        try {
            await navigator.serviceWorker.register('service-worker.js');
        } catch (error) {
            console.error('Service Worker registration failed:', error);
        }
    }

    const urlParams = new URLSearchParams(window.location.search);
    const sharedUrl = urlParams.get('url');
    if (sharedUrl) {
        urlInput.value = sharedUrl;
        urlInput.dispatchEvent(new Event('input'));
        // Clear URL parameter
        window.history.replaceState({}, document.title, window.location.pathname);
    }
});

// Disable quality select when audio-only is checked
audioOnlyCheckbox.addEventListener('change', (e) => {
    if (qualitySelect) qualitySelect.disabled = e.target.checked;
    // Also disable quality cards opacity
    if (qualitiesContainer) {
        qualitiesContainer.style.opacity = e.target.checked ? '0.5' : '1';
        qualitiesContainer.style.pointerEvents = e.target.checked ? 'none' : 'auto';
    }
});
