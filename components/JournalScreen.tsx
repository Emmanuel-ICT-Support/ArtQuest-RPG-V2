import React, { useEffect, useMemo, useRef, useState } from 'react';
import { WING_DEFINITIONS } from '../constants';
import { JournalEntry, JournalScreenProps, WingDefinition } from '../types';
import { getAvatarBuildForAvatar, getAvatarLayerImageUrls } from '../data/AvatarRewards';
import { getAssessmentDisplayLabel } from '../data/SCSACurriculum';
import {
  ArtQuestButton,
  ArtQuestPage,
  ArtQuestSectionTitle,
  artQuestCx,
} from './ArtQuestUI';
import AvatarLayeredPreview from './AvatarLayeredPreview';

type JournalPhase = 1 | 2 | 3 | 4;
type PageTurnDirection = 'forward' | 'backward' | null;
type JournalPageTurnSound = 'page' | 'fast';

const PHASE_RESPONSE_LABELS: Record<JournalPhase, string> = {
  1: 'Phase 1: See',
  2: 'Phase 2: Think',
  3: 'Phase 3: Interpret',
  4: 'Phase 4: Reflect',
};

const PHASE_RESPONSE_SUBTITLES: Record<JournalPhase, string> = {
  1: 'Description',
  2: 'Analysis',
  3: 'Meaning',
  4: 'Judgement',
};

const JOURNAL_PHASES = [1, 2, 3, 4] as const;

const JOURNAL_BLANK_PLATE_SRC = './public/images/screens/journal-blank-plate.png';
const JOURNAL_BOOK_REST_SRC = './public/images/screens/journal-page-turns/book-rest.png';
const pageTurnFramesForward = [
  './public/images/screens/journal-page-turns/frame-01.png',
  './public/images/screens/journal-page-turns/frame-02.png',
  './public/images/screens/journal-page-turns/frame-03.png',
  './public/images/screens/journal-page-turns/frame-04.png',
  './public/images/screens/journal-page-turns/frame-05.png',
  './public/images/screens/journal-page-turns/frame-06.png',
  './public/images/screens/journal-page-turns/frame-07.png',
] as const;
const pageTurnFramesBackward = [...pageTurnFramesForward].reverse();
const PAGE_TURN_FRAME_COUNT = pageTurnFramesForward.length;
const PAGE_TURN_FRAME_DURATION_MS = 84;
const PAGE_TURN_SWAP_FRAME_INDEX = 3;
const FAST_PAGE_TURN_CYCLES = 3;
const FAST_PAGE_TURN_DURATION_MS = 2200;
const FAST_PAGE_TURN_TICK_MS = 40;
const FAST_PAGE_TURN_TOTAL_FRAMES = PAGE_TURN_FRAME_COUNT * FAST_PAGE_TURN_CYCLES;

const JOURNAL_BOOK_STYLES = `
.journal-book-content {
  --journal-gold: #dca247;
  --journal-gold-bright: #ffe7a7;
  --journal-gold-deep: #8f5524;
  --journal-navy: #050d1f;
  --journal-purple: #4a176f;
  --journal-purple-bright: #8b4bd1;
  --journal-parchment: #ead9b8;
  --journal-parchment-light: #f7e9c9;
  --journal-ink: #28190f;
}

.journal-book-layout {
  display: grid;
  grid-template-columns: minmax(220px, 0.72fr) minmax(0, 3.7fr) minmax(220px, 0.72fr);
  gap: clamp(14px, 1.7vw, 26px);
  align-items: center;
}

.journal-side-rail {
  position: relative;
  align-self: stretch;
  min-height: 280px;
  border: 1px solid rgba(220, 162, 71, 0.82);
  border-radius: 6px;
  padding: clamp(14px, 1.7vw, 22px);
  background:
    radial-gradient(circle at 50% 0%, rgba(117, 60, 173, 0.22), transparent 16rem),
    linear-gradient(180deg, rgba(6, 19, 42, 0.94), rgba(3, 10, 24, 0.98));
  box-shadow:
    inset 0 0 0 1px rgba(255, 231, 167, 0.08),
    inset 0 0 34px rgba(105, 46, 150, 0.14),
    0 16px 30px rgba(0, 0, 0, 0.34);
}

.journal-side-rail::before {
  content: "";
  position: absolute;
  inset: 7px;
  border: 1px solid rgba(220, 162, 71, 0.32);
  pointer-events: none;
}

.journal-side-list {
  display: grid;
  gap: 16px;
  margin-top: 14px;
}

.journal-side-item {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
  border-bottom: 1px solid rgba(166, 108, 43, 0.38);
  padding-bottom: 14px;
}

.journal-side-item:last-child {
  border-bottom: 0;
  padding-bottom: 0;
}

.journal-side-icon {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border: 1px solid rgba(255, 231, 167, 0.72);
  border-radius: 4px;
  color: #ffe9b2;
  background:
    radial-gradient(circle, rgba(124, 58, 237, 0.7), rgba(33, 14, 61, 0.95) 60%),
    linear-gradient(135deg, rgba(255, 231, 167, 0.26), transparent);
  box-shadow: inset 0 0 0 2px rgba(3, 10, 24, 0.82), 0 6px 14px rgba(0, 0, 0, 0.32);
}

.journal-side-copy {
  margin: 0;
  color: #f7e5c9;
  font-family: Georgia, "Times New Roman", serif;
  font-size: 0.96rem;
  line-height: 1.38;
}

.journal-progress-grid {
  display: grid;
  gap: 12px;
  margin-top: 14px;
}

.journal-progress-meter {
  margin-top: 14px;
  border-top: 1px solid rgba(166, 108, 43, 0.5);
  padding-top: 14px;
  color: #f7e5c9;
}

.journal-progress-meter p {
  margin: 0;
  font-family: Georgia, "Times New Roman", serif;
  font-weight: 800;
}

.journal-progress-track {
  height: 12px;
  margin-top: 9px;
  border: 1px solid rgba(220, 162, 71, 0.76);
  border-radius: 2px;
  padding: 2px;
  background: #030817;
}

.journal-progress-fill {
  height: 100%;
  border-radius: 1px;
  background: linear-gradient(90deg, #7e2ac6, #f0abfc 48%, #f5b342);
  box-shadow: 0 0 10px rgba(217, 70, 239, 0.32);
}

.journal-quote-box {
  margin-top: 18px;
  border: 1px solid rgba(220, 162, 71, 0.62);
  border-radius: 6px;
  padding: 16px;
  text-align: center;
  background: rgba(4, 12, 28, 0.72);
}

.journal-quote-box p {
  margin: 0;
  color: #ffe4ad;
  font-family: Georgia, "Times New Roman", serif;
  font-size: 1.02rem;
  font-style: italic;
  line-height: 1.45;
}

.journal-book-stage {
  position: relative;
  perspective: 1800px;
  min-width: 0;
}

.journal-book {
  position: relative;
  min-height: min(74vh, 760px);
  border-radius: 22px;
  padding: clamp(18px, 2vw, 28px);
  background:
    radial-gradient(circle at 50% 0%, rgba(255, 231, 167, 0.16), transparent 18rem),
    linear-gradient(90deg, #26130b 0%, #5b3116 4%, #241109 8%, #160b07 49%, #2f190d 53%, #1c0e08 100%);
  box-shadow:
    inset 0 0 0 2px rgba(255, 231, 167, 0.18),
    inset 0 0 0 8px rgba(21, 9, 6, 0.78),
    inset 0 0 44px rgba(255, 190, 106, 0.13),
    0 28px 62px rgba(0, 0, 0, 0.58);
}

.journal-book::before,
.journal-book::after {
  content: "";
  position: absolute;
  top: 12%;
  bottom: 12%;
  width: 20px;
  border: 1px solid rgba(220, 162, 71, 0.48);
  border-radius: 999px;
  background: linear-gradient(180deg, #9a6328, #2a1308 38%, #c78536 50%, #2a1308 62%, #8f5524);
  box-shadow: inset 0 0 0 2px rgba(30, 12, 5, 0.66), 0 0 16px rgba(0, 0, 0, 0.4);
}

.journal-book::before {
  left: -8px;
}

.journal-book::after {
  right: -8px;
}

.journal-book-spread {
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  min-height: calc(min(74vh, 760px) - clamp(36px, 4vw, 56px));
  overflow: hidden;
  border-radius: 10px;
  background:
    linear-gradient(90deg, rgba(58, 30, 15, 0.54), transparent 7%, transparent 93%, rgba(58, 30, 15, 0.5)),
    linear-gradient(90deg, #d7c29b, #f4e4c1 9%, #ead9b8 47%, #b89767 50%, #ead9b8 53%, #f3e3bf 91%, #c9ad7c);
  box-shadow:
    inset 0 0 0 1px rgba(94, 55, 26, 0.42),
    inset 0 0 34px rgba(69, 35, 17, 0.28);
}

.journal-book-spread::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.24;
  background-image:
    repeating-linear-gradient(0deg, rgba(85, 48, 20, 0.08) 0 1px, transparent 1px 27px),
    radial-gradient(circle at 18% 24%, rgba(106, 60, 24, 0.16), transparent 18rem),
    radial-gradient(circle at 80% 72%, rgba(106, 60, 24, 0.12), transparent 15rem);
}

.journal-book-spread::after {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  left: calc(50% - 9px);
  z-index: 3;
  width: 18px;
  pointer-events: none;
  background:
    linear-gradient(90deg, rgba(56, 26, 14, 0.55), rgba(84, 45, 105, 0.78) 40%, rgba(36, 14, 58, 0.82) 51%, rgba(48, 24, 16, 0.5));
  box-shadow:
    -8px 0 18px rgba(73, 42, 20, 0.22),
    8px 0 18px rgba(73, 42, 20, 0.24);
}

.journal-paper-page {
  position: relative;
  z-index: 1;
  min-width: 0;
  max-height: calc(min(74vh, 760px) - clamp(36px, 4vw, 56px));
  overflow-y: auto;
  padding: clamp(20px, 2.35vw, 34px);
  color: var(--journal-ink);
  scrollbar-color: rgba(111, 67, 31, 0.6) transparent;
}

.journal-paper-page--contents {
  padding-right: clamp(26px, 3vw, 42px);
}

.journal-paper-page--room {
  padding-left: clamp(28px, 3vw, 46px);
}

.journal-paper-kicker,
.journal-room-number {
  margin: 0;
  color: #6f421e;
  font-family: Georgia, "Times New Roman", serif;
  font-size: 0.82rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-align: center;
  text-transform: uppercase;
}

.journal-paper-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin: 8px 0 16px;
  color: #24150c;
  font-family: Georgia, "Times New Roman", serif;
  font-size: clamp(1.45rem, 2.2vw, 2.2rem);
  font-weight: 900;
  line-height: 1.05;
  text-align: center;
}

.journal-paper-title::before,
.journal-paper-title::after {
  content: "";
  height: 1px;
  width: min(90px, 14vw);
  background: linear-gradient(90deg, transparent, rgba(111, 66, 30, 0.72), transparent);
}

.journal-contents-list {
  display: grid;
  gap: 5px;
}

.journal-contents-row {
  width: 100%;
  display: grid;
  grid-template-columns: 38px 2.2rem minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  min-height: 46px;
  border: 1px solid transparent;
  border-radius: 5px;
  padding: 5px 9px;
  color: #2d1d12;
  text-align: left;
  background: rgba(255, 255, 255, 0.13);
}

.journal-contents-row:not(:disabled) {
  cursor: pointer;
  transition: transform 140ms ease, border-color 140ms ease, background 140ms ease, box-shadow 140ms ease;
}

.journal-contents-row:not(:disabled):hover,
.journal-contents-row:not(:disabled):focus-visible {
  border-color: rgba(92, 45, 120, 0.72);
  background: rgba(69, 33, 97, 0.16);
  box-shadow: 0 0 0 2px rgba(92, 45, 120, 0.12);
  outline: none;
  transform: translateX(2px);
}

.journal-contents-row--active {
  border-color: rgba(92, 45, 120, 0.72);
  background: linear-gradient(90deg, rgba(44, 21, 73, 0.88), rgba(95, 49, 130, 0.78));
  color: #fff2cc;
  box-shadow: inset 0 0 0 1px rgba(255, 231, 167, 0.16), 0 6px 14px rgba(68, 35, 16, 0.16);
}

.journal-contents-row:disabled {
  cursor: default;
  opacity: 0.48;
  filter: saturate(0.55);
}

.journal-contents-icon {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border: 1px solid rgba(76, 45, 22, 0.72);
  border-radius: 4px;
  background: rgba(38, 24, 14, 0.86);
  color: #ffe4a6;
  font-size: 1.1rem;
  box-shadow: inset 0 0 0 2px rgba(255, 231, 167, 0.08);
}

.journal-contents-index {
  font-family: Georgia, "Times New Roman", serif;
  font-size: 1.18rem;
  font-weight: 900;
}

.journal-contents-name {
  min-width: 0;
}

.journal-contents-name strong,
.journal-room-title {
  font-family: Georgia, "Times New Roman", serif;
  font-weight: 900;
}

.journal-contents-name strong {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.journal-contents-name span {
  display: block;
  margin-top: 1px;
  overflow: hidden;
  color: inherit;
  font-size: 0.77rem;
  line-height: 1.2;
  opacity: 0.78;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.journal-contents-status {
  font-family: Georgia, "Times New Roman", serif;
  font-size: 0.78rem;
  font-weight: 900;
  text-transform: uppercase;
  white-space: nowrap;
}

.journal-front-matter {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  text-align: center;
}

.journal-front-emblem {
  display: grid;
  place-items: center;
  width: 86px;
  height: 86px;
  margin: 0 auto 18px;
  border: 2px solid rgba(111, 66, 30, 0.72);
  border-radius: 50%;
  color: #4a176f;
  font-family: Georgia, "Times New Roman", serif;
  font-size: 2rem;
  font-weight: 900;
  background: radial-gradient(circle, rgba(255, 247, 220, 0.8), rgba(216, 186, 132, 0.65));
  box-shadow: inset 0 0 0 6px rgba(83, 45, 19, 0.09);
}

.journal-front-copy {
  margin: 0 auto;
  max-width: 42ch;
  color: #4d321d;
  font-family: Georgia, "Times New Roman", serif;
  font-size: 1.05rem;
  line-height: 1.58;
}

.journal-front-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-top: 22px;
}

.journal-front-stat {
  border: 1px solid rgba(111, 66, 30, 0.36);
  border-radius: 5px;
  padding: 10px 8px;
  background: rgba(255, 255, 255, 0.14);
}

.journal-front-stat strong {
  display: block;
  color: #321c0f;
  font-family: Georgia, "Times New Roman", serif;
  font-size: 1.42rem;
  line-height: 1;
}

.journal-front-stat span {
  display: block;
  margin-top: 4px;
  color: #6f421e;
  font-size: 0.7rem;
  font-weight: 900;
  text-transform: uppercase;
}

.journal-room-header {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 14px;
  align-items: start;
  margin-bottom: 16px;
}

.journal-room-gem {
  display: grid;
  place-items: center;
  width: 54px;
  height: 54px;
  border: 1px solid rgba(111, 66, 30, 0.78);
  border-radius: 8px;
  background: linear-gradient(135deg, rgba(73, 24, 111, 0.95), rgba(12, 24, 52, 0.95));
  color: #ffe7a7;
  font-size: 1.55rem;
  box-shadow: inset 0 0 0 3px rgba(255, 231, 167, 0.12), 0 6px 14px rgba(70, 38, 16, 0.2);
}

.journal-room-title {
  margin: 2px 0 5px;
  color: #211308;
  font-size: clamp(1.4rem, 2vw, 2rem);
  line-height: 1.05;
}

.journal-room-focus,
.journal-room-date {
  margin: 0;
  color: #5a391f;
  font-size: 0.88rem;
  line-height: 1.35;
}

.journal-room-date {
  margin-top: 4px;
  color: #7d552e;
  font-style: italic;
}

.journal-paper-section {
  border-top: 1px solid rgba(111, 66, 30, 0.28);
  padding-top: 14px;
  margin-top: 14px;
}

.journal-paper-section:first-of-type {
  border-top: 0;
  padding-top: 0;
}

.journal-paper-section-title {
  margin: 0 0 8px;
  color: #321c0f;
  font-family: Georgia, "Times New Roman", serif;
  font-size: 0.96rem;
  font-weight: 900;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.journal-recap-text {
  margin: 0;
  color: #422715;
  font-family: Georgia, "Times New Roman", serif;
  font-size: 1rem;
  font-style: italic;
  line-height: 1.52;
}

.journal-artwork-frame {
  overflow: hidden;
  border: 1px solid rgba(111, 66, 30, 0.48);
  border-radius: 5px;
  background: rgba(50, 31, 17, 0.14);
}

.journal-artwork-frame img {
  display: block;
  width: 100%;
  max-height: 210px;
  object-fit: contain;
  background: rgba(25, 18, 13, 0.86);
}

.journal-artwork-frame figcaption {
  margin: 0;
  padding: 7px 9px;
  overflow: hidden;
  color: #6f421e;
  font-size: 0.72rem;
  font-style: italic;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.journal-artwork-title,
.journal-artwork-artist {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.journal-artwork-title {
  color: #2d1b0f;
  font-weight: 900;
}

.journal-artwork-artist {
  margin-top: 2px;
  color: #6f421e;
}

.journal-phase-list {
  display: grid;
  gap: 10px;
}

.journal-phase-card {
  border: 1px solid rgba(111, 66, 30, 0.32);
  border-radius: 5px;
  padding: 10px 11px;
  background: rgba(255, 255, 255, 0.13);
}

.journal-phase-card h4 {
  margin: 0 0 5px;
  color: #4a176f;
  font-family: Georgia, "Times New Roman", serif;
  font-size: 0.86rem;
  font-weight: 900;
}

.journal-phase-card h4 span {
  color: #7d552e;
  font-size: 0.72rem;
  font-style: italic;
  font-weight: 800;
}

.journal-phase-card p {
  margin: 0;
  color: #3b2413;
  font-size: 0.88rem;
  line-height: 1.48;
  white-space: pre-wrap;
}

.journal-vocab-list {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.journal-vocab-chip {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  border: 1px solid rgba(92, 45, 120, 0.35);
  border-radius: 999px;
  padding: 2px 10px;
  color: #3a174d;
  font-size: 0.78rem;
  font-weight: 800;
  background: rgba(106, 53, 143, 0.12);
}

.journal-muted {
  margin: 0;
  color: #7d552e;
  font-size: 0.88rem;
  line-height: 1.45;
}

.journal-notes-textarea {
  width: 100%;
  min-height: 112px;
  resize: vertical;
  border: 1px solid rgba(111, 66, 30, 0.5);
  border-radius: 5px;
  padding: 11px;
  color: #28190f;
  background: rgba(255, 248, 224, 0.48);
  box-shadow: inset 0 1px 10px rgba(80, 42, 15, 0.12);
}

.journal-notes-textarea::placeholder {
  color: rgba(86, 50, 23, 0.56);
  font-style: italic;
}

.journal-notes-textarea:focus-visible {
  outline: 2px solid rgba(74, 23, 111, 0.62);
  outline-offset: 3px;
}

.journal-room-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 12px;
}

.journal-locked-page {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  text-align: center;
  opacity: 0.78;
  filter: saturate(0.72);
}

.journal-locked-seal {
  display: grid;
  place-items: center;
  width: 84px;
  height: 84px;
  margin: 0 auto 18px;
  border: 2px solid rgba(111, 66, 30, 0.6);
  border-radius: 50%;
  color: #4c321c;
  font-size: 2rem;
  background:
    linear-gradient(135deg, rgba(117, 76, 36, 0.12), rgba(255, 255, 255, 0.18)),
    repeating-linear-gradient(45deg, transparent 0 8px, rgba(88, 53, 25, 0.08) 8px 10px);
}

.journal-turn-sheet {
  position: absolute;
  top: clamp(18px, 2vw, 28px);
  bottom: clamp(18px, 2vw, 28px);
  left: 50%;
  z-index: 7;
  width: calc(50% - clamp(18px, 2vw, 28px));
  border-radius: 0 10px 10px 0;
  pointer-events: none;
  opacity: 0;
  transform-origin: left center;
  background:
    linear-gradient(90deg, rgba(125, 80, 42, 0.22), rgba(255, 239, 198, 0.86) 18%, rgba(234, 217, 184, 0.92) 92%, rgba(112, 65, 30, 0.2)),
    repeating-linear-gradient(0deg, rgba(85, 48, 20, 0.05) 0 1px, transparent 1px 27px);
  box-shadow: -16px 0 30px rgba(45, 22, 12, 0.22);
}

.journal-book--turning-forward .journal-turn-sheet {
  animation: journalPageForward 420ms ease-in-out both;
}

.journal-book--turning-backward .journal-turn-sheet {
  left: clamp(18px, 2vw, 28px);
  border-radius: 10px 0 0 10px;
  transform-origin: right center;
  animation: journalPageBackward 420ms ease-in-out both;
}

@keyframes journalPageForward {
  0% {
    opacity: 0;
    transform: rotateY(0deg);
  }
  28% {
    opacity: 0.78;
  }
  100% {
    opacity: 0;
    transform: rotateY(-168deg);
  }
}

@keyframes journalPageBackward {
  0% {
    opacity: 0;
    transform: rotateY(0deg);
  }
  28% {
    opacity: 0.78;
  }
  100% {
    opacity: 0;
    transform: rotateY(168deg);
  }
}

.journal-book-nav {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 16px;
}

.journal-page-counter {
  min-width: 190px;
  color: #ffe4ad;
  font-family: Georgia, "Times New Roman", serif;
  font-size: 1.05rem;
  font-weight: 900;
  text-align: center;
  text-transform: uppercase;
}

.journal-page-counter span {
  color: #f0abfc;
}

@media (max-width: 1380px) {
  .journal-book-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .journal-side-rail {
    min-height: auto;
  }

  .journal-side-rail--left {
    order: 2;
  }

  .journal-side-rail--right {
    order: 3;
  }
}

@media (max-width: 860px) {
  .journal-book {
    min-height: auto;
    padding: 14px;
  }

  .journal-book-spread {
    grid-template-columns: 1fr;
    min-height: auto;
  }

  .journal-book-spread::after {
    display: none;
  }

  .journal-paper-page {
    max-height: none;
    padding: 22px;
  }

  .journal-paper-page--contents,
  .journal-paper-page--room {
    padding-right: 22px;
    padding-left: 22px;
  }

  .journal-paper-page--contents {
    border-bottom: 2px solid rgba(111, 66, 30, 0.22);
  }

  .journal-turn-sheet {
    display: none;
  }

  .journal-front-stats {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .journal-contents-row {
    grid-template-columns: 34px 1.7rem minmax(0, 1fr);
  }

  .journal-contents-status {
    grid-column: 3;
    justify-self: start;
  }

  .journal-room-header {
    grid-template-columns: 1fr;
    text-align: center;
  }

  .journal-room-gem {
    margin: 0 auto;
  }

  .journal-room-actions,
  .journal-book-nav {
    align-items: stretch;
    flex-direction: column;
  }

  .journal-book-nav button,
  .journal-room-actions button {
    width: 100%;
  }

  .journal-page-counter {
    min-width: 0;
  }
}

.journal-screen-shell {
  height: 100vh;
  max-height: 100vh;
  min-height: 100vh;
  overflow: hidden;
  padding: clamp(6px, 0.9vw, 12px);
  background:
    radial-gradient(circle at 20% 10%, rgba(83, 55, 167, 0.34), transparent 28rem),
    radial-gradient(circle at 72% 22%, rgba(142, 57, 180, 0.24), transparent 25rem),
    radial-gradient(circle at 50% 108%, rgba(10, 125, 144, 0.12), transparent 20rem),
    linear-gradient(180deg, #030817 0%, #07142b 52%, #020611 100%);
}

.journal-screen-shell::before {
  content: "";
  position: fixed;
  inset: 7px;
  z-index: 1;
  pointer-events: none;
  border: 1px solid rgba(244, 183, 73, 0.9);
  box-shadow:
    inset 0 0 0 2px rgba(17, 8, 28, 0.92),
    inset 0 0 0 4px rgba(216, 143, 45, 0.2),
    inset 0 0 36px rgba(104, 66, 180, 0.26);
}

.journal-screen-shell > .relative.z-10 {
  min-height: calc(100vh - clamp(12px, 1.8vw, 24px));
  max-width: 1720px;
}

.journal-screen-shell header {
  grid-template-columns: minmax(170px, 0.24fr) minmax(0, 1fr) minmax(230px, 0.28fr);
  align-items: center;
  gap: 10px;
  margin-bottom: 4px;
}

.journal-screen-shell header h1 {
  font-size: clamp(2rem, 3.1vw, 3.85rem);
  line-height: 0.86;
}

.journal-screen-shell header p {
  margin-top: 2px;
  font-size: clamp(0.92rem, 1.2vw, 1.2rem);
}

.journal-screen-shell header button {
  min-height: 40px;
  padding: 7px 20px;
  font-size: 0.9rem;
}

.journal-screen-shell header aside {
  max-width: 285px;
  padding: 7px;
}

.journal-screen-shell header aside > div {
  grid-template-columns: 48px minmax(0, 1fr);
  gap: 9px;
}

.journal-screen-shell header aside > div > div:first-child {
  width: 52px;
  height: 52px;
}

.journal-screen-shell header aside p:first-child {
  font-size: 1.05rem;
}

.journal-book-content {
  position: relative;
  display: flex;
  min-height: 0;
  height: calc(100vh - clamp(92px, 12vh, 124px));
  align-items: center;
  overflow: hidden;
}

.journal-book-content::before,
.journal-book-content::after {
  content: "";
  position: fixed;
  z-index: 0;
  pointer-events: none;
}

.journal-book-content::before {
  left: 2.4%;
  right: 2.4%;
  bottom: 42px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(244, 183, 73, 0.72), transparent);
  box-shadow: 0 -18px 40px rgba(104, 66, 180, 0.12);
}

.journal-book-content::after {
  inset: 0;
  opacity: 0.36;
  background-image:
    radial-gradient(circle, rgba(255, 231, 167, 0.9) 0 1px, transparent 1.6px),
    radial-gradient(circle, rgba(217, 112, 255, 0.4) 0 1px, transparent 1.8px);
  background-size: 90px 90px, 137px 137px;
  background-position: 12px 10px, 46px 34px;
}

.journal-book-layout {
  position: relative;
  z-index: 2;
  grid-template-columns: minmax(150px, 0.48fr) minmax(790px, 4.6fr) minmax(150px, 0.48fr);
  width: 100%;
  height: 100%;
  gap: clamp(8px, 1vw, 16px);
  align-items: center;
}

.journal-side-rail--left,
.journal-book-stage,
.journal-side-rail--right {
  order: 0;
}

.journal-side-rail {
  min-height: 0;
  height: min(100%, 610px);
  align-self: center;
  border: 1px solid rgba(244, 183, 73, 0.78);
  border-radius: 7px;
  padding: 12px 10px;
  overflow: hidden;
  background:
    linear-gradient(180deg, rgba(7, 18, 38, 0.96), rgba(3, 9, 22, 0.98)),
    radial-gradient(circle at 50% 0%, rgba(107, 55, 165, 0.34), transparent 11rem);
  box-shadow:
    inset 0 0 0 2px rgba(8, 14, 31, 0.92),
    inset 0 0 0 4px rgba(244, 183, 73, 0.1),
    inset 0 0 24px rgba(129, 65, 194, 0.16),
    0 16px 32px rgba(0, 0, 0, 0.36);
}

.journal-side-rail::before {
  inset: 6px;
  border-color: rgba(244, 183, 73, 0.34);
  box-shadow: inset 0 0 0 1px rgba(123, 63, 174, 0.18);
}

.journal-side-rail::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(90deg, var(--journal-gold) 0 7px, transparent 7px calc(100% - 7px), var(--journal-gold) calc(100% - 7px)),
    linear-gradient(180deg, var(--journal-gold) 0 7px, transparent 7px calc(100% - 7px), var(--journal-gold) calc(100% - 7px));
  clip-path: polygon(0 0, 28px 0, 28px 3px, 3px 3px, 3px 28px, 0 28px, 0 0, 100% 0, 100% 28px, calc(100% - 3px) 28px, calc(100% - 3px) 3px, calc(100% - 28px) 3px, calc(100% - 28px) 0, 100% 0, 100% 100%, calc(100% - 28px) 100%, calc(100% - 28px) calc(100% - 3px), calc(100% - 3px) calc(100% - 3px), calc(100% - 3px) calc(100% - 28px), 100% calc(100% - 28px), 100% 100%, 0 100%, 0 calc(100% - 28px), 3px calc(100% - 28px), 3px calc(100% - 3px), 28px calc(100% - 3px), 28px 100%, 0 100%);
  opacity: 0.46;
}

.journal-side-rail .mb-3 {
  margin-bottom: 8px;
}

.journal-side-rail h2 {
  font-size: clamp(0.9rem, 1.05vw, 1.08rem);
}

.journal-side-list {
  gap: 10px;
  margin-top: 9px;
}

.journal-side-item {
  grid-template-columns: 34px minmax(0, 1fr);
  gap: 9px;
  padding-bottom: 10px;
}

.journal-side-icon {
  width: 31px;
  height: 31px;
  border-radius: 5px;
  font-size: 1.05rem;
  background:
    radial-gradient(circle, rgba(142, 82, 201, 0.92), rgba(25, 19, 62, 0.96) 58%),
    linear-gradient(135deg, rgba(255, 231, 167, 0.32), transparent);
  box-shadow:
    inset 0 0 0 2px rgba(3, 10, 24, 0.82),
    0 0 12px rgba(163, 92, 226, 0.26);
}

.journal-side-copy {
  font-size: clamp(0.76rem, 0.82vw, 0.88rem);
  line-height: 1.28;
}

.journal-quote-box {
  margin-top: 12px;
  padding: 11px 9px;
  border-color: rgba(244, 183, 73, 0.62);
  background:
    radial-gradient(circle at 50% 0%, rgba(123, 63, 174, 0.18), transparent 7rem),
    rgba(4, 12, 28, 0.72);
}

.journal-quote-box p {
  font-size: clamp(0.78rem, 0.88vw, 0.95rem);
  line-height: 1.32;
}

.journal-progress-grid {
  gap: 8px;
  margin-top: 9px;
}

.journal-mini-stat {
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr);
  align-items: center;
  gap: 9px;
  min-height: 56px;
  border: 1px solid rgba(244, 183, 73, 0.34);
  border-radius: 6px;
  padding: 8px;
  background:
    linear-gradient(180deg, rgba(9, 24, 50, 0.92), rgba(4, 11, 25, 0.94)),
    radial-gradient(circle at 14% 14%, rgba(129, 65, 194, 0.22), transparent 5rem);
  box-shadow: inset 0 0 0 1px rgba(255, 231, 167, 0.06);
}

.journal-mini-stat-icon {
  color: #ffe7a7;
  font-size: 1.35rem;
  filter: drop-shadow(0 0 8px rgba(163, 92, 226, 0.35));
}

.journal-mini-stat strong {
  display: block;
  color: #dffcff;
  font-family: Georgia, "Times New Roman", serif;
  font-size: 1.42rem;
  line-height: 1;
}

.journal-mini-stat span:last-child {
  display: block;
  margin-top: 2px;
  color: #f2d19a;
  font-size: 0.64rem;
  font-weight: 900;
  letter-spacing: 0.02em;
  line-height: 1.05;
  text-transform: uppercase;
}

.journal-progress-meter {
  margin-top: 10px;
  padding-top: 10px;
}

.journal-progress-meter p {
  font-size: 0.78rem;
  line-height: 1.25;
}

.journal-progress-track {
  height: 10px;
  margin-top: 7px;
}

.journal-book-stage {
  height: min(100%, 635px);
  min-height: 520px;
  align-self: center;
  perspective: 2100px;
}

.journal-book {
  height: 100%;
  min-height: 0;
  border-radius: 26px;
  padding: clamp(16px, 1.7vw, 24px);
  background:
    radial-gradient(circle at 50% -8%, rgba(255, 231, 167, 0.22), transparent 18rem),
    linear-gradient(90deg, #1d0d07 0%, #6f3b18 3.2%, #2d150b 7%, #170b07 47.5%, #0f0807 49.3%, #351b0d 52.5%, #170b07 96%, #6b3717 98%, #1b0d07 100%);
  box-shadow:
    inset 0 0 0 2px rgba(255, 231, 167, 0.18),
    inset 0 0 0 7px rgba(20, 9, 6, 0.86),
    inset 0 0 34px rgba(244, 183, 73, 0.2),
    0 0 0 1px rgba(244, 183, 73, 0.34),
    0 24px 52px rgba(0, 0, 0, 0.62);
}

.journal-book::before,
.journal-book::after {
  top: 33%;
  bottom: 16%;
  width: 18px;
  z-index: 5;
  background:
    linear-gradient(180deg, #dca247 0%, #693615 12%, #2b1208 38%, #dca247 51%, #2b1208 64%, #6f3b18 100%);
  box-shadow:
    inset 0 0 0 2px rgba(30, 12, 5, 0.72),
    0 0 0 1px rgba(255, 231, 167, 0.2),
    0 10px 18px rgba(0, 0, 0, 0.42);
}

.journal-book::before {
  left: -6px;
}

.journal-book::after {
  right: -6px;
}

.journal-book-spread {
  height: 100%;
  min-height: 0;
  border-radius: 13px;
  background:
    linear-gradient(90deg, rgba(82, 45, 18, 0.44), transparent 5%, transparent 45%, rgba(90, 48, 18, 0.22) 49.2%, rgba(44, 20, 55, 0.38) 50%, rgba(90, 48, 18, 0.22) 50.8%, transparent 55%, transparent 95%, rgba(82, 45, 18, 0.42)),
    linear-gradient(90deg, #c3a371 0%, #ead6ab 4%, #f2dfb8 22%, #e4c893 49.2%, #9a6e4a 50%, #e4c893 50.8%, #f2dfb8 78%, #ead6ab 96%, #b89260 100%);
  box-shadow:
    inset 0 0 0 1px rgba(77, 42, 18, 0.48),
    inset 0 0 30px rgba(73, 36, 16, 0.3),
    inset 12px 0 18px rgba(83, 48, 22, 0.18),
    inset -12px 0 18px rgba(83, 48, 22, 0.18);
}

.journal-book-spread::before {
  opacity: 0.38;
  background-image:
    repeating-linear-gradient(0deg, rgba(85, 48, 20, 0.08) 0 1px, transparent 1px 22px),
    repeating-linear-gradient(90deg, rgba(85, 48, 20, 0.035) 0 1px, transparent 1px 34px),
    radial-gradient(circle at 18% 24%, rgba(106, 60, 24, 0.18), transparent 14rem),
    radial-gradient(circle at 80% 72%, rgba(106, 60, 24, 0.14), transparent 12rem);
}

.journal-book-spread::after {
  left: calc(50% - 8px);
  width: 16px;
  z-index: 6;
  background:
    linear-gradient(90deg, rgba(38, 15, 8, 0.5), rgba(89, 46, 120, 0.82) 36%, rgba(29, 13, 51, 0.9) 50%, rgba(97, 50, 128, 0.78) 64%, rgba(38, 15, 8, 0.44));
  box-shadow:
    -10px 0 22px rgba(75, 39, 16, 0.22),
    10px 0 22px rgba(75, 39, 16, 0.24);
}

.journal-paper-page {
  max-height: none;
  height: 100%;
  overflow: hidden;
  padding: clamp(16px, 1.8vw, 26px);
  cursor: pointer;
}

.journal-paper-page--contents {
  padding: clamp(15px, 1.55vw, 22px) clamp(26px, 2.3vw, 36px) clamp(15px, 1.55vw, 22px) clamp(18px, 1.8vw, 26px);
}

.journal-paper-page--room {
  padding: clamp(16px, 1.65vw, 24px) clamp(18px, 1.8vw, 28px) clamp(16px, 1.65vw, 24px) clamp(28px, 2.5vw, 42px);
  overflow-y: auto;
  cursor: pointer;
}

.journal-paper-page button,
.journal-paper-page textarea {
  cursor: auto;
}

.journal-paper-kicker,
.journal-room-number {
  font-size: 0.68rem;
  letter-spacing: 0.1em;
}

.journal-paper-title {
  gap: 9px;
  margin: 5px 0 9px;
  font-size: clamp(1.18rem, 1.75vw, 1.82rem);
  text-shadow: 0 1px 0 rgba(255, 248, 220, 0.55);
}

.journal-paper-title::before,
.journal-paper-title::after {
  width: min(64px, 9vw);
}

.journal-contents-list {
  gap: 3px;
}

.journal-contents-row {
  grid-template-columns: 30px 1.55rem minmax(0, 1fr) 3.9rem;
  min-height: 32px;
  border-radius: 4px;
  padding: 3px 7px;
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.12), rgba(101, 59, 24, 0.06)),
    rgba(255, 255, 255, 0.06);
}

.journal-contents-row:not(:disabled):hover,
.journal-contents-row:not(:disabled):focus-visible {
  border-color: rgba(92, 45, 120, 0.78);
  background: linear-gradient(90deg, rgba(44, 21, 73, 0.78), rgba(95, 49, 130, 0.58));
  color: #fff2cc;
  transform: translateX(2px);
}

.journal-contents-row:disabled {
  opacity: 0.64;
  filter: saturate(0.75);
}

.journal-contents-row--active {
  background: linear-gradient(90deg, rgba(44, 21, 73, 0.92), rgba(95, 49, 130, 0.78));
}

.journal-contents-icon {
  width: 26px;
  height: 26px;
  font-size: 0.9rem;
  border-color: rgba(76, 45, 22, 0.65);
}

.journal-contents-index {
  font-size: 0.96rem;
}

.journal-contents-name strong {
  font-size: 0.88rem;
  line-height: 1.05;
}

.journal-contents-name span {
  font-size: 0.61rem;
  line-height: 1.05;
}

.journal-contents-status {
  font-size: 0.58rem;
  text-align: right;
}

.journal-front-emblem {
  width: 70px;
  height: 70px;
  margin-bottom: 12px;
  border-color: rgba(111, 66, 30, 0.75);
  color: #4a176f;
  box-shadow:
    inset 0 0 0 5px rgba(83, 45, 19, 0.09),
    0 0 22px rgba(123, 63, 174, 0.16);
}

.journal-front-copy {
  max-width: 36ch;
  font-size: clamp(0.82rem, 1vw, 0.98rem);
  line-height: 1.42;
}

.journal-front-stats {
  gap: 8px;
  margin-top: 15px;
}

.journal-front-stat {
  padding: 8px 6px;
}

.journal-front-stat strong {
  font-size: 1.18rem;
}

.journal-front-stat span {
  font-size: 0.58rem;
}

.journal-room-header {
  gap: 10px;
  margin-bottom: 10px;
}

.journal-room-gem {
  width: 42px;
  height: 42px;
  border-radius: 7px;
  font-size: 1.25rem;
}

.journal-room-title {
  margin: 0 0 3px;
  font-size: clamp(1.18rem, 1.55vw, 1.62rem);
}

.journal-room-focus,
.journal-room-date {
  font-size: 0.74rem;
}

.journal-paper-section {
  margin-top: 9px;
  padding-top: 9px;
}

.journal-paper-section-title {
  margin-bottom: 5px;
  font-size: 0.78rem;
}

.journal-recap-text {
  font-size: 0.84rem;
  line-height: 1.35;
}

.journal-artwork-frame img {
  max-height: 138px;
}

.journal-phase-list {
  gap: 6px;
}

.journal-phase-card {
  padding: 7px 8px;
}

.journal-phase-card h4 {
  margin-bottom: 3px;
  font-size: 0.73rem;
}

.journal-phase-card h4 span {
  font-size: 0.62rem;
}

.journal-phase-card p,
.journal-muted {
  font-size: 0.74rem;
  line-height: 1.34;
}

.journal-vocab-list {
  gap: 5px;
}

.journal-vocab-chip {
  min-height: 20px;
  padding: 1px 8px;
  font-size: 0.66rem;
}

.journal-notes-textarea {
  min-height: 72px;
  padding: 8px;
  font-size: 0.78rem;
}

.journal-room-actions {
  gap: 8px;
  margin-top: 8px;
}

.journal-room-actions button {
  min-height: 34px;
  padding: 6px 10px;
  font-size: 0.68rem;
}

.journal-locked-seal {
  width: 68px;
  height: 68px;
  margin-bottom: 12px;
  font-size: 1.45rem;
}

.journal-book-nav {
  display: none;
}

.journal-book-page-counter {
  position: absolute;
  left: 50%;
  bottom: 5px;
  z-index: 9;
  transform: translateX(-50%);
  min-width: 220px;
  border: 1px solid rgba(244, 183, 73, 0.54);
  border-radius: 999px;
  padding: 5px 16px;
  color: #ffe7a7;
  font-family: Georgia, "Times New Roman", serif;
  font-size: 0.76rem;
  font-weight: 900;
  text-align: center;
  text-transform: uppercase;
  background: rgba(5, 13, 31, 0.86);
  box-shadow: inset 0 0 0 1px rgba(255, 231, 167, 0.08), 0 0 18px rgba(123, 63, 174, 0.2);
}

.journal-book-page-counter span {
  color: #f0abfc;
}

.journal-edge-tab,
.journal-corner-control,
.journal-page-curl {
  position: absolute;
  z-index: 10;
  display: grid;
  place-items: center;
  border: 1px solid rgba(244, 183, 73, 0.78);
  color: #ffe7a7;
  font-family: Georgia, "Times New Roman", serif;
  font-weight: 900;
  background:
    linear-gradient(180deg, rgba(58, 21, 88, 0.96), rgba(12, 23, 50, 0.96)),
    radial-gradient(circle, rgba(240, 171, 252, 0.28), transparent 60%);
  box-shadow:
    inset 0 0 0 2px rgba(5, 13, 31, 0.78),
    0 0 18px rgba(163, 92, 226, 0.26),
    0 8px 18px rgba(0, 0, 0, 0.38);
  transition: transform 140ms ease, filter 140ms ease, opacity 140ms ease;
}

.journal-edge-tab:hover:not(:disabled),
.journal-corner-control:hover:not(:disabled),
.journal-page-curl:hover:not(:disabled),
.journal-edge-tab:focus-visible,
.journal-corner-control:focus-visible,
.journal-page-curl:focus-visible {
  filter: brightness(1.16) saturate(1.1);
  outline: 2px solid rgba(255, 231, 167, 0.86);
  outline-offset: 3px;
}

.journal-edge-tab:disabled,
.journal-corner-control:disabled,
.journal-page-curl:disabled {
  cursor: not-allowed;
  filter: grayscale(0.72) brightness(0.72);
  opacity: 0.48;
}

.journal-edge-tab {
  top: 50%;
  width: 36px;
  height: 90px;
  transform: translateY(-50%);
  font-size: 2rem;
}

.journal-edge-tab--prev {
  left: -15px;
  border-radius: 14px 5px 5px 14px;
}

.journal-edge-tab--next {
  right: -15px;
  border-radius: 5px 14px 14px 5px;
}

.journal-corner-control {
  top: 12px;
  width: 38px;
  height: 32px;
  font-size: 0.84rem;
}

.journal-corner-control--first {
  left: 25px;
  clip-path: polygon(0 0, 100% 0, 84% 100%, 0 100%);
}

.journal-corner-control--last {
  right: 25px;
  clip-path: polygon(0 0, 100% 0, 100% 100%, 16% 100%);
}

.journal-page-curl {
  bottom: 18px;
  width: 44px;
  height: 44px;
  border-radius: 0 0 8px 0;
  color: rgba(83, 45, 19, 0.86);
  background:
    linear-gradient(135deg, rgba(255, 247, 220, 0.82), rgba(199, 160, 95, 0.72) 54%, rgba(96, 56, 24, 0.2) 56%),
    var(--journal-parchment-light);
  box-shadow:
    inset -5px -5px 10px rgba(74, 42, 18, 0.2),
    0 5px 12px rgba(78, 42, 18, 0.2);
}

.journal-page-curl--prev {
  left: 31px;
  transform: scaleX(-1);
}

.journal-page-curl--prev span {
  transform: scaleX(-1);
}

.journal-page-curl--next {
  right: 31px;
}

.journal-turn-sheet {
  top: clamp(16px, 1.7vw, 24px);
  bottom: clamp(16px, 1.7vw, 24px);
  z-index: 12;
  width: calc(50% - clamp(16px, 1.7vw, 24px));
  border-radius: 0 13px 13px 0;
  transform-style: preserve-3d;
  backface-visibility: hidden;
  background:
    linear-gradient(90deg, rgba(96, 56, 24, 0.2), rgba(255, 241, 202, 0.96) 16%, rgba(233, 210, 167, 0.98) 62%, rgba(122, 74, 32, 0.22)),
    repeating-linear-gradient(0deg, rgba(85, 48, 20, 0.07) 0 1px, transparent 1px 22px),
    radial-gradient(circle at 78% 28%, rgba(106, 60, 24, 0.12), transparent 10rem);
  box-shadow:
    -22px 0 34px rgba(44, 22, 10, 0.34),
    inset 12px 0 18px rgba(255, 248, 220, 0.38),
    inset -12px 0 20px rgba(96, 56, 24, 0.18);
}

.journal-book--turning-forward .journal-turn-sheet {
  animation: journalPageForward 520ms cubic-bezier(0.2, 0.68, 0.24, 1) both;
}

.journal-book--turning-backward .journal-turn-sheet {
  left: clamp(16px, 1.7vw, 24px);
  border-radius: 13px 0 0 13px;
  animation: journalPageBackward 520ms cubic-bezier(0.2, 0.68, 0.24, 1) both;
}

@keyframes journalPageForward {
  0% {
    opacity: 0;
    transform: rotateY(0deg) translateZ(1px);
    box-shadow: -10px 0 18px rgba(44, 22, 10, 0.18);
  }
  18% {
    opacity: 0.96;
  }
  58% {
    opacity: 0.94;
    transform: rotateY(-92deg) translateZ(9px);
    box-shadow: -34px 0 42px rgba(44, 22, 10, 0.34);
  }
  100% {
    opacity: 0;
    transform: rotateY(-176deg) translateZ(1px);
    box-shadow: 12px 0 28px rgba(44, 22, 10, 0.2);
  }
}

@keyframes journalPageBackward {
  0% {
    opacity: 0;
    transform: rotateY(0deg) translateZ(1px);
    box-shadow: 10px 0 18px rgba(44, 22, 10, 0.18);
  }
  18% {
    opacity: 0.96;
  }
  58% {
    opacity: 0.94;
    transform: rotateY(92deg) translateZ(9px);
    box-shadow: 34px 0 42px rgba(44, 22, 10, 0.34);
  }
  100% {
    opacity: 0;
    transform: rotateY(176deg) translateZ(1px);
    box-shadow: -12px 0 28px rgba(44, 22, 10, 0.2);
  }
}

@media (max-height: 690px) {
  .journal-screen-shell header {
    transform: scale(0.92);
    transform-origin: top center;
    margin-bottom: -8px;
  }

  .journal-book-content {
    height: calc(100vh - 92px);
  }

  .journal-book-stage {
    min-height: 500px;
  }

  .journal-side-rail {
    height: min(100%, 560px);
  }

  .journal-paper-page {
    padding-top: 14px;
    padding-bottom: 14px;
  }
}

@media (max-width: 1180px) {
  .journal-book-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .journal-side-rail {
    display: none;
  }

  .journal-book-stage {
    height: 100%;
  }
}

.journal-screen-shell {
  background:
    radial-gradient(circle at 20% 10%, rgba(83, 55, 167, 0.2), transparent 28rem),
    radial-gradient(circle at 72% 22%, rgba(142, 57, 180, 0.14), transparent 25rem),
    #020711;
}

.journal-screen-shell > .pointer-events-none.fixed,
.journal-screen-shell header {
  display: none;
}

.journal-screen-shell > .relative.z-10 {
  min-height: 100vh;
  max-width: none;
}

.journal-book-content {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  height: 100vh;
  min-height: 100vh;
  overflow: hidden;
}

.journal-book-content::before,
.journal-book-content::after,
.journal-screen-shell::before {
  display: none;
}

.journal-plate-return {
  position: absolute;
  left: 3.25%;
  top: 5.15%;
  z-index: 30;
  width: 16.5%;
  height: 6.9%;
  border: 0;
  background: transparent;
  cursor: pointer;
}

.journal-plate-return:focus-visible {
  outline: 2px solid rgba(255, 231, 167, 0.92);
  outline-offset: 3px;
}

.journal-live-avatar-panel,
.journal-live-progress-panel {
  position: absolute;
  z-index: 24;
  border: 1px solid rgba(224, 158, 57, 0.94);
  border-radius: 0.55vw;
  color: #f8ddb0;
  background:
    radial-gradient(circle at 18% 18%, rgba(126, 57, 178, 0.24), transparent 6rem),
    linear-gradient(180deg, rgba(5, 16, 36, 0.98), rgba(2, 8, 21, 0.99));
  box-shadow:
    inset 0 0 0 1px rgba(255, 232, 170, 0.12),
    inset 0 0 22px rgba(125, 63, 178, 0.16),
    0 0 16px rgba(0, 0, 0, 0.38);
}

.journal-live-avatar-panel::before,
.journal-live-progress-panel::before {
  content: "";
  position: absolute;
  inset: 5px;
  border: 1px solid rgba(224, 158, 57, 0.32);
  pointer-events: none;
}

.journal-live-avatar-panel {
  left: 73.95%;
  top: 2.45%;
  width: 23.6%;
  height: 12.05%;
  display: grid;
  grid-template-columns: 22% minmax(0, 1fr);
  gap: 4.1%;
  align-items: center;
  padding: 0.72% 1.15%;
}

.journal-live-avatar-portrait {
  display: grid;
  place-items: center;
  width: 100%;
  aspect-ratio: 1;
  min-width: 0;
  border: 1px solid rgba(224, 158, 57, 0.75);
  border-radius: 0.3vw;
  background: #07142d;
  box-shadow: inset 0 0 0 2px rgba(3, 8, 19, 0.84);
}

.journal-live-avatar-portrait img {
  width: 82%;
  height: 82%;
  object-fit: contain;
  image-rendering: pixelated;
}

.journal-live-avatar-initial {
  color: #ffe7a7;
  font-family: Georgia, "Times New Roman", serif;
  font-size: clamp(1rem, 1.9vw, 2rem);
  font-weight: 900;
}

.journal-live-avatar-main {
  position: relative;
  z-index: 1;
  min-width: 0;
}

.journal-live-avatar-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.55vw;
}

.journal-live-avatar-name,
.journal-live-progress-title {
  margin: 0;
  color: #ffc857;
  font-family: Georgia, "Times New Roman", serif;
  font-weight: 900;
  letter-spacing: 0.02em;
  text-shadow: 0 1px 0 #4a260e, 0 0 10px rgba(244, 183, 73, 0.18);
}

.journal-live-avatar-name {
  overflow: hidden;
  font-size: clamp(0.72rem, 1.25vw, 1.55rem);
  line-height: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.journal-live-avatar-year {
  flex: 0 0 auto;
  color: #ffc857;
  font-size: clamp(0.48rem, 0.72vw, 0.8rem);
  font-weight: 900;
  line-height: 1.05;
  text-transform: uppercase;
}

.journal-live-avatar-title {
  margin: 0.32vh 0 0;
  overflow: hidden;
  color: #f7d9ab;
  font-size: clamp(0.48rem, 0.72vw, 0.86rem);
  line-height: 1.15;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.journal-live-avatar-xp {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.65vw;
  align-items: center;
  margin-top: 1vh;
}

.journal-live-avatar-xp-track {
  height: clamp(6px, 1vh, 12px);
  border: 1px solid rgba(224, 158, 57, 0.8);
  padding: 2px;
  background: #020815;
}

.journal-live-avatar-xp-fill {
  height: 100%;
  background: linear-gradient(90deg, #8b4bd1, #f0abfc 42%, #ffc857);
  box-shadow: 0 0 10px rgba(240, 171, 252, 0.28);
}

.journal-live-avatar-xp-text {
  color: #fff2c9;
  font-size: clamp(0.48rem, 0.68vw, 0.78rem);
  font-weight: 900;
  white-space: nowrap;
}

.journal-live-progress-panel {
  left: 82.7%;
  top: 25%;
  width: 14.55%;
  height: 31.9%;
  padding: 1.35% 1.25%;
}

.journal-live-progress-title {
  position: relative;
  z-index: 1;
  margin-bottom: 1.4vh;
  font-size: clamp(0.58rem, 0.98vw, 1.08rem);
  text-align: center;
  text-transform: uppercase;
}

.journal-live-progress-list {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 1.1vh;
}

.journal-live-progress-stat {
  display: grid;
  grid-template-columns: 2.1vw minmax(0, 1fr);
  gap: 0.65vw;
  align-items: center;
  border-bottom: 1px solid rgba(119, 69, 25, 0.52);
  padding-bottom: 0.95vh;
}

.journal-live-progress-stat:last-child {
  border-bottom: 0;
  padding-bottom: 0;
}

.journal-live-progress-icon {
  display: grid;
  place-items: center;
  color: #ffe7a7;
  font-size: clamp(1rem, 1.8vw, 2rem);
  filter: drop-shadow(0 0 8px rgba(180, 92, 227, 0.34));
}

.journal-live-progress-value {
  display: block;
  color: #dffcff;
  font-family: Georgia, "Times New Roman", serif;
  font-size: clamp(0.95rem, 1.8vw, 2.15rem);
  font-weight: 900;
  line-height: 0.9;
}

.journal-live-progress-label {
  display: block;
  margin-top: 0.38vh;
  color: #f3d19b;
  font-size: clamp(0.42rem, 0.65vw, 0.72rem);
  font-weight: 900;
  line-height: 1.08;
  text-transform: uppercase;
}

.journal-visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

.journal-book-layout {
  position: relative;
  display: block;
  width: min(100vw, 177.683vh);
  height: min(100vh, 56.28vw);
  max-width: 100vw;
  max-height: 100vh;
  aspect-ratio: 1672 / 941;
  background: url("${JOURNAL_BLANK_PLATE_SRC}") center / 100% 100% no-repeat;
}

.journal-page-turn-frame {
  position: absolute;
  inset: 0;
  z-index: 22;
  display: block;
  width: 100%;
  height: 100%;
  object-fit: fill;
  pointer-events: none;
  user-select: none;
}

.journal-book--turning-forward .journal-book-spread,
.journal-book--turning-backward .journal-book-spread {
  opacity: 0;
  pointer-events: none;
}

.journal-book--turning-forward .journal-book-page-counter,
.journal-book--turning-backward .journal-book-page-counter {
  opacity: 0;
}

.journal-side-rail {
  display: none;
}

.journal-book-stage {
  position: absolute;
  left: 21.85%;
  top: 17.1%;
  width: 55.7%;
  height: 68.2%;
  min-height: 0;
  perspective: 2200px;
}

.journal-book {
  height: 100%;
  min-height: 0;
  padding: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.journal-book::before,
.journal-book::after {
  display: none;
}

.journal-book-spread {
  height: 100%;
  min-height: 0;
  overflow: visible;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.journal-book-spread::before,
.journal-book-spread::after {
  display: none;
}

.journal-paper-page {
  height: 100%;
  overflow: hidden;
  background: transparent;
}

.journal-paper-page--contents {
  padding: 2.2vh 2.25vw 2.7vh 2vw;
}

.journal-paper-page--room {
  padding: 2.4vh 2vw 2.9vh 2.75vw;
}

.journal-paper-page--room-left {
  padding-left: 2vw;
  padding-right: 2.55vw;
  overflow-y: auto;
}

.journal-paper-page--room-right {
  padding-left: 2.9vw;
  padding-right: 1.8vw;
  overflow-y: auto;
}

.journal-paper-kicker,
.journal-room-number {
  color: #6d4020;
  font-size: clamp(0.58rem, 0.78vw, 0.78rem);
}

.journal-paper-title {
  margin: 0.45vh 0 1.05vh;
  color: #24150c;
  font-size: clamp(1.08rem, 1.65vw, 1.75rem);
}

.journal-contents-list {
  gap: 0.18vh;
}

.journal-contents-row {
  grid-template-columns: 2rem 1.45rem minmax(0, 1fr) 3.6rem;
  min-height: clamp(18px, 2.25vh, 28px);
  padding: 0.12vh 0.45vw;
  border-color: rgba(77, 42, 18, 0.13);
  background: rgba(255, 248, 224, 0.16);
}

.journal-contents-icon {
  width: 1.1rem;
  height: 1.1rem;
  font-size: 0.62rem;
}

.journal-contents-index {
  font-size: clamp(0.68rem, 0.86vw, 0.9rem);
}

.journal-contents-name strong {
  font-size: clamp(0.56rem, 0.76vw, 0.82rem);
}

.journal-contents-name span {
  font-size: clamp(0.42rem, 0.54vw, 0.58rem);
}

.journal-contents-status {
  font-size: clamp(0.38rem, 0.5vw, 0.54rem);
}

.journal-front-matter {
  justify-content: center;
  padding-bottom: 1.5vh;
}

.journal-front-emblem {
  width: clamp(54px, 5vw, 76px);
  height: clamp(54px, 5vw, 76px);
  margin-bottom: 1.3vh;
}

.journal-front-copy {
  font-size: clamp(0.72rem, 0.95vw, 1rem);
}

.journal-front-stats {
  margin-top: 1.6vh;
}

.journal-room-header {
  margin-bottom: 1.1vh;
}

.journal-room-title {
  font-size: clamp(1.06rem, 1.45vw, 1.55rem);
}

.journal-room-focus,
.journal-room-date {
  font-size: clamp(0.62rem, 0.72vw, 0.78rem);
}

.journal-room-gem {
  width: clamp(34px, 3.1vw, 44px);
  height: clamp(34px, 3.1vw, 44px);
}

.journal-artwork-frame--large img {
  max-height: 22vh;
}

.journal-artwork-frame img {
  max-height: 18vh;
}

.journal-paper-section {
  margin-top: 1vh;
  padding-top: 1vh;
}

.journal-paper-section-title {
  font-size: clamp(0.66rem, 0.76vw, 0.82rem);
}

.journal-recap-text,
.journal-phase-card p,
.journal-muted {
  font-size: clamp(0.63rem, 0.76vw, 0.82rem);
}

.journal-phase-list {
  gap: 0.65vh;
}

.journal-phase-card {
  padding: 0.65vh 0.6vw;
}

.journal-phase-card h4 {
  font-size: clamp(0.62rem, 0.74vw, 0.8rem);
}

.journal-notes-textarea {
  min-height: 8.2vh;
  max-height: 15vh;
  resize: none;
}

.journal-room-actions button {
  min-height: 3.8vh;
}

.journal-locked-page {
  padding: 0 1.5vw;
}

.journal-locked-seal {
  width: clamp(54px, 5vw, 72px);
  height: clamp(54px, 5vw, 72px);
}

.journal-edge-tab,
.journal-corner-control {
  border: 0;
  color: transparent;
  background: transparent;
  box-shadow: none;
}

.journal-edge-tab:focus-visible,
.journal-corner-control:focus-visible,
.journal-page-curl:focus-visible {
  outline: 2px solid rgba(255, 231, 167, 0.92);
  outline-offset: 2px;
}

.journal-corner-control--first,
.journal-edge-tab--prev,
.journal-edge-tab--next,
.journal-corner-control--last {
  width: 4.2vw;
  height: 5.7vh;
  min-width: 48px;
  min-height: 38px;
  clip-path: none;
}

.journal-corner-control--first {
  left: -4.45vw;
  top: 35.7%;
}

.journal-edge-tab--prev {
  left: -4.45vw;
  top: 61.1%;
  transform: none;
}

.journal-edge-tab--next {
  right: -4.45vw;
  top: 35.7%;
  transform: none;
}

.journal-corner-control--last {
  right: -4.45vw;
  top: 61.1%;
}

.journal-page-curl {
  opacity: 0;
  width: 4.5vw;
  height: 6vh;
  border: 0;
  background: transparent;
  box-shadow: none;
}

.journal-page-curl:disabled {
  opacity: 0;
  cursor: default;
  filter: none;
}

.journal-book-page-counter {
  bottom: -4.1vh;
  min-width: min(28vw, 320px);
  padding: 0.45vh 1.2vw;
  font-size: clamp(0.62rem, 0.8vw, 0.84rem);
  background: rgba(5, 13, 31, 0.72);
}

.journal-turn-sheet {
  top: 0;
  bottom: 0;
  width: 50%;
  border-radius: 10px;
  background:
    linear-gradient(90deg, rgba(99, 61, 30, 0.18), rgba(255, 241, 202, 0.98) 15%, rgba(232, 208, 164, 0.99) 70%, rgba(99, 61, 30, 0.25)),
    repeating-linear-gradient(0deg, rgba(85, 48, 20, 0.07) 0 1px, transparent 1px 22px);
}

.journal-book--turning-backward .journal-turn-sheet {
  left: 0;
}

@media (max-width: 1180px) {
  .journal-book-stage {
    left: 21.85%;
    width: 55.7%;
  }

  .journal-paper-page--contents {
    padding-left: 1.6vw;
    padding-right: 2.4vw;
  }

  .journal-paper-page--room {
    padding-left: 2.4vw;
    padding-right: 1.8vw;
  }
}
`;

const getJournalPhaseResponses = (entry: JournalEntry): Record<JournalPhase, string> => ({
  1: entry.phaseResponses?.[1] || '',
  2: entry.phaseResponses?.[2] || '',
  3: entry.phaseResponses?.[3] || '',
  4: entry.phaseResponses?.[4] || entry.playerReflection || '',
});

const formatJournalDate = (dateValue: string): string => {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return dateValue;
  return date.toLocaleDateString('en-AU');
};

const getRoomTitle = (wing: WingDefinition): string => (
  wing.icon && wing.name.startsWith(wing.icon)
    ? wing.name.slice(wing.icon.length).trim()
    : wing.name
);

const getFocusTitle = (artPrinciple: string): string => artPrinciple.split(' - ')[0].trim();

const getArtworkTitle = (entry: JournalEntry): string => (
  entry.mainArtworkTitle?.trim() || 'Artwork analysed'
);

const getArtworkArtist = (entry: JournalEntry): string => (
  entry.mainArtworkArtist?.trim() || 'Artist unknown'
);

interface PdfImageData {
  dataUrl: string;
  width: number;
  height: number;
}

const loadImageElement = (src: string): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
  const img = new Image();
  if (/^https?:\/\//i.test(src) && !src.startsWith(window.location.origin)) {
    img.crossOrigin = 'anonymous';
  }
  img.onload = () => resolve(img);
  img.onerror = () => reject(new Error(`Unable to load artwork image: ${src}`));
  img.src = src;
});

const prepareImageForPdf = async (src: string): Promise<PdfImageData> => {
  const img = await loadImageElement(src);
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;
  if (!width || !height) {
    throw new Error('Artwork image loaded without usable dimensions.');
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas rendering is unavailable for PDF image export.');
  }

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  return {
    dataUrl: canvas.toDataURL('image/jpeg', 0.92),
    width,
    height,
  };
};

const getEntryDateValue = (entry: JournalEntry): number => {
  const dateValue = new Date(entry.completedDate).getTime();
  return Number.isNaN(dateValue) ? 0 : dateValue;
};

const isJournalInteractiveTarget = (target: EventTarget | null): boolean => (
  target instanceof Element && Boolean(target.closest('button, textarea, input, select, a, [role="button"]'))
);

const JournalScreen: React.FC<JournalScreenProps> = ({
  learningJournal,
  selectedAvatar,
  playerStats,
  onReturnToMap,
  focusedWingId,
  onClearFocusedWingId,
  onUpdateJournalEntry,
  onPageTurn,
  onFastPageTurn,
}) => {
  const pageTurnIntervalRef = useRef<number | null>(null);
  const saveTimersRef = useRef<Record<string, number>>({});
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [turnDirection, setTurnDirection] = useState<PageTurnDirection>(null);
  const [turnFrameIndex, setTurnFrameIndex] = useState(0);
  const [pageTurnSerial, setPageTurnSerial] = useState(0);
  const [personalReflections, setPersonalReflections] = useState<Record<string, string>>({});
  const [isExportingPdf, setIsExportingPdf] = useState<Record<string, boolean>>({});
  const [recentlySavedEntries, setRecentlySavedEntries] = useState<Record<string, boolean>>({});

  const entriesByWingId = useMemo<Record<string, JournalEntry>>(() => {
    const entries: Record<string, JournalEntry> = {};
    learningJournal.forEach(entry => {
      const existingEntry = entries[entry.wingId];
      if (!existingEntry || getEntryDateValue(entry) >= getEntryDateValue(existingEntry)) {
        entries[entry.wingId] = entry;
      }
    });
    return entries;
  }, [learningJournal]);

  const latestEntry = useMemo<JournalEntry | null>(() => (
    learningJournal.reduce<JournalEntry | null>((latest, entry) => {
      if (!latest || getEntryDateValue(entry) > getEntryDateValue(latest)) return entry;
      return latest;
    }, null)
  ), [learningJournal]);

  const totalPageCount = WING_DEFINITIONS.length + 1;
  const currentWing = currentPageIndex > 0 ? WING_DEFINITIONS[currentPageIndex - 1] : null;
  const currentEntry = currentWing ? entriesByWingId[currentWing.id] : null;
  const latestEntryWing = latestEntry
    ? WING_DEFINITIONS.find(wing => wing.id === latestEntry.wingId)
    : undefined;
  const latestEntryFallbackWing: WingDefinition | undefined = latestEntry
    ? {
      id: latestEntry.wingId,
      name: latestEntry.wingName,
      artPrinciple: latestEntry.artPrinciple,
      icon: latestEntry.gemIcon,
    }
    : undefined;
  const latestEntryDisplayWing = latestEntryWing || latestEntryFallbackWing;
  const latestEntryTitle = latestEntryDisplayWing ? getRoomTitle(latestEntryDisplayWing) : '';
  const completedRoomsCount = WING_DEFINITIONS.filter(wing => Boolean(entriesByWingId[wing.id])).length;
  const completionPercentage = Math.round((completedRoomsCount / Math.max(1, WING_DEFINITIONS.length)) * 100);
  const artEnergyXP = playerStats?.artEnergy.currentXP || 0;
  const artEnergyMaxXP = playerStats?.artEnergy.maxXp || 600;
  const artEnergyPercentage = Math.min(100, Math.round((artEnergyXP / Math.max(1, artEnergyMaxXP)) * 100));
  const avatarCourseLabel = selectedAvatar
    ? getAssessmentDisplayLabel(selectedAvatar.selectedYearLevel, selectedAvatar.selectedCoursePathway)
    : 'Year';
  const avatarBuild = selectedAvatar?.id === 'custom' && selectedAvatar.avatarBuild
    ? getAvatarBuildForAvatar(selectedAvatar)
    : null;
  const avatarLayerImageUrls = avatarBuild ? getAvatarLayerImageUrls(avatarBuild) : [];
  const shouldUseLayeredAvatar = avatarLayerImageUrls.length > 1;
  const avatarImageUrl = selectedAvatar?.imageUrl;

  useEffect(() => {
    [JOURNAL_BLANK_PLATE_SRC, JOURNAL_BOOK_REST_SRC, ...pageTurnFramesForward].forEach((src) => {
      const image = new Image();
      image.src = src;
    });
  }, []);

  useEffect(() => {
    const initialReflections: Record<string, string> = {};
    learningJournal.forEach(entry => {
      initialReflections[entry.id] = entry.playerPersonalReflection || '';
    });
    setPersonalReflections(initialReflections);
  }, [learningJournal]);

  const clearPageTurnAnimation = () => {
    if (pageTurnIntervalRef.current) {
      window.clearInterval(pageTurnIntervalRef.current);
      pageTurnIntervalRef.current = null;
    }
  };

  const startPageTurn = (direction: Exclude<PageTurnDirection, null>, targetPageIndex: number) => {
    clearPageTurnAnimation();
    setTurnDirection(direction);
    setTurnFrameIndex(0);
    setPageTurnSerial(serial => serial + 1);

    let frameIndex = 0;
    let hasSwappedPage = false;
    const swapDisplayedPage = () => {
      if (hasSwappedPage) return;
      setCurrentPageIndex(targetPageIndex);
      hasSwappedPage = true;
    };

    pageTurnIntervalRef.current = window.setInterval(() => {
      frameIndex += 1;

      if (frameIndex >= PAGE_TURN_SWAP_FRAME_INDEX) {
        swapDisplayedPage();
      }

      if (frameIndex >= PAGE_TURN_FRAME_COUNT) {
        clearPageTurnAnimation();
        swapDisplayedPage();
        setTurnDirection(null);
        setTurnFrameIndex(0);
        return;
      }

      setTurnFrameIndex(frameIndex);
    }, PAGE_TURN_FRAME_DURATION_MS);
  };

  const startFastPageTurn = (direction: Exclude<PageTurnDirection, null>, targetPageIndex: number) => {
    clearPageTurnAnimation();
    setTurnDirection(direction);
    setTurnFrameIndex(0);
    setPageTurnSerial(serial => serial + 1);

    const startingPageIndex = currentPageIndex;
    const pageDistance = targetPageIndex - startingPageIndex;
    const animationStartedAt = Date.now();
    let displayedPageIndex = startingPageIndex;

    const setDisplayedPageProgress = (cycleIndex: number) => {
      const isFinalCycle = cycleIndex >= FAST_PAGE_TURN_CYCLES - 1;
      const progress = isFinalCycle ? 1 : (cycleIndex + 1) / FAST_PAGE_TURN_CYCLES;
      const nextDisplayedPageIndex = Math.max(
        0,
        Math.min(totalPageCount - 1, Math.round(startingPageIndex + pageDistance * progress)),
      );

      if (nextDisplayedPageIndex !== displayedPageIndex) {
        displayedPageIndex = nextDisplayedPageIndex;
        setCurrentPageIndex(nextDisplayedPageIndex);
      }
    };

    pageTurnIntervalRef.current = window.setInterval(() => {
      const elapsedMs = Date.now() - animationStartedAt;

      if (elapsedMs >= FAST_PAGE_TURN_DURATION_MS) {
        clearPageTurnAnimation();
        setCurrentPageIndex(targetPageIndex);
        setTurnDirection(null);
        setTurnFrameIndex(0);
        return;
      }

      const absoluteFrameIndex = Math.min(
        FAST_PAGE_TURN_TOTAL_FRAMES - 1,
        Math.floor((elapsedMs / FAST_PAGE_TURN_DURATION_MS) * FAST_PAGE_TURN_TOTAL_FRAMES),
      );
      const frameIndex = absoluteFrameIndex % PAGE_TURN_FRAME_COUNT;
      const cycleIndex = Math.floor(absoluteFrameIndex / PAGE_TURN_FRAME_COUNT);

      if (frameIndex >= PAGE_TURN_SWAP_FRAME_INDEX) {
        setDisplayedPageProgress(cycleIndex);
      }

      setTurnFrameIndex(frameIndex);
    }, FAST_PAGE_TURN_TICK_MS);
  };

  const goToPage = (targetPageIndex: number, sound: JournalPageTurnSound = 'page') => {
    if (turnDirection) return;
    const nextPageIndex = Math.max(0, Math.min(totalPageCount - 1, targetPageIndex));
    if (nextPageIndex === currentPageIndex) return;
    const direction = nextPageIndex > currentPageIndex ? 'forward' : 'backward';
    if (sound === 'fast') {
      onFastPageTurn?.();
      startFastPageTurn(direction, nextPageIndex);
    } else {
      onPageTurn?.();
      startPageTurn(direction, nextPageIndex);
    }
  };

  const handlePageSurfaceClick = (event: React.MouseEvent<HTMLElement>, targetPageIndex: number) => {
    if (isJournalInteractiveTarget(event.target)) return;
    goToPage(targetPageIndex);
  };

  useEffect(() => {
    if (!focusedWingId) return;
    const focusedIndex = WING_DEFINITIONS.findIndex(wing => wing.id === focusedWingId);
    if (focusedIndex >= 0) {
      const focusedPageIndex = focusedIndex + 1;
      if (focusedPageIndex !== currentPageIndex) {
        startPageTurn(focusedPageIndex > currentPageIndex ? 'forward' : 'backward', focusedPageIndex);
      }
    }
    onClearFocusedWingId();
  }, [focusedWingId, currentPageIndex, onClearFocusedWingId]);

  useEffect(() => () => {
    clearPageTurnAnimation();
    Object.values(saveTimersRef.current).forEach(timer => window.clearTimeout(timer));
  }, []);

  const handleReflectionChange = (entryId: string, value: string) => {
    setPersonalReflections(prev => ({ ...prev, [entryId]: value }));
  };

  const handleSaveReflection = (entry: JournalEntry) => {
    const updatedEntry = { ...entry, playerPersonalReflection: personalReflections[entry.id] };
    onUpdateJournalEntry(updatedEntry);

    setRecentlySavedEntries(prev => ({ ...prev, [entry.id]: true }));
    if (saveTimersRef.current[entry.id]) {
      window.clearTimeout(saveTimersRef.current[entry.id]);
    }
    saveTimersRef.current[entry.id] = window.setTimeout(() => {
      setRecentlySavedEntries(prev => ({ ...prev, [entry.id]: false }));
      delete saveTimersRef.current[entry.id];
    }, 2000);
  };

  const handleExportToPDF = async (entry: JournalEntry) => {
    setIsExportingPdf(prev => ({ ...prev, [entry.id]: true }));
    try {
      const globalJsPDF = (window as unknown as { jspdf?: { jsPDF?: typeof import('jspdf').default } }).jspdf?.jsPDF;
      if (!globalJsPDF && window.location.protocol === 'file:') {
        throw new Error('PDF export is unavailable because the standalone jsPDF library did not load.');
      }
      const jsPDF = globalJsPDF || (await import('jspdf')).default;
      const doc = new jsPDF('p', 'pt', 'a4');

      const pageHeight = doc.internal.pageSize.getHeight();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 40;
      const usableWidth = pageWidth - 2 * margin;
      let yPosition = margin;
      const baseLineHeight = 14;
      const titleLineHeight = 20;
      const mainTitleLineHeight = 28;
      const sectionSpacing = 20;

      const addPageIfNeeded = (currentY: number, contentHeightEstimate: number = baseLineHeight): number => {
        if (currentY + contentHeightEstimate > pageHeight - margin) {
          doc.addPage();
          return margin;
        }
        return currentY;
      };

      const addSectionTitle = (title: string, currentY: number): number => {
        let nextY = addPageIfNeeded(currentY, titleLineHeight + 5);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(title, margin, nextY);
        nextY += titleLineHeight;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        return nextY;
      };

      const addWrappedParagraph = (text: string | undefined, currentY: number, customLineHeight: number = baseLineHeight): number => {
        let nextY = currentY;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const lines = doc.splitTextToSize(text || 'N/A', usableWidth);
        for (const line of lines) {
          nextY = addPageIfNeeded(nextY, customLineHeight);
          doc.text(line, margin, nextY);
          nextY += customLineHeight;
        }
        return nextY + (sectionSpacing / 2);
      };

      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      yPosition = addPageIfNeeded(yPosition, mainTitleLineHeight);
      doc.text(entry.wingName, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += mainTitleLineHeight * 1.5;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      yPosition = addPageIfNeeded(yPosition, baseLineHeight);
      doc.text(`Art Focus: ${entry.artPrinciple}`, margin, yPosition);
      yPosition += baseLineHeight;
      yPosition = addPageIfNeeded(yPosition, baseLineHeight);
      doc.text(`Completed: ${formatJournalDate(entry.completedDate)}`, margin, yPosition);
      yPosition += baseLineHeight + sectionSpacing;

      yPosition = addSectionTitle("Curator's Recap", yPosition);
      yPosition = addWrappedParagraph(entry.roomRecap, yPosition);

      if (entry.mainArtworkImage) {
        yPosition = addSectionTitle('Artwork Snapshot', yPosition);
        try {
          const pdfImage = await prepareImageForPdf(entry.mainArtworkImage);
          const aspectRatio = pdfImage.width / pdfImage.height;
          let imageWidth = usableWidth;
          let imageHeight = imageWidth / aspectRatio;

          const maxImageHeight = pageHeight / 2.5;
          if (imageHeight > maxImageHeight) {
            imageHeight = maxImageHeight;
            imageWidth = imageHeight * aspectRatio;
          }
          if (imageWidth > usableWidth) {
            imageWidth = usableWidth;
            imageHeight = imageWidth / aspectRatio;
          }

          yPosition = addPageIfNeeded(yPosition, imageHeight + sectionSpacing);
          doc.addImage(pdfImage.dataUrl, 'JPEG', margin, yPosition, imageWidth, imageHeight);
          yPosition += imageHeight + baseLineHeight;
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          for (const line of doc.splitTextToSize(getArtworkTitle(entry), usableWidth)) {
            yPosition = addPageIfNeeded(yPosition, baseLineHeight);
            doc.text(line, margin, yPosition);
            yPosition += baseLineHeight;
          }
          doc.setFont('helvetica', 'normal');
          for (const line of doc.splitTextToSize(getArtworkArtist(entry), usableWidth)) {
            yPosition = addPageIfNeeded(yPosition, baseLineHeight);
            doc.text(line, margin, yPosition);
            yPosition += baseLineHeight;
          }
          yPosition += sectionSpacing;
        } catch (e) {
          console.error('Error loading image for PDF:', e);
          yPosition = addWrappedParagraph('(Artwork image could not be loaded into PDF)', yPosition);
        }
      }

      yPosition = addSectionTitle('My Art Analysis Responses', yPosition);
      const phaseResponses = getJournalPhaseResponses(entry);
      for (const phase of JOURNAL_PHASES) {
        yPosition = addSectionTitle(`${PHASE_RESPONSE_LABELS[phase]} (${PHASE_RESPONSE_SUBTITLES[phase]})`, yPosition);
        yPosition = addWrappedParagraph(phaseResponses[phase] || 'No response captured for this phase.', yPosition);
      }

      if (entry.visualLanguageLog && entry.visualLanguageLog.length > 0) {
        yPosition = addSectionTitle('My Descriptive Language Log', yPosition);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        for (const term of entry.visualLanguageLog) {
          yPosition = addPageIfNeeded(yPosition, baseLineHeight);
          doc.text(`- ${term}`, margin + 15, yPosition);
          yPosition += baseLineHeight;
        }
        yPosition += (sectionSpacing / 2);
      } else {
        yPosition = addSectionTitle('My Descriptive Language Log', yPosition);
        yPosition = addWrappedParagraph('No specific descriptive terms were logged from your responses for this wing.', yPosition);
      }

      const additionalNotesText = personalReflections[entry.id] || 'No additional notes added.';
      yPosition = addSectionTitle('My Additional Notes & Insights', yPosition);
      yPosition = addWrappedParagraph(additionalNotesText, yPosition);

      const safeWingName = entry.wingName.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 50);
      doc.save(`ArtQuest_Journal_${safeWingName}.pdf`);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      alert('Sorry, there was an error generating the PDF. Please try again.');
    } finally {
      setIsExportingPdf(prev => ({ ...prev, [entry.id]: false }));
    }
  };

  const journalEntriesWritten = learningJournal.length;
  const journalInsightsCaptured = learningJournal.reduce(
    (total, entry) => total + (entry.visualLanguageLog?.length || 0),
    0,
  );
  const journalReflectionsMade = learningJournal.filter(entry => (
    (personalReflections[entry.id] ?? entry.playerPersonalReflection ?? '').trim().length > 0
  )).length;

  const renderFrontMatterPage = () => (
    <div className="journal-front-matter">
      <div className="journal-front-emblem" aria-hidden="true">AQ</div>
      <p className="journal-paper-kicker">My ArtQuest Journal</p>
      <h2 className="journal-paper-title">Discovery Record</h2>
      <p className="journal-front-copy">
        {latestEntry
          ? `Latest entry: ${latestEntryTitle} was completed on ${formatJournalDate(latestEntry.completedDate)}.`
          : 'The first pages are ready for your discoveries, insights, and reflections from the gallery.'}
      </p>
      <div className="journal-front-stats" aria-label="Journal summary">
        <div className="journal-front-stat">
          <strong>{completedRoomsCount}</strong>
          <span>Rooms</span>
        </div>
        <div className="journal-front-stat">
          <strong>{journalInsightsCaptured}</strong>
          <span>Insights</span>
        </div>
        <div className="journal-front-stat">
          <strong>{journalReflectionsMade}</strong>
          <span>Reflections</span>
        </div>
      </div>
    </div>
  );

  const renderLockedRoomPage = (wing: WingDefinition, wingIndex: number) => (
    <div className="journal-locked-page">
      <div className="journal-locked-seal" aria-hidden="true">Lock</div>
      <p className="journal-room-number">Room {wingIndex + 1} of {WING_DEFINITIONS.length}</p>
      <h2 className="journal-paper-title">{getRoomTitle(wing)}</h2>
      <p className="journal-front-copy">
        This room page will open once its gallery challenge is complete.
      </p>
      <section className="journal-paper-section" aria-labelledby={`locked-focus-${wing.id}`}>
        <h3 id={`locked-focus-${wing.id}`} className="journal-paper-section-title">Art Focus</h3>
        <p className="journal-muted">{getFocusTitle(wing.artPrinciple)}</p>
      </section>
    </div>
  );

  const renderLockedRoomDetailPage = (wing: WingDefinition) => (
    <div className="journal-locked-page journal-locked-page--detail">
      <p className="journal-paper-kicker">Locked Journal Spread</p>
      <h2 className="journal-paper-title">Awaiting Discovery</h2>
      <p className="journal-front-copy">
        Complete the {getRoomTitle(wing)} challenge to reveal your artwork snapshot, phase responses, descriptive language, and personal reflection notes.
      </p>
      <div className="journal-front-stats" aria-hidden="true">
        <div className="journal-front-stat">
          <strong>4</strong>
          <span>Phases</span>
        </div>
        <div className="journal-front-stat">
          <strong>1</strong>
          <span>Artwork</span>
        </div>
        <div className="journal-front-stat">
          <strong>PDF</strong>
          <span>Export</span>
        </div>
      </div>
    </div>
  );

  const renderCompletedRoomLeftPage = (entry: JournalEntry, wing: WingDefinition, wingIndex: number) => (
    <article id={`journal-entry-${entry.wingId}`} className="journal-room-left-page">
      <p className="journal-room-number">Room {wingIndex + 1} of {WING_DEFINITIONS.length}</p>
      <header className="journal-room-header">
        <div className="journal-room-gem" aria-hidden="true">{entry.gemIcon || wing.icon || 'Gem'}</div>
        <div>
          <h2 className="journal-room-title">{getRoomTitle(wing)}</h2>
          <p className="journal-room-focus">{getFocusTitle(entry.artPrinciple)}</p>
          <p className="journal-room-date">Completed: {formatJournalDate(entry.completedDate)}</p>
        </div>
      </header>

      {entry.mainArtworkImage && (
        <section className="journal-paper-section" aria-labelledby={`artwork-${entry.id}`}>
          <h3 id={`artwork-${entry.id}`} className="journal-paper-section-title">Artwork Snapshot</h3>
          <figure className="journal-artwork-frame journal-artwork-frame--large">
            <img
              src={entry.mainArtworkImage}
              alt={`${getArtworkTitle(entry)} by ${getArtworkArtist(entry)}`}
            />
            <figcaption title={`${getArtworkTitle(entry)} - ${getArtworkArtist(entry)}`}>
              <span className="journal-artwork-title">{getArtworkTitle(entry)}</span>
              <span className="journal-artwork-artist">{getArtworkArtist(entry)}</span>
            </figcaption>
          </figure>
        </section>
      )}

      <section className="journal-paper-section" aria-labelledby={`recap-${entry.id}`}>
        <h3 id={`recap-${entry.id}`} className="journal-paper-section-title">Curator&apos;s Recap</h3>
        <p className="journal-recap-text">&quot;{entry.roomRecap}&quot;</p>
      </section>

      <section className="journal-paper-section" aria-labelledby={`language-${entry.id}`}>
        <h3 id={`language-${entry.id}`} className="journal-paper-section-title">Descriptive Language</h3>
        {entry.visualLanguageLog && entry.visualLanguageLog.length > 0 ? (
          <div className="journal-vocab-list">
            {entry.visualLanguageLog.map((term, index) => (
              <span key={`${entry.id}-term-${index}`} className="journal-vocab-chip">
                {term}
              </span>
            ))}
          </div>
        ) : (
          <p className="journal-muted">No specific descriptive terms were logged from your responses for this wing.</p>
        )}
      </section>
    </article>
  );

  const renderCompletedRoomRightPage = (entry: JournalEntry) => {
    const phaseResponses = getJournalPhaseResponses(entry);

    return (
      <article className="journal-room-right-page">
        <section className="journal-paper-section" aria-labelledby={`responses-${entry.id}`}>
          <h3 id={`responses-${entry.id}`} className="journal-paper-section-title">Phase Responses</h3>
          <div className="journal-phase-list">
            {JOURNAL_PHASES.map(phase => (
              <div key={`${entry.id}-phase-${phase}`} className="journal-phase-card">
                <h4>
                  {PHASE_RESPONSE_LABELS[phase]} <span>({PHASE_RESPONSE_SUBTITLES[phase]})</span>
                </h4>
                <p>{phaseResponses[phase] || 'No response captured for this phase.'}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="journal-paper-section" aria-labelledby={`notes-${entry.id}`}>
          <h3 id={`notes-${entry.id}`} className="journal-paper-section-title">Personal Reflection Notes</h3>
          <textarea
            value={personalReflections[entry.id] || ''}
            onChange={(event) => handleReflectionChange(entry.id, event.target.value)}
            placeholder="Type your notes here..."
            className="journal-notes-textarea"
            aria-label={`Additional notes and insights for ${entry.wingName}`}
          />
          <div className="journal-room-actions">
            <ArtQuestButton
              type="button"
              id={`save-reflection-${entry.id}`}
              onClick={() => handleSaveReflection(entry)}
              variant={recentlySavedEntries[entry.id] ? 'primary' : 'purple'}
              aria-label={`Save additional notes for ${entry.wingName}`}
            >
              <span aria-hidden="true">{recentlySavedEntries[entry.id] ? '✓' : '✎'}</span>
              <span>{recentlySavedEntries[entry.id] ? 'Saved' : 'Save Notes'}</span>
            </ArtQuestButton>
            <ArtQuestButton
              type="button"
              id={`export-pdf-${entry.id}`}
              onClick={() => handleExportToPDF(entry)}
              disabled={isExportingPdf[entry.id]}
              variant="secondary"
              aria-label={`Export journal entry for ${entry.wingName} to PDF`}
            >
              <span aria-hidden="true">↓</span>
              <span>{isExportingPdf[entry.id] ? 'Exporting PDF...' : 'Export to PDF'}</span>
            </ArtQuestButton>
          </div>
        </section>
      </article>
    );
  };

  const activeRoomLabel = currentWing ? getRoomTitle(currentWing) : 'Contents';
  const isTurning = turnDirection !== null;
  const activePageTurnFrames = turnDirection === 'backward' ? pageTurnFramesBackward : pageTurnFramesForward;
  const activePageTurnFrame = isTurning ? activePageTurnFrames[turnFrameIndex] : null;

  return (
    <>
      <style>{JOURNAL_BOOK_STYLES}</style>
      <ArtQuestPage
        title="My ArtQuest Journal"
        subtitle="A record of your discoveries and reflections."
        selectedAvatar={selectedAvatar}
        playerStats={playerStats}
        onReturnToMap={onReturnToMap}
        className="journal-screen-shell"
        contentClassName="journal-book-content"
        footerText=""
      >
        <div className="journal-book-layout">
          <button
            type="button"
            className="journal-plate-return"
            onClick={onReturnToMap}
            aria-label="Return to map"
          >
            <span className="journal-visually-hidden">Return to Map</span>
          </button>

          <aside className="journal-live-avatar-panel" aria-label="Player profile and XP">
            <div className="journal-live-avatar-portrait" aria-hidden="true">
              {shouldUseLayeredAvatar ? (
                <AvatarLayeredPreview
                  imageUrls={avatarLayerImageUrls}
                  alt=""
                  className="h-full w-full"
                />
              ) : avatarImageUrl ? (
                <img src={avatarImageUrl} alt="" />
              ) : (
                <span className="journal-live-avatar-initial">{selectedAvatar?.iconInitial || '?'}</span>
              )}
            </div>
            <div className="journal-live-avatar-main">
              <div className="journal-live-avatar-row">
                <div className="min-w-0">
                  <p className="journal-live-avatar-name" title={selectedAvatar?.name || 'Artist'}>
                    {selectedAvatar?.name || 'Artist'}
                  </p>
                  <p className="journal-live-avatar-title" title={selectedAvatar?.title || 'ArtQuest Adventurer'}>
                    {selectedAvatar?.title || 'ArtQuest Adventurer'}
                  </p>
                </div>
                <span className="journal-live-avatar-year">{avatarCourseLabel}</span>
              </div>
              <div className="journal-live-avatar-xp" aria-label={`${artEnergyXP} of ${artEnergyMaxXP} XP`}>
                <div className="journal-live-avatar-xp-track" aria-hidden="true">
                  <div className="journal-live-avatar-xp-fill" style={{ width: `${artEnergyPercentage}%` }} />
                </div>
                <span className="journal-live-avatar-xp-text">{artEnergyXP} / {artEnergyMaxXP} XP</span>
              </div>
            </div>
          </aside>

          <aside className="journal-live-progress-panel" aria-label="Journal progress">
            <h2 className="journal-live-progress-title">Journal Progress</h2>
            <div className="journal-live-progress-list">
              <div className="journal-live-progress-stat">
                <span className="journal-live-progress-icon" aria-hidden="true">📔</span>
                <span>
                  <strong className="journal-live-progress-value">{journalEntriesWritten}</strong>
                  <span className="journal-live-progress-label">Entries Written</span>
                </span>
              </div>
              <div className="journal-live-progress-stat">
                <span className="journal-live-progress-icon" aria-hidden="true">★</span>
                <span>
                  <strong className="journal-live-progress-value">{journalInsightsCaptured}</strong>
                  <span className="journal-live-progress-label">Insights Captured</span>
                </span>
              </div>
              <div className="journal-live-progress-stat">
                <span className="journal-live-progress-icon" aria-hidden="true">✒</span>
                <span>
                  <strong className="journal-live-progress-value">{journalReflectionsMade}</strong>
                  <span className="journal-live-progress-label">Reflections Made</span>
                </span>
              </div>
            </div>
          </aside>

          <aside className="journal-side-rail journal-side-rail--left" aria-label="Journal purpose">
            <ArtQuestSectionTitle>Your Journal</ArtQuestSectionTitle>
            <div className="journal-side-list">
              <div className="journal-side-item">
                <span className="journal-side-icon" aria-hidden="true">📔</span>
                <p className="journal-side-copy">Document discoveries and creative breakthroughs.</p>
              </div>
              <div className="journal-side-item">
                <span className="journal-side-icon" aria-hidden="true">💡</span>
                <p className="journal-side-copy">Capture key insights from each challenge.</p>
              </div>
              <div className="journal-side-item">
                <span className="journal-side-icon" aria-hidden="true">✦</span>
                <p className="journal-side-copy">Reflect and grow on your artistic journey.</p>
              </div>
            </div>
            <div className="journal-quote-box">
              <p>Creativity is the compass. Curiosity is your guide.</p>
            </div>
          </aside>

          <section
            className={artQuestCx(
              'journal-book-stage',
              turnDirection === 'forward' && 'journal-book--turning-forward',
              turnDirection === 'backward' && 'journal-book--turning-backward',
            )}
            aria-label={`Open journal, ${activeRoomLabel}`}
            aria-busy={isTurning}
          >
            <div className="journal-book">
              <button
                type="button"
                className="journal-edge-tab journal-edge-tab--prev"
                onClick={() => goToPage(currentPageIndex - 1)}
                disabled={isTurning || currentPageIndex === 0}
                aria-label="Go to previous journal page"
              >
                <span aria-hidden="true">‹</span>
              </button>
              <button
                type="button"
                className="journal-edge-tab journal-edge-tab--next"
                onClick={() => goToPage(currentPageIndex + 1)}
                disabled={isTurning || currentPageIndex >= totalPageCount - 1}
                aria-label="Go to next journal page"
              >
                <span aria-hidden="true">›</span>
              </button>
              <button
                type="button"
                className="journal-corner-control journal-corner-control--first"
                onClick={() => goToPage(0, 'fast')}
                disabled={isTurning || currentPageIndex === 0}
                aria-label="Go to first journal page"
              >
                <span aria-hidden="true">|‹</span>
              </button>
              <button
                type="button"
                className="journal-corner-control journal-corner-control--last"
                onClick={() => goToPage(totalPageCount - 1, 'fast')}
                disabled={isTurning || currentPageIndex >= totalPageCount - 1}
                aria-label="Go to last journal page"
              >
                <span aria-hidden="true">›|</span>
              </button>
              <div className="journal-book-spread">
                {currentPageIndex === 0 ? (
                  <>
                    <section
                      className="journal-paper-page journal-paper-page--contents narrative-scrollbar"
                      aria-labelledby="journal-contents-heading"
                      onClick={(event) => handlePageSurfaceClick(event, currentPageIndex - 1)}
                    >
                      <p className="journal-paper-kicker">Contents</p>
                      <h2 id="journal-contents-heading" className="journal-paper-title">All Rooms</h2>
                      <div className="journal-contents-list">
                        {WING_DEFINITIONS.map((wing, index) => {
                          const entry = entriesByWingId[wing.id];
                          const isCompleted = Boolean(entry);
                          const isActive = currentPageIndex === index + 1;
                          return (
                            <button
                              key={wing.id}
                              type="button"
                              className={artQuestCx(
                                'journal-contents-row',
                                isActive && 'journal-contents-row--active',
                              )}
                              onClick={() => goToPage(index + 1)}
                              disabled={isTurning || !isCompleted}
                              aria-current={isActive ? 'page' : undefined}
                              aria-label={isCompleted ? `Open ${getRoomTitle(wing)}` : `${getRoomTitle(wing)} locked`}
                            >
                              <span className="journal-contents-icon" aria-hidden="true">{wing.icon || entry?.gemIcon || 'Gem'}</span>
                              <span className="journal-contents-index">{index + 1}</span>
                              <span className="journal-contents-name">
                                <strong>{getRoomTitle(wing)}</strong>
                                <span>{getFocusTitle(wing.artPrinciple)}</span>
                              </span>
                              <span className="journal-contents-status">{isCompleted ? 'Complete' : 'Locked'}</span>
                            </button>
                          );
                        })}
                      </div>
                    </section>

                    <section
                      className="journal-paper-page journal-paper-page--room narrative-scrollbar"
                      aria-live="polite"
                      onClick={(event) => handlePageSurfaceClick(event, currentPageIndex + 1)}
                    >
                      {renderFrontMatterPage()}
                    </section>
                  </>
                ) : currentWing && (
                  <>
                    <section
                      className="journal-paper-page journal-paper-page--room journal-paper-page--room-left narrative-scrollbar"
                      aria-live="polite"
                      onClick={(event) => handlePageSurfaceClick(event, currentPageIndex - 1)}
                    >
                      {currentEntry
                        ? renderCompletedRoomLeftPage(currentEntry, currentWing, currentPageIndex - 1)
                        : renderLockedRoomPage(currentWing, currentPageIndex - 1)}
                    </section>

                    <section
                      className="journal-paper-page journal-paper-page--room journal-paper-page--room-right narrative-scrollbar"
                      aria-live="polite"
                      onClick={(event) => handlePageSurfaceClick(event, currentPageIndex + 1)}
                    >
                      {currentEntry
                        ? renderCompletedRoomRightPage(currentEntry)
                        : renderLockedRoomDetailPage(currentWing)}
                    </section>
                  </>
                )}
              </div>
              <button
                type="button"
                className="journal-page-curl journal-page-curl--prev"
                onClick={() => goToPage(currentPageIndex - 1)}
                disabled={isTurning || currentPageIndex === 0}
                aria-label="Turn to previous page"
              >
                <span aria-hidden="true">⌞</span>
              </button>
              <button
                type="button"
                className="journal-page-curl journal-page-curl--next"
                onClick={() => goToPage(currentPageIndex + 1)}
                disabled={isTurning || currentPageIndex >= totalPageCount - 1}
                aria-label="Turn to next page"
              >
                <span aria-hidden="true">⌟</span>
              </button>
              <div className="journal-book-page-counter" aria-live="polite">
                <span>{activeRoomLabel}</span> | Page {currentPageIndex + 1} of {totalPageCount}
              </div>
            </div>
          </section>

          <aside className="journal-side-rail journal-side-rail--right" aria-label="Journal progress">
            <ArtQuestSectionTitle>Journal Progress</ArtQuestSectionTitle>
            <div className="journal-progress-grid">
              <div className="journal-mini-stat">
                <span className="journal-mini-stat-icon" aria-hidden="true">📔</span>
                <span>
                  <strong>{journalEntriesWritten}</strong>
                  <span>Entries Written</span>
                </span>
              </div>
              <div className="journal-mini-stat">
                <span className="journal-mini-stat-icon" aria-hidden="true">★</span>
                <span>
                  <strong>{journalInsightsCaptured}</strong>
                  <span>Insights Captured</span>
                </span>
              </div>
              <div className="journal-mini-stat">
                <span className="journal-mini-stat-icon" aria-hidden="true">✒</span>
                <span>
                  <strong>{journalReflectionsMade}</strong>
                  <span>Reflections Made</span>
                </span>
              </div>
            </div>
            <div className="journal-progress-meter" aria-label={`${completedRoomsCount} of ${WING_DEFINITIONS.length} rooms complete`}>
              <p>{completedRoomsCount} / {WING_DEFINITIONS.length} Rooms Complete</p>
              <div className="journal-progress-track" aria-hidden="true">
                <div className="journal-progress-fill" style={{ width: `${completionPercentage}%` }} />
              </div>
            </div>
            <div className="journal-quote-box">
              <p>The more you create, the more your story grows.</p>
            </div>
          </aside>

          {activePageTurnFrame && (
            <img
              key={pageTurnSerial}
              src={activePageTurnFrame}
              alt=""
              className="journal-page-turn-frame"
              aria-hidden="true"
              draggable={false}
            />
          )}
        </div>
      </ArtQuestPage>
    </>
  );
};

export default JournalScreen;
