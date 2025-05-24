const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const remoteMain = require('@electron/remote/main');

remoteMain.initialize();

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  remoteMain.enable(mainWindow.webContents); // <<<<< enable remote here with webContents

  // Hide the default menu bar
  Menu.setApplicationMenu(null);

  // Load the main HTML
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Uncomment to open DevTools
  // mainWindow.webContents.openDevTools();

  // Window control handlers via IPC
  ipcMain.on('minimize', () => {
    if (mainWindow) {
      mainWindow.minimize();
      console.log('Window minimized');
    }
  });

  ipcMain.on('maximize', () => {
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
    if (mainWindow) {
      mainWindow.close();
      console.log('Window closed');
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}


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
