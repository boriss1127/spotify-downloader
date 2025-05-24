// Remove direct Node.js requires since we're using preload API
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM fully loaded');

  // Check if electronAPI is available
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

  console.log('Buttons found:', {
      downloadBtn: !!downloadBtn,
      openFolderBtn: !!openFolderBtn,
      minBtn: !!minBtn,
      maxBtn: !!maxBtn,
      closeBtn: !!closeBtn,
      formatToggle: !!formatToggle
  });

  // Helper exposed by preload.js for IPC calls and fs-safe ops
  const { 
    getData: preloadGetData, 
    getTracks: preloadGetTracks, 
    ytdlDownload, 
    ytSearch: preloadYtSearch, 
    openFolder, 
    windowControls 
  } = window.electronAPI;

  if (downloadBtn) {
    downloadBtn.onclick = async () => {
      const input = spotifyLink.value.trim();
      console.log('Download button clicked with input:', input);
      
      if (!input) {
        status.textContent = 'Please enter a Spotify link';
        return;
      }
      if (!isSpotifyUrl(input)) {
        status.textContent = 'Please enter a valid Spotify link';
        return;
      }

      try {
        downloadBtn.disabled = true;
        status.textContent = 'Fetching Spotify data...';
        progress.style.width = '10%';

        console.log('Calling preloadGetData...');
        const data = await preloadGetData(input);
        console.log('Spotify data received:', data);
        
        let tracks = [];

        if (data.type === 'playlist' || data.type === 'album') {
          console.log('Fetching tracks for playlist/album...');
          const allTracks = await preloadGetTracks(input);
          console.log('All tracks received:', allTracks);
          tracks = allTracks.map(t => ({ name: t.name, artist: t.artists[0].name }));
        } else if (data.type === 'track') {
          tracks = [{ name: data.name, artist: data.artists[0].name }];
        } else {
          throw new Error('Unsupported Spotify link');
        }

        console.log('Tracks to download:', tracks);
        let successCount = 0;

        for (let i = 0; i < tracks.length; i++) {
          const track = tracks[i];
          console.log(`Processing track ${i + 1}/${tracks.length}:`, track);
          
          status.textContent = `Searching YouTube for: ${track.name} by ${track.artist}`;
          progress.style.width = `${((i + 1) / tracks.length) * 100}%`;

          const searchQuery = `${track.name} ${track.artist} official music video`;
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
            
            // Get the current format from the toggle
            const format = formatToggle.checked ? 'mp4' : 'mp3';
            console.log('Download format:', format);
            
            await ytdlDownload(videoUrl, track.name, track.artist, format);
            console.log('Download completed for:', track.name);
            successCount++;
          } catch (error) {
            console.error(`Download error for ${track.name}:`, error);
            status.textContent = `Error downloading: ${track.name} - ${error.message}`;
            // Continue with next track instead of stopping
            continue;
          }
        }

        if (successCount > 0) {
          status.textContent = `Download complete! (${successCount}/${tracks.length} videos)`;
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
      console.log('Setting up minimize button handler');
      minBtn.addEventListener('click', () => {
          console.log('Minimize button clicked');
          window.electronAPI.minimize();
      });
  }

  if (maxBtn) {
      console.log('Setting up maximize button handler');
      maxBtn.addEventListener('click', () => {
          console.log('Maximize button clicked');
          window.electronAPI.maximize();
      });
  }

  if (closeBtn) {
      console.log('Setting up close button handler');
      closeBtn.addEventListener('click', () => {
          console.log('Close button clicked');
          window.electronAPI.close();
      });
  }

  if (formatToggle) {
    formatToggle.addEventListener('change', (e) => {
      const format = e.target.checked ? 'MP4' : 'MP3';
      console.log(`Format changed to: ${format}`);
      console.log(`Toggle state: ${e.target.checked}`);
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

      console.log('Downloading single video:', { videoId, title });

      // Fixed: Added artist parameter
      await ytdlDownload(`https://www.youtube.com/watch?v=${videoId}`, title, 'Unknown Artist');

      status.textContent = 'Download complete!';
      progress.style.width = '100%';
      console.log('Single video download completed');
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

  function isSpotifyUrl(url) {
    return url.includes('open.spotify.com/');
  }

  // Optional helper if you need to convert stream to buffer anywhere:
  function streamToBuffer(stream) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      stream.on('data', chunk => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }
});