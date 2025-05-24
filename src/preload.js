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
        ytdlDownload: (url, title, artist, format, isPlaylist) => {
            console.log('Preload: Sending ytdlDownload event with format:', format);
            return ipcRenderer.invoke('ytdl-download', url, title, artist, format, isPlaylist);
        },
        ytSearch: (query) => {
            console.log('Preload: Sending ytSearch event');
            return ipcRenderer.invoke('yt-search', query);
        },
        createPlaylistZip: (folderPath, zipPath) => {
            console.log('Preload: Sending createPlaylistZip event');
            return ipcRenderer.invoke('create-playlist-zip', folderPath, zipPath);
        },
        openFolder: () => {
            console.log('Preload: Sending openFolder event');
            return ipcRenderer.invoke('open-folder');
        }
    }
);

console.log('Preload script completed');