document.addEventListener('DOMContentLoaded', () => {
    const backBtn = document.getElementById('backBtn');
    const changeFolderBtn = document.getElementById('changeFolderBtn');
    const defaultVideoType = document.getElementById('defaultVideoType');
    const minBtn = document.getElementById('min-btn');
    const maxBtn = document.getElementById('max-btn');
    const closeBtn = document.getElementById('close-btn');
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    const pageDots = document.querySelectorAll('.page-dot');
    const settingsSections = document.querySelectorAll('.settings-section');

    let currentPageIndex = 0;
    const totalPages = settingsSections.length;
    let isTransitioning = false;

    // Load saved settings
    loadSettings();

    // Back button handler
    backBtn.addEventListener('click', () => {
        window.location.href = 'index.html';
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
    changeFolderBtn.addEventListener('click', async () => {
        try {
            const result = await window.electronAPI.selectDownloadFolder();
            if (result.success) {
                // Save the new folder path
                await window.electronAPI.saveSettings({
                    downloadFolder: result.folderPath
                });
            }
        } catch (error) {
            console.error('Error changing download folder:', error);
        }
    });

    // Default video type handler
    defaultVideoType.addEventListener('change', async (e) => {
        try {
            await window.electronAPI.saveSettings({
                defaultVideoType: e.target.checked ? 'lyrics' : 'music'
            });
        } catch (error) {
            console.error('Error saving video type setting:', error);
        }
    });

    // Page navigation functions
    function updatePageDisplay() {
        if (isTransitioning) return;
        isTransitioning = true;

        // Update sections
        settingsSections.forEach((section, index) => {
            if (index === currentPageIndex) {
                section.classList.add('active');
            } else {
                section.classList.remove('active');
            }
        });

        // Update dots with animation
        pageDots.forEach((dot, index) => {
            const img = dot.querySelector('img');
            if (index === currentPageIndex) {
                img.src = '../img-src/pages/filled-in.png';
                dot.classList.add('active');
            } else {
                img.src = '../img-src/pages/not-filled-in.png';
                dot.classList.remove('active');
            }
        });

        // Update arrow button states
        prevPageBtn.style.opacity = currentPageIndex === 0 ? '0.5' : '1';
        nextPageBtn.style.opacity = currentPageIndex === totalPages - 1 ? '0.5' : '1';

        // Reset transition flag after animation completes
        setTimeout(() => {
            isTransitioning = false;
        }, 300);
    }

    // Previous page button handler
    prevPageBtn.addEventListener('click', () => {
        if (currentPageIndex > 0 && !isTransitioning) {
            currentPageIndex--;
            updatePageDisplay();
        }
    });

    // Next page button handler
    nextPageBtn.addEventListener('click', () => {
        if (currentPageIndex < totalPages - 1 && !isTransitioning) {
            currentPageIndex++;
            updatePageDisplay();
        }
    });

    // Page dot click handlers
    pageDots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            if (currentPageIndex !== index && !isTransitioning) {
                currentPageIndex = index;
                updatePageDisplay();
            }
        });
    });

    // Load saved settings
    async function loadSettings() {
        try {
            const settings = await window.electronAPI.getSettings();
            if (settings) {
                defaultVideoType.checked = settings.defaultVideoType === 'lyrics';
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    // Initialize page display
    updatePageDisplay();
}); 