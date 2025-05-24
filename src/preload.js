const { contextBridge, ipcRenderer } = require('electron');

console.log('Preload script running');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
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
        ytdlDownload: (url, title, artist) => {
            console.log('Preload: Sending ytdlDownload event');
            return ipcRenderer.invoke('ytdl-download', url, title, artist);
        },
        ytSearch: (query) => {
            console.log('Preload: Sending ytSearch event');
            return ipcRenderer.invoke('yt-search', query);
        },
        openFolder: () => {
            console.log('Preload: Sending openFolder event');
            return ipcRenderer.invoke('open-folder');
        }
    }
);

console.log('Preload script completed');