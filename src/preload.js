const { contextBridge, ipcRenderer, shell } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimize: () => ipcRenderer.send('minimize'),
  maximize: () => ipcRenderer.send('maximize'),
  close: () => ipcRenderer.send('close'),
  
  // Window controls object (alternative access pattern used in renderer.js)
  windowControls: {
    minimize: () => ipcRenderer.send('minimize'),
    maximize: () => ipcRenderer.send('maximize'),
    close: () => ipcRenderer.send('close'),
  },
  
  // Spotify data fetching
  getData: async (url) => {
    try {
      return await getData(url);
    } catch (error) {
      throw new Error(`Failed to get Spotify data: ${error.message}`);
    }
  },
  
  getTracks: async (url) => {
    try {
      return await getTracks(url);
    } catch (error) {
      throw new Error(`Failed to get tracks: ${error.message}`);
    }
  },
  
  // YouTube search
  ytSearch: async (query) => {
    try {
      return await ytSearch(query);
    } catch (error) {
      throw new Error(`YouTube search failed: ${error.message}`);
    }
  },
  
  // YouTube download
  ytdlDownload: async (videoUrl, trackName, artistName = '') => {
    try {
      const downloadsPath = path.join(os.homedir(), 'Downloads');
      const fileName = `${trackName}${artistName ? ` - ${artistName}` : ''}.mp4`
        .replace(/[<>:"/\\|?*]/g, '_'); // Replace invalid filename characters
      const filePath = path.join(downloadsPath, fileName);
      
      return new Promise((resolve, reject) => {
        const stream = ytdl(videoUrl, { 
          quality: 'highestaudio',
          filter: 'audioonly'
        });
        
        const writeStream = fs.createWriteStream(filePath);
        
        stream.pipe(writeStream);
        
        stream.on('error', (error) => {
          reject(new Error(`Download failed: ${error.message}`));
        });
        
        writeStream.on('error', (error) => {
          reject(new Error(`File write failed: ${error.message}`));
        });
        
        writeStream.on('finish', () => {
          resolve(filePath);
        });
      });
    } catch (error) {
      throw new Error(`Download setup failed: ${error.message}`);
    }
  },
  
  // Open downloads folder
  openFolder: () => {
    const downloadsPath = path.join(os.homedir(), 'Downloads');
    shell.openPath(downloadsPath);
  }
});