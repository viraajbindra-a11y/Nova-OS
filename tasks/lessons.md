# Astrion OS — Lessons Learned

## Architecture
1. **Never use RGBA transparency without a compositor.** All `rgba()` in CSS and `gdk_screen_get_rgba_visual()` in C render as WHITE on X11 without compositing. Use solid colors only.
2. **`gtk_window_fullscreen()` needs a window manager.** Without a WM, use `gtk_window_resize(w, screen_width, screen_height)` + `gtk_window_move(w, 0, 0)` instead.
3. **`gtk_window_begin_move_drag()` needs a WM.** Without a WM, implement manual drag via motion-notify-event.
4. **GDK_SCALE=2 + GDK_DPI_SCALE compound.** Don't use both — GDK_SCALE alone handles HiDPI for native shell. Web content zoom is separate (webkit_web_view_set_zoom_level).
5. **ESM imports must be at the top of the file.** `import { X } from 'y'` inside a function or try/catch block crashes Node.js in ESM mode.
6. **C forward declarations required.** If function A calls function B and B is defined after A, add `static void B(...)` declaration at the top.
7. **C++ lambda syntax (`+[](...){}`) doesn't work in C.** Use named callback functions.
8. **A web page is NOT an operating system.** Users notice Ctrl+R, right-click menus, scroll bounce, and other browser behaviors. A native shell with WebKitGTK app windows is the right architecture.

## Live ISO
9. **Live ISOs lose ALL state on reboot.** localStorage, Wi-Fi profiles, settings — everything is in RAM overlay. Install to disk for persistence.
10. **System clock is wrong on live boot.** NTP needs internet, internet needs Wi-Fi, Wi-Fi needs manual setup. Use `ntpdate -u` (UDP, no SSL) in .xinitrc.
11. **DNS must be set explicitly.** Live ISOs often have empty `/etc/resolv.conf`. Write `nameserver 8.8.8.8` before anything network-dependent.
12. **SSL cert errors = wrong clock.** If `curl` fails with cert error (code 60), fix the date first: `sudo date -s "2026-04-07 12:00:00"`.

## Surface Pro 6
13. **Marvell Wi-Fi needs `firmware-misc-nonfree`.** The AVASTAR chip doesn't work without proprietary firmware blobs.
14. **Surface Pro 6 is 2736x1824 at 267 DPI.** Without scaling, everything is microscopic. GDK_SCALE=2 for native GTK, webkit_web_view_set_zoom_level(1.75) for web content.
15. **The `-nocursor` flag on `startx` permanently hides the cursor.** Don't use it. Use `xsetroot -cursor_name left_ptr` instead.
16. **`prompt()` may be blocked in WebKitGTK.** Use custom HTML dialogs instead of JavaScript `prompt()`, `confirm()`, `alert()`.

## Development
17. **`sudo nova-update` only updates web files (JS/CSS/HTML).** Compiled C binaries need a new ISO build or manual recompile on the device.
18. **Test on real hardware, not just in the browser.** Many features (battery, Wi-Fi, Bluetooth, audio) only work on the ISO.
19. **Don't hallucinate features.** Always verify with `grep` or `ls` that code actually exists before claiming it works.
20. **Cancel and retrigger builds rather than waiting for stale ones.** If you push a fix after triggering a build, the running build doesn't have the fix.
