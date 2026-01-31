const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const { SteamToolsDownloader } = require('./steam_logic');
const fs = require('fs');
const { spawn } = require('child_process');


let mainWindow;

function checkAdmin() {
    try {
        fs.writeFileSync(path.join(process.env.SystemRoot, 'temp', 'admin_check.txt'), 'check');
        fs.unlinkSync(path.join(process.env.SystemRoot, 'temp', 'admin_check.txt'));
        return true;
    } catch (error) {
        return false;
    }
}

const createWindow = () => {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 800,
        minWidth: 600,
        minHeight: 600,
        resizable: true,
        maximizable: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
        backgroundColor: '#0f111a',
        autoHideMenuBar: true,
        title: "FeedTools"
    });

    // Load the app.
    // We need to handle dev vs prod
    const isDev = !app.isPackaged;
    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
        // mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
    }
};

// Check admin on ready
app.whenReady().then(() => {
    if (process.platform === 'win32' && !checkAdmin()) {
        const choice = dialog.showMessageBoxSync({
            type: 'warning',
            buttons: ['Restart as Admin', 'Cancel'],
            title: 'Administrator Privileges Required',
            message: 'This application requires Administrator permissions to modify Steam files.',
            detail: 'The app will now attempt to restart with elevated privileges.'
        });

        if (choice === 0) {
            // Restart as admin using PowerShell
            const exePath = process.execPath;
            const args = process.argv.slice(1).map(arg => `"${arg}"`).join(' ');

            // If in dev mode, we might need to handle "npm start" differently.
            // But simplest is to just respawn the executable (electron)
            spawn('powershell.exe', ['Start-Process', `"${exePath}"`, '-ArgumentList', `'${args}'`, '-Verb', 'RunAs'], {
                detached: true,
                stdio: 'ignore'
            });
            app.quit();
            return;
        } else {
            app.quit();
            return;
        }
    }

    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// IPC Implementation
const downloader = new SteamToolsDownloader();

ipcMain.on('check-steamtools', (event) => {
    const exists = downloader.findSteamtoolsExe();
    event.reply('check-steamtools-reply', !!exists);
});

ipcMain.on('start-download', async (event, query) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    const sendLog = (msg) => window.webContents.send('log-message', msg);
    const setStatus = (msg) => window.webContents.send('status-update', msg);

    try {
        setStatus("Searching for game...");
        sendLog(`Searching: ${query}`);

        const result = await downloader.findGame(query);

        if (result === null) {
            window.webContents.send('search-error', `No game found for: ${query}`);
            return;
        }

        if (typeof result === "object" && result.length) {
            // Array means multiple matches
            window.webContents.send('show-selection', result);
            return;
        }

        // Single ID found
        startDeepDownload(result, window);

    } catch (e) {
        sendLog(`Error during search: ${e}`);
        window.webContents.send('search-error', `Error: ${e.message}`);
    }
});

ipcMain.on('confirm-selection', (event, appid) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    startDeepDownload(appid, window);
});

ipcMain.on('toggle-fullscreen', () => {
    if (mainWindow) {
        mainWindow.setFullScreen(!mainWindow.isFullScreen());
    }
});

async function startDeepDownload(appId, window) {
    const sendLog = (msg) => window.webContents.send('log-message', msg);
    const setStatus = (msg) => window.webContents.send('status-update', msg);

    try {
        sendLog(`\n${'='.repeat(60)}\nProcessing App ID: ${appId}\n${'='.repeat(60)}`);
        setStatus("Getting game details...");
        sendLog("\n[1/5] Fetching store details...");

        const details = await downloader.getAppDetails(appId);
        if (details) {
            sendLog(`Found: ${details.name}`);
        } else {
            sendLog("Store details not available");
        }

        setStatus("Downloading files...");
        const success = await downloader.downloadAppidZip(appId, "downloads", sendLog);

        if (!success) {
            window.webContents.send('process-complete', { success: false, message: "Could not download game data" });
            return;
        }

        sendLog("Download complete");
        setStatus("Installing files...");

        downloader.copyFilesToSteam("downloads", sendLog);
        sendLog("Files installed");

        setStatus("Restarting Steam components...");
        sendLog("\n[5/5] Restarting Steam components...");

        await downloader.closeSteam(sendLog);
        await new Promise(r => setTimeout(r, 1000));

        await downloader.launchSteamtools(sendLog);
        await new Promise(r => setTimeout(r, 2000));

        await downloader.startSteam(sendLog);

        setStatus("Complete!");
        sendLog(`\n${'='.repeat(60)}\n✓ Complete!\n${'='.repeat(60)}`);

        window.webContents.send('process-complete', { success: true, message: "Installation complete! Steam has been restarted." });

    } catch (e) {
        sendLog(`Fatal Error: ${e.message}`);
        window.webContents.send('process-complete', { success: false, message: `Fatal Error: ${e.message}` });
    }
}
