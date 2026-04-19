#!/bin/bash
# Astrion OS — auto-push every N minutes via launchd
# Pushes commits already on the local branch that aren't yet on origin/<branch>.
# Refuses to do anything if the repo is mid-rebase, mid-merge, or has a detached HEAD.
# Plain `git push` (never --force) and only the current branch.

set -u
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"

REPO="/Users/parul/Nova OS"
LOG="$REPO/scripts/auto-push.log"

ts() { date "+%Y-%m-%d %H:%M:%S"; }
log() { echo "[$(ts)] $*" >> "$LOG"; }

cd "$REPO" 2>/dev/null || { log "FATAL: cannot cd into $REPO"; exit 1; }

# Refuse mid-state operations.
if [ -d .git/rebase-merge ] || [ -d .git/rebase-apply ]; then
  log "skip: rebase in progress"; exit 0
fi
if [ -f .git/MERGE_HEAD ] || [ -f .git/CHERRY_PICK_HEAD ] || [ -f .git/REVERT_HEAD ]; then
  log "skip: merge/cherry-pick/revert in progress"; exit 0
fi

BRANCH=$(git symbolic-ref --short HEAD 2>/dev/null || true)
if [ -z "$BRANCH" ]; then
  log "skip: detached HEAD"; exit 0
fi

# Make sure the branch tracks a remote; if not, do nothing.
UPSTREAM=$(git rev-parse --abbrev-ref --symbolic-full-name "@{u}" 2>/dev/null || true)
if [ -z "$UPSTREAM" ]; then
  log "skip: $BRANCH has no upstream"; exit 0
fi

# Refresh remote refs (read-only). Tolerate network failure.
if ! git fetch --quiet origin "$BRANCH" 2>>"$LOG"; then
  log "skip: git fetch failed"; exit 0
fi

AHEAD=$(git rev-list --count "$UPSTREAM..HEAD" 2>/dev/null || echo 0)
BEHIND=$(git rev-list --count "HEAD..$UPSTREAM" 2>/dev/null || echo 0)

if [ "$AHEAD" = "0" ]; then
  log "noop: $BRANCH up to date with $UPSTREAM"
  exit 0
fi

if [ "$BEHIND" != "0" ]; then
  log "skip: $BRANCH is $AHEAD ahead but also $BEHIND behind $UPSTREAM (would need rebase/merge)"
  exit 0
fi

log "pushing $AHEAD commit(s) to $UPSTREAM"
if git push origin "$BRANCH" >>"$LOG" 2>&1; then
  log "OK: pushed $AHEAD commit(s)"
else
  log "FAIL: push exited non-zero"
fi
