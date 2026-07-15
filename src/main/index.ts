// @ts-ignore
await import("v8-compile-cache");

import { app, components, ipcMain } from "electron";
import { join } from "path";
import { Store } from "./base/store.js";
import { AppEvents } from "./base/app.js";
import { Plugins } from "./base/plugins.js";
import { BrowserWindow } from "./base/browserwindow.js";
import { utils } from "./base/utils.js";
import fetch from "node-fetch";
import { spawn } from "child_process";
import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";

const appName = 'sh.cider.classic';
app.commandLine.appendSwitch("no-verify-widevine-cdm");

if (!app.isPackaged) {
  app.setPath('userData', join(app.getPath('appData'), `${appName}.dev`));
} else {
  app.setPath('userData', join(app.getPath('appData'), appName));
}

// Analytics for debugging - wrapped in try/catch to prevent crash if Sentry fails
try {
  const { init: Sentry } = await import("@sentry/electron");
  const { RewriteFrames } = await import("@sentry/integrations");
  Sentry({
    dsn: "https://68c422bfaaf44dea880b86aad5a820d2@o954055.ingest.sentry.io/6112214",
    integrations: [
      new RewriteFrames({
        root: process.cwd(),
      }),
    ],
  });
} catch (e) {
  console.warn("[Cider] Sentry initialization failed, continuing without error reporting:", e);
}

new Store();
const Cider = new AppEvents();
const CiderPlug = new Plugins();

/**
 * Creates the browser window - extracted to avoid duplication between
 * the Widevine success and fallback paths.
 */
async function createAppWindow() {
  const bw = new BrowserWindow();
  console.log("[Cider] Creating Window.");
  const win = await bw.createWindow();

  app.getGPUInfo("complete").then((gpuInfo) => {
    console.log(gpuInfo);
  }).catch(() => {});

  console.log("[Cider][Widevine] Status:", components.status());
  Cider.bwCreated();
  win.on("ready-to-show", () => {
    console.debug("[Cider] Window is Ready.");
    CiderPlug.callPlugins("onReady", win);
    if (!app.commandLine.hasSwitch("hidden")) {
      win.show();
    }
  });
}

async function checkAndApplyUpdates() {
  try {
    console.log("[Cider] Checking for updates...");
    const res = await fetch("https://api.github.com/repos/krishna3163/Cider-desktop/releases/latest", {
      headers: { "User-Agent": "Cider-Desktop-App" }
    });
    if (!res.ok) {
      console.warn("[Cider] Update check failed: API response not OK");
      return;
    }
    const release = await res.json() as any;
    const latestVersion = (release.tag_name || "").replace(/^v/, "");
    const currentVersion = app.getVersion();
    
    console.log(`[Cider] Current version: ${currentVersion}, Latest version: ${latestVersion}`);
    
    if (latestVersion && latestVersion !== currentVersion) {
      console.log("[Cider] New version available! Initializing automatic download...");
      
      const exeAsset = release.assets.find((asset: any) => asset.name.endsWith(".exe"));
      if (!exeAsset) {
        console.warn("[Cider] No executable installer found in the latest release assets");
        return;
      }
      
      const downloadUrl = exeAsset.browser_download_url;
      const installerPath = join(app.getPath("temp"), exeAsset.name);
      
      console.log(`[Cider] Downloading installer from ${downloadUrl} to ${installerPath}`);
      const downloadRes = await fetch(downloadUrl);
      if (!downloadRes.ok) {
        console.warn("[Cider] Failed to download installer binary");
        return;
      }
      
      const fileStream = createWriteStream(installerPath);
      // @ts-ignore
      await pipeline(downloadRes.body, fileStream);
      console.log("[Cider] Download completed! Launching installer...");
      
      const installerProcess = spawn(installerPath, [], {
        detached: true,
        stdio: "ignore"
      });
      installerProcess.unref();
      
      console.log("[Cider] Quitting application to run installer...");
      app.quit();
    }
  } catch (error) {
    console.error("[Cider] Error checking for updates:", error);
  }
}

/*~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 * App Event Handlers
 * ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
app.on("ready", async () => {
  await utils.initializeTranslations();
  Cider.ready(CiderPlug);

  console.log("[Cider] Application is Ready. Creating Window.");
  if (!app.isPackaged) {
    console.info("[Cider] Running in development mode.");
    try {
      // @ts-ignore
      (await import("vue-devtools")).default.install();
    } catch (e) {
      console.warn("[Cider] vue-devtools failed to load (this is non-critical):", e);
    }
  }

  // Try to wait for Widevine CDM components, but fall back if they fail
  // (e.g. when not using the Castlabs Electron fork)
  try {
    await components.whenReady();
    console.log("[Cider] Widevine components ready.");
  } catch (e) {
    console.warn("[Cider] Widevine components failed to load (DRM playback may be limited):", e);
  }

  await createAppWindow();
  // Perform background update check after app window is created
  checkAndApplyUpdates();
});

/*~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 * Renderer Event Handlers
 * ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
let rendererInitialized = false;
ipcMain.handle("renderer-ready", (event) => {
  if (rendererInitialized) return;
  CiderPlug.callPlugins("onRendererReady", event);
  rendererInitialized = true;
});

ipcMain.on("playbackStateDidChange", (_event, attributes) => {
  CiderPlug.callPlugins("onPlaybackStateDidChange", attributes);
});

ipcMain.on("nowPlayingItemDidChange", (_event, attributes) => {
  CiderPlug.callPlugins("onNowPlayingItemDidChange", attributes);
});

ipcMain.on("playbackTimeDidChange", (_event, attributes) => {
  CiderPlug.callPlugins("playbackTimeDidChange", attributes);
});

app.on("before-quit", () => {
  CiderPlug.callPlugins("onBeforeQuit");
  console.warn(`${app.getName()} exited.`);
});

