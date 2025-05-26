const { contextBridge, ipcRenderer } = require('electron');

console.log('Preload script running');

contextBridge.exposeInMainWorld(
    'electronAPI',
    {
        minimize: () => {
            console.log('Preload: Sending minimize event');
            ipcRenderer.send('minimize');
        },
        maximize: () => {
            console.log('Preload: Sending maximize event');
            ipcRenderer.send('maximize');
        },
        close: () => {
            console.log('Preload: Sending close event');
            ipcRenderer.send('close');
        },
        getData: (url) => {
            console.log('Preload: Sending getData event');
            return ipcRenderer.invoke('get-data', url);
        },
        getTracks: (url) => {
            console.log('Preload: Sending getTracks event');
            return ipcRenderer.invoke('get-tracks', url);
        },
        ytdlDownload: (url, title, artist, format, isPlaylist, playlistFolder) => {
            console.log('Preload: Sending ytdlDownload event with format:', format);
            return ipcRenderer.invoke('ytdl-download', url, title, artist, format, isPlaylist, playlistFolder);
        },
        ytSearch: (query) => {
            console.log('Preload: Sending ytSearch event');
            return ipcRenderer.invoke('yt-search', query);
        },
        createPlaylistFolder: (folderName) => {
            console.log('Preload: Sending createPlaylistFolder event');
            return ipcRenderer.invoke('create-playlist-folder', folderName);
        },
        createPlaylistZip: (folderName, zipName) => {
            console.log('Preload: Sending createPlaylistZip event');
            return ipcRenderer.invoke('create-playlist-zip', folderName, zipName);
        },
        getSettings: () => {
            console.log('Preload: Sending getSettings event');
            return ipcRenderer.invoke('get-settings');
        },
        saveSettings: (settings) => {
            console.log('Preload: Sending saveSettings event');
            return ipcRenderer.invoke('save-settings', settings);
        },
        selectDownloadFolder: () => {
            console.log('Preload: Sending selectDownloadFolder event');
            return ipcRenderer.invoke('select-download-folder');
        },
        openFolder: () => {
            console.log('Preload: Sending openFolder event');
            return ipcRenderer.invoke('open-folder');
        }
    }
);

console.log('Preload script completed');
 