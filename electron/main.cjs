const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);
const hotDbDir = path.join(app.getPath('userData'), 'hot-db');

function readDesktopConfig() {
  try {
    const cfgPath = path.join(__dirname, 'desktop-config.json');
    return JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
  } catch {
    return {};
  }
}

function getHotManifestUrl() {
  const cfg = readDesktopConfig();
  if (cfg.hotManifestUrl) return cfg.hotManifestUrl;
  if (cfg.githubOwner && cfg.githubOwner !== 'REPLACE_WITH_YOUR_GITHUB_USERNAME' && cfg.githubRepo) {
    return `https://github.com/${cfg.githubOwner}/${cfg.githubRepo}/releases/latest/download/manifest.json`;
  }
  return '';
}

function readCachedHotManifest() {
  try {
    return JSON.parse(fs.readFileSync(path.join(hotDbDir, 'manifest.json'), 'utf-8'));
  } catch {
    try {
      return JSON.parse(fs.readFileSync(path.join(__dirname, '../dist/data/manifest.json'), 'utf-8'));
    } catch {
      return null;
    }
  }
}

async function checkHotDatabaseUpdate() {
  const manifestUrl = getHotManifestUrl();
  const current = readCachedHotManifest();
  if (!manifestUrl) {
    return { status: 'unconfigured', updatedAt: current?.updatedAt || null };
  }

  try {
    const res = await fetch(manifestUrl, { cache: 'no-store' });
    if (!res.ok) return { status: 'error', message: `HTTP ${res.status}` };
    const remoteManifest = await res.json();

    if (current && current.sha256 === remoteManifest.sha256) {
      return { status: 'up-to-date', updatedAt: remoteManifest.updatedAt };
    }

    const bundleUrl = new URL(remoteManifest.bundleFile || 'db-bundle.json', manifestUrl).toString();
    const bundleRes = await fetch(bundleUrl, { cache: 'no-store' });
    if (!bundleRes.ok) return { status: 'error', message: `Bundle HTTP ${bundleRes.status}` };
    const bundleText = await bundleRes.text();
    const sha = crypto.createHash('sha256').update(bundleText).digest('hex');

    if (remoteManifest.sha256 && sha !== remoteManifest.sha256) {
      return { status: 'error', message: 'SHA-256 mismatch on remote db-bundle.json' };
    }

    fs.mkdirSync(hotDbDir, { recursive: true });
    fs.writeFileSync(path.join(hotDbDir, 'db-bundle.json'), bundleText, 'utf-8');
    fs.writeFileSync(path.join(hotDbDir, 'manifest.json'), JSON.stringify(remoteManifest, null, 2), 'utf-8');

    return {
      status: 'updated',
      updatedAt: remoteManifest.updatedAt,
      counts: remoteManifest.counts,
    };
  } catch (err) {
    return { status: 'error', message: err instanceof Error ? err.message : String(err) };
  }
}

function initAutoUpdater(win) {
  try {
    const { autoUpdater } = require('electron-updater');
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;

    const sendStatus = (payload) => {
      if (win && !win.isDestroyed()) {
        win.webContents.send('app-update-status', payload);
      }
    };

    autoUpdater.on('checking-for-update', () => sendStatus({ state: 'checking' }));
    autoUpdater.on('update-available', (info) => sendStatus({ state: 'available', version: info.version }));
    autoUpdater.on('update-not-available', (info) => sendStatus({ state: 'none', version: info.version }));
    autoUpdater.on('download-progress', (p) => sendStatus({ state: 'downloading', percent: Math.round(p.percent) }));
    autoUpdater.on('update-downloaded', (info) => sendStatus({ state: 'downloaded', version: info.version }));
    autoUpdater.on('error', (err) => sendStatus({ state: 'error', message: err?.message || 'Updater error' }));

    ipcMain.handle('check-app-update', async () => {
      try {
        const result = await autoUpdater.checkForUpdates();
        return { ok: true, version: result?.updateInfo?.version || app.getVersion() };
      } catch (err) {
        return { ok: false, message: err instanceof Error ? err.message : String(err) };
      }
    });

    ipcMain.handle('install-app-update', () => {
      autoUpdater.quitAndInstall(false, true);
    });

    if (!isDev) {
      setTimeout(() => {
        autoUpdater.checkForUpdates().catch(() => {});
      }, 3500);
    }
  } catch {
    ipcMain.handle('check-app-update', async () => ({ ok: false, message: 'electron-updater unavailable in dev' }));
    ipcMain.handle('install-app-update', () => {});
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#0c0d10',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  if (isDev) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  initAutoUpdater(win);
  return win;
}

ipcMain.handle('check-hot-db-update', checkHotDatabaseUpdate);

ipcMain.handle('scan-mods-folder', async () => {
  const res = await dialog.showOpenDialog({
    title: 'Выберите папку mods (Minecraft / Prism Launcher)',
    properties: ['openDirectory'],
  });

  if (res.canceled || !res.filePaths.length) {
    return { canceled: true, folderPath: '', jarFiles: [], hasConnectorFolder: false, hasEmbeddiumSodiumAlias: false };
  }

  const folderPath = res.filePaths[0];
  const entries = fs.readdirSync(folderPath, { withFileTypes: true });
  const jarFiles = entries
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.jar'))
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b));

  const connectorDir = path.join(folderPath, '.connector');
  const hasConnectorFolder = fs.existsSync(connectorDir);
  let hasEmbeddiumSodiumAlias = false;

  const connectorJsonPath = path.join(connectorDir, 'connector.json');
  if (fs.existsSync(connectorJsonPath)) {
    try {
      const content = fs.readFileSync(connectorJsonPath, 'utf-8').toLowerCase();
      hasEmbeddiumSodiumAlias = content.includes('embeddium') && content.includes('sodium');
    } catch {
      hasEmbeddiumSodiumAlias = false;
    }
  }

  return {
    canceled: false,
    folderPath,
    jarFiles,
    hasConnectorFolder,
    hasEmbeddiumSodiumAlias,
  };
});

ipcMain.handle('get-app-meta', () => ({
  appVersion: app.getVersion(),
  hotManifest: readCachedHotManifest(),
}));

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
