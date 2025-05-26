document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM fully loaded');

  if (!window.electronAPI) {
      console.error('electronAPI not available - preload script may not be working');
      return;
  }

  console.log('electronAPI is available:', window.electronAPI);

  const downloadBtn = document.getElementById('downloadBtn');
  const spotifyLink = document.getElementById('spotifyLink');
  const progress = document.getElementById('progress');
  const status = document.getElementById('status');
  const openFolderBtn = document.getElementById('openFolderBtn');
  const minBtn = document.getElementById('min-btn');
  const maxBtn = document.getElementById('max-btn');
  const closeBtn = document.getElementById('close-btn');
  const formatToggle = document.getElementById('formatToggle');

  const { 
    getData: preloadGetData, 
    getTracks: preloadGetTracks, 
    ytdlDownload, 
    ytSearch: preloadYtSearch, 
    openFolder
  } = window.electronAPI;

  if (downloadBtn) {
    downloadBtn.onclick = async () => {
      await download();
    };
  }

  if (spotifyLink) {
    spotifyLink.addEventListener('input', async (e) => {
      const value = e.target.value.trim();
      if (isSpotifyUrl(value) || !value) {
        removeSuggestionsDropdown();
        return;
      }
      await showSuggestions(value);
    });

    spotifyLink.addEventListener('blur', () => {
      setTimeout(removeSuggestionsDropdown, 200);
    });
  }

  if (openFolderBtn) {
    openFolderBtn.onclick = () => {
      console.log('Opening downloads folder...');
      openFolder();
    };
  }

  if (minBtn) {
      minBtn.addEventListener('click', () => {
          window.electronAPI.minimize();
      });
  }

  if (maxBtn) {
      maxBtn.addEventListener('click', () => {
          window.electronAPI.maximize();
      });
  }

  if (closeBtn) {
      closeBtn.addEventListener('click', () => {
          window.electronAPI.close();
      });
  }

  if (formatToggle) {
    formatToggle.addEventListener('change', (e) => {
      const format = e.target.checked ? 'MP4' : 'MP3';
      console.log(`Format changed to: ${format}`);
    });
  }

  let suggestionsDropdown;

  function createSuggestionsDropdown() {
    suggestionsDropdown = document.createElement('ul');
    suggestionsDropdown.className = 'suggestions-dropdown';
    suggestionsDropdown.style.position = 'absolute';
    suggestionsDropdown.style.zIndex = 1001;
    suggestionsDropdown.style.background = '#fff';
    suggestionsDropdown.style.border = '1px solid #e0e0e0';
    suggestionsDropdown.style.width = spotifyLink.offsetWidth + 'px';
    suggestionsDropdown.style.maxHeight = '200px';
    suggestionsDropdown.style.overflowY = 'auto';
    suggestionsDropdown.style.listStyle = 'none';
    suggestionsDropdown.style.padding = '0';
    suggestionsDropdown.style.margin = '0';
    suggestionsDropdown.style.left = spotifyLink.getBoundingClientRect().left + 'px';
    suggestionsDropdown.style.top = (spotifyLink.getBoundingClientRect().bottom + window.scrollY) + 'px';
    document.body.appendChild(suggestionsDropdown);
  }

  function removeSuggestionsDropdown() {
    if (suggestionsDropdown) {
      suggestionsDropdown.remove();
      suggestionsDropdown = null;
    }
  }

  async function showSuggestions(query) {
    try {
      if (!suggestionsDropdown) createSuggestionsDropdown();
      suggestionsDropdown.innerHTML = '';
      const results = await preloadYtSearch(query);
      results.videos.slice(0, 6).forEach(video => {
        const li = document.createElement('li');
        li.textContent = `${video.title} (${video.author.name})`;
        li.style.padding = '8px 12px';
        li.style.cursor = 'pointer';
        li.addEventListener('mousedown', () => {
          spotifyLink.value = video.title;
          removeSuggestionsDropdown();
          downloadVideoById(video.videoId, video.title);
        });
        suggestionsDropdown.appendChild(li);
      });
    } catch (error) {
      console.error('Error showing suggestions:', error);
    }
  }

  async function downloadVideoById(videoId, title) {
    try {
      downloadBtn.disabled = true;
      status.textContent = `Downloading ${title}...`;
      progress.style.width = '50%';

      const format = formatToggle.checked ? 'mp4' : 'mp3';
      console.log('Downloading single video:', { videoId, title, format });

      await ytdlDownload(`https://www.youtube.com/watch?v=${videoId}`, title, 'Unknown Artist', format);

      status.textContent = 'Download complete!';
      progress.style.width = '100%';
    } catch (error) {
      console.error('Single video download error:', error);
      status.textContent = `Error: ${error.message}`;
    } finally {
      downloadBtn.disabled = false;
      setTimeout(() => {
        progress.style.width = '0%';
      }, 1000);
    }
  }

  async function download() {
    const url = document.getElementById('spotifyLink').value;
    if (!url) {
        console.log('No URL provided');
        console.log('No valid URL provided');
        return;
    }

    const format = formatToggle.checked ? 'mp4' : 'mp3';
    console.log(`Starting download in ${format.toUpperCase()} format`);
    
    try {
        downloadBtn.disabled = true;
        status.textContent = 'Fetching Spotify data...';
        progress.style.width = '10%';

        console.log('Calling preloadGetData...');
        const data = await preloadGetData(url);
        console.log('Spotify data received:', data);
        
        let tracks = [];
        const isPlaylist = data.type === 'playlist' || data.type === 'album';
        let playlistFolder = null;
        let zipPath = null;

        if (isPlaylist) {
            console.log('Fetching tracks for playlist/album...');
            const allTracks = await preloadGetTracks(url);
            console.log('All tracks received:', allTracks);
            
            // Create playlist folder name from the playlist/album name
            const sanitizedFolderName = data.name
                .replace(/[<>:"/\\|?*]/g, '')
                .replace(/\s+/g, ' ')
                .trim()
                .substring(0, 100);

            // Set the playlist folder and zip path
            playlistFolder = sanitizedFolderName;
            zipPath = `${sanitizedFolderName}.zip`;

            // Create the playlist folder immediately
            await window.electronAPI.createPlaylistFolder(playlistFolder);
            
            // Map tracks with their original order
            tracks = allTracks.map((t, index) => ({ 
                name: t.name, 
                artist: t.artists[0].name,
                originalIndex: index
            }));
        } else if (data.type === 'track') {
            tracks = [{ name: data.name, artist: data.artists[0].name, originalIndex: 0 }];
        } else {
            throw new Error('Unsupported Spotify link');
        }

        console.log('Tracks to download:', tracks);
        let successCount = 0;

        // Sort tracks by their original index to ensure correct order
        tracks.sort((a, b) => a.originalIndex - b.originalIndex);

        for (let i = 0; i < tracks.length; i++) {
            const track = tracks[i];
            console.log(`Processing track ${i + 1}/${tracks.length}:`, track);
            
            status.textContent = `Searching YouTube for: ${track.name} by ${track.artist}`;
            progress.style.width = `${((i + 1) / tracks.length) * 100}%`;

            const searchQuery = format === 'mp3' 
                ? `${track.name} ${track.artist} lyrics video`
                : `${track.name} ${track.artist} official music video`;
            console.log('YouTube search query:', searchQuery);
            
            const results = await preloadYtSearch(searchQuery);
            console.log('YouTube search results:', results);
            
            const video = results.videos[0];
            console.log('Selected video:', video);

            if (!video) {
                console.log(`No video found for: ${track.name}`);
                status.textContent = `Could not find video for: ${track.name}`;
                continue;
            }

            try {
                console.log('Starting download for:', video.url);
                status.textContent = `Downloading: ${track.name}`;
                
                // Ensure URL is properly formatted
                const videoUrl = video.url.startsWith('http') ? video.url : `https://www.youtube.com/watch?v=${video.videoId}`;
                console.log('Formatted video URL:', videoUrl);
                
                const result = await ytdlDownload(videoUrl, track.name, track.artist, format, isPlaylist, playlistFolder);
                console.log('Download completed for:', track.name);
                successCount++;

                // Add a small delay between downloads to prevent race conditions
                if (i < tracks.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            } catch (error) {
                console.error(`Download error for ${track.name}:`, error);
                status.textContent = `Error downloading: ${track.name} - ${error.message}`;
                continue;
            }
        }

        // Create zip file if this was a playlist download
        if (isPlaylist && playlistFolder && zipPath && successCount > 0) {
            status.textContent = 'Creating zip file...';
            try {
                await window.electronAPI.createPlaylistZip(playlistFolder, zipPath);
                status.textContent = `Download complete! (${successCount}/${tracks.length} videos) - Playlist zipped`;
            } catch (error) {
                console.error('Error creating zip:', error);
                status.textContent = `Download complete but zip creation failed: ${error.message}`;
            }
        } else if (successCount > 0) {
            status.textContent = isPlaylist 
                ? `Download complete! (${successCount}/${tracks.length} videos)`
                : 'Download complete!';
        } else {
            status.textContent = 'No videos were downloaded successfully';
        }
    } catch (error) {
        console.error('Main download error:', error);
        status.textContent = `Error: ${error.message}`;
    } finally {
        downloadBtn.disabled = false;
        setTimeout(() => {
            progress.style.width = '0%';
        }, 1000);
    }
}

  function isSpotifyUrl(url) {
    return url.includes('open.spotify.com/');
  }

  function streamToBuffer(stream) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      stream.on('data', chunk => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }
});