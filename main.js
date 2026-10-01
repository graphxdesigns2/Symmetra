import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { autoUpdater } from 'electron-updater';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let win;

const isDev = process.argv.includes('--dev') || process.env.ELECTRON_DEV === '1';
const devUrl = process.env.ELECTRON_DEV_URL || 'http://localhost:3000';

function createWindow() {
  win = new BrowserWindow({
    width: 1920,
    height: 1080,
    show: false,
    backgroundColor: '#0f0f0f',
    icon: path.join(process.resourcesPath, 'icon.ico'),
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      backgroundThrottling: false
    }
  });

  if (isDev) {
    // Dev mode: load the live Vite server (run `npm run dev` first).
    // No rebuild needed — the Electron window refreshes with your saved changes.
    win.webContents.on('did-fail-load', (_e, code, desc, url) => {
      console.error(`[Symmetra] Could not load ${url} (${code}: ${desc}). Is the Vite dev server running? Start it with: npm run dev`);
    });
    win.loadURL(devUrl);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

win.once('ready-to-show', () => {
  win.show();
});
}

ipcMain.on('window-minimize', () => win.minimize());
ipcMain.on('window-maximize', () => {
  if (win.isMaximized()) win.unmaximize();
  else win.maximize();
});
ipcMain.on('window-close', () => win.close());

// Two instances sharing one Chromium profile fight over the disk cache
// ("Unable to move the cache: Access is denied") and can corrupt
// localStorage. Keep a single instance and focus it on re-launch.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
  app.whenReady().then(() => {
    createWindow();
    if (!isDev) {
      autoUpdater.checkForUpdatesAndNotify();
    }
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});