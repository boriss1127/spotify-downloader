# Spotify Downloader

---

## This open-source program downloads any song, playlist or album of your choice from Spotify.

---

To download, double click the .exe that you installed from the Releases tab on Github. When the Windows Defender alert pops up, press More Info, and then a new button should appear on the bottom left, that says Run. Press that. The app will install. Then you should search for "Spotify Downloader" in the Windows Search bar.
Input a link to a Spotify track/playlist/album, and hit download. It will find the video on Youtube, and will download it as a MP3/MP4 version of the video, depending on what you selected.
It will download in your Downloads folder, in a folder called "Spotify Downloads". If it's just a song, it will download in the raw .mp3/4 form. If it's an album/playlist it will download in a zipped format that you can unzip to access the songs.

---

https://github.com/user-attachments/assets/ec622b18-fc2d-4959-839f-13318e24c142 <!-- <video src="/img-src/README/ee.mov"> -->

---

PATCH NOTES-

**v1.0.0** - **_Release 1_**. <br>
**v1.0.1** - **_Release 2_**. The app used to download video and audio separately to get them both the highest quality, and then merge them together using ffmpeg, but wouldn't merge them, if the user did not have ffmpeg installed. Now, it checks if you do have ffmpeg. If you do, it uses the first method. If you don't it downloads them together. <br> **Note** - Downloading them separately will give higher video and audio quality.<br>




