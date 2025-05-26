document.addEventListener('DOMContentLoaded', () => {
    const backBtn = document.getElementById('backBtn');
    const changeFolderBtn = document.getElementById('changeFolderBtn');
    const defaultVideoType = document.getElementById('defaultVideoType');
    const minBtn = document.getElementById('min-btn');
    const maxBtn = document.getElementById('max-btn');
    const closeBtn = document.getElementById('close-btn');

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
}); 