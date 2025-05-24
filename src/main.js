const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const remoteMain = require('@electron/remote/main');
const play = require('play-dl');
const { search } = require('yt-search');
const fs = require('fs');
const { shell } = require('electron');
const fetch = require('node-fetch');
require('dotenv').config();

remoteMain.initialize();

let mainWindow;

// Create downloads directory if it doesn't exist
const downloadsDir = path.join(app.getPath('downloads'), 'Spotify Downloads');
if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir, { recursive: true });
}

// Spotify API credentials from .env file
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

// Validate Spotify credentials
if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    console.error('Spotify credentials not found in .env file. Please add SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET to your .env file.');
    app.quit();
}

// Helper function to validate Spotify URL
function isValidSpotifyUrl(url) {
    try {
        const spotifyUrl = new URL(url);
        return spotifyUrl.hostname === 'open.spotify.com' && 
               (spotifyUrl.pathname.startsWith('/track/') || 
                spotifyUrl.pathname.startsWith('/album/') || 
                spotifyUrl.pathname.startsWith('/playlist/'));
    } catch (error) {
        return false;
    }
}

// Helper function to extract Spotify ID and type from URL
function getSpotifyInfo(url) {
    try {
        const spotifyUrl = new URL(url);
        const pathParts = spotifyUrl.pathname.split('/');
        const type = pathParts[1]; // track, album, or playlist
        const id = pathParts[2].split('?')[0];
        return { type, id };
    } catch (error) {
        return null;
    }
}

// Get Spotify access token
async function getSpotifyToken() {
    const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + Buffer.from(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET).toString('base64')
        },
        body: 'grant_type=client_credentials'
    });

    const data = await response.json();
    return data.access_token;
}

// Improved YouTube video download function
async function downloadYouTubeVideo(url, outputPath, format = 'mp3') {
    console.log('Starting download for:', url);
    console.log('Output path:', outputPath);
    console.log('Format:', format);

    try {
        console.log('Processing URL:', url);
        console.log('Fetching video info...');

        // Get stream based on format
        const streamOptions = {
            quality: format === 'mp4' ? 140 : 140, // 140 is a good quality for both audio and video
            discordPlayerCompatibility: false
        };

        console.log('Stream options:', streamOptions);
        const stream = await play.stream(url, streamOptions);
        
        if (!stream || !stream.stream) {
            throw new Error('Failed to create download stream');
        }

        console.log('Stream created successfully');
        
        // Add timeout handling
        const timeout = setTimeout(() => {
            stream.stream.destroy();
            throw new Error('Download timeout - taking too long');
        }, 300000); // 5 minute timeout

        const writeStream = fs.createWriteStream(outputPath);
        
        return new Promise((resolve, reject) => {
            let downloadedBytes = 0;
            let lastLogTime = Date.now();

            // Handle data chunks
            stream.stream.on('data', (chunk) => {
                downloadedBytes += chunk.length;
                const now = Date.now();
                if (now - lastLogTime > 1000) { // Log every second
                    console.log(`Downloaded: ${(downloadedBytes / 1024 / 1024).toFixed(2)} MB`);
                    lastLogTime = now;
                }
            });

            // Handle stream end
            stream.stream.on('end', () => {
                console.log('Stream ended');
                writeStream.end();
            });

            // Handle stream errors
            stream.stream.on('error', (error) => {
                clearTimeout(timeout);
                console.error('Stream error:', error);
                writeStream.end();
                reject(new Error(`Stream error: ${error.message}`));
            });

            // Handle write stream errors
            writeStream.on('error', (error) => {
                clearTimeout(timeout);
                console.error('Write stream error:', error);
                reject(new Error(`Write error: ${error.message}`));
            });

            // Handle write stream finish
            writeStream.on('finish', () => {
                clearTimeout(timeout);
                console.log('Download completed successfully');
                resolve();
            });

            // Pipe the stream to the file
            stream.stream.pipe(writeStream);
        });
    } catch (error) {
        console.error('Download failed:', error);
        throw new Error(`Download failed: ${error.message}`);
    }
}

function createWindow() {
  console.log('Creating main window');
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: true,
      enableRemoteModule: true,
      webSecurity: true,
      sandbox: false
    }
  });

  remoteMain.enable(mainWindow.webContents);

  // Hide the default menu bar
  Menu.setApplicationMenu(null);

  // Load the main HTML
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Enable dev tools for debugging - remove this line in production
  // mainWindow.webContents.openDevTools();

  // Window control handlers via IPC
  ipcMain.on('minimize', () => {
    console.log('Main: Received minimize event');
    if (mainWindow) {
      mainWindow.minimize();
      console.log('Window minimized');
    }
  });

  ipcMain.on('maximize', () => {
    console.log('Main: Received maximize event');
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
        console.log('Window unmaximized');
      } else {
        mainWindow.maximize();
        console.log('Window maximized');
      }
    }
  });

  ipcMain.on('close', () => {
    console.log('Main: Received close event');
    if (mainWindow) {
      mainWindow.close();
      console.log('Window closed');
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Spotify and YouTube IPC handlers
ipcMain.handle('get-data', async (event, url) => {
  try {
    if (!url) {
      throw new Error('No URL provided');
    }

    if (!isValidSpotifyUrl(url)) {
      throw new Error('Invalid Spotify URL. Please provide a valid Spotify track, album, or playlist URL.');
    }

    console.log('Fetching Spotify data for URL:', url);
    
    const spotifyInfo = getSpotifyInfo(url);
    if (!spotifyInfo) {
      throw new Error('Could not extract Spotify information from URL');
    }

    const token = await getSpotifyToken();
    const response = await fetch(`https://api.spotify.com/v1/${spotifyInfo.type}s/${spotifyInfo.id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch Spotify data');
    }

    const data = await response.json();
    return {
      name: data.name,
      type: spotifyInfo.type,
      artists: data.artists || [{ name: data.owner?.display_name || 'Unknown Artist' }]
    };
  } catch (error) {
    console.error('Error getting Spotify data:', error);
    throw error;
  }
});

ipcMain.handle('get-tracks', async (event, url) => {
  try {
    if (!url) {
      throw new Error('No URL provided');
    }

    if (!isValidSpotifyUrl(url)) {
      throw new Error('Invalid Spotify URL. Please provide a valid Spotify track, album, or playlist URL.');
    }

    console.log('Fetching Spotify tracks for URL:', url);
    
    const spotifyInfo = getSpotifyInfo(url);
    if (!spotifyInfo) {
      throw new Error('Could not extract Spotify information from URL');
    }

    const token = await getSpotifyToken();
    let tracks = [];

    if (spotifyInfo.type === 'track') {
      const response = await fetch(`https://api.spotify.com/v1/tracks/${spotifyInfo.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      tracks = [{
        name: data.name,
        artists: data.artists.map(artist => ({ name: artist.name }))
      }];
    } else {
      const response = await fetch(`https://api.spotify.com/v1/${spotifyInfo.type}s/${spotifyInfo.id}/tracks`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      tracks = data.items.map(item => ({
        name: item.track.name,
        artists: item.track.artists.map(artist => ({ name: artist.name }))
      }));
    }

    return tracks;
  } catch (error) {
    console.error('Error getting Spotify tracks:', error);
    throw error;
  }
});

ipcMain.handle('yt-search', async (event, query) => {
  try {
    if (!query) {
      throw new Error('No search query provided');
    }

    console.log('Searching YouTube for:', query);
    const results = await search(query);
    
    if (!results || !results.videos) {
      throw new Error('No search results found');
    }

    // Convert the results to a plain object to avoid cloning issues
    return {
      videos: results.videos.map(video => ({
        title: video.title,
        url: video.url,
        videoId: video.videoId,
        author: {
          name: video.author.name
        }
      }))
    };
  } catch (error) {
    console.error('Error searching YouTube:', error);
    throw error;
  }
});

// Improved download handler with better error handling
ipcMain.handle('ytdl-download', async (event, url, title, artist = 'Unknown', format = 'mp3') => {
    try {
        console.log('Download request received:', { url, title, artist, format });
        
        if (!url || !title) {
            throw new Error('Missing required parameters for download');
        }

        // Validate URL
        if (typeof url !== 'string' || url.trim() === '') {
            throw new Error('Invalid URL provided');
        }

        // Clean the filename more thoroughly
        const sanitizedTitle = `${title} - ${artist}`
            .replace(/[<>:"/\\|?*]/g, '') // Remove invalid filename characters
            .replace(/\s+/g, ' ') // Replace multiple spaces with single space
            .trim()
            .substring(0, 200); // Limit length
            
        const outputPath = path.join(downloadsDir, `${sanitizedTitle}.${format}`);
        
        console.log('Sanitized filename:', sanitizedTitle);
        console.log('Full output path:', outputPath);

        await downloadYouTubeVideo(url, outputPath, format);
        
        console.log('Download successful');
        return { success: true, path: outputPath };
        
    } catch (error) {
        console.error('Download error in IPC handler:', error.message);
        throw new Error(`Download failed: ${error.message}`);
    }
});

ipcMain.handle('open-folder', async () => {
  try {
    await shell.openPath(downloadsDir);
  } catch (error) {
    console.error('Error opening downloads folder:', error);
    throw error;
  }
});

// App ready
app.whenReady().then(createWindow);

// macOS behavior
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Exit on all windows closed (except macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});