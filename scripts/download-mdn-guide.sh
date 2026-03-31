#!/usr/bin/env bash
set -euo pipefail

# Downloads the MDN JavaScript Guide content from GitHub into the mdn/ folder.
# Requires: gh (GitHub CLI), curl
#
# Usage:
#   ./scripts/download-mdn-guide.sh [commit-sha]
#
# If no commit SHA is provided, defaults to the main branch.

REPO="mdn/content"
BASE_PATH="files/en-us/web/javascript/guide"
REF="${1:-main}"
OUT_DIR="$(git rev-parse --show-toplevel)/mdn"

download_folder() {
  local api_path="$1"
  local out_path="$2"

  mkdir -p "$out_path"

  gh api "repos/$REPO/contents/$api_path?ref=$REF" --jq '.[] | .type + "\t" + .name + "\t" + (.download_url // "")' |
    while IFS=$'\t' read -r type name url; do
      if [ "$type" = "file" ] && [ -n "$url" ]; then
        curl -sL "$url" -o "$out_path/$name"
      elif [ "$type" = "dir" ]; then
        echo "  Entering $name/"
        download_folder "$api_path/$name" "$out_path/$name"
      fi
    done
}

echo "Downloading MDN JavaScript Guide (ref: $REF) into $OUT_DIR"
echo "---"

# Get top-level folders
folders=$(gh api "repos/$REPO/contents/$BASE_PATH?ref=$REF" --jq '.[] | select(.type=="dir") | .name')

for folder in $folders; do
  echo "Downloading $folder..."
  download_folder "$BASE_PATH/$folder" "$OUT_DIR/$folder"
done

echo "---"
echo "Done! Downloaded to $OUT_DIR"
