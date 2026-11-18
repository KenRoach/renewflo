#!/usr/bin/env bash
# extract-to-repo — move a folder of this repo into its own (private) GitHub repo, keeping its history.
#
# Usage:
#   scripts/extract-to-repo.sh [options] <folder> <owner/name>
#
# Example (the KitZ hiring kit):
#   scripts/extract-to-repo.sh --remove hiring/kitz-backend-challenge KenRoach/kitz-backend-challenge
#
# Options:
#   --public         Create the repo as public (default: private)
#   --remove         Afterwards, open a draft PR in THIS repo that deletes <folder> (never merges it)
#   --remote <url>   Push to this git URL instead of creating a GitHub repo (skips `gh repo create`)
#   --dry-run        Print what would happen, change nothing
#   -h, --help       Show this help
#
# Needs: git, and the GitHub CLI `gh` logged in (`gh auth login`) unless --remote is given.
# Safe by default: refuses a dirty working tree, refuses a target repo that already has commits,
# and never deletes anything from this repo without a PR you review.

set -euo pipefail

VISIBILITY=private
REMOVE=0
DRY=0
REMOTE_URL=""

die()  { echo "✗ $*" >&2; exit 1; }
info() { echo "→ $*"; }
run()  { if [[ $DRY == 1 ]]; then echo "  [dry-run] $*"; else "$@"; fi; }
usage() { sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//'; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --public)  VISIBILITY=public; shift ;;
    --remove)  REMOVE=1; shift ;;
    --remote)  [[ $# -ge 2 ]] || die "--remote needs a URL"; REMOTE_URL="$2"; shift 2 ;;
    --dry-run) DRY=1; shift ;;
    -h|--help) usage; exit 0 ;;
    -*)        die "unknown option: $1 (see --help)" ;;
    *)         break ;;
  esac
done
[[ $# -eq 2 ]] || { usage; exit 1; }

FOLDER="${1%/}"
TARGET="$2"
[[ "$TARGET" =~ ^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$ ]] || die "target must look like owner/name, got: $TARGET"

# ---------- preflight ----------
command -v git >/dev/null || die "git not installed"
ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || die "run this inside a git repo"
cd "$ROOT"
[[ -d "$FOLDER" ]] || die "folder not found: $FOLDER"
[[ -n "$(git log --oneline -1 -- "$FOLDER")" ]] || die "folder has no committed history: $FOLDER"
[[ -z "$(git status --porcelain)" ]] || die "working tree not clean — commit or stash first"

if [[ -z "$REMOTE_URL" || $REMOVE == 1 ]]; then
  command -v gh >/dev/null || die "GitHub CLI 'gh' not installed (https://cli.github.com)"
  gh auth status >/dev/null 2>&1 || die "gh is not logged in — run: gh auth login"
fi

info "Folder:  $FOLDER ($(git ls-files -- "$FOLDER" | wc -l | tr -d ' ') files)"
info "Target:  $TARGET ($VISIBILITY)"

# ---------- 1. create (or verify) the target repo ----------
if [[ -z "$REMOTE_URL" ]]; then
  if gh repo view "$TARGET" >/dev/null 2>&1; then
    COMMITS="$(gh api "repos/$TARGET/commits?per_page=1" 2>/dev/null | grep -c '"sha"' || true)"
    [[ "$COMMITS" == 0 ]] || die "$TARGET already exists and has commits — refusing to overwrite"
    info "$TARGET exists and is empty — reusing it"
  else
    info "Creating $TARGET ($VISIBILITY)"
    run gh repo create "$TARGET" "--$VISIBILITY" --description "Extracted from $(basename "$ROOT")/$FOLDER"
  fi
  REMOTE_URL="https://github.com/$TARGET.git"
fi

# ---------- 2. split the folder's history and push it ----------
SPLIT_BRANCH="extract/$(echo "$FOLDER" | tr '/' '-')-$$"
info "Splitting history of $FOLDER"
if [[ $DRY == 1 ]]; then
  echo "  [dry-run] git subtree split --prefix=$FOLDER -b $SPLIT_BRANCH"
  echo "  [dry-run] git push $REMOTE_URL $SPLIT_BRANCH:main"
else
  git subtree split -q --prefix="$FOLDER" -b "$SPLIT_BRANCH" >/dev/null
  trap 'git branch -D "$SPLIT_BRANCH" >/dev/null 2>&1 || true' EXIT
  info "Pushing $(git rev-list --count "$SPLIT_BRANCH") commit(s) to $REMOTE_URL (main)"
  git push -q "$REMOTE_URL" "$SPLIT_BRANCH:main"
fi

# ---------- 3. optional: PR that removes the folder from this repo ----------
if [[ $REMOVE == 1 ]]; then
  BASE="$(git rev-parse --abbrev-ref HEAD)"
  RM_BRANCH="chore/remove-$(echo "$FOLDER" | tr '/' '-')"
  info "Opening a draft PR in this repo that removes $FOLDER (you merge it)"
  run git checkout -q -b "$RM_BRANCH"
  run git rm -rq -- "$FOLDER"
  run git commit -qm "chore: move $FOLDER to $TARGET" -m "History preserved in https://github.com/$TARGET"
  run git push -qu origin "$RM_BRANCH"
  run gh pr create --draft --base "$BASE" --head "$RM_BRANCH" \
    --title "chore: move $FOLDER to $TARGET" \
    --body "Moved \`$FOLDER\` (with history) to https://github.com/$TARGET. This PR only deletes the old copy."
  run git checkout -q "$BASE"
fi

echo
echo "✓ Done${DRY:+}$([[ $DRY == 1 ]] && echo ' (dry run — nothing changed)')"
[[ -n "${TARGET:-}" && $DRY == 0 && "$REMOTE_URL" == https://github.com/* ]] && echo "  https://github.com/$TARGET"
exit 0
