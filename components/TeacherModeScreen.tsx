import React from 'react';

const TEACHER_MODE_BACKGROUND = './public/images/screens/teacher-mode-start-screen.png';

const TEACHER_MODE_FRAME_STYLE: React.CSSProperties = {
  width: 'min(100vw, calc(100vh * 1672 / 941))',
  height: 'min(100vh, calc(100vw * 941 / 1672))',
};

const TEACHER_MODE_HOTSPOT_CLASS = 'absolute z-20 rounded-sm bg-transparent text-transparent transition hover:bg-white/5 focus:outline-none focus:ring-4 focus:ring-pink-200/80 disabled:cursor-default';

interface TeacherModeScreenProps {
  onExploreArtQuest: () => void;
}

const TeacherModeScreen: React.FC<TeacherModeScreenProps> = ({ onExploreArtQuest }) => (
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
        disabled
        className={TEACHER_MODE_HOTSPOT_CLASS}
        style={{ left: '28.3%', top: '55.7%', width: '43.3%', height: '10.8%' }}
        aria-label="Build a Class Pack (coming soon)"
      >
        Build a Class Pack
      </button>

      <button
        type="button"
        disabled
        className={TEACHER_MODE_HOTSPOT_CLASS}
        style={{ left: '28.3%', top: '68.2%', width: '43.3%', height: '10.8%' }}
        aria-label="Edit a Class Pack (coming soon)"
      >
        Edit a Class Pack
      </button>
    </div>
  </main>
);

export default TeacherModeScreen;
