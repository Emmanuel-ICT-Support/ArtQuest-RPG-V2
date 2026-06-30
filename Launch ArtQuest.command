#!/bin/zsh
set -e

APP_DIR="$(cd -- "$(dirname "$0")" && pwd)"
HTML_FILE="${APP_DIR}/index.html"
CACHE_BUSTER="$(date +%s)"

if [ ! -f "${HTML_FILE}" ]; then
  echo "ArtQuest could not find index.html in:"
  echo "${APP_DIR}"
  read -k 1 "?Press any key to close."
  exit 1
fi

if command -v python3 >/dev/null 2>&1; then
  HTML_TARGET="$(python3 -c 'from pathlib import Path; import sys; print(Path(sys.argv[1]).resolve().as_uri())' "${HTML_FILE}")?v=${CACHE_BUSTER}"
else
  HTML_TARGET="file://${HTML_FILE// /%20}?v=${CACHE_BUSTER}"
fi

if open -Ra "Google Chrome"; then
  open -a "Google Chrome" "${HTML_TARGET}"
else
  open "${HTML_TARGET}"
fi

echo "ArtQuest opened from:"
echo "${HTML_FILE}"
echo "You can close this window after the browser opens."
