
import React, { useState, useRef } from 'react';
import { SplashScreenProps } from '../types';
import LoadingSpinner from './LoadingSpinner';

const START_SCREEN_BACKGROUND = './public/images/screens/startscreen-v2.png';
const SCREEN_FRAME_STYLE: React.CSSProperties = {
  width: 'min(100vw, calc(100vh * 1672 / 941))',
  height: 'min(100vh, calc(100vw * 941 / 1672))',
};
const START_HOTSPOT_CLASS = 'absolute z-20 rounded-sm bg-transparent text-transparent transition hover:bg-white/5 focus:outline-none focus:ring-4 focus:ring-pink-200/80';

const SplashScreen: React.FC<SplashScreenProps> = ({ onNewGame, onLoadGame, onTeacherUnlock, onNavigateToGuide }) => {
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isTeacherUnlockOpen, setIsTeacherUnlockOpen] = useState(false);
  const [teacherCode, setTeacherCode] = useState('');
  const [teacherUnlockError, setTeacherUnlockError] = useState<string | null>(null);
  const [isUnlockingTeacherMode, setIsUnlockingTeacherMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLoadGameClick = () => {
    setLoadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleTeacherUnlockClick = () => {
    setTeacherCode('');
    setTeacherUnlockError(null);
    setIsTeacherUnlockOpen(true);
  };

  const handleTeacherUnlockSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTeacherUnlockError(null);
    setIsUnlockingTeacherMode(true);

    try {
      const didUnlock = await onTeacherUnlock(teacherCode);
      if (!didUnlock) {
        setTeacherUnlockError('Incorrect teacher code.');
        setIsUnlockingTeacherMode(false);
      }
    } catch (err) {
      console.error("Teacher unlock failed:", err);
      const errorMessage = (err instanceof Error) ? err.message : "Teacher unlock could not be started.";
      setTeacherUnlockError(errorMessage);
      setIsUnlockingTeacherMode(false);
    }
  };

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setIsLoadingFile(true);
    setLoadError(null);

    try {
      const fileContent = await file.text();
      await onLoadGame(fileContent);
      // Navigation to map screen will be handled by App.tsx after successful load
    } catch (err) {
      console.error("Error reading or processing save file:", err);
      const errorMessage = (err instanceof Error) ? err.message : "Could not load the save file. It might be corrupted or not a valid ArtQuest save.";
      setLoadError(errorMessage);
    } finally {
      setIsLoadingFile(false);
      // Reset file input value so the same file can be selected again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#120b20] text-gray-100 selection:bg-pink-500 selection:text-white">
      <div className="relative overflow-hidden" style={SCREEN_FRAME_STYLE}>
        <img
          src={START_SCREEN_BACKGROUND}
          alt="ArtQuest start screen"
          className="absolute inset-0 h-full w-full object-cover"
          draggable={false}
        />
        <button
          type="button"
          onClick={onNavigateToGuide}
          className={START_HOTSPOT_CLASS}
          style={{ left: '84.9%', top: '3.3%', width: '5.7%', height: '10.5%' }}
          aria-label="Open game guide before starting"
          title="Game guide"
        >
          Game Guide
        </button>
        <button
          type="button"
          onClick={handleTeacherUnlockClick}
          className={START_HOTSPOT_CLASS}
          style={{ left: '93.1%', top: '3.3%', width: '5.3%', height: '10.5%' }}
          aria-label="Open teacher unlock"
          title="Teacher unlock"
        >
          Teacher Unlock
        </button>

        {isLoadingFile && (
          <div className="absolute left-1/2 top-[47%] z-30 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center border-2 border-pink-300 bg-slate-950/90 px-8 py-6 shadow-2xl">
            <LoadingSpinner size={10} />
            <p className="text-purple-300 mt-3">Loading your adventure...</p>
          </div>
        )}

        {loadError && (
          <div className="absolute left-1/2 top-[78%] z-30 w-[44%] -translate-x-1/2 border border-red-600 bg-red-950/90 p-4 text-sm text-red-200 shadow-2xl">
            <p className="font-semibold mb-1">Load Error:</p>
            <p>{loadError}</p>
          </div>
        )}

        {!isLoadingFile && (
          <>
            <button
              onClick={onNewGame}
              className={START_HOTSPOT_CLASS}
              style={{ left: '28.5%', top: '50.5%', width: '43%', height: '12.4%' }}
              aria-label="Start a new game"
            >
              New Game
            </button>
            <button
              onClick={handleLoadGameClick}
              className={START_HOTSPOT_CLASS}
              style={{ left: '28.5%', top: '64.5%', width: '43%', height: '12.4%' }}
              aria-label="Load a saved game"
            >
              Load Game
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelected}
              accept=".json"
              className="hidden"
              aria-hidden="true"
            />
          </>
        )}
      </div>

      {isTeacherUnlockOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/75 p-4">
          <div className="artquest-panel w-full max-w-sm p-6 text-left shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-purple-200">Teacher Unlock</h2>
                <p className="mt-1 text-sm text-gray-300">Enter the teacher code to open all levels and rooms.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsTeacherUnlockOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-800 text-xl font-bold text-gray-200 hover:bg-gray-700 focus:outline-none focus:ring-4 focus:ring-purple-300"
                aria-label="Close teacher unlock"
              >
                X
              </button>
            </div>

            <form onSubmit={handleTeacherUnlockSubmit} className="space-y-4">
              <label htmlFor="teacherUnlockCode" className="block text-sm font-semibold text-purple-200">
                Teacher Code
              </label>
              <input
                id="teacherUnlockCode"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                value={teacherCode}
                onChange={(event) => setTeacherCode(event.target.value)}
                className="w-full rounded-lg border border-purple-300/50 bg-gray-950 px-4 py-3 font-mono text-xl font-semibold text-white shadow-inner outline-none focus:ring-4 focus:ring-purple-400"
                autoComplete="off"
                autoFocus
                disabled={isUnlockingTeacherMode}
              />

              {teacherUnlockError && (
                <p className="rounded-lg border border-red-500/60 bg-red-950/70 px-3 py-2 text-sm font-semibold text-red-200">
                  {teacherUnlockError}
                </p>
              )}

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={isUnlockingTeacherMode || teacherCode.trim().length === 0}
                  className="flex-1 rounded-lg bg-purple-500 px-4 py-3 font-semibold text-white shadow-md transition hover:bg-purple-600 focus:outline-none focus:ring-4 focus:ring-purple-300 disabled:cursor-not-allowed disabled:bg-gray-600"
                >
                  {isUnlockingTeacherMode ? 'Unlocking...' : 'Unlock'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsTeacherUnlockOpen(false)}
                  disabled={isUnlockingTeacherMode}
                  className="rounded-lg bg-gray-700 px-4 py-3 font-semibold text-white shadow-md transition hover:bg-gray-600 focus:outline-none focus:ring-4 focus:ring-gray-400 disabled:cursor-not-allowed disabled:bg-gray-800"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SplashScreen;
