# Astrion OS Auto-Updater

**Shipped in:** v0.2.0 (2026-04-20 target) — Polish Sprint Day 6-7

This doc explains how Astrion checks for and installs updates, what
the three different update paths are, and the known limitations you
should expect to hit.

---

## The three update paths

Astrion runs in three different contexts, and each has its own update
mechanism. The `Check for Updates…` item in the Apple menu does the
right thing for whichever one you're running.

### 1. Electron desktop app (.dmg / .exe / .AppImage)

**Path:** `update-electron-app` → Squirrel (Electron's built-in
updater) → GitHub releases → background download → restart to apply.

**How it works:**
1. On launch, `installer/main.js:setupAutoUpdater()` configures
   `update-electron-app` to poll `viraajbindra-a11y/Astrion-OS`
   releases every hour.
2. When a new release is detected, Squirrel downloads the matching
   platform asset in the background.
3. When the download completes, the renderer gets an IPC event
   (`updater:downloaded`) which fires an Astrion notification:
   > "Astrion v0.2.1 ready to install — [Restart] [Later]"
4. Clicking "Restart" calls `autoUpdater.quitAndInstall()`, which
   swaps the app and relaunches into the new version.

**Manual check:** Apple menu → "Check for Updates…" calls
`window.astrionElectron.updater.check()` which pokes the updater
immediately. The Astrion notification center reflects the result.

**Known limits:**
- **macOS code signing not configured for v0.2.** Unsigned builds
  trigger Gatekeeper on first launch (users click "Open Anyway" in
  System Settings → Privacy & Security). Squirrel's auto-update
  also requires a signed build on macOS — on unsigned builds the
  updater will fail silently and Astrion will fall back to showing
  "Open Releases" to let users download manually.
- **Windows unsigned installer** shows a SmartScreen warning on
  first run. Workaround: users click "More info" → "Run anyway".
- **Linux AppImage** updates via `update-electron-app` work without
  signing but require the AppImage to be writable at the install
  location (true by default).

### 2. Bootable ISO (installed to disk)

**Path:** System package manager equivalent — not yet shipped in
v0.2. Currently the installed ISO is immutable between releases;
users re-download the latest ISO and reinstall if they want to
update. Roadmap item for post-v0.2.

**Workaround for v0.2 users:** open Firefox/Chromium inside Astrion,
visit `https://github.com/viraajbindra-a11y/Astrion-OS/releases/latest`,
download the new ISO, boot from it.

### 3. Web app (running in a browser)

**Path:** Server-side git-pull via `/api/update/check`.

**How it works:** The Express server that serves Astrion has a
`/api/update/check` POST endpoint that runs `git pull` on the
Astrion repo and returns a JSON status. The menubar
`checkForUpdates()` falls back to this path when it can't find
`window.astrionElectron.isDesktopApp`.

**Limits:** only works if the web server runs from a git checkout
with network access and the server process has permission to
write to the repo. In production hosting it's disabled.

---

## Architecture

```
┌─────────────────────────────────────┐
│ installer/main.js (Electron main)   │
│  ├─ update-electron-app (Squirrel)  │  ← polls GitHub releases
│  ├─ autoUpdater.on('...') → IPC ─┐  │     every 1h
│  └─ ipcMain.handle('updater:*')  │  │
└──────────────────────────────────┼──┘
                                   │
                      ┌────────────┴────┐
                      │ preload.js      │  ← exposes
                      │ window.astrion  │     window.astrionElectron.updater
                      │   Electron.     │     { check, install, state,
                      │   updater       │       openReleases, onChecking,
                      │                 │       onAvailable, onDownloaded,
                      └─────────────────┘       onError }
                              │
                              ▼
┌─────────────────────────────────────┐
│ js/shell/menubar.js                 │
│  ├─ checkForUpdates()               │  ← Apple menu item
│  │    - detects Electron vs web     │
│  │    - dispatches to right path    │
│  └─ wireElectronUpdaterEvents()     │  ← runs on boot;
│       - fires Astrion notifications │     forwards push events
│         on update-available and     │     to the notification center
│         update-downloaded           │
└─────────────────────────────────────┘
```

---

## IPC handlers (installer/main.js)

| Channel | Payload | Returns | Purpose |
|---|---|---|---|
| `updater:check` | — | `{ ok, state, error? }` | Force an immediate update check |
| `updater:install` | — | `{ ok, error? }` | Apply a downloaded update + restart |
| `updater:state` | — | `{ available, downloaded, version, error }` | Current updater state (sync) |
| `updater:open-releases` | — | `{ ok }` | Open GitHub releases page in the user's default browser |

## Events pushed to the renderer

| Channel | Payload | When |
|---|---|---|
| `updater:checking` | — | Check started |
| `updater:available` | `{ version, ... }` | A new release was found |
| `updater:none` | — | No new release |
| `updater:downloaded` | `{ version, ... }` | Update downloaded and ready to install |
| `updater:error` | `{ message }` | Squirrel reported an error |

Renderer code subscribes via `window.astrionElectron.updater.onChecking
(cb)` etc. The menubar's `wireElectronUpdaterEvents()` function does
the default wiring so Astrion notifications fire automatically.

---

## For developers: testing update flows

**In dev (running `npm run dev` or `node server/index.js`):**
- You're in the web path. `/api/update/check` will try to `git pull`.
- If you want to test the Electron path without building, build a
  dev DMG with `cd installer && npm run build:mac`, open it, and
  watch `~/Library/Logs/Astrion OS/main.log` for the updater chatter.

**Simulating a new release (from the Electron build):**
1. Bump `installer/package.json`'s `version` field to a value HIGHER
   than the currently-published GitHub release.
2. Build with `npm run build:mac` / `build:win` / `build:linux`.
3. Upload the output to a fake release tag (`v0.2.1-test` or similar).
4. Launch the current installed version. Within 1 hour it should
   notice the new version and start downloading.
5. For faster testing, manually run the Apple menu → "Check for
   Updates…" item.

**Resetting updater state during dev:** there's no in-app "forget
pending update" toggle in v0.2. If you want to re-test, delete the
Squirrel cache manually:
- macOS: `~/Library/Caches/com.astrionos.desktop.ShipIt/`
- Windows: `%LOCALAPPDATA%\astrion-os-updater\`
- Linux: `~/.config/astrion-os/` (AppImage stores update state here)

---

## Roadmap (post v0.2)

- **Code signing for macOS + Windows.** Apple developer cert ($99/yr)
  + EV code signing cert for Windows (~$300/yr). Deferred until
  revenue lands in M3.
- **Delta updates.** Squirrel supports delta patches that only
  download the diff between versions. Cuts update size from ~100MB
  to ~10MB. Requires `electron-builder` config tweaks.
- **Update channels (stable, beta, canary).** Let power users
  opt into pre-releases.
- **ISO auto-update.** Bootable Astrion installs currently need a
  full reinstall to update. A minimal package manager that pulls
  from GitHub releases on boot would fix this — probably M5+ work.
- **Update receipts** (verifiable provenance). Matches the M4
  verifiable code generation thesis — every update ships with a
  receipt showing which commits landed, which tests passed, and
  who signed off.
