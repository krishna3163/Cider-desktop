// @ts-ignore
await import("v8-compile-cache");

import { app, components, ipcMain } from "electron";
import { join } from "path";
import { Store } from "./base/store.js";
import { AppEvents } from "./base/app.js";
import { Plugins } from "./base/plugins.js";
import { BrowserWindow } from "./base/browserwindow.js";
import { utils } from "./base/utils.js";

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

