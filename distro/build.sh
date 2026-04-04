#!/bin/bash
# NOVA OS — ISO Build Script
# Requires: Debian/Ubuntu with live-build installed
# Run: sudo bash build.sh

set -e

echo "========================================="
echo "  NOVA OS — Building Bootable ISO"
echo "========================================="

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BUILD_DIR="$SCRIPT_DIR/build"
OUTPUT_DIR="$SCRIPT_DIR/output"

# Clean previous build
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR" "$OUTPUT_DIR"
cd "$BUILD_DIR"

# Install build dependencies
echo "[1/6] Installing build tools..."
apt-get update -qq
apt-get install -y -qq live-build debootstrap syslinux isolinux xorriso 2>/dev/null

# Configure live-build
echo "[2/6] Configuring live system..."
lb config \
  --distribution bookworm \
  --archive-areas "main contrib non-free non-free-firmware" \
  --architectures amd64 \
  --binary-images iso-hybrid \
  --bootappend-live "boot=live quiet splash" \
  --debian-installer false \
  --memtest none \
  --iso-application "NOVA OS" \
  --iso-publisher "NOVA OS Project" \
  --iso-volume "NOVA-OS" \
  --image-name "nova-os"

# Define packages to install
echo "[3/6] Setting up packages..."
cat > config/package-lists/nova.list.chroot << 'PACKAGES'
# Display
xorg
xinit
openbox

# Browser (kiosk mode)
chromium
chromium-sandbox

# Audio
pulseaudio
alsa-utils

# Network
network-manager
wireless-tools
firmware-iwlwifi
firmware-misc-nonfree

# Node.js for local server
nodejs
npm

# System utilities
sudo
dbus-x11
policykit-1
upower
PACKAGES

# Copy NOVA OS files into the live filesystem
echo "[4/6] Copying NOVA OS files..."
CHROOT_DIR="config/includes.chroot"
mkdir -p "$CHROOT_DIR/opt/nova-os"
mkdir -p "$CHROOT_DIR/home/nova"
mkdir -p "$CHROOT_DIR/etc/systemd/system"
mkdir -p "$CHROOT_DIR/usr/local/bin"

# Copy the entire NOVA OS web app
cp -r "$PROJECT_ROOT/index.html" "$CHROOT_DIR/opt/nova-os/"
cp -r "$PROJECT_ROOT/css" "$CHROOT_DIR/opt/nova-os/"
cp -r "$PROJECT_ROOT/js" "$CHROOT_DIR/opt/nova-os/"
cp -r "$PROJECT_ROOT/server" "$CHROOT_DIR/opt/nova-os/"
cp -r "$PROJECT_ROOT/package.json" "$CHROOT_DIR/opt/nova-os/"
cp -r "$PROJECT_ROOT/package-lock.json" "$CHROOT_DIR/opt/nova-os/"
[ -d "$PROJECT_ROOT/assets" ] && cp -r "$PROJECT_ROOT/assets" "$CHROOT_DIR/opt/nova-os/"

# Create the auto-login and auto-start scripts
cat > "$CHROOT_DIR/usr/local/bin/nova-session" << 'SESSION'
#!/bin/bash
# NOVA OS Session Script — starts the full desktop experience

# Start PulseAudio
pulseaudio --start 2>/dev/null

# Install Node dependencies if needed
if [ ! -d /opt/nova-os/node_modules ]; then
  cd /opt/nova-os && npm install --production 2>/dev/null
fi

# Start the NOVA OS local server
cd /opt/nova-os
node server/index.js &
NOVA_PID=$!

# Wait for server to start
sleep 2

# Launch Chromium in kiosk mode
chromium \
  --no-first-run \
  --no-default-browser-check \
  --disable-translate \
  --disable-infobars \
  --disable-suggestions-ui \
  --disable-save-password-bubble \
  --disable-session-crashed-bubble \
  --disable-component-update \
  --noerrdialogs \
  --kiosk \
  --window-size=$(xdpyinfo | awk '/dimensions/{print $2}' | tr 'x' ',') \
  --app=http://localhost:3000 \
  2>/dev/null

# If Chromium closes, kill the server and restart
kill $NOVA_PID 2>/dev/null
SESSION
chmod +x "$CHROOT_DIR/usr/local/bin/nova-session"

# Openbox autostart
mkdir -p "$CHROOT_DIR/etc/xdg/openbox"
cat > "$CHROOT_DIR/etc/xdg/openbox/autostart" << 'AUTOSTART'
# Disable screen saver
xset s off
xset -dpms
xset s noblank

# Hide cursor after 3 seconds of inactivity
unclutter -idle 3 &

# Start NOVA OS
/usr/local/bin/nova-session &
AUTOSTART

# Create .xinitrc for startx
cat > "$CHROOT_DIR/home/nova/.xinitrc" << 'XINITRC'
exec openbox-session
XINITRC

# Auto-login service
cat > "$CHROOT_DIR/etc/systemd/system/nova-autologin.service" << 'AUTOLOGIN'
[Unit]
Description=NOVA OS Auto Login
After=systemd-user-sessions.service plymouth-quit-wait.service
After=getty@tty1.service

[Service]
Type=simple
ExecStart=/usr/local/bin/nova-startx
Restart=always
RestartSec=3
User=nova
Environment=DISPLAY=:0

[Install]
WantedBy=graphical.target
AUTOLOGIN

# startx wrapper
cat > "$CHROOT_DIR/usr/local/bin/nova-startx" << 'STARTX'
#!/bin/bash
export HOME=/home/nova
export DISPLAY=:0
cd /home/nova
exec startx /home/nova/.xinitrc -- :0 vt1 -keeptty
STARTX
chmod +x "$CHROOT_DIR/usr/local/bin/nova-startx"

# Getty autologin override
mkdir -p "$CHROOT_DIR/etc/systemd/system/getty@tty1.service.d"
cat > "$CHROOT_DIR/etc/systemd/system/getty@tty1.service.d/autologin.conf" << 'GETTY'
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin nova --noclear %I $TERM
GETTY

# Create user setup hook
mkdir -p "$CHROOT_DIR/../hooks/normal"
cat > "$CHROOT_DIR/../hooks/normal/0100-setup-user.hook.chroot" << 'HOOK'
#!/bin/bash
# Create nova user
useradd -m -s /bin/bash -G audio,video,sudo,netdev nova 2>/dev/null || true
echo "nova:nova" | chpasswd
echo "nova ALL=(ALL) NOPASSWD: ALL" >> /etc/sudoers

# Install node modules
cd /opt/nova-os && npm install --production 2>/dev/null || true

# Enable services
systemctl enable nova-autologin.service 2>/dev/null || true
systemctl enable NetworkManager 2>/dev/null || true

# Set ownership
chown -R nova:nova /home/nova
chown -R nova:nova /opt/nova-os
HOOK
chmod +x "$CHROOT_DIR/../hooks/normal/0100-setup-user.hook.chroot"

# Boot splash (optional - NOVA branding)
mkdir -p "$CHROOT_DIR/etc/default"
cat > "$CHROOT_DIR/etc/default/grub" << 'GRUB'
GRUB_DEFAULT=0
GRUB_TIMEOUT=0
GRUB_DISTRIBUTOR="NOVA OS"
GRUB_CMDLINE_LINUX_DEFAULT="quiet splash"
GRUB_CMDLINE_LINUX=""
GRUB_BACKGROUND=""
GRUB_TERMINAL_OUTPUT="gfxterm"
GRUB

# Build the ISO
echo "[5/6] Building ISO (this takes 10-20 minutes)..."
lb build 2>&1 | tail -5

# Move output
echo "[6/6] Finalizing..."
mv nova-os-amd64.hybrid.iso "$OUTPUT_DIR/nova-os.iso" 2>/dev/null || mv *.iso "$OUTPUT_DIR/nova-os.iso" 2>/dev/null

ISO_SIZE=$(du -h "$OUTPUT_DIR/nova-os.iso" | cut -f1)
echo ""
echo "========================================="
echo "  NOVA OS ISO built successfully!"
echo "  Size: $ISO_SIZE"
echo "  Location: $OUTPUT_DIR/nova-os.iso"
echo "========================================="
echo ""
echo "Flash to USB with:"
echo "  sudo dd if=$OUTPUT_DIR/nova-os.iso of=/dev/sdX bs=4M status=progress"
echo "  (or use Balena Etcher)"
