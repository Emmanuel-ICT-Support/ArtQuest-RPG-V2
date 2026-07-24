import React, { useRef, useState } from 'react';
import { PRELOADED_CLASS_PACKS } from '../data/preloadedClassPacks';
import { parseClassPackExport } from '../data/ClassPack';
import type { ClassPackExport } from '../data/ClassPack';

interface ClassPackSelectionScreenProps {
  onChooseDefault: () => void;
  onChooseClassPack: (classPack: ClassPackExport) => void;
  onReturnToMenu: () => void;
}

type SelectionId = 'default' | 'find' | 'import';

const CLASS_PACK_SELECTION_BACKGROUND = './public/images/screens/choose-your-class-screen.png';
const CLASS_PACK_SELECTION_FRAME_STYLE: React.CSSProperties = {
  width: 'min(100vw, calc(100vh * 1672 / 941))',
  height: 'min(100vh, calc(100vw * 941 / 1672))',
};
const CLASS_PACK_HOTSPOT_CLASS = 'absolute z-20 rounded-sm bg-transparent text-transparent transition hover:bg-white/5 focus:outline-none focus:ring-4 focus:ring-pink-200/80 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:focus:ring-0';

const ClassPackSelectionScreen: React.FC<ClassPackSelectionScreenProps> = ({
  onChooseDefault,
  onChooseClassPack,
  onReturnToMenu,
}) => {
  const [selectedId, setSelectedId] = useState<SelectionId>('default');
  const [isClassPickerOpen, setIsClassPickerOpen] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const chooseImportedPack = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setIsImporting(true);
    setImportError(null);
    try {
      onChooseClassPack(parseClassPackExport(await file.text()));
    } catch (error) {
      setImportError(error instanceof Error
        ? error.message
        : 'This Class Pack could not be read. Choose a JSON file exported by ArtQuest.');
    } finally {
      setIsImporting(false);
    }
  };

  const continueWithSelection = () => {
    if (selectedId === 'default') {
      onChooseDefault();
      return;
    }
    if (selectedId === 'find') {
      setIsClassPickerOpen(true);
      return;
    }
    fileInputRef.current?.click();
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#120b20] text-gray-100 selection:bg-pink-500 selection:text-white">
      <div className="relative overflow-hidden" style={CLASS_PACK_SELECTION_FRAME_STYLE}>
        <img
          src={CLASS_PACK_SELECTION_BACKGROUND}
          alt="Choose your ArtQuest class pack"
          className="absolute inset-0 h-full w-full object-cover"
          draggable={false}
        />

        <button
          type="button"
          onClick={() => setSelectedId('default')}
          className={`${CLASS_PACK_HOTSPOT_CLASS} ${selectedId === 'default' ? 'ring-2 ring-amber-200/70' : ''}`}
          style={{ left: '19.1%', top: '24.8%', width: '19.1%', height: '46.6%' }}
          aria-label="Select the default ArtQuest game"
          aria-pressed={selectedId === 'default'}
        >
          Default ArtQuest
        </button>
        <button
          type="button"
          onClick={() => {
            setSelectedId('find');
            setIsClassPickerOpen(true);
          }}
          className={`${CLASS_PACK_HOTSPOT_CLASS} ${selectedId === 'find' ? 'ring-2 ring-amber-200/70' : ''}`}
          style={{ left: '39.4%', top: '24.8%', width: '20.1%', height: '46.6%' }}
          aria-label="Find a preloaded class pack"
          aria-pressed={selectedId === 'find'}
        >
          Find a Class
        </button>
        <button
          type="button"
          onClick={() => {
            setSelectedId('import');
            fileInputRef.current?.click();
          }}
          disabled={isImporting}
          className={`${CLASS_PACK_HOTSPOT_CLASS} ${selectedId === 'import' ? 'ring-2 ring-amber-200/70' : ''}`}
          style={{ left: '60.8%', top: '24.8%', width: '20.1%', height: '46.6%' }}
          aria-label="Import an ArtQuest Class Pack JSON file"
          aria-pressed={selectedId === 'import'}
        >
          Import a Class Pack
        </button>
        <button
          type="button"
          onClick={onReturnToMenu}
          className={CLASS_PACK_HOTSPOT_CLASS}
          style={{ left: '24.8%', top: '86.8%', width: '22.6%', height: '8.2%' }}
          aria-label="Return to main menu"
        >
          Return to Menu
        </button>
        <button
          type="button"
          onClick={continueWithSelection}
          disabled={isImporting}
          className={CLASS_PACK_HOTSPOT_CLASS}
          style={{ left: '51.5%', top: '86.8%', width: '23.8%', height: '8.2%' }}
          aria-label="Continue with the selected class option"
        >
          Continue
        </button>
      </div>

      <input ref={fileInputRef} type="file" accept="application/json,.json" className="sr-only" onChange={(event) => { void chooseImportedPack(event); }} />

      {isClassPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#08050d]/85 p-4" role="dialog" aria-modal="true" aria-labelledby="availableClassPacksTitle">
          <div className="artquest-panel w-full max-w-2xl p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-pink-300">Teacher prepared</p>
                <h2 id="availableClassPacksTitle" className="mt-1 text-2xl font-black text-[#ffe2f4]">Available Class Packs</h2>
                <p className="mt-2 text-sm text-gray-300">Choose the pack your teacher has prepared for this class.</p>
              </div>
              <button type="button" onClick={() => setIsClassPickerOpen(false)} className="rounded bg-slate-800 px-3 py-2 font-black text-white hover:bg-slate-700 focus:outline-none focus:ring-4 focus:ring-pink-200" aria-label="Close available class packs">×</button>
            </div>
            <div className="mt-5 max-h-[58vh] space-y-3 overflow-y-auto pr-1">
              {PRELOADED_CLASS_PACKS.map((pack) => (
                <button key={pack.id} type="button" onClick={() => onChooseClassPack(pack.classPack)} className="w-full border border-amber-300/40 bg-[#180f2b] p-4 text-left transition hover:border-pink-300 hover:bg-[#26133b] focus:outline-none focus:ring-4 focus:ring-pink-200">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-lg font-black text-[#ffd7eb]">{pack.label}</span>
                    <span className="shrink-0 text-xs font-bold text-amber-200">Year {pack.classPack.yearLevel}</span>
                  </div>
                  <p className="mt-1 text-sm text-gray-300">{pack.classPack.rooms.length} gallery rooms · {pack.source}</p>
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setIsClassPickerOpen(false)} className="mt-5 w-full rounded bg-slate-700 px-4 py-3 font-bold text-white hover:bg-slate-600 focus:outline-none focus:ring-4 focus:ring-slate-300">Back</button>
          </div>
        </div>
      )}

      {importError && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#08050d]/85 p-4" role="alertdialog" aria-modal="true" aria-labelledby="classPackImportErrorTitle">
          <div className="artquest-panel w-full max-w-md p-6 shadow-2xl">
            <h2 id="classPackImportErrorTitle" className="text-2xl font-black text-pink-100">Class Pack not opened</h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-300">{importError}</p>
            <button type="button" onClick={() => setImportError(null)} className="artquest-button mt-6 w-full px-4 py-3 text-sm font-black focus:outline-none focus:ring-4 focus:ring-pink-200">Choose another file</button>
          </div>
        </div>
      )}
    </main>
  );
};

export default ClassPackSelectionScreen;
