# Avatar Layer Assets

This folder is reserved for transparent PNG avatar layers that match the detailed Nova, Leo, and Zia preset sprite style.

Preferred final structure:

```text
avatar-layers/
  nova/
    hair/
    face/
    outfit/
    held-object/
    accessory/
  leo/
    hair/
    face/
    outfit/
    held-object/
    accessory/
  zia/
    hair/
    face/
    outfit/
    held-object/
    accessory/
```

Incoming asset drop zone:

```text
avatar-layers/
  source/
    Asset.hair/
      Brown.curls.png
      Black.bob.png
    Asset.face/
      Focused.png
      Happy.png
    Asset.outfit/
      Mystic.robe.png
    Asset.held-object/
      Paint.brush.png
    Asset.accessory/
      Round.glasses.png
    Asset.skin/
      Warm.tone.png
```

Copy generated folders into `public/images/avatar-layers/source/` exactly as they are currently named. Filenames such as `Brown.curls.png` are fine; the import step can convert them into app-friendly IDs such as `brown_curls`.

If the layers are universal across Nova, Leo, and Zia, keep only one source set here. If any layer is character-specific, add an archetype folder inside `source`, for example `source/nova/Asset.hair/`.

Regenerate the app manifest after adding or renaming PNG files:

```bash
npm run avatar:normalize
npm run avatar:manifest
```

If `npm` is not available in the current shell, run the script directly with Node:

```bash
node scripts/normalize-avatar-layer-assets.mjs
node scripts/generate-avatar-layer-manifest.mjs
```

The normalized layer copies are written to `public/images/avatar-layers/generated/normalized/`, and the generated manifest is written to `data/AvatarLayerManifest.generated.ts`. Do not hand-edit generated files; update the PNGs in `source/`, rerun normalization, then rerun the manifest generator.

Current archetype base canvas sizes:

- `nova`: `1086 x 1448`
- `leo`: `1024 x 1536`
- `zia`: `1086 x 1448`

Asset requirements:

- Use transparent PNG files.
- Match the exact full-canvas size and alignment of the matching preset sprite.
- Draw only the layer being swapped, not the full character.
- Keep the existing detailed pixel-art style, shading, outline weight, and scale.
- Do not use generated rectangle/canvas placeholders for final art.

Current imported source asset dimensions are mixed: `1024 x 1536`, `1058 x 1487`, `1086 x 1448`, `1254 x 1254`, and `724 x 2172`. The code can list and preview these assets now, but perfect layer alignment will require normalizing the final PNG layers to one shared transparent canvas.

Layered source files are ideal. If only flat PNG variants are available, they can still be used as references, but clean transparent layer PNGs will produce the best in-game result.
