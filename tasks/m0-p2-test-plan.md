# M0.P2 Test Plan

Execute this checklist on the fresh ISO after it finishes building
(from run `24272911555` or later). Expected time: ~10 minutes.

## Setup (2 minutes)

1. Go to https://github.com/viraajbindra-a11y/Astrion-OS/releases/latest
2. Download the newest `astrion-os-*-amd64.iso` (should be >v0.1.99)
3. Open UTM → delete the old VM if any → create new Linux VM
4. Boot ISO → 4 GB RAM → 20 GB disk → start the VM
5. Wait for boot to complete → should land on either the native shell desktop
   or the setup wizard (if it's the first boot)

## Test 1 — Native shell is the default ✓

**What to check:** You're looking at nova-shell (C/GTK3), not nova-renderer (web).

**How to tell:**
- The menubar at the top does NOT have "Finder File Edit View Window Help" from macOS style
- Right-click the desktop background → native GTK menu appears with "New Folder" (disabled), "Change Wallpaper", "Display Settings", "Open Terminal", "Open Finder", "About Astrion OS"
- If the menu looks like a web popup instead of native GTK, something's wrong

**✅ PASS** if the right-click menu is a native GTK menu with those entries.

## Test 2 — Brain indicator in the menubar ✓

**What to check:** The `S1` pill is visible in the top-right of the menubar.

**How to tell:**
- Look at the top right of the screen
- Should see a small pill with cyan background and dark "S1" text
- It should be the LEFTMOST item in the right side of the menubar (before Wi-Fi, Bluetooth, Volume, Battery)

**✅ PASS** if you see the cyan S1 pill.

## Test 3 — Wi-Fi picker (CLICK) ✓

**What to check:** Clicking the Wi-Fi icon opens a native GTK dialog listing networks.

**Steps:**
1. Find the 📶 Wi-Fi icon in the top-right menubar
2. Click it once
3. A modal dialog should open titled "Wi-Fi Networks"
4. It should show a header "Wi-Fi" + hint "Click a network to connect"
5. Below that: a scrollable list of network rows with SSID, signal bars, lock icon for secured networks
6. If VM has no Wi-Fi, should show "No networks found. Try again in a few seconds."
7. Close button at bottom right — click to dismiss

**Common issues:**
- If dialog doesn't open: click handler broken (check devtools/stderr if web)
- If dialog opens but is empty: `nmcli` not installed in the chroot
- If layout is weird: CSS class `nova-about-dialog` issue

**✅ PASS** if dialog opens, shows list (or empty state), closes cleanly.

## Test 4 — Bluetooth picker (CLICK) ✓

**What to check:** Clicking the Bluetooth icon scans and shows devices.

**Steps:**
1. Find the 🔵 Bluetooth icon (between Wi-Fi and Volume in the menubar)
2. Click it
3. A modal dialog should open titled "Bluetooth Devices"
4. Header "Bluetooth" + hint "Scanning for nearby devices..."
5. Below: list of devices with MAC + name (paired devices get checkmark, unpaired get open circle)
6. In a VM with no Bluetooth adapter, should show "No devices found. Make sure Bluetooth is on and try again."

**Common issues:**
- `bluetoothctl` not in PATH → nothing shows
- Adapter not powered → "No devices found" (expected in VM without BT hardware)

**✅ PASS** if dialog opens and shows either devices or the empty state cleanly.

## Test 5 — Volume slider (CLICK) ✓

**What to check:** Clicking the volume icon opens a small popover with a slider.

**Steps:**
1. Find the 🔊 (or 🔈/🔉) volume icon in the menubar
2. Click it
3. A small popover should appear below the icon (280x110 or so)
4. Header "🔊 Volume"
5. Horizontal slider (GtkScale) — drag it to change volume
6. Mute toggle button below the slider
7. Click the volume icon again → popover closes (toggle behavior)
8. Click elsewhere → popover closes (focus-out)

**Verify the slider actually works:**
- Drag the slider to 50% → menubar label should update to "🔉 50%"
- Click Mute → slider grays out, label shows "🔇 Muted"
- Click Unmute → slider re-enables

**Common issues:**
- Popover positioned off-screen → `gdk_window_get_origin` returned garbage
- Slider doesn't affect actual volume → `pactl` not installed

**✅ PASS** if popover opens, slider affects label, mute works.

## Test 6 — Window snap to edges ✓

**What to check:** Dragging a window to the screen edge snaps it.

**Steps:**
1. Click any app in the dock (e.g., Terminal)
2. Drag the titlebar slowly to the LEFT edge of the screen
3. When your mouse hits the left edge, the window should snap to the left half
4. Repeat with right edge → snap to right half
5. Repeat with top edge → window maximizes

**✅ PASS** if all 3 snap zones work.

## Test 7 — Keyboard shortcuts ✓

**What to check:** Ctrl+Space and Alt+Tab work globally.

**Steps:**
1. Close any open apps
2. Press `Ctrl+Space` → Spotlight/Search launcher should open
3. Press Escape → launcher closes
4. Open 2 apps (Terminal + Notes from the dock)
5. Press `Alt+Tab` → app switcher appears showing both
6. Release Alt → switches to the other app

**✅ PASS** if both shortcuts work.

## Test 8 — Ctrl+R does nothing ✓

**What to check:** Press Ctrl+R anywhere on the desktop. Nothing should reload.

**✅ PASS** if nothing happens (this is the whole point of the native shell).

## Test 9 — Launch all 52 apps (quick) ✓

**What to check:** All dock apps open without "App not found" errors.

**Steps:**
1. Click each icon in the dock, one by one
2. Each should open in its own GTK window
3. Close each before opening the next (to avoid clutter)

**The 52 apps include (dock shows a subset; use Search to find the rest):**
Finder, Notes, Terminal, Calculator, Settings, Text Editor, Draw, Browser,
Music, Calendar, App Store, Photos, Weather, Clock, Reminders, Task Manager,
Vault, Messages, Screen Recorder, Trash, Installer, Sticky Notes, Contacts,
Maps, Voice Memos, Pomodoro, PDF Viewer, Kanban, Habits, Video Player,
System Info, Translator, Converter, Color Picker, Stopwatch, Timer, Whiteboard,
Password Gen, Markdown, QR Code, Dictionary, Journal, Flashcards, Chess,
Snake, 2048, Budget, Quotes, Typing Test, Todo, Beat Studio, Live Chat.

**✅ PASS** if each opens without error. It's fine if some LOOK weird or have
unfixed bugs — we just need them to launch.

## Test 10 — Browser launches astrion-browser ✓

**What to check:** Clicking the Browser app launches the native astrion-browser binary, not the web iframe version.

**Steps:**
1. Click the Browser icon in the dock
2. A GTK window should open with an address bar + tabs
3. Type `github.com` in the address bar → should actually navigate
4. If you see a web iframe that can't load external sites → still broken

**✅ PASS** if astrion-browser launches and can navigate.

## Reporting results

For each test, mark ✅ PASS or ❌ FAIL. If any fail, include:
- Test number
- What you saw vs what was expected
- Screenshot if possible

Paste results into this file under a `## Test Run <date>` heading and I'll fix
whatever broke.

## After all tests pass

You've confirmed M0.P2 is fully working. Time to move to M0.P3 (web app polish)
and M0.P4 (install-to-disk default). Both phases are smaller than M0.P1 and M0.P2,
so the April 14 deadline is very doable.
