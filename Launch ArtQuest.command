#!/bin/zsh
set -e

APP_DIR="$(cd -- "$(dirname "$0")" && pwd)"
HTML_FILE="${APP_DIR}/index.html"

if [ ! -f "${HTML_FILE}" ]; then
  echo "ArtQuest could not find index.html in:"
  echo "${APP_DIR}"
  read -k 1 "?Press any key to close."
  exit 1
fi

if open -Ra "Google Chrome"; then
  open -a "Google Chrome" "${HTML_FILE}"
else
  open "${HTML_FILE}"
fi

echo "ArtQuest opened from:"
echo "${HTML_FILE}"
echo "You can close this window after the browser opens."
