document.addEventListener('DOMContentLoaded', () => {
    const backBtn = document.getElementById('backBtn');
    const changeFolderBtn = document.getElementById('changeFolderBtn');
    const openFolderBtn = document.getElementById('openFolderBtn');
    const defaultVideoType = document.getElementById('defaultVideoType');
    const formatToggle = document.getElementById('formatToggle');
    const minBtn = document.getElementById('min-btn');
    const maxBtn = document.getElementById('max-btn');
    const closeBtn = document.getElementById('close-btn');
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    const pageDots = document.querySelectorAll('.page-dot');
    const animatedDot = document.querySelector('.animated-dot');
    const settingsContainer = document.querySelector('.settings-container');

    // Load saved settings
    loadSettings();

    // Function to trigger animation and navigate
    function navigateWithAnimation(targetUrl) {
        if (settingsContainer) {
            settingsContainer.classList.add('pop');
            // Use setTimeout instead of animationend for potentially more reliable navigation after animation
            setTimeout(() => {
                window.location.href = targetUrl;
            }, 0); // Reverted delay back to 400ms

            // Remove the pop class after the animation duration to allow it to be triggered again
            setTimeout(() => {
                settingsContainer.classList.remove('pop');
            }, 400); // Remove class after animation completes (match animation duration)

        } else {
            // Fallback if container not found
            window.location.href = targetUrl;
        }
    }

    // Back button handler
    backBtn.addEventListener('click', () => {
        navigateWithAnimation('index.html');
    });

    // Window control handlers
    minBtn.addEventListener('click', () => {
        window.electronAPI.minimize();
    });

    maxBtn.addEventListener('click', () => {
        window.electronAPI.maximize();
    });

    closeBtn.addEventListener('click', () => {
        window.electronAPI.close();
    });

    // Change folder button handler
    changeFolderBtn?.addEventListener('click', async () => {
        try {
            const result = await window.electronAPI.selectDownloadFolder();
            if (result.success) {
                await window.electronAPI.saveSettings({
                    downloadFolder: result.folderPath
                });
                showToast('Download folder updated successfully');
            }
        } catch (error) {
            console.error('Error changing download folder:', error);
            showToast('Failed to change download folder', true);
        }
    });

    // Open folder button handler
    openFolderBtn?.addEventListener('click', async () => {
        try {
            await window.electronAPI.openFolder();
        } catch (error) {
            console.error('Error opening folder:', error);
            showToast('Failed to open folder', true);
        }
    });

    // Default video type handler
    defaultVideoType?.addEventListener('change', async (e) => {
        try {
            await window.electronAPI.saveSettings({
                defaultVideoType: e.target.checked ? 'audio' : 'music'
            });
            showToast('Video type preference saved');
        } catch (error) {
            console.error('Error saving video type setting:', error);
            showToast('Failed to save video type preference', true);
            e.target.checked = !e.target.checked; // Revert the toggle
        }
    });

    // Format toggle handler
    formatToggle?.addEventListener('change', async (e) => {
        try {
            await window.electronAPI.saveSettings({
                defaultFormat: e.target.checked ? 'mp4' : 'mp3'
            });
            showToast('Format preference saved');
        } catch (error) {
            console.error('Error saving format setting:', error);
            showToast('Failed to save format preference', true);
            e.target.checked = !e.target.checked; // Revert the toggle
        }
    });

    // Navigation handlers
    prevPageBtn?.addEventListener('click', () => {
        const currentPage = window.location.pathname.split('/').pop();
        if (currentPage === 'downloader-settings.html') {
            navigateWithAnimation('media-settings.html');
        }
    });

    nextPageBtn?.addEventListener('click', () => {
        const currentPage = window.location.pathname.split('/').pop();
        if (currentPage === 'media-settings.html') {
            navigateWithAnimation('downloader-settings.html');
        }
    });

    // Page dot click handlers
    pageDots.forEach((dot) => {
        dot.addEventListener('click', () => {
            const targetPage = dot.getAttribute('data-page');
            if (targetPage && targetPage !== window.location.pathname.split('/').pop()) {
                navigateWithAnimation(targetPage);
            }
        });
    });

    // Load saved settings
    async function loadSettings() {
        try {
            const settings = await window.electronAPI.getSettings();
            if (settings) {
                if (defaultVideoType) {
                    defaultVideoType.checked = settings.defaultVideoType === 'audio';
                }
                if (formatToggle) {
                    formatToggle.checked = settings.defaultFormat === 'mp4';
                }
            }
        } catch (error) {
            console.error('Error loading settings:', error);
            showToast('Failed to load settings', true);
        }
    }

    // Toast notification function
    function showToast(message, isError = false) {
        const toast = document.createElement('div');
        toast.className = `toast ${isError ? 'error' : 'success'}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        // Trigger animation
        setTimeout(() => toast.classList.add('show'), 10);

        // Remove toast after animation
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // Initialize page display
    const currentPage = window.location.pathname.split('/').pop();
    const currentDot = document.querySelector(`.page-dot[data-page="${currentPage}"]`);
    if (currentDot) {
        currentDot.classList.add('active');
    }

    // Update arrow button states
    if (prevPageBtn && nextPageBtn) {
        prevPageBtn.disabled = currentPage === 'media-settings.html';
        nextPageBtn.disabled = currentPage === 'downloader-settings.html';
    }
}); 