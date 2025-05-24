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

// Helper function to download YouTube video
async function downloadYouTubeVideo(url, outputPath) {
    try {
        console.log('Starting download...');
        
        // Validate URL
        if (!url || typeof url !== 'string' || url.trim() === '') {
            throw new Error('Invalid or empty URL provided');
        }

        // Ensure URL is properly formatted
        const videoUrl = url.trim();
        if (!videoUrl.startsWith('http')) {
            throw new Error('Invalid URL format. URL must start with http:// or https://');
        }

        console.log('Processing URL:', videoUrl);
        
        // Get video info
        const videoInfo = await play.video_info(videoUrl);
        if (!videoInfo) {
            throw new Error('Could not get video information');
        }

        console.log('Video info retrieved:', {
            title: videoInfo.video_details.title,
            duration: videoInfo.video_details.durationInSec,
            channel: videoInfo.video_details.channel.name
        });

        // Get the best audio stream
        const stream = await play.stream(videoUrl, {
            quality: 140, // 140 is the highest audio quality
            discordPlayerCompatibility: false
        });

        if (!stream) {
            throw new Error('Could not get audio stream');
        }

        const writeStream = fs.createWriteStream(outputPath);
        
        return new Promise((resolve, reject) => {
            let downloadedBytes = 0;
            const totalBytes = stream.stream?.info?.size || 0;

            // Handle stream errors
            stream.stream.on('error', (error) => {
                console.error('Stream error:', error);
                writeStream.end();
                reject(error);
            });

            // Handle write stream errors
            writeStream.on('error', (error) => {
                console.error('Write error:', error);
                reject(error);
            });

            // Handle successful completion
            writeStream.on('finish', () => {
                console.log('Download completed successfully');
                console.log(`Total downloaded: ${(downloadedBytes / 1024 / 1024).toFixed(2)} MB`);
                resolve();
            });

            // Handle data chunks
            stream.stream.on('data', (chunk) => {
                downloadedBytes += chunk.length;
                const mbDownloaded = (downloadedBytes / 1024 / 1024).toFixed(2);
                console.log(`Downloaded: ${mbDownloaded} MB`);
            });

            // Handle stream end
            stream.stream.on('end', () => {
                console.log('Stream ended, waiting for write to complete...');
            });

            // Pipe the stream and handle errors
            try {
                stream.stream.pipe(writeStream);
            } catch (error) {
                console.error('Error during pipe operation:', error);
                reject(error);
            }
        });
    } catch (error) {
        console.error('Download failed:', error);
        throw error;
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

  // Window control handlers via IPC
  ipcMain.on('minimize', () => {
    console.log('Main: Received minimize event');
    if (mainWindow) {
      mainWindow.minimize();
      console.log('Window minimized');
    }
  });

  // ipcMain.on('open-dev-tools', () => {
    //mainWindow.webContents.openDevTools();
  //});

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

ipcMain.handle('ytdl-download', async (event, url, title, artist) => {
    try {
        if (!url || !title) {
            throw new Error('Missing required parameters for download');
        }

        // Validate URL
        if (typeof url !== 'string' || url.trim() === '') {
            throw new Error('Invalid URL provided');
        }

        const sanitizedTitle = `${title} - ${artist}`.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const outputPath = path.join(downloadsDir, `${sanitizedTitle}.mp3`);
        
        console.log('Downloading from YouTube:', url);
        console.log('Output path:', outputPath);

        await downloadYouTubeVideo(url, outputPath);
        return { success: true, path: outputPath };
    } catch (error) {
        console.error('Error downloading from YouTube:', error);
        throw error;
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
