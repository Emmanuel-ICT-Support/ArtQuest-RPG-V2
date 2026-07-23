import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const localVendorScripts = [
  './public/vendor/tailwindcss.js',
  './public/vendor/react.development.js',
  './public/vendor/react-dom.development.js',
  './public/vendor/jspdf.umd.min.js',
  './public/vendor/babel.min.js',
];

localVendorScripts.forEach((src) => {
  const absolutePath = resolve(rootDir, src);
  if (!existsSync(absolutePath)) {
    throw new Error(`Missing standalone vendor dependency: ${src}`);
  }
});

const sourceFiles = [
  'types.ts',
  'constants.ts',
  'data/AvatarLayerManifest.generated.ts',
  'data/AvatarAssetBounds.generated.ts',
  'data/AvatarRewards.ts',
  'data/GalleryLayout.ts',
  'data/DoorChallenges.ts',
  'data/DoorUnlockAssets.ts',
  'data/SideQuests.ts',
  'data/SCSACurriculum.ts',
  'data/AssessmentRubric.ts',
  'data/ArtworkSelections.ts',
  'data/ArtworkLibrary.ts',
  'data/VisualLanguageGuide.ts',
  'data/ResponseExpectations.ts',
  'data/OfflineCurator.ts',
  'utils/assetPreloader.ts',
  'components/LoadingSpinner.tsx',
  'components/ProgressBar.tsx',
  'components/Modal.tsx',
  'components/PostLevelSummaryModal.tsx',
  'components/PlayerStatsDisplay.tsx',
  'components/AvatarLayeredPreview.tsx',
  'components/AvatarAssetPreview.tsx',
  'components/ArtQuestUI.tsx',
  'components/useGameAudio.ts',
  'components/GalleryLoadingScreen.tsx',
  'components/DoorUnlockAnimation.tsx',
  'components/SplashScreen.tsx',
  'components/ReturnToGameScreen.tsx',
  'components/StartScreen.tsx',
  'components/MapScreen.tsx',
  'components/JournalScreen.tsx',
  'components/InventoryScreen.tsx',
  'components/GameGuideScreen.tsx',
  'components/AssessmentScreen.tsx',
  'services/aiService.ts',
  'MainGame.tsx',
  'App.tsx',
];

const stripModules = (source) => source
  .replace(/^\s*import[\s\S]*?;\s*/gm, '')
  .replace(/^\s*export\s+default\s+[^;\n]+;\s*$/gm, '')
  .replace(/\bexport\s+(const|let|var|function|class|interface|type)\b/g, '$1');

const sourceBundle = sourceFiles
  .map((file) => {
    const source = readFileSync(resolve(rootDir, file), 'utf8');
    return `\n// --- ${file} ---\n${stripModules(source)}`;
  })
  .join('\n');

const appScript = `
const { useCallback, useEffect, useMemo, useRef, useState } = React;

${sourceBundle}

const initializeAiChat = initializeChat;

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

ReactDOM.createRoot(rootElement).render(
  <App />
);
`.replace(/<\/script/gi, '<\\/script');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ArtQuest: The Gallery of Secrets</title>
  ${localVendorScripts.map(src => `<script src="${src}"></script>`).join('\n  ')}
  <style>
    html {
      height: 100%;
    }
    body {
      font-family: 'Trebuchet MS', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background:
        linear-gradient(180deg, rgba(7, 10, 24, 0.96), rgba(14, 11, 30, 0.98)),
        repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.035) 0 1px, transparent 1px 4px);
      margin: 0;
    }
    #root {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .narrative-scrollbar::-webkit-scrollbar {
      width: 8px;
    }
    .narrative-scrollbar::-webkit-scrollbar-track {
      background: #2d3748;
    }
    .narrative-scrollbar::-webkit-scrollbar-thumb {
      background: #4a5568;
      border-radius: 4px;
    }
    .narrative-scrollbar::-webkit-scrollbar-thumb:hover {
      background: #718096;
    }
    .artquest-app-shell {
      background:
        linear-gradient(180deg, #070a18 0%, #11122a 44%, #080b16 100%),
        repeating-linear-gradient(90deg, rgba(251, 113, 192, 0.08) 0 1px, transparent 1px 36px);
      color: #f8f1ff;
    }
    .artquest-hud-panel,
    .artquest-panel {
      position: relative;
      border: 2px solid #d89443;
      background:
        linear-gradient(180deg, rgba(19, 18, 40, 0.98), rgba(8, 10, 24, 0.98));
      box-shadow:
        inset 0 0 0 2px rgba(255, 201, 108, 0.18),
        inset 0 0 0 5px rgba(228, 83, 168, 0.14),
        0 16px 0 rgba(0, 0, 0, 0.28),
        0 22px 44px rgba(0, 0, 0, 0.42);
    }
    .artquest-hud-panel::before,
    .artquest-panel::before,
    .artquest-scene-stage::before {
      content: "";
      position: absolute;
      inset: 5px;
      pointer-events: none;
      border: 1px solid rgba(105, 230, 219, 0.2);
    }
    .artquest-hud-panel::after,
    .artquest-panel::after,
    .artquest-scene-stage::after {
      content: "";
      position: absolute;
      inset: 0;
      pointer-events: none;
      background:
        linear-gradient(90deg, #f28ac8 0 9px, transparent 9px calc(100% - 9px), #f28ac8 calc(100% - 9px)),
        linear-gradient(180deg, #f28ac8 0 9px, transparent 9px calc(100% - 9px), #f28ac8 calc(100% - 9px));
      clip-path: polygon(0 0, 34px 0, 34px 5px, 5px 5px, 5px 34px, 0 34px, 0 0, 100% 0, 100% 34px, calc(100% - 5px) 34px, calc(100% - 5px) 5px, calc(100% - 34px) 5px, calc(100% - 34px) 0, 100% 0, 100% 100%, calc(100% - 34px) 100%, calc(100% - 34px) calc(100% - 5px), calc(100% - 5px) calc(100% - 5px), calc(100% - 5px) calc(100% - 34px), 100% calc(100% - 34px), 100% 100%, 0 100%, 0 calc(100% - 34px), 5px calc(100% - 34px), 5px calc(100% - 5px), 34px calc(100% - 5px), 34px 100%, 0 100%);
      opacity: 0.78;
    }
    .artquest-panel-title {
      color: #ff7fbd;
      text-shadow: 0 2px 0 rgba(0, 0, 0, 0.65);
      letter-spacing: 0;
    }
    .artquest-button {
      border: 2px solid #060815;
      background: linear-gradient(180deg, #7b2cbf 0%, #4a176f 100%);
      color: #fff3ff;
      box-shadow:
        inset 0 0 0 1px rgba(255, 255, 255, 0.16),
        0 4px 0 rgba(0, 0, 0, 0.45);
      text-transform: uppercase;
    }
    .artquest-button:hover:not(:disabled) {
      filter: brightness(1.13) saturate(1.08);
      transform: translateY(-1px);
    }
    .artquest-button:disabled {
      cursor: not-allowed;
      filter: grayscale(0.85) brightness(0.72);
      opacity: 0.68;
    }
    .artquest-inner-panel {
      border: 1px solid rgba(105, 230, 219, 0.28);
      background: rgba(4, 7, 20, 0.48);
      box-shadow: inset 0 0 0 1px rgba(255, 127, 189, 0.08);
    }
    .artquest-scene-stage {
      position: relative;
      border: 6px solid #0a0c18;
      box-shadow:
        0 0 0 2px #d89443,
        0 0 0 5px rgba(255, 127, 189, 0.45),
        0 22px 44px rgba(0, 0, 0, 0.55);
    }
    .artquest-progress-track {
      border: 1px solid rgba(248, 214, 138, 0.32);
      background: rgba(2, 6, 23, 0.82);
    }
    .analysis-screen-shell {
      position: relative;
      background:
        radial-gradient(circle at 50% -8%, rgba(124, 58, 237, 0.28), transparent 31rem),
        radial-gradient(circle at 12% 16%, rgba(14, 165, 233, 0.12), transparent 22rem),
        radial-gradient(circle at 88% 62%, rgba(217, 70, 239, 0.12), transparent 25rem),
        linear-gradient(180deg, rgba(3, 9, 22, 0.98), rgba(2, 6, 18, 1));
      color: #f8ead1;
      font-family: "Trebuchet MS", "Segoe UI", sans-serif;
    }
    .analysis-screen-shell::before {
      content: "";
      position: absolute;
      inset: 0;
      pointer-events: none;
      background:
        radial-gradient(circle, rgba(255, 229, 157, 0.62) 0 1px, transparent 1.5px),
        radial-gradient(circle, rgba(208, 117, 255, 0.32) 0 1px, transparent 1.7px),
        linear-gradient(90deg, rgba(0, 0, 0, 0.32), transparent 12%, transparent 88%, rgba(0, 0, 0, 0.32)),
        repeating-linear-gradient(0deg, transparent 0 25px, rgba(154, 99, 40, 0.16) 25px 27px),
        repeating-linear-gradient(90deg, transparent 0 51px, rgba(154, 99, 40, 0.09) 51px 53px);
      background-position: 12px 18px, 42px 54px, center, center, center;
      background-size: 104px 104px, 152px 152px, 100% 100%, auto, auto;
      opacity: 0.72;
    }
    .analysis-header::before {
      content: "";
      position: absolute;
      left: 8px;
      right: 8px;
      top: 2px;
      height: calc(100% - 6px);
      border: 1px solid rgba(211, 140, 46, 0.72);
      box-shadow:
        inset 0 0 0 2px rgba(17, 8, 28, 0.82),
        inset 0 0 0 4px rgba(216, 143, 45, 0.14);
      opacity: 0.9;
      pointer-events: none;
      z-index: 0;
    }
    .analysis-header {
      grid-template-columns: minmax(380px, auto) minmax(0, 1fr) minmax(232px, auto);
      column-gap: 1rem;
      align-items: start;
    }
    .analysis-header-left {
      justify-self: start;
    }
    .analysis-header-center {
      align-self: start;
      overflow: hidden;
      padding: 0 0.6rem;
    }
    .analysis-logo {
      color: transparent;
      background: linear-gradient(180deg, #fff2bc 0%, #f3bd47 52%, #c97921 100%);
      -webkit-background-clip: text;
      background-clip: text;
      font-family: Georgia, "Times New Roman", serif;
      font-size: clamp(1.8rem, 2.8vw, 3.2rem);
      font-weight: 900;
      line-height: 1;
      filter: drop-shadow(0 4px 0 rgba(0, 0, 0, 0.85)) drop-shadow(0 0 18px rgba(255, 188, 76, 0.24));
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      z-index: 1;
    }
    .analysis-wing-pill,
    .analysis-player-badge {
      border: 1px solid rgba(154, 99, 40, 0.8);
      border-radius: 0.375rem;
      background: linear-gradient(180deg, rgba(34, 18, 55, 0.96), rgba(7, 18, 38, 0.96));
      box-shadow:
        inset 0 0 0 1px rgba(255, 238, 190, 0.08),
        inset 0 0 24px rgba(105, 46, 150, 0.14),
        0 8px 22px rgba(0, 0, 0, 0.32);
      color: #ffe7b0;
      font-family: Georgia, "Times New Roman", serif;
      font-weight: 800;
    }
    .analysis-wing-pill {
      display: inline-flex;
      min-width: min(380px, 100%);
      max-width: 100%;
      align-items: center;
      justify-content: center;
      gap: 0.45rem;
      overflow: hidden;
      padding: 0.36rem 1.2rem;
      text-align: center;
      white-space: nowrap;
    }
    .analysis-wing-pill span:last-child {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .analysis-player-badge {
      justify-self: end;
      width: 232px;
      max-width: 24vw;
      margin-right: 2.25rem;
      padding: 0.42rem 0.8rem;
      font-size: 0.95rem;
    }
    .analysis-player-shield {
      display: inline-flex;
      height: 32px;
      width: 28px;
      flex: 0 0 auto;
      align-items: center;
      justify-content: center;
      border: 1px solid rgba(220, 162, 71, 0.82);
      background: linear-gradient(135deg, #f68aff, #662c9d 52%, #120b28);
      color: #ffe26e;
      box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.34), 0 0 12px rgba(217, 70, 239, 0.26);
    }
    .analysis-main-grid {
      grid-template-columns: 320px minmax(0, 1fr);
    }
    .analysis-content-grid {
      grid-template-rows: minmax(0, 1fr) 178px;
    }
    .analysis-workspace-grid {
      grid-template-columns: minmax(0, 1.5fr) minmax(360px, 0.86fr);
    }
    .analysis-panel {
      position: relative;
      border: 1px solid rgba(166, 108, 43, 0.78);
      border-radius: 0.375rem;
      background:
        radial-gradient(circle at 50% 0%, rgba(105, 46, 150, 0.18), transparent 46%),
        linear-gradient(180deg, rgba(6, 17, 37, 0.96), rgba(3, 8, 22, 0.98));
      box-shadow:
        inset 0 0 0 1px rgba(255, 236, 176, 0.08),
        inset 0 0 34px rgba(105, 46, 150, 0.12),
        0 12px 28px rgba(0, 0, 0, 0.36);
    }
    .analysis-panel::before {
      content: "";
      position: absolute;
      inset: 5px;
      pointer-events: none;
      border: 1px solid rgba(255, 236, 176, 0.08);
      border-radius: 0.25rem;
      box-shadow: inset 0 0 0 1px rgba(30, 16, 7, 0.5);
    }
    .analysis-panel::after {
      content: "";
      position: absolute;
      inset: -2px;
      pointer-events: none;
      background:
        linear-gradient(90deg, #dca247 0 8px, transparent 8px calc(100% - 8px), #dca247 calc(100% - 8px)),
        linear-gradient(180deg, #dca247 0 8px, transparent 8px calc(100% - 8px), #dca247 calc(100% - 8px));
      clip-path: polygon(0 0, 28px 0, 28px 4px, 4px 4px, 4px 28px, 0 28px, 0 0, 100% 0, 100% 28px, calc(100% - 4px) 28px, calc(100% - 4px) 4px, calc(100% - 28px) 4px, calc(100% - 28px) 0, 100% 0, 100% 100%, calc(100% - 28px) 100%, calc(100% - 28px) calc(100% - 4px), calc(100% - 4px) calc(100% - 4px), calc(100% - 4px) calc(100% - 28px), 100% calc(100% - 28px), 100% 100%, 0 100%, 0 calc(100% - 28px), 4px calc(100% - 28px), 4px calc(100% - 4px), 28px calc(100% - 4px), 28px 100%, 0 100%);
      opacity: 0.42;
    }
    .analysis-inner-panel {
      position: relative;
      border: 1px solid rgba(127, 85, 36, 0.7);
      border-radius: 0.375rem;
      background: rgba(8, 22, 46, 0.88);
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.04);
    }
    .analysis-section-title {
      color: #ffd45f;
      font-family: Georgia, "Times New Roman", serif;
      font-size: 1rem;
      font-weight: 900;
      letter-spacing: 0;
      text-transform: uppercase;
      text-shadow: 0 2px 0 rgba(0, 0, 0, 0.75);
    }
    .analysis-sidebar-section {
      position: relative;
      z-index: 1;
      border-bottom: 1px solid rgba(126, 76, 28, 0.55);
      padding: 0.28rem 0 0.3rem;
    }
    .analysis-progress-grid {
      display: grid;
      grid-template-columns: repeat(12, minmax(0, 1fr));
      gap: 4px;
    }
    .analysis-progress-cell {
      height: 16px;
      border: 2px solid #13091d;
      background: #1b1731;
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
    }
    .analysis-progress-locked {
      background: #181326;
    }
    .analysis-progress-unlocked,
    .analysis-progress-current {
      background: linear-gradient(180deg, #9c4cf2, #46116c);
    }
    .analysis-progress-current {
      animation: analysisPulse 1.3s ease-in-out infinite;
    }
    .analysis-progress-complete {
      background: linear-gradient(180deg, #4fe1b0, #146b55);
    }
    @keyframes analysisPulse {
      0%, 100% { filter: brightness(1); }
      50% { filter: brightness(1.38); }
    }
    .analysis-challenge-card,
    .analysis-question-box {
      border: 1px solid rgba(255, 123, 197, 0.64);
      border-radius: 0.375rem;
      background: linear-gradient(180deg, rgba(47, 17, 60, 0.96), rgba(18, 9, 35, 0.96));
      box-shadow: inset 0 0 0 1px rgba(255, 123, 197, 0.12), 0 0 18px rgba(191, 54, 115, 0.12);
      padding: 0.52rem;
    }
    .analysis-question-complete {
      border-color: rgba(83, 215, 145, 0.65);
      background: linear-gradient(180deg, rgba(15, 50, 32, 0.96), rgba(9, 28, 22, 0.96));
    }
    .analysis-term-chip {
      border: 1px solid rgba(219, 164, 74, 0.55);
      border-radius: 0.25rem;
      background: linear-gradient(180deg, #58318b, #2a1748);
      color: #f2e8ff;
      font-size: 0.78rem;
      line-height: 1;
      padding: 0.32rem 0.56rem;
      box-shadow: inset 0 0 0 1px rgba(255, 238, 190, 0.08), 0 2px 0 rgba(0, 0, 0, 0.42);
      white-space: nowrap;
    }
    .analysis-visual-guide {
      display: grid;
      gap: 0.12rem;
      overflow: hidden;
    }
    .analysis-guide-heading-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      min-width: 0;
    }
    .analysis-guide-heading-row .analysis-section-title {
      min-width: 0;
    }
    .analysis-guide-section {
      min-width: 0;
      overflow: hidden;
    }
    .analysis-guide-label {
      color: #ffd45f;
      font-family: Georgia, "Times New Roman", serif;
      font-size: 0.52rem;
      font-weight: 900;
      letter-spacing: 0;
      line-height: 1;
      text-transform: uppercase;
      text-shadow: 0 1px 0 rgba(0, 0, 0, 0.82);
    }
    .analysis-guide-chips {
      display: flex;
      max-height: 1.02rem;
      flex-wrap: wrap;
      gap: 0.16rem;
      overflow: hidden;
      padding-top: 0.12rem;
    }
    .analysis-term-chip-compact {
      max-width: 100%;
      overflow: hidden;
      padding: 0.13rem 0.28rem;
      text-overflow: ellipsis;
      font-size: 0.56rem;
    }
    .analysis-guide-lines {
      display: grid;
      gap: 0.1rem;
      padding-top: 0.12rem;
    }
    .analysis-guide-line {
      display: -webkit-box;
      max-height: 0.72rem;
      overflow: hidden;
      color: #e8dcc2;
      font-size: 0.58rem;
      font-style: italic;
      line-height: 1.05;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 1;
    }
    .analysis-button {
      border: 1px solid rgba(219, 164, 74, 0.8);
      border-radius: 0.375rem;
      color: #fff7d0;
      font-family: Georgia, "Times New Roman", serif;
      font-weight: 900;
      letter-spacing: 0;
      text-transform: uppercase;
      box-shadow:
        inset 0 0 0 1px rgba(255, 229, 157, 0.16),
        0 5px 0 rgba(0, 0, 0, 0.42);
      transition: filter 150ms ease, transform 150ms ease;
    }
    .analysis-button:hover:not(:disabled) {
      filter: brightness(1.15) saturate(1.08);
      transform: translateY(-1px);
    }
    .analysis-button:disabled {
      cursor: not-allowed;
      filter: grayscale(0.85) brightness(0.7);
      opacity: 0.65;
    }
    .analysis-button-blue {
      background: linear-gradient(180deg, #1d55a8, #102456);
    }
    .analysis-button-purple {
      background: linear-gradient(180deg, #4b1a6f, #321246 55%, #17091f);
    }
    .analysis-guide-enlarge-button {
      flex: 0 0 auto;
      padding: 0.24rem 0.45rem;
      font-size: 0.58rem;
      line-height: 1;
      white-space: nowrap;
    }
    .analysis-nav-button {
      display: inline-flex;
      min-width: 126px;
      align-items: center;
      justify-content: center;
      gap: 0.45rem;
      padding: 0.55rem 1rem;
      font-size: 0.98rem;
    }
    .analysis-dialogue-top {
      border-bottom: 1px solid rgba(142, 85, 28, 0.48);
    }
    .analysis-curator-portrait {
      height: 112px;
      border: 1px solid rgba(142, 85, 28, 0.72);
      background: rgba(9, 12, 30, 0.78);
      box-shadow: inset 0 0 22px rgba(0, 0, 0, 0.42);
    }
    .analysis-log {
      background: linear-gradient(180deg, rgba(6, 9, 23, 0.08), rgba(3, 5, 13, 0.22));
    }
    .analysis-message {
      max-width: 86%;
      border: 2px solid rgba(153, 80, 212, 0.78);
      background: linear-gradient(180deg, #52217a, #2c124e);
      box-shadow: inset 0 0 0 1px rgba(244, 199, 255, 0.12), 0 4px 0 rgba(0, 0, 0, 0.32);
      color: #f6efff;
      padding: 0.72rem 0.85rem;
    }
    .analysis-message-player {
      margin-left: auto;
      border-color: rgba(118, 232, 245, 0.65);
      background: linear-gradient(180deg, #173b59, #0f243a);
    }
    .analysis-message-curator {
      margin-right: auto;
    }
    .analysis-system-message {
      position: relative;
      display: flex;
      align-items: center;
      gap: 0.65rem;
      width: 94%;
      margin-left: auto;
      margin-right: auto;
      border: 1px solid rgba(127, 85, 36, 0.72);
      border-radius: 0.375rem;
      background: linear-gradient(180deg, rgba(15, 23, 42, 0.96), rgba(8, 14, 30, 0.96));
      color: #d8cfdd;
      font-size: 0.92rem;
      font-style: italic;
      padding: 0.58rem 0.8rem;
      text-align: center;
      box-shadow: inset 0 0 0 1px rgba(255, 201, 108, 0.08);
    }
    .analysis-system-gem {
      display: inline-flex;
      height: 24px;
      width: 24px;
      flex: 0 0 auto;
      align-items: center;
      justify-content: center;
      color: #6af7ff;
      text-shadow: 0 0 10px rgba(106, 247, 255, 0.75);
    }
    .analysis-response-area {
      border-top: 1px solid rgba(142, 85, 28, 0.62);
    }
    .analysis-response-form {
      border: 1px solid rgba(154, 99, 40, 0.75);
      border-radius: 0.375rem;
      background: rgba(3, 8, 23, 0.88);
      padding: 0.55rem;
      box-shadow:
        inset 0 0 0 1px rgba(255, 201, 108, 0.06),
        inset 0 0 24px rgba(105, 46, 150, 0.1);
    }
    .analysis-response-input {
      min-height: 72px;
      max-height: 112px;
      min-width: 0;
      flex: 1 1 auto;
      resize: none;
      overflow-y: auto;
      border: 0;
      outline: 0;
      background: transparent;
      color: #fff4d0;
      font-size: 1rem;
      line-height: 1.45;
    }
    .analysis-response-input::placeholder {
      color: rgba(216, 194, 154, 0.72);
    }
    .analysis-response-input:disabled {
      opacity: 0.62;
    }
    .analysis-send-button {
      min-width: 116px;
      padding: 0.62rem 1.05rem;
      font-size: 1rem;
    }
    .analysis-enlarge-button {
      padding: 0.44rem 0.82rem;
      font-size: 0.82rem;
    }
    .analysis-artwork-figure {
      display: grid !important;
      grid-template-rows: minmax(0, 1fr) auto;
      gap: 0.5rem;
      align-items: stretch;
      justify-items: center;
      padding-top: 0.25rem;
    }
    .analysis-artwork-mat {
      display: flex;
      width: min(100%, 640px);
      height: 100%;
      min-height: 0;
      max-height: none;
      align-items: center;
      justify-content: center;
      border: 4px solid #c88a35;
      background: #f3e4c8;
      padding: 0.65rem 0.8rem;
      box-shadow: inset 0 0 22px rgba(95, 58, 20, 0.18), 0 6px 0 rgba(0, 0, 0, 0.42);
    }
    .analysis-artwork-image {
      display: block;
      height: 100%;
      width: 100%;
      max-height: 100%;
      max-width: 100%;
      object-fit: contain;
    }
    .analysis-artwork-caption {
      width: 100%;
      max-width: 520px;
      text-align: center;
      color: #e8dcc2;
      font-size: 0.78rem;
      line-height: 1.2;
      max-height: 3.2rem;
      overflow: hidden;
    }
    .analysis-bottom-panel {
      grid-template-columns: 160px minmax(0, 1fr);
    }
    .analysis-avatar-panel {
      background: linear-gradient(180deg, rgba(9, 22, 46, 0.96), rgba(5, 10, 24, 0.96));
    }
    .analysis-avatar-name {
      display: -webkit-box;
      max-height: 1.55rem;
      overflow: hidden;
      overflow-wrap: anywhere;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
    }
    .analysis-avatar-mode {
      white-space: normal;
    }
    .analysis-avatar-title {
      display: -webkit-box;
      max-height: 1rem;
      overflow: hidden;
      overflow-wrap: anywhere;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 1;
    }
    .analysis-stats-display {
      display: flex;
      height: 100%;
      min-height: 0;
      flex-direction: column;
      gap: 0.7rem;
      overflow: hidden;
      padding: 0.45rem 0.65rem;
    }
    .analysis-stats-heading {
      color: #ffd45f;
      font-family: Georgia, "Times New Roman", serif;
      font-size: 0.96rem;
      font-weight: 900;
      letter-spacing: 0;
      text-transform: uppercase;
      text-shadow: 0 2px 0 rgba(0, 0, 0, 0.75);
    }
    .analysis-trait-grid {
      display: grid;
      min-height: 0;
      flex: 1 1 auto;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 8px;
    }
    .analysis-trait-card {
      display: flex;
      min-height: 0;
      flex-direction: column;
      justify-content: space-between;
      border: 1px solid rgba(127, 85, 36, 0.72);
      border-radius: 0.375rem;
      background: linear-gradient(180deg, rgba(8, 22, 46, 0.98), rgba(5, 10, 24, 0.98));
      padding: 0.5rem;
      box-shadow: inset 0 0 0 1px rgba(255, 201, 108, 0.07);
    }
    .analysis-trait-description {
      display: -webkit-box;
      max-height: 1.1rem;
      overflow: hidden;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 1;
    }
    .analysis-trait-bronze {
      border-color: rgba(245, 158, 11, 0.72);
      background: linear-gradient(180deg, rgba(55, 35, 17, 0.98), rgba(22, 15, 13, 0.98));
    }
    .analysis-trait-silver {
      border-color: rgba(165, 243, 252, 0.68);
      background: linear-gradient(180deg, rgba(18, 47, 59, 0.98), rgba(7, 20, 29, 0.98));
    }
    .analysis-trait-gold {
      border-color: rgba(253, 224, 71, 0.8);
      background: linear-gradient(180deg, rgba(66, 23, 62, 0.98), rgba(28, 11, 34, 0.98));
    }
    .analysis-trait-locked {
      border-color: rgba(77, 88, 110, 0.72);
    }
    .analysis-trait-icon {
      display: inline-flex;
      height: 34px;
      width: 34px;
      flex: 0 0 auto;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
    }
    .analysis-enlarged-artwork {
      display: grid;
      grid-template-rows: minmax(0, 1fr) auto;
      gap: 0.75rem;
      max-height: 76vh;
      min-height: 0;
      overflow: hidden;
    }
    .analysis-enlarged-artwork-frame {
      display: flex;
      min-height: 0;
      align-items: center;
      justify-content: center;
      border: 4px solid #c88a35;
      background: #f3e4c8;
      padding: 0.75rem;
      box-shadow: inset 0 0 22px rgba(95, 58, 20, 0.18), 0 6px 0 rgba(0, 0, 0, 0.42);
      overflow: hidden;
    }
    .analysis-enlarged-artwork-image {
      display: block;
      height: 100%;
      max-height: 100%;
      max-width: 100%;
      object-fit: contain;
    }
    .analysis-enlarged-artwork-caption {
      border: 1px solid rgba(200, 138, 53, 0.5);
      background: rgba(4, 8, 20, 0.72);
      color: #d8d0db;
      font-size: 0.9rem;
      line-height: 1.35;
      padding: 0.65rem;
      text-align: center;
    }
    .analysis-guide-help-modal {
      display: grid;
      height: min(74vh, 700px);
      min-height: 0;
      grid-template-columns: minmax(0, 1fr) minmax(15rem, 0.42fr);
      grid-template-rows: auto minmax(0, 1fr) auto;
      grid-template-areas:
        "definition definition"
        "practice words"
        "practice prompts";
      gap: 0.65rem;
      overflow: hidden;
    }
    .analysis-guide-help-section {
      border: 1px solid rgba(142, 85, 28, 0.62);
      border-radius: 0.375rem;
      background: rgba(6, 12, 28, 0.68);
      min-height: 0;
      padding: 0.58rem;
      box-shadow: inset 0 0 0 1px rgba(255, 216, 121, 0.08);
    }
    .analysis-guide-definition-section {
      grid-area: definition;
    }
    .analysis-guide-words-section,
    .analysis-guide-prompts-section {
      min-width: 0;
    }
    .analysis-guide-words-section {
      grid-area: words;
      overflow: hidden;
    }
    .analysis-guide-prompts-section {
      grid-area: prompts;
      overflow: hidden;
    }
    .analysis-guide-modal-label {
      margin-bottom: 0.34rem;
      color: #ffd45f;
      font-family: Georgia, "Times New Roman", serif;
      font-size: 0.82rem;
      font-weight: 900;
      letter-spacing: 0;
      line-height: 1.1;
      text-transform: uppercase;
      text-shadow: 0 1px 0 rgba(0, 0, 0, 0.82);
    }
    .analysis-guide-help-definition {
      color: #efe4d2;
      font-size: 0.88rem;
      line-height: 1.32;
    }
    .analysis-guide-modal-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.24rem;
    }
    .analysis-guide-modal-chips .analysis-term-chip {
      padding: 0.18rem 0.34rem;
      font-size: 0.68rem;
      line-height: 1.05;
    }
    .analysis-guide-modal-lines {
      display: grid;
      gap: 0.3rem;
    }
    .analysis-guide-modal-line {
      border-left: 2px solid rgba(255, 123, 197, 0.6);
      color: #efe4d2;
      font-size: 0.78rem;
      font-style: italic;
      line-height: 1.22;
      padding-left: 0.45rem;
    }
    .analysis-guide-practice-section {
      grid-area: practice;
      display: grid;
      grid-template-rows: auto minmax(0, 1fr);
      overflow: hidden;
    }
    .analysis-guide-practice-figure {
      margin: 0;
      min-height: 0;
    }
    .analysis-guide-practice-image-wrap {
      position: relative;
      overflow: hidden;
      border: 3px solid #c88a35;
      background: #f3e4c8;
      box-shadow: inset 0 0 22px rgba(95, 58, 20, 0.18), 0 6px 0 rgba(0, 0, 0, 0.32);
      width: 100%;
      aspect-ratio: 4 / 3;
      max-height: 100%;
      margin: 0 auto;
    }
    .analysis-guide-practice-image {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .analysis-guide-practice-label {
      position: absolute;
      z-index: 2;
      display: inline-flex;
      max-width: 11.75rem;
      align-items: center;
      gap: 0.32rem;
      transform: translate(-50%, -50%);
      border: 1px solid rgba(255, 212, 95, 0.75);
      border-radius: 0.375rem;
      background: rgba(4, 9, 24, 0.88);
      color: #fff4d0;
      font-size: 0.66rem;
      font-weight: 900;
      line-height: 1.15;
      overflow-wrap: anywhere;
      padding: 0.3rem 0.42rem;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.42);
    }
    .analysis-guide-practice-label-dot {
      display: inline-block;
      width: 0.48rem;
      height: 0.48rem;
      flex: 0 0 auto;
      border: 1px solid rgba(4, 9, 24, 0.9);
      border-radius: 999px;
      background: #6af7ff;
      box-shadow: 0 0 9px rgba(106, 247, 255, 0.8);
    }
    @media (max-width: 1400px) {
      .analysis-header {
        grid-template-columns: minmax(330px, auto) minmax(0, 1fr) minmax(190px, auto);
        column-gap: 0.65rem;
      }
      .analysis-nav-button {
        min-width: 104px;
        padding-inline: 0.65rem;
        font-size: 0.82rem;
      }
      .analysis-player-badge {
        width: 190px;
        margin-right: 1rem;
        font-size: 0.82rem;
      }
      .analysis-logo {
        font-size: clamp(1.6rem, 2.55vw, 2.5rem);
      }
      .analysis-wing-pill {
        min-width: min(320px, 100%);
        padding-inline: 0.8rem;
        font-size: 0.82rem;
      }
    }
    @media (max-width: 1180px) {
      .analysis-main-grid {
        grid-template-columns: 280px minmax(0, 1fr);
      }
      .analysis-content-grid {
        grid-template-rows: minmax(0, 1fr) 168px;
      }
      .analysis-workspace-grid {
        grid-template-columns: minmax(0, 1.3fr) minmax(300px, 0.86fr);
      }
      .analysis-dialogue-top {
        grid-template-columns: 96px minmax(0, 1fr);
      }
      .analysis-curator-portrait {
        height: 96px;
      }
      .analysis-bottom-panel {
        grid-template-columns: 150px minmax(0, 1fr);
      }
      .analysis-trait-grid {
        gap: 8px;
      }
    }
    @media (max-width: 920px) {
      .analysis-header {
        grid-template-columns: minmax(260px, auto) minmax(0, 1fr) minmax(160px, auto);
        column-gap: 0.45rem;
      }
      .analysis-nav-button {
        min-width: 86px;
        gap: 0.25rem;
        padding-inline: 0.45rem;
        font-size: 0.72rem;
      }
      .analysis-main-grid {
        grid-template-columns: 250px minmax(0, 1fr);
      }
      .analysis-player-badge {
        width: 160px;
        margin-right: 0.55rem;
      }
      .analysis-logo {
        font-size: 1.45rem;
      }
      .analysis-wing-pill {
        min-width: min(240px, 100%);
        font-size: 0.85rem;
      }
      .analysis-workspace-grid {
        grid-template-columns: minmax(0, 1fr);
        grid-template-rows: minmax(0, 1fr) minmax(300px, 0.9fr);
      }
      .analysis-trait-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .analysis-guide-help-modal {
        height: min(76vh, 640px);
        grid-template-columns: minmax(0, 1fr) minmax(12rem, 0.38fr);
        gap: 0.5rem;
      }
      .analysis-guide-help-section {
        padding: 0.48rem;
      }
      .analysis-guide-help-definition {
        font-size: 0.78rem;
        line-height: 1.22;
      }
      .analysis-guide-modal-label {
        margin-bottom: 0.25rem;
        font-size: 0.72rem;
      }
      .analysis-guide-modal-chips {
        gap: 0.18rem;
      }
      .analysis-guide-modal-chips .analysis-term-chip {
        padding: 0.13rem 0.26rem;
        font-size: 0.57rem;
      }
      .analysis-guide-modal-line {
        font-size: 0.64rem;
        line-height: 1.16;
      }
      .analysis-guide-practice-label {
        max-width: 8.5rem;
        font-size: 0.54rem;
        padding: 0.22rem 0.3rem;
      }
    }
  </style>
</head>
<body class="bg-gradient-to-br from-gray-900 via-purple-900 to-pink-900 text-gray-100 min-h-screen">
  <noscript>ArtQuest needs JavaScript enabled to run.</noscript>
  <div id="root"></div>
  <script type="text/plain" id="artquest-source">
${appScript}
  </script>
  <script>
    try {
      const source = document.getElementById('artquest-source').textContent;
      const compiled = Babel.transform(source, {
        filename: 'artquest.tsx',
        presets: [
          ['typescript', { allExtensions: true, isTSX: true }],
          ['react', { runtime: 'classic' }]
        ],
        sourceMaps: false
      }).code;
      (0, eval)(compiled + '\\n//# sourceURL=artquest-standalone.js');
    } catch (error) {
      console.error(error);
      document.getElementById('root').innerHTML = '<div style="padding:2rem;color:#fecaca;background:#111827;min-height:100vh;font-family:system-ui"><h1 style="font-size:1.5rem;margin-bottom:1rem">ArtQuest could not start</h1><pre style="white-space:pre-wrap">' + String(error && (error.stack || error.message || error)).replace(/[&<>]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[char])) + '</pre></div>';
    }
  </script>
</body>
</html>
`;

writeFileSync(resolve(rootDir, 'index.html'), html, 'utf8');
console.log(`Wrote ${resolve(rootDir, 'index.html')} with ${sourceFiles.length} source files embedded.`);
