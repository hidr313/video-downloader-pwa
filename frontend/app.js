// Configuration
const API_BASE_URL = 'https://lessdowcgreater-production.up.railway.app/api'; // Backend على Railway

// Elements
const urlInput = document.getElementById('videoUrl');
const qualitySelect = document.getElementById('quality');
const audioOnlyCheckbox = document.getElementById('audioOnly');
const downloadBtn = document.getElementById('downloadBtn');
const messageDiv = document.getElementById('message');
const pasteBtn = document.getElementById('pasteBtn');
const videoInfoCard = document.getElementById('videoInfo');
const qualitiesContainer = document.getElementById('qualitiesContainer');
const loadingState = document.getElementById('loadingState');
const errorMessage = document.getElementById('errorMessage');
const errorText = document.getElementById('errorText');
const successMessage = document.getElementById('successMessage');
const progressContainer = document.getElementById('progressContainer');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const successActions = document.getElementById('successActions');
const reloadBtn = document.getElementById('reloadBtn');

let currentVideoInfo = null;
let selectedQualityFormat = null;

// Helper: Check if URL is YouTube
function isYouTubeURL(url) {
    return url && (url.includes('youtube.com') || url.includes('youtu.be'));
}

// Helper: Format file size
function formatFileSize(bytes) {
    if (!bytes) return 'حجم غير معروف';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
    return Math.round(bytes / 1024 / 1024) + ' MB';
}

// Show message
function showMessage(text, type = 'info') {
    if (messageDiv) {
        messageDiv.textContent = text;
        messageDiv.className = `message ${type}`;
        messageDiv.style.display = 'block';
    }
}

// Hide message
function hideMessage() {
    if (messageDiv) messageDiv.style.display = 'none';
}

// UI Helper Functions
function setLoading(loading) {
    downloadBtn.disabled = loading;
    if (loading) {
        if (loadingState) loadingState.classList.remove('hidden');
    } else {
        if (loadingState) loadingState.classList.add('hidden');
    }
}

function showProgress(show) {
    if (show) {
        progressContainer.classList.remove('hidden');
        progressFill.style.width = '0%';
        progressText.textContent = '0%';
    } else {
        progressContainer.classList.add('hidden');
    }
}

function updateProgress(percent) {
    progressFill.style.width = `${percent}%`;
    progressText.textContent = `${Math.round(percent)}%`;
}

function showSuccessActions() {
    successActions.classList.remove('hidden');
    downloadBtn.parentElement.style.display = 'none';
}

function showError(message) {
    if (errorText) errorText.textContent = message;
    if (errorMessage) {
        errorMessage.classList.remove('hidden');
        setTimeout(() => {
            errorMessage.classList.add('hidden');
        }, 5000);
    } else {
        alert(message);
    }
}

function showSuccess() {
    if (successMessage) {
        successMessage.classList.remove('hidden');
        setTimeout(() => {
            successMessage.classList.add('hidden');
        }, 3000);
    } else {
        alert('تم التحميل بنجاح!');
    }
}

function hideMessages() {
    if (errorMessage) errorMessage.classList.add('hidden');
    if (successMessage) successMessage.classList.add('hidden');
}

// Reload button handler
if (reloadBtn) {
    reloadBtn.addEventListener('click', () => {
        window.location.reload(true);
    });
}

// Fetch video info
async function fetchVideoInfo(url) {
    try {
        setLoading(true);

        const response = await fetch(`${API_BASE_URL}/info`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'فشل جلب المعلومات');
        }

        currentVideoInfo = data;
        displayVideoInfo(data);

    } catch (error) {
        console.error('Error fetching info:', error);
        hideVideoInfo();
    } finally {
        setLoading(false);
    }
}

// Display video info
function displayVideoInfo(info) {
    const thumb = document.getElementById('videoThumbnail');
    if (thumb) thumb.src = info.thumbnail || '';

    const title = document.getElementById('videoTitle');
    if (title) title.textContent = info.title || 'فيديو بدون عنوان';

    const duration = document.getElementById('videoDuration');
    if (duration) {
        if (info.duration) {
            const minutes = Math.floor(info.duration / 60);
            const seconds = info.duration % 60;
            duration.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        } else {
            duration.textContent = '--:--';
        }
    }

    if (qualitiesContainer && info.qualities && info.qualities.length > 0) {
        qualitiesContainer.innerHTML = info.qualities.map(q => `
            <div class="quality-option" data-resolution="${q.resolution}" data-format="${q.format_id}">
                <div class="quality-badge">${q.resolution}</div>
                <div class="quality-size">${q.filesizeMB ? `~${q.filesizeMB} MB` : 'حجم غير معروف'}</div>
                <div class="quality-check">✓</div>
            </div>
        `).join('');

        document.querySelectorAll('.quality-option').forEach(option => {
            option.addEventListener('click', function () {
                document.querySelectorAll('.quality-option').forEach(o => o.classList.remove('selected'));
                this.classList.add('selected');
                selectedQualityFormat = this.dataset.resolution.replace('p', '');
            });
        });

        const firstOption = qualitiesContainer.querySelector('.quality-option');
        if (firstOption) {
            firstOption.click();
        }

        if (qualitySelect) qualitySelect.parentElement.style.display = 'none';
    } else {
        if (qualitiesContainer) qualitiesContainer.innerHTML = '<p style="text-align: center; color: #999;">لا توجد جودات متاحة</p>';
        if (qualitySelect) qualitySelect.parentElement.style.display = 'block';
    }

    if (videoInfoCard) videoInfoCard.style.display = 'block';
}

// Hide video info
function hideVideoInfo() {
    if (videoInfoCard) videoInfoCard.style.display = 'none';
    if (qualitySelect) qualitySelect.parentElement.style.display = 'block';
    currentVideoInfo = null;
    selectedQualityFormat = null;
}

// Handle URL input change
let debounceTimer;
urlInput.addEventListener('input', function () {
    const url = this.value.trim();

    clearTimeout(debounceTimer);

    if (isYouTubeURL(url)) {
        debounceTimer = setTimeout(() => {
            fetchVideoInfo(url);
        }, 500);
    } else if (url) {
        hideVideoInfo();
    } else {
        hideVideoInfo();
    }
});

// Handle paste button
if (pasteBtn) {
    pasteBtn.addEventListener('click', async function () {
        try {
            const text = await navigator.clipboard.readText();
            urlInput.value = text;
            urlInput.dispatchEvent(new Event('input'));
        } catch (error) {
            showError('❌ فشل اللصق من الحافظة');
        }
    });
}

// Download button handler
downloadBtn.addEventListener('click', async () => {
    const url = urlInput.value.trim();

    if (!url) {
        showError('الرجاء إدخال رابط الفيديو');
        return;
    }

    hideMessages();
    setLoading(true);

    const isYouTube = isYouTubeURL(url);

    if (isYouTube) {
        showProgress(true);
    } else {
        showMessage('جاري تحويلك لمدير التحميلات...', 'info');
    }

    try {
        const audioOnly = audioOnlyCheckbox.checked;

        let quality = 'best';
        if (selectedQualityFormat && !audioOnly) {
            quality = selectedQualityFormat;
        } else if (qualitySelect) {
            quality = qualitySelect.value;
        }

        if (audioOnly) {
            await downloadAudio(url, !isYouTube);
        } else {
            await downloadVideo(url, quality, !isYouTube);
        }

        if (isYouTube) {
            showSuccess();
            showSuccessActions();
        } else {
            setTimeout(() => {
                showSuccess();
                resetApp();
            }, 3000);
        }

    } catch (error) {
        showError(error.message || 'حدث خطأ أثناء التحميل');
        showProgress(false);
    } finally {
        setLoading(false);
    }
});

// Reset App State
async function resetApp() {
    urlInput.value = '';
    hideVideoInfo();
    hideMessages();
    showProgress(false);
    if (loadingState) loadingState.classList.add('hidden');

    if ('serviceWorker' in navigator && 'Notification' in window && Notification.permission === 'granted') {
        try {
            const registration = await navigator.serviceWorker.ready;
            registration.showNotification('محمّل الفيديوهات', {
                body: 'التطبيق جاهز للتحميل التالي!',
                icon: '/icons/icon-192.png',
                badge: '/icons/icon-192.png'
            });
        } catch (error) {
            console.log('Notification failed:', error);
        }
    }
}

// Download video function
async function downloadVideo(url, quality, useNative = false) {
    const endpoint = `${API_BASE_URL}/download`;

    if (useNative) {
        await triggerNativeDownload(endpoint, { url, quality });
        return;
    }

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, quality }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'فشل التحميل');
    }

    const contentLength = +response.headers.get('Content-Length');
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = 'video.mp4';
    if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match) filename = match[1];
    }

    const reader = response.body.getReader();
    let receivedLength = 0;
    const chunks = [];

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        receivedLength += value.length;
        if (contentLength) updateProgress((receivedLength / contentLength) * 100);
    }

    const blob = new Blob(chunks);
    downloadBlob(blob, filename);
    updateProgress(100);
}

// Download audio function
async function downloadAudio(url, useNative = false) {
    const endpoint = `${API_BASE_URL}/audio`;

    if (useNative) {
        await triggerNativeDownload(endpoint, { url });
        return;
    }

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
    });

    if (!response.ok) {
        try {
            const registration = await navigator.serviceWorker.ready;
            registration.showNotification('جاري التحميل...', {
                body: 'يتم الآن تحميل الملف في الخلفية',
                icon: '/icons/icon-192.png',
                badge: '/icons/icon-192.png',
                tag: 'download-progress'
            });
        } catch (error) {
            console.log('Notification failed:', error);
        }
    }

    if (endpoint.includes('audio')) {
        return downloadAudio(data.url, false);
    } else {
        return downloadVideo(data.url, data.quality, false);
    }
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

// Check for shared URL
window.addEventListener('DOMContentLoaded', async () => {
    if ('serviceWorker' in navigator) {
        try {
            await navigator.serviceWorker.register('service-worker.js');
        } catch (error) {
            console.error('Service Worker registration failed:', error);
        }
    }

    if ('Notification' in window && Notification.permission !== 'granted') {
        Notification.requestPermission();
    }

    const urlParams = new URLSearchParams(window.location.search);
    let sharedUrl = urlParams.get('url') || urlParams.get('text') || urlParams.get('title') || '';

    if (sharedUrl && !sharedUrl.startsWith('http')) {
        const urlMatch = sharedUrl.match(/(https?:\/\/[^\s]+)/);
        if (urlMatch) {
            sharedUrl = urlMatch[1];
        }
    }

    if (sharedUrl) {
        urlInput.value = sharedUrl;
        urlInput.dispatchEvent(new Event('input'));

        window.history.replaceState({}, document.title, window.location.pathname);

        if (!isYouTubeURL(sharedUrl)) {
            console.log('Auto-downloading non-YouTube URL...');
            showMessage('جاري بدء التحميل التلقائي...', 'info');
            setTimeout(() => {
                downloadBtn.click();
            }, 1000);
        }
    }
});

// Disable quality select when audio-only is checked
audioOnlyCheckbox.addEventListener('change', (e) => {
    if (qualitySelect) qualitySelect.disabled = e.target.checked;
    if (qualitiesContainer) {
        qualitiesContainer.style.opacity = e.target.checked ? '0.5' : '1';
        qualitiesContainer.style.pointerEvents = e.target.checked ? 'none' : 'auto';
    }
});
