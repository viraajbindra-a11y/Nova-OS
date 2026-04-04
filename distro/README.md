# NOVA OS — Custom Linux Distribution

This builds a bootable `.iso` file that boots directly into NOVA OS.

## How it works

- Based on **Debian 12 (Bookworm)** minimal
- Boots to auto-login, no password
- Starts X11 + Chromium in kiosk mode
- Chromium loads NOVA OS from a local Node.js server
- No traditional desktop environment — NOVA OS IS the desktop

## Building the ISO

### Option 1: GitHub Actions (Recommended)
Push to the `main` branch. The GitHub Action builds the ISO automatically.
Download it from the Actions tab → Artifacts.

### Option 2: Build locally (requires Linux)
```bash
cd distro
sudo bash build.sh
```
The ISO will be at `distro/output/nova-os.iso`.

## Flashing to USB
```bash
# macOS
sudo dd if=output/nova-os.iso of=/dev/diskN bs=4M status=progress

# Linux
sudo dd if=output/nova-os.iso of=/dev/sdX bs=4M status=progress

# Or use Balena Etcher (GUI) — https://etcher.balena.io
```

## System Requirements
- 2GB RAM minimum (4GB recommended)
- 8GB USB drive or disk space
- x86_64 processor
- Network connection (for AI features, optional)
