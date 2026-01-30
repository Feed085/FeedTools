const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { exec } = require('child_process');
const AdmZip = require('adm-zip');
const os = require('os');

class SteamWebSearch {
    constructor() {
        this.searchCache = {};
    }

    async searchSteamStore(query) {
        if (this.searchCache[query]) {
            return this.searchCache[query];
        }

        try {
            const encodedQuery = encodeURIComponent(query);
            const url = `https://store.steampowered.com/search/?term=${encodedQuery}`;

            const headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
            };

            const response = await axios.get(url, { headers, timeout: 15000 });
            const html = response.data;
            const $ = cheerio.load(html);
            const results = [];

            // Find all search result rows
            const searchResultRows = $('a[data-ds-appid]');

            searchResultRows.each((i, row) => {
                if (i >= 10) return false; // Limit to 10

                try {
                    const rowElem = $(row);
                    const appidStr = rowElem.attr('data-ds-appid') || '';
                    const appid = appidStr.split(',')[0];

                    if (!/^\d+$/.test(appid)) return;

                    const titleSpan = rowElem.find('span.title');
                    if (!titleSpan.length) return;

                    const name = titleSpan.text().trim();
                    const href = rowElem.attr('href') || '';

                    results.push({
                        name: name,
                        appid: parseInt(appid, 10),
                        url: href
                    });
                } catch (e) {
                    // continue
                }
            });

            // Alternative method
            if (results.length === 0) {
                // Look for app links directly
                $('a[href]').each((i, link) => {
                    const href = $(link).attr('href');
                    const appMatch = href.match(/\/app\/(\d+)\//);
                    if (appMatch) {
                        const appid = appMatch[1];
                        const name = $(link).text().trim();
                        if (name && /^\d+$/.test(appid)) {
                            results.push({
                                name: name.substring(0, 100) || `App ${appid}`,
                                appid: parseInt(appid, 10),
                                url: href.startsWith('http') ? href : `https://store.steampowered.com${href}`
                            });
                        }
                    }
                });
            }

            // Remove duplicates
            const uniqueResults = [];
            const seenAppids = new Set();
            for (const result of results) {
                if (!seenAppids.has(result.appid)) {
                    uniqueResults.push(result);
                    seenAppids.add(result.appid);
                }
            }

            this.searchCache[query] = uniqueResults;
            return uniqueResults;
        } catch (e) {
            console.error(`Error searching Steam store: ${e}`);
            return [];
        }
    }

    extractAppidFromUrl(url) {
        try {
            const patterns = [
                /\/app\/(\d+)/,
                /app\/(\d+)/,
                /AppId=(\d+)/,
                /id=(\d+)/
            ];

            for (const pattern of patterns) {
                const match = url.match(pattern);
                if (match && /^\d+$/.test(match[1])) {
                    return parseInt(match[1], 10);
                }
            }
            return null;
        } catch (e) {
            console.error(`Error extracting App ID from URL: ${e}`);
            return null;
        }
    }
}

class SteamToolsDownloader {
    constructor() {
        this.gamesCache = {};
        this.baseUrl = "https://api.steampowered.com";
        this.serverBaseUrl = "https://walftech.com/proxy.php?url=https%3A%2F%2Fsteamgames554.s3.us-east-1.amazonaws.com%2F";
        this.steamtoolsExe = this.findSteamtoolsExe();
        this._steamFolder = null;
        this.webSearcher = new SteamWebSearch();
    }

    resourcePath(relativePath) {
        // In Electron, resources might be packed differently. 
        // For now, assuming dev or standard unpacked.
        try {
            if (process.resourcesPath) {
                return path.join(process.resourcesPath, relativePath);
            }
        } catch (e) { }
        return path.resolve(relativePath);
    }

    findSteamtoolsExe() {
        const homeDir = os.homedir();
        const commonPaths = [
            path.join(process.cwd(), 'SteamTools'),
            path.join(homeDir, 'Desktop', 'SteamTools'),
            path.join(homeDir, 'Documents', 'SteamTools'),
            path.join(homeDir, 'Downloads', 'SteamTools'),
            'C:\\SteamTools',
            'D:\\SteamTools'
        ];

        for (const basePath of commonPaths) {
            if (fs.existsSync(basePath)) {
                try {
                    const stats = fs.statSync(basePath);
                    if (stats.isDirectory()) {
                        const found = this.findFileRecursive(basePath, "SteamTools.exe");
                        if (found) return found;
                    } else if (path.basename(basePath).toLowerCase() === "steamtools.exe") {
                        return basePath;
                    }
                } catch (e) { }
            }
        }
        return null;
    }

    findFileRecursive(dir, filename) {
        try {
            const files = fs.readdirSync(dir);
            for (const file of files) {
                const fullPath = path.join(dir, file);
                let stat;
                try { stat = fs.statSync(fullPath); } catch (e) { continue; }

                if (stat.isDirectory()) {
                    const found = this.findFileRecursive(fullPath, filename);
                    if (found) return found;
                } else if (file.toLowerCase() === filename.toLowerCase()) {
                    return fullPath;
                }
            }
        } catch (e) { }
        return null;
    }

    async getAppList() {
        if (Object.keys(this.gamesCache).length === 0) {
            try {
                const url = `${this.baseUrl}/ISteamApps/GetAppList/v2/`;
                const response = await axios.get(url, { timeout: 15000 });
                const apps = response.data.applist.apps;
                for (const app of apps) {
                    this.gamesCache[app.name.toLowerCase()] = app.appid;
                }
            } catch (e) {
                console.error(`Error fetching app list: ${e}`);
            }
        }
        return this.gamesCache;
    }

    findSteamFolder() {
        if (this._steamFolder) return this._steamFolder;

        const possiblePaths = [
            path.join(process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'Steam'),
            path.join(process.env['PROGRAMFILES'] || 'C:\\Program Files', 'Steam'),
            'C:\\Program Files (x86)\\Steam',
            'C:\\Program Files\\Steam'
        ];

        for (const steamPath of possiblePaths) {
            if (fs.existsSync(steamPath)) {
                this._steamFolder = steamPath;
                return this._steamFolder;
            }
        }
        return null;
    }

    async findGame(query) {
        if (query.includes('store.steampowered.com') || query.includes('steamcommunity.com')) {
            const appid = this.webSearcher.extractAppidFromUrl(query);
            if (appid) return appid;
        }

        if (/^\d+$/.test(query)) {
            return parseInt(query, 10);
        }

        const webResults = await this.webSearcher.searchSteamStore(query);
        if (webResults && webResults.length > 0) {
            if (webResults.length === 1) {
                return webResults[0].appid;
            } else {
                return webResults;
            }
        }

        const games = await this.getAppList();
        if (!games || Object.keys(games).length === 0) return null;

        const queryLower = query.toLowerCase();
        if (games[queryLower]) {
            return games[queryLower];
        }

        // Fuzzy match reimplementation (simple partial includes or difflib)
        // Python used get_close_matches. We'll use a simple filter here for now.
        const keys = Object.keys(games);
        const matches = keys.filter(k => k.includes(queryLower)).slice(0, 5);
        // Or better, sort by similarity? For now, includes is decent.

        if (matches.length > 0) {
            return matches.map(match => ({ name: match, appid: games[match] }));
        }

        return null;
    }

    async getAppDetails(appId) {
        const url = `https://store.steampowered.com/api/appdetails?appids=${appId}`;
        try {
            const response = await axios.get(url, { timeout: 10000 });
            const data = response.data;
            if (data[appId] && data[appId].success) {
                return data[appId].data;
            }
        } catch (e) {
            console.error(`Error fetching app details: ${e}`);
        }
        return null;
    }

    async downloadAppidZip(appId, outputDir = "downloads", logCallback = null) {
        if (logCallback) logCallback(`[2/5] Downloading ${appId}.zip from server storage...`);

        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

        const url = `${this.serverBaseUrl}${appId}.zip`;
        const zipPath = path.join(outputDir, `${appId}.zip`);

        try {
            const response = await axios({
                method: 'get',
                url: url,
                responseType: 'stream',
                timeout: 30000
            });

            // Axios treats 404 as error usually, but let's check stream status if needed
            // Actually axios throws on 404 by default.

            const writer = fs.createWriteStream(zipPath);
            response.data.pipe(writer);

            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            if (logCallback) {
                logCallback(`Downloaded: ${path.basename(zipPath)}`);
                logCallback(`Extracting...`);
            }

            const zip = new AdmZip(zipPath);
            zip.extractAllTo(outputDir, true);

            if (logCallback) logCallback(`Extracted successfully`);

            fs.unlinkSync(zipPath);
            return true;

        } catch (e) {
            if (logCallback) logCallback(`Error during download/extraction: ${e}`);
            // Check if 404
            if (e.response && e.response.status === 404 && logCallback) {
                logCallback(`No data found for App ID ${appId}`);
            }
            return false;
        }
    }

    copyFilesToSteam(sourceDir = "downloads", logCallback = null) {
        const sourcePath = path.resolve(sourceDir);

        // Find files recursively
        const findFiles = (dir, ext) => {
            let results = [];
            const list = fs.readdirSync(dir);
            list.forEach(file => {
                file = path.join(dir, file);
                const stat = fs.statSync(file);
                if (stat && stat.isDirectory()) {
                    results = results.concat(findFiles(file, ext));
                } else {
                    if (file.endsWith(ext)) results.push(file);
                }
            });
            return results;
        }

        const luaFiles = findFiles(sourcePath, '.lua');
        const manifestFiles = findFiles(sourcePath, '.manifest');
        const stFiles = findFiles(sourcePath, '.st');

        if (luaFiles.length === 0 && manifestFiles.length === 0 && stFiles.length === 0) {
            if (logCallback) logCallback("No files found to copy.");
            return false;
        }

        if (logCallback) logCallback(`\n[3/5] Copying files to Steam...`);

        const steamFolder = this.findSteamFolder();
        if (!steamFolder) {
            if (logCallback) logCallback("\nCould not find Steam installation.");
            return false;
        }

        const stplugFolder = path.join(steamFolder, 'config', 'stplug-in');
        const depotcacheFolder = path.join(steamFolder, 'depotcache');

        if (!fs.existsSync(stplugFolder)) fs.mkdirSync(stplugFolder, { recursive: true });
        if (!fs.existsSync(depotcacheFolder)) fs.mkdirSync(depotcacheFolder, { recursive: true });

        const filesToCopy = [...luaFiles, ...stFiles];
        if (filesToCopy.length > 0) {
            if (logCallback) logCallback(`\nCopying plugin file(s) to config/stplug-in...`);
            for (const filePath of filesToCopy) {
                try {
                    const destPath = path.join(stplugFolder, path.basename(filePath));
                    fs.copyFileSync(filePath, destPath);
                } catch (e) {
                    if (logCallback) logCallback(`  ✗ Failed: ${e}`);
                }
            }
        }

        if (manifestFiles.length > 0) {
            if (logCallback) logCallback(`\nCopying manifest file(s) to depotcache...`);
            for (const filePath of manifestFiles) {
                try {
                    const destPath = path.join(depotcacheFolder, path.basename(filePath));
                    fs.copyFileSync(filePath, destPath);
                } catch (e) {
                    if (logCallback) logCallback(`  ✗ Failed: ${e}`);
                }
            }
        }

        if (logCallback) logCallback(`\n[4/5] Cleaning up...`);
        try {
            fs.rmSync(sourcePath, { recursive: true, force: true });
            if (logCallback) logCallback(`✓ Deleted temporary files`);
        } catch (e) {
            if (logCallback) logCallback(`⚠ Could not delete downloads folder: ${e}`);
        }

        return true;
    }

    async closeSteam(logCallback = null) {
        return new Promise((resolve) => {
            exec('taskkill /F /IM steam.exe', (error) => {
                // Ignore error if process not found
                if (logCallback) logCallback("✓ Steam closed");
                setTimeout(resolve, 1000, true);
            });
        });
    }

    async startSteam(logCallback = null) {
        const steamFolder = this.findSteamFolder();
        if (!steamFolder) return false;

        const steamExe = path.join(steamFolder, 'steam.exe');
        if (!fs.existsSync(steamExe)) return false;

        exec(`"${steamExe}"`);
        // We don't await this as it starts a GUI app
        await new Promise(r => setTimeout(r, 1000));
        if (logCallback) logCallback("✓ Steam started");
        return true;
    }

    async launchSteamtools(logCallback = null) {
        if (!this.steamtoolsExe) this.steamtoolsExe = this.findSteamtoolsExe();

        if (!this.steamtoolsExe || !fs.existsSync(this.steamtoolsExe)) {
            if (logCallback) logCallback("⚠ SteamTools.exe not found. Skipping launch.");
            return false;
        }

        exec(`"${this.steamtoolsExe}"`);
        await new Promise(r => setTimeout(r, 2000));
        if (logCallback) logCallback("✓ SteamTools launched");
        exec('taskkill /F /IM steamtools.exe');
        return true;
    }
}

module.exports = { SteamWebSearch, SteamToolsDownloader };
