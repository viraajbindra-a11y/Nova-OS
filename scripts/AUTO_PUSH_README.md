# Auto-push (every 30 minutes)

`scripts/auto-push.sh` checks if the current branch has commits ahead of its
upstream (`origin/<branch>`) and pushes them. It refuses to push if the repo
is mid-rebase, mid-merge/cherry-pick/revert, in detached-HEAD state, or if
the branch is also behind upstream.

A copy of the launchd plist sits at `scripts/com.astrion.autopush.plist`.

## Install (one-time, per machine)

```bash
cp "scripts/com.astrion.autopush.plist" ~/Library/LaunchAgents/
launchctl load -w ~/Library/LaunchAgents/com.astrion.autopush.plist
launchctl list | grep astrion   # confirm: <pid> 0 com.astrion.autopush
```

`RunAtLoad=true` runs the script once at install and after every reboot;
`StartInterval=1800` reruns it every 30 minutes.

## Inspect

```bash
tail -n 20 scripts/auto-push.log              # script's own log
tail -n 20 scripts/auto-push.launchd.out.log  # launchd stdout
tail -n 20 scripts/auto-push.launchd.err.log  # launchd stderr
```

## Stop / restart

```bash
launchctl unload ~/Library/LaunchAgents/com.astrion.autopush.plist   # stop
launchctl load   -w ~/Library/LaunchAgents/com.astrion.autopush.plist # restart
```

## Uninstall

```bash
launchctl unload ~/Library/LaunchAgents/com.astrion.autopush.plist
rm ~/Library/LaunchAgents/com.astrion.autopush.plist
```
