const { app, BrowserWindow } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '..', 'img', 'logo.png'),
    show: false,
    backgroundColor: '#0f172a',
    title: 'Show Booking'
  });

  // Show window when ready to prevent flickering
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Load the frontend
  const indexPath = isDev
    ? path.join(__dirname, '..', 'index.html')
    : path.join(process.resourcesPath, 'app', 'index.html');

  mainWindow.loadFile(indexPath);

  // Open DevTools in development
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', () => {
  console.log('[Electron] Starting Show Booking application...');
  console.log('[Electron] Using remote backend: https://showbooking-iqzi.onrender.com/api');
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('[Electron] Uncaught exception:', error);
});
