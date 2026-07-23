# ArtQuest: The Gallery of Secrets

This folder contains the original game structure plus a standalone `index.html` entry point that runs outside Google AI Studio.

## Run From HTML

Open `index.html` directly in a modern browser. Chrome is recommended. The page loads React, Tailwind, Babel, and jsPDF from public CDNs, then runs the existing game source embedded into the HTML file.

ArtQuest now runs in offline Curator mode. It does not require a Gemini API key. Curator dialogue, progress feedback, vocabulary prompts, and the level artwork selections are generated locally from the files in this folder.

The curated artwork manifest lives in `public/images/artworks/manifest.json`, and the app's source-facing artwork map lives in `data/ArtworkSelections.ts`. Artworks can be sourced from the Art Institute of Chicago API or the Metropolitan Museum of Art Open Access API, then downloaded as local JPG files in `public/images/artworks`. This keeps the standalone HTML working without a local server or a live museum API connection. Each record includes a `sourceProvider`, `isPublicDomain`, and `copyrightNotice` for audit purposes.

To refresh the curated artwork selections, run:

```bash
node --use-system-ca scripts/fetch-artic-artwork-assets.mjs
```

Useful options:

```bash
node --use-system-ca scripts/fetch-artic-artwork-assets.mjs --dry-run
node --use-system-ca scripts/fetch-artic-artwork-assets.mjs --dry-run --verify-images
node --use-system-ca scripts/fetch-artic-artwork-assets.mjs --public-domain-only
```

If you specifically want to reference AIC IIIF URLs instead of saving local JPGs, add `--hotlink-only`, but direct `file://` use is more reliable with the local files.

### Museum sources

`scripts/fetch-artic-artwork-assets.mjs` is a multi-source artwork collector (the filename is retained for compatibility). Art Institute selections use its search and artwork endpoints; Met selections use the Collection API's object and search endpoints. To pin a Met work, add a manual selection using `sourceProvider: MET_SOURCE` and its Met object ID. The script normalises both APIs into the same game artwork record and saves the chosen image locally.

The running game always uses the local artwork manifest and images. Museum APIs are used only when curating or refreshing the artwork collection.

Note: this removes the AI/API requirement, but the current standalone HTML still loads React, Tailwind, Babel, and jsPDF from public CDNs. To make the app work with no internet connection at all, those browser libraries would also need to be saved locally and referenced from the folder.

On macOS, double-click `Launch ArtQuest.command` to open `index.html` directly in Google Chrome. If Chrome is not installed, it will use the default browser.

You can also right-click `index.html`, choose **Open With**, and select Google Chrome.

## Rebuild The HTML

If you edit the `.tsx` or `.ts` source files, rebuild the standalone HTML with:

```bash
node scripts/build-standalone.mjs
```

The original folder structure is maintained: components remain in `components/`, offline Curator logic remains in `services/`, scripted content remains in `data/`, and images remain in `public/images/`.
