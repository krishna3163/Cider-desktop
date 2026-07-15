<p align="center">
  <a href="https://github.com/krishna3163/Cider-desktop"><img src="./resources/banner.png" width="90%" alt="Cider Desktop Banner"></a>
  <br><br>
  <b>A highly optimized, bug-fixed, and feature-rich development fork of the Apple Music desktop experience. 🚀</b>
  <br><br>
  <img src="https://img.shields.io/github/stars/krishna3163/Cider-desktop?label=Stars&style=for-the-badge&color=fc3c44" alt="GitHub Stars"/>
  <img src="https://img.shields.io/github/forks/krishna3163/Cider-desktop?label=Forks&style=for-the-badge&color=B48C69" alt="GitHub Forks"/>
  <a href="https://github.com/krishna3163/Cider-desktop/releases/latest"><img src="https://img.shields.io/github/v/release/krishna3163/Cider-desktop?label=Version&style=for-the-badge&color=4caf50" alt="Latest Version"/></a>
</p>

---

## 🔥 Key Enhancements & Fixes in this Fork

This fork modernizes Cider Classic and resolves critical errors that broke Apple Music playback and local library streaming.

### 🍏 Playback & DRM Optimizations
* **Forced Hardware Acceleration (Windows):** Overrides configurations to force GPU acceleration on Windows. This bypasses the Chromium Widevine `DRMUNSUPPORTED` error that restricted playback to 30-second previews and skipped songs.
* **Apple Music Developer Token Fallback:** Automatically fetches fallback tokens when official key-rotation servers are offline, keeping catalog streams functional.

### 📁 Rich Local Library Support
* **Multi-Format Support:** Stream `flac`, `m4a`, `mp3`, `aac`, `ogg`, `wav`, `webm`, and `opus` files directly.
* **Instantaneous Loading (Metadata Cache):** Scanned local songs are cached in a JSON storage layer. The app uses the *Stale-While-Revalidate* pattern to load tracks instantly on startup and scan directories in the background.
* **Folder Sync:** Added a direct **Sync Folders** button on the local playlist page for on-demand folder indexing.

### ⚡ Lower CPU Usage & Smooth Animations
* **V8 Garbage Collection Fix:** Increased the old-space V8 memory limit from `350MB` to `1024MB` (1GB) to prevent GC cycles from stuttering the UI thread and spiking CPU usage.
* **GPU Compositor Acceleration:** Configured CSS `will-change` properties on transition-heavy elements, transferring visual animation loads directly to your GPU.

### 🛠️ Interactive DRM Diagnostics
* **Live Status Check:** The app automatically checks your storefront region, IP country location, internet state, and subscription status when an error is caught.
* **Troubleshooting Assistant:** Displays recommendations to solve regional locks and expired login sessions.

---

## 📥 Get the Application (Windows)

Download the pre-compiled installer directly from the releases page:

👉 **[Download Cider Dev Setup (Releases)](https://github.com/krishna3163/Cider-desktop/releases)**

---

## 🛠️ Development & Build Guide

Ensure you have [Node.js (>= 18)](https://nodejs.org/) installed:

1. Clone the repository:
   ```bash
   git clone https://github.com/krishna3163/Cider-desktop.git
   cd Cider-desktop
   ```
2. Install dependencies:
   ```bash
   yarn install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Build and compile the Windows installer:
   ```bash
   npm run dist:win
   ```

---

## Disclaimer
*This project is NOT affiliated with Apple in any way. You must have an active Apple Music subscription to stream catalog tracks.*
