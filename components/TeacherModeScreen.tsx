import React, { useRef, useState } from 'react';
import type { YearLevel } from '../types';

const TEACHER_MODE_BACKGROUND = './public/images/screens/teacher-mode-start-screen.png';

const TEACHER_MODE_FRAME_STYLE: React.CSSProperties = {
  width: 'min(100vw, calc(100vh * 1672 / 941))',
  height: 'min(100vh, calc(100vw * 941 / 1672))',
};

const TEACHER_MODE_HOTSPOT_CLASS = 'absolute z-20 rounded-sm bg-transparent text-transparent transition hover:bg-white/5 focus:outline-none focus:ring-4 focus:ring-pink-200/80 disabled:cursor-default';

interface TeacherModeScreenProps {
  onExploreArtQuest: () => void;
  onBuildClassPack: (yearLevel: YearLevel) => void;
  onEditClassPack: (fileContent: string) => string | null;
}

const TeacherModeScreen: React.FC<TeacherModeScreenProps> = ({ onExploreArtQuest, onBuildClassPack, onEditClassPack }) => {
  const [isYearPickerOpen, setIsYearPickerOpen] = useState(false);
  const [selectedYearLevel, setSelectedYearLevel] = useState<YearLevel>(9);
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const classPackFileInputRef = useRef<HTMLInputElement>(null);

  const handleClassPackFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    event.target.value = '';
    if (!selectedFile) return;

    setIsImporting(true);
    setImportError(null);
    try {
      const error = onEditClassPack(await selectedFile.text());
      if (error) setImportError(error);
    } catch {
      setImportError('The Class Pack could not be read. Please choose a valid exported JSON file.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
  <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#120b20] text-gray-100 selection:bg-pink-500 selection:text-white">
    <div className="relative overflow-hidden" style={TEACHER_MODE_FRAME_STYLE}>
      <img
        src={TEACHER_MODE_BACKGROUND}
        alt="ArtQuest Teacher Mode menu"
        className="absolute inset-0 h-full w-full object-cover"
        draggable={false}
      />

      <button
        type="button"
        onClick={onExploreArtQuest}
        className={TEACHER_MODE_HOTSPOT_CLASS}
        style={{ left: '28.3%', top: '42.9%', width: '43.3%', height: '11.1%' }}
        aria-label="Explore ArtQuest with every gallery room unlocked"
      >
        Explore ArtQuest
      </button>

      <button
        type="button"
        onClick={() => setIsYearPickerOpen(true)}
        className={TEACHER_MODE_HOTSPOT_CLASS}
        style={{ left: '28.3%', top: '55.7%', width: '43.3%', height: '10.8%' }}
        aria-label="Build a Class Pack"
      >
        Build a Class Pack
      </button>

      <button
        type="button"
        onClick={() => classPackFileInputRef.current?.click()}
        disabled={isImporting}
        className={TEACHER_MODE_HOTSPOT_CLASS}
        style={{ left: '28.3%', top: '68.2%', width: '43.3%', height: '10.8%' }}
        aria-label="Edit an exported Class Pack"
      >
        Edit a Class Pack
      </button>
      <input
        ref={classPackFileInputRef}
        type="file"
        accept="application/json,.json"
        className="sr-only"
        onChange={(event) => { void handleClassPackFile(event); }}
        aria-label="Choose an exported ArtQuest Class Pack JSON file"
      />
    </div>

    {isYearPickerOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/80 p-4">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onBuildClassPack(selectedYearLevel);
          }}
          className="artquest-panel w-full max-w-md p-6 shadow-2xl"
        >
          <h2 className="text-2xl font-black text-purple-100">Build a Class Pack</h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-300">Which year level would you like to prepare?</p>
          <label className="mt-5 block text-sm font-bold text-amber-200" htmlFor="classPackYearLevel">
            Year level
          </label>
          <select
            id="classPackYearLevel"
            value={selectedYearLevel}
            onChange={(event) => setSelectedYearLevel(Number(event.target.value) as YearLevel)}
            className="mt-2 w-full rounded-lg border border-amber-300/50 bg-slate-950 px-4 py-3 text-lg font-bold text-white outline-none focus:ring-4 focus:ring-pink-200"
          >
            {[7, 8, 9, 10, 11, 12].map((yearLevel) => (
              <option key={yearLevel} value={yearLevel}>Year {yearLevel}</option>
            ))}
          </select>
          <div className="mt-6 flex gap-3">
            <button type="submit" className="artquest-button flex-1 px-4 py-3 text-sm font-black focus:outline-none focus:ring-4 focus:ring-pink-200">
              Open Builder
            </button>
            <button
              type="button"
              onClick={() => setIsYearPickerOpen(false)}
              className="rounded-lg bg-slate-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-600 focus:outline-none focus:ring-4 focus:ring-slate-300"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    )}

    {importError && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/80 p-4" role="alertdialog" aria-modal="true" aria-labelledby="classPackImportErrorTitle">
        <div className="artquest-panel w-full max-w-md p-6 shadow-2xl">
          <h2 id="classPackImportErrorTitle" className="text-2xl font-black text-purple-100">Class Pack not opened</h2>
          <p className="mt-3 text-sm leading-relaxed text-gray-300">{importError}</p>
          <button
            type="button"
            onClick={() => setImportError(null)}
            className="artquest-button mt-6 w-full px-4 py-3 text-sm font-black focus:outline-none focus:ring-4 focus:ring-pink-200"
          >
            Choose another file
          </button>
        </div>
      </div>
    )}
  </main>
);
};

export default TeacherModeScreen;
