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
    const settingsSections = document.querySelectorAll('.settings-section');
    const animatedDot = document.querySelector('.animated-dot');

    let currentPageIndex = 0;
    const totalPages = 2; // Total number of settings pages
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

    // Page navigation functions
    function updatePageDisplay(direction = 'next') {
        if (isTransitioning) return;
        isTransitioning = true;

        // Get all sections
        const sections = document.querySelectorAll('.settings-section');
        const currentSection = sections[currentPageIndex];
        const nextSection = sections[currentPageIndex + (direction === 'next' ? 1 : -1)];

        // Prepare the next section
        if (nextSection) {
            nextSection.style.visibility = 'visible';
            nextSection.classList.add('active');
            nextSection.classList.add(direction === 'next' ? 'slide-in' : 'slide-out');
        }

        // Start the transition
        requestAnimationFrame(() => {
            if (currentSection) {
                currentSection.classList.add(direction === 'next' ? 'slide-out' : 'slide-in');
            }

            // Update dots
            pageDots.forEach((dot, index) => {
                if (index === currentPageIndex) {
                    dot.classList.add('active');
                } else {
                    dot.classList.remove('active');
                }
            });

            // Update animated dot position
            const dotWidth = 12;
            const dotGap = 12;
            const newPosition = currentPageIndex * (dotWidth + dotGap);
            animatedDot.style.left = `${newPosition}px`;

            // Update arrow button states
            prevPageBtn.disabled = currentPageIndex === 0;
            nextPageBtn.disabled = currentPageIndex === totalPages - 1;
        });

        // Reset transition flag after animation completes
        setTimeout(() => {
            isTransitioning = false;
            if (currentSection) {
                currentSection.classList.remove('active', 'slide-out', 'slide-in');
                currentSection.style.visibility = 'hidden';
            }
            if (nextSection) {
                nextSection.classList.remove('slide-in', 'slide-out');
            }
        }, 300); // Match the CSS transition duration
    }

    // Previous page button handler
    prevPageBtn.addEventListener('click', () => {
        if (currentPageIndex > 0 && !isTransitioning) {
            currentPageIndex--;
            updatePageDisplay('prev');
        }
    });

    // Next page button handler
    nextPageBtn.addEventListener('click', () => {
        if (currentPageIndex < totalPages - 1 && !isTransitioning) {
            currentPageIndex++;
            updatePageDisplay('next');
        }
    });

    // Page dot click handlers
    pageDots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            if (currentPageIndex !== index && !isTransitioning) {
                const direction = index > currentPageIndex ? 'next' : 'prev';
                currentPageIndex = index;
                updatePageDisplay(direction);
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
    currentPageIndex = currentPage === 'video-settings.html' ? 1 : 0;
    updatePageDisplay();
}); 