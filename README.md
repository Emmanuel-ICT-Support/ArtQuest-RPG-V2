# ArtQuest: The Gallery of Secrets

This folder contains the ArtQuest game source configured for a Vite production build that can be published to GitHub Pages.

## Run Locally

Install dependencies and run the Vite dev server:

```bash
npm install
npm run dev
```

Build and preview the same static files that GitHub Pages will serve:

```bash
npm run build
npm run preview
```

The published GitHub Pages path is configured in `vite.config.ts` as `/ArtQuest-RPG-V2/`.

ArtQuest runs in offline Curator mode. It does not require a Gemini API key. Curator dialogue, progress feedback, vocabulary prompts, and the level artwork selections are generated locally from the files in this folder.

The curated artwork manifest lives in `public/images/artworks/manifest.json`, and the app's source-facing artwork map lives in `data/ArtworkSelections.ts`. The current selection uses Art Institute of Chicago API records downloaded as local JPG files in `public/images/artworks`, so the built app can display the artworks without remote image requests. Each record includes `isPublicDomain` and `copyrightNotice` metadata for audit purposes.

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

If you specifically want to reference AIC IIIF URLs instead of saving local JPGs, add `--hotlink-only`.

The original folder structure is maintained: components remain in `components/`, offline Curator logic remains in `services/`, scripted content remains in `data/`, and images remain in `public/images/`.
