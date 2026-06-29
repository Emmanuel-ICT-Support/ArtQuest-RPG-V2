import React, { useMemo, useState } from 'react';
import { GameGuideScreenProps } from '../types';
import {
  ArtQuestButton,
  ArtQuestPage,
  ArtQuestPanel,
  ArtQuestSectionTitle,
  artQuestCx,
} from './ArtQuestUI';

type GuideTabId =
  | 'quick-start'
  | 'artist-setup'
  | 'map-basics'
  | 'inside-wing'
  | 'answer-phases'
  | 'inventory-rewards'
  | 'journal'
  | 'assessment'
  | 'side-quests-pip'
  | 'case-files';

interface GuideCallout {
  number: number;
  label: string;
  description: string;
  left: string;
  top: string;
}

interface GuideTab {
  id: GuideTabId;
  title: string;
  shortTitle: string;
  explanation: string;
  keyPoints: string[];
  screenshotSrc: string;
  screenshotAlt: string;
  callouts: GuideCallout[];
}

const GUIDE_TABS: GuideTab[] = [
  {
    id: 'quick-start',
    title: 'Quick Start',
    shortTitle: 'Start',
    explanation: 'Use the start screen to begin a new journey, load saved progress, or open this guide before entering the gallery.',
    keyPoints: [
      'Open the question mark to learn the game before starting.',
      'Choose New Game to build a fresh artist profile.',
      'Use Load Game to continue from an exported ArtQuest save file.',
      'The lock icon opens teacher preview mode for room review.',
    ],
    screenshotSrc: './public/images/screens/guide/quick-start.png',
    screenshotAlt: 'ArtQuest start screen showing New Game, Load Game, guide, and teacher unlock controls.',
    callouts: [
      { number: 1, label: 'Game Guide', description: 'The question mark opens this guide before a game begins.', left: '87.9%', top: '8.6%' },
      { number: 2, label: 'New Game', description: 'Starts a fresh profile and avatar setup flow.', left: '50%', top: '56.4%' },
      { number: 3, label: 'Load Game', description: 'Restores progress from an ArtQuest save file.', left: '50%', top: '70.2%' },
      { number: 4, label: 'Teacher Unlock', description: 'The lock opens teacher preview mode with the access code.', left: '95.2%', top: '8.6%' },
    ],
  },
  {
    id: 'artist-setup',
    title: 'Artist Setup',
    shortTitle: 'Setup',
    explanation: 'Choose the learning level, select or build an avatar, and personalise the artist name before entering the map.',
    keyPoints: [
      'Pick the year level or senior pathway first so prompts and assessment language match the learner.',
      'Choose a preset avatar or build a custom pixel artist.',
      'Use the name field to personalise the journey.',
      'Begin ArtQuest opens the gallery map with the selected profile.',
    ],
    screenshotSrc: './public/images/screens/guide/artist-setup.png',
    screenshotAlt: 'ArtQuest artist profile setup showing year level, avatar cards, name field, and begin button.',
    callouts: [
      { number: 1, label: 'Year or Pathway', description: 'Sets the curriculum level for prompts, feedback, and assessment.', left: '50%', top: '28%' },
      { number: 2, label: 'Avatar Choices', description: 'Select a preset character or choose the custom builder.', left: '42%', top: '58%' },
      { number: 3, label: 'Artist Name', description: 'Adds the player name used in the adventure.', left: '48%', top: '88%' },
      { number: 4, label: 'Begin ArtQuest', description: 'Starts the game once the profile is ready.', left: '50%', top: '95%' },
    ],
  },
  {
    id: 'map-basics',
    title: 'Map Basics',
    shortTitle: 'Map',
    explanation: 'The map is the hub for movement, room entry, side quests, support pages, saving, and progress checks.',
    keyPoints: [
      'Move with WASD or the arrow keys.',
      'Approach doors, guards, exits, or characters until a prompt appears.',
      'Press Return to enter doors and exits; press E or Return for characters and side quests.',
      'The command bar links to Guide, Journal, Inventory, Side Quests, Assessment, Save, and Menu.',
    ],
    screenshotSrc: './public/images/screens/guide/map-basics.png',
    screenshotAlt: 'ArtQuest gallery map showing command bar, door guard, Return prompt, and status bar.',
    callouts: [
      { number: 1, label: 'Command Bar', description: 'Quick access to guide pages, save, inventory, journal, and assessment.', left: '50%', top: '6.5%' },
      { number: 2, label: 'Return Prompt', description: 'Approach a door or exit, then press Return when the prompt appears.', left: '46%', top: '35%' },
      { number: 3, label: 'Door Guard', description: 'Some rooms use a nearby guard and unlock check before entry.', left: '35.5%', top: '45%' },
      { number: 4, label: 'Status Bar', description: 'Shows gems, cases, journal entries, and current location.', left: '19%', top: '96%' },
    ],
  },
  {
    id: 'inside-wing',
    title: 'Inside a Wing',
    shortTitle: 'Wing',
    explanation: 'A wing combines the current task, Curator dialogue, artwork, visual language support, avatar, and progress information.',
    keyPoints: [
      'Read Your Challenge before answering.',
      'Study the Visual Canvas and artwork details closely.',
      'Use the Curator dialogue for prompts, feedback, and phase changes.',
      'Use More Help in the Visual Language Guide for extra examples and sentence support.',
    ],
    screenshotSrc: './public/images/screens/guide/inside-wing.png',
    screenshotAlt: 'Inside an ArtQuest wing showing challenge, dialogue, artwork, vocabulary, More Help, and stats.',
    callouts: [
      { number: 1, label: 'Your Challenge', description: 'The current phase task appears in the left sidebar.', left: '13%', top: '38%' },
      { number: 2, label: 'Visual Language Guide', description: 'Compact terms, starters, and examples support evidence-based responses.', left: '13%', top: '75%' },
      { number: 3, label: 'More Help', description: 'Opens an expanded guide with definitions, examples, and practice support.', left: '20.5%', top: '66.5%' },
      { number: 4, label: 'Curator Dialogue', description: 'The Curator gives prompts, feedback, and next steps.', left: '42%', top: '27%' },
      { number: 5, label: 'Visual Canvas', description: 'The artwork sits here for close visual analysis.', left: '82%', top: '48%' },
    ],
  },
  {
    id: 'answer-phases',
    title: 'Answer Phases',
    shortTitle: 'Phases',
    explanation: 'Every wing uses four phases that move from close observation to analysis, interpretation, and judgement.',
    keyPoints: [
      'See: describe visible details, locations, and art elements.',
      'Think: explain how visual choices are arranged and what effect they create.',
      'Interpret: suggest mood, meaning, story, or symbolism using evidence.',
      'Reflect: judge how successfully the artwork communicates.',
    ],
    screenshotSrc: './public/images/screens/guide/answer-phases.png',
    screenshotAlt: 'ArtQuest wing screen highlighting the current phase task, question, and response box.',
    callouts: [
      { number: 1, label: 'Current Phase Task', description: 'The active See, Think, Interpret, or Reflect task appears in Your Challenge.', left: '13%', top: '52%' },
      { number: 2, label: 'Current Question', description: 'The same active prompt is repeated in the Curator dialogue panel.', left: '50%', top: '25%' },
      { number: 3, label: 'Response Box', description: 'Type the phase answer here, then use Send when the response is ready.', left: '45%', top: '59%' },
    ],
  },
  {
    id: 'inventory-rewards',
    title: 'Inventory & Rewards',
    shortTitle: 'Inventory',
    explanation: 'The inventory is where players review Art Energy, trait progress, unlocked rewards, badges, and avatar customisation.',
    keyPoints: [
      'Art Energy and trait XP show how learning progress is building.',
      'Trait levels unlock new avatar parts and badges.',
      'Unlocked avatar items can be equipped and saved.',
      'The next reward panel shows what the player is working toward.',
    ],
    screenshotSrc: './public/images/screens/guide/inventory-rewards.png',
    screenshotAlt: 'ArtQuest inventory screen showing avatar editor, Art Energy, trait badges, and reward progress.',
    callouts: [
      { number: 1, label: 'Trait Panel', description: 'Focus, Expression, Insight, and Imagination levels show learning progress.', left: '12%', top: '34%' },
      { number: 2, label: 'Avatar Editor', description: 'Preview and customise the current artist avatar.', left: '38%', top: '61%' },
      { number: 3, label: 'Editor Tabs', description: 'Switch between skin, hair, face, outfit, and item options.', left: '54%', top: '38%' },
      { number: 4, label: 'Rewards Panel', description: 'Track Art Energy, next unlocks, reward chests, and available avatar options.', left: '84%', top: '45%' },
    ],
  },
  {
    id: 'journal',
    title: 'Journal',
    shortTitle: 'Journal',
    explanation: 'The journal records discoveries, wing entries, artwork evidence, reflections, notes, and room recaps.',
    keyPoints: [
      'Completed wings add journal spreads with captured responses and recap notes.',
      'The new journal layout works like a magical field book.',
      'Learners can add extra notes and export entries for evidence.',
      'Journal progress shows how much reflection has been collected.',
    ],
    screenshotSrc: './public/images/screens/guide/journal.png',
    screenshotAlt: 'ArtQuest journal screen showing the updated book-style journal layout.',
    callouts: [
      { number: 1, label: 'Your Journal', description: 'The left panel explains what the journal is collecting during play.', left: '9%', top: '43%' },
      { number: 2, label: 'Contents Page', description: 'The left book page lists rooms and shows which entries are still locked.', left: '36%', top: '47%' },
      { number: 3, label: 'Discovery Record', description: 'The right book page introduces the entry summary for discoveries and reflections.', left: '66%', top: '52%' },
      { number: 4, label: 'Journal Progress', description: 'The right panel counts entries, insights, and reflections collected so far.', left: '90%', top: '43%' },
    ],
  },
  {
    id: 'assessment',
    title: 'Assessment',
    shortTitle: 'Assess',
    explanation: 'Assessment Summary translates completed journal evidence into curriculum-aligned criteria, levels, and feedback.',
    keyPoints: [
      'The rubric adapts to the selected year level or senior pathway.',
      'Scores appear after journal entries are completed.',
      'Criteria connect gameplay evidence to visual arts learning goals.',
      'Teachers can use the summary as formative evidence alongside their own judgement.',
    ],
    screenshotSrc: './public/images/screens/guide/assessment.png',
    screenshotAlt: 'ArtQuest assessment summary screen showing rubric criteria and level descriptors.',
    callouts: [
      { number: 1, label: 'Assessment Context', description: 'The top panel explains how the selected level is assessed.', left: '50%', top: '22%' },
      { number: 2, label: 'Rubric Criteria', description: 'Rows show the assessed visual arts skills.', left: '13%', top: '55%' },
      { number: 3, label: 'Level Descriptors', description: 'Columns describe achievement from beginning to excellent.', left: '55%', top: '55%' },
      { number: 4, label: 'Estimated Level', description: 'The final column shows estimated progress once journal evidence exists.', left: '90%', top: '55%' },
    ],
  },
  {
    id: 'side-quests-pip',
    title: 'Side Quests & Pip',
    shortTitle: 'Pip',
    explanation: 'Pip introduces optional case mysteries around the gallery. These side quests add clue-finding, final puzzles, and extra rewards.',
    keyPoints: [
      'Speak to Pip when he appears near a case location.',
      'Open Side Quests from the command bar to review active case files.',
      'Search the gallery for clue objects linked to the current case.',
      'Solving cases awards Art Energy, trait XP, and badges.',
    ],
    screenshotSrc: './public/images/screens/guide/side-quests-pip.png',
    screenshotAlt: 'ArtQuest map showing Pip the Case Keeper and side quest access.',
    callouts: [
      { number: 1, label: 'Pip', description: 'Pip is the case keeper who introduces optional mysteries.', left: '53%', top: '65%' },
      { number: 2, label: 'Interaction Prompt', description: 'Approach and press E or Return to talk when prompted.', left: '53%', top: '53%' },
      { number: 3, label: 'Side Quests Button', description: 'The command bar opens case files at any time.', left: '51%', top: '4.4%' },
      { number: 4, label: 'Case Count', description: 'The status bar tracks completed cases.', left: '13%', top: '96%' },
    ],
  },
  {
    id: 'case-files',
    title: 'Case Files',
    shortTitle: 'Cases',
    explanation: 'Case Files show available mysteries, clue progress, objectives, final puzzles, and side quest rewards.',
    keyPoints: [
      'Select a case from the list to review its objective and status.',
      'Clue slots show what has been found and what remains hidden.',
      'Ready cases unlock a final puzzle.',
      'Rewards show exactly what the case can add to Art Energy, traits, and badges.',
    ],
    screenshotSrc: './public/images/screens/guide/case-files.png',
    screenshotAlt: 'ArtQuest case files screen showing case list, objective, clue slots, final puzzle, and rewards.',
    callouts: [
      { number: 1, label: 'Case List', description: 'Choose a mystery and see locked, new, active, or complete status.', left: '23%', top: '42%' },
      { number: 2, label: 'Objective', description: 'The selected case explains the mystery goal.', left: '55%', top: '42%' },
      { number: 3, label: 'Clues', description: 'Clue slots fill as evidence is collected around the gallery.', left: '55%', top: '67%' },
      { number: 4, label: 'Rewards', description: 'Rewards list Art Energy, trait XP, and badge prizes.', left: '67%', top: '88%' },
    ],
  },
];

const compactSectionTitleClass = 'mb-2 [&_h2]:text-lg [&>span:first-child]:w-6';
const tabButtonBaseClass = 'min-h-0 rounded-md border px-2.5 py-1.5 text-left font-serif text-[13px] font-black uppercase leading-tight shadow-[0_3px_0_rgba(0,0,0,0.32)] transition focus:outline-none focus:ring-2 focus:ring-[#ffd978]';

const GuideScreenshot: React.FC<{ tab: GuideTab }> = ({ tab }) => (
  <figure className="relative flex min-h-0 flex-col overflow-hidden rounded-md border border-[#9a6328]/80 bg-[#030817] p-2 shadow-[inset_0_0_0_1px_rgba(255,238,190,0.06)]">
    <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-sm border border-[#4c371f] bg-[#050a16]">
      <img
        src={tab.screenshotSrc}
        alt={tab.screenshotAlt}
        className="block h-full w-full object-contain"
        draggable={false}
      />
      {tab.callouts.map(callout => (
        <span
          key={`${tab.id}-callout-${callout.number}`}
          className="absolute flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#fff0a8]/85 bg-[#f0b84a]/88 font-serif text-[10px] font-black text-[#180b20] shadow-[0_0_0_1px_rgba(0,0,0,0.52),0_0_7px_rgba(240,184,74,0.22)] sm:h-6 sm:w-6 sm:text-xs"
          style={{ left: callout.left, top: callout.top }}
          aria-label={`${callout.number}: ${callout.label}`}
          title={callout.label}
        >
          {callout.number}
        </span>
      ))}
    </div>
    <figcaption className="mt-1.5 shrink-0 text-center text-xs font-semibold leading-relaxed text-[#d8c29a]">
      Screenshot from the live game screen.
    </figcaption>
  </figure>
);

const GuideKeyPoints: React.FC<{ points: string[] }> = ({ points }) => (
  <ul className="grid gap-2">
    {points.map(point => (
      <li key={point} className="grid grid-cols-[1rem_minmax(0,1fr)] gap-2">
        <span className="mt-1.5 h-2 w-2 rotate-45 border border-[#ffd978] bg-[#6b2a8f]" aria-hidden="true" />
        <span className="text-[13px] leading-relaxed text-[#f7e5c9]">{point}</span>
      </li>
    ))}
  </ul>
);

const GuideCalloutList: React.FC<{ callouts: GuideCallout[] }> = ({ callouts }) => (
  <div className="grid min-h-0 gap-1">
    {callouts.map(callout => (
      <div
        key={`label-${callout.number}-${callout.label}`}
        className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-1.5 rounded-md border border-[#7f5524]/60 bg-[#050b18]/72 p-1"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full border border-[#fff0a8] bg-[#f0b84a] font-serif text-[10px] font-black text-[#180b20]">
          {callout.number}
        </span>
        <span className="min-w-0">
          <span className="block font-serif text-[11px] font-black uppercase leading-tight text-[#ffe7a0]">{callout.label}</span>
          <span className="mt-px block text-[10px] leading-tight text-[#d8c29a]">{callout.description}</span>
        </span>
      </div>
    ))}
  </div>
);

const GameGuideScreen: React.FC<GameGuideScreenProps> = ({
  onReturnToMap,
  selectedAvatar,
  playerStats,
  returnLabel = 'Return to Map',
}) => {
  const [activeTabId, setActiveTabId] = useState<GuideTabId>(GUIDE_TABS[0].id);
  const activeTabIndex = Math.max(0, GUIDE_TABS.findIndex(tab => tab.id === activeTabId));
  const activeTab = GUIDE_TABS[activeTabIndex] || GUIDE_TABS[0];

  const relatedTabs = useMemo(() => {
    const previous = GUIDE_TABS[(activeTabIndex - 1 + GUIDE_TABS.length) % GUIDE_TABS.length];
    const next = GUIDE_TABS[(activeTabIndex + 1) % GUIDE_TABS.length];
    return { previous, next };
  }, [activeTabIndex]);

  const focusTabButton = (tabId: GuideTabId) => {
    window.requestAnimationFrame(() => {
      document.getElementById(`guide-tab-${tabId}`)?.focus();
    });
  };

  const moveToTab = (tabId: GuideTabId) => {
    setActiveTabId(tabId);
    focusTabButton(tabId);
  };

  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;

    event.preventDefault();
    if (event.key === 'Home') {
      moveToTab(GUIDE_TABS[0].id);
      return;
    }
    if (event.key === 'End') {
      moveToTab(GUIDE_TABS[GUIDE_TABS.length - 1].id);
      return;
    }

    const direction = event.key === 'ArrowRight' ? 1 : -1;
    const nextIndex = (activeTabIndex + direction + GUIDE_TABS.length) % GUIDE_TABS.length;
    moveToTab(GUIDE_TABS[nextIndex].id);
  };

  return (
    <ArtQuestPage
      title="Guidebook"
      subtitle="A field manual for exploring the Gallery of Secrets."
      selectedAvatar={selectedAvatar}
      playerStats={playerStats}
      onReturnToMap={onReturnToMap}
      returnLabel={returnLabel}
      showPlayerPanel={!!selectedAvatar || !!playerStats}
      className="box-border h-screen min-h-0 overflow-hidden p-2 sm:p-2 lg:p-3 [&>div.relative]:h-full [&>div.relative]:min-h-0 [&>div.relative]:max-w-[1660px] [&_footer]:mt-2 [&_footer]:py-1 [&_footer]:text-xs [&_h1]:!text-4xl [&_h1]:sm:!text-5xl [&_h1]:xl:!text-5xl [&_header]:mb-2 [&_header]:gap-2 [&_header]:lg:grid-cols-[220px_minmax(0,1fr)_260px] [&_header>div]:min-h-12 [&_header_button]:min-h-10 [&_header_button]:px-5 [&_header_button]:py-1 [&_header_button]:text-sm [&_header_p]:!mt-0 [&_header_p]:!text-base"
      contentClassName="grid min-h-0 flex-1 gap-3 overflow-hidden lg:grid-cols-[270px_minmax(0,1fr)] 2xl:grid-cols-[310px_minmax(0,1fr)]"
      footerText="Look closely, think clearly, judge with evidence."
    >
      <ArtQuestPanel as="aside" className="flex min-h-0 flex-col overflow-hidden p-3">
        <ArtQuestSectionTitle className={compactSectionTitleClass}>Guide Tabs</ArtQuestSectionTitle>
        <div
          role="tablist"
          aria-label="Game guide sections"
          onKeyDown={handleTabKeyDown}
          className="grid min-h-0 flex-1 auto-rows-fr grid-cols-1 gap-1.5 overflow-hidden"
        >
          {GUIDE_TABS.map((tab, index) => {
            const isActive = activeTab.id === tab.id;
            return (
              <button
                key={tab.id}
                id={`guide-tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`guide-panel-${tab.id}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => setActiveTabId(tab.id)}
                className={artQuestCx(
                  tabButtonBaseClass,
                  isActive
                    ? 'border-[#8cff55] bg-[#103114]/92 text-[#ecffd8] shadow-[0_0_18px_rgba(132,255,80,0.2),0_4px_0_rgba(0,0,0,0.42)]'
                    : 'border-[#7f5524]/70 bg-[#071226]/86 text-[#ffe8ad] hover:border-[#d79634] hover:bg-[#102245]',
                )}
              >
                <span className="block text-[9px] text-[#d8c29a]">Part {index + 1}</span>
                <span className="block">{tab.shortTitle}</span>
              </button>
            );
          })}
        </div>

        <ArtQuestPanel as="div" variant="inner" className="mt-2 shrink-0 p-2 text-xs leading-relaxed text-[#d8c29a]">
          <p>
            The screenshot pins are deliberately small. Match each number to the label list beside the image.
          </p>
        </ArtQuestPanel>
      </ArtQuestPanel>

      <ArtQuestPanel
        id={`guide-panel-${activeTab.id}`}
        role="tabpanel"
        aria-labelledby={`guide-tab-${activeTab.id}`}
        className="flex min-h-0 flex-col overflow-hidden p-4"
      >
        <div className="mb-3 grid shrink-0 gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div className="max-w-4xl">
            <p className="font-serif text-sm font-black uppercase text-[#8cff55]">
              Guidebook Part {activeTabIndex + 1} of {GUIDE_TABS.length}
            </p>
            <h2 className="mt-1 font-serif text-3xl font-black uppercase leading-tight text-[#ffe7a0] drop-shadow-[0_3px_0_rgba(0,0,0,0.78)]">
              {activeTab.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#f7e5c9] xl:text-base">
              {activeTab.explanation}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <ArtQuestButton
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setActiveTabId(relatedTabs.previous.id)}
              aria-label={`Open previous guide tab: ${relatedTabs.previous.title}`}
            >
              <span aria-hidden="true">←</span>
              <span>Previous</span>
            </ArtQuestButton>
            <ArtQuestButton
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setActiveTabId(relatedTabs.next.id)}
              aria-label={`Open next guide tab: ${relatedTabs.next.title}`}
            >
              <span>Next</span>
              <span aria-hidden="true">→</span>
            </ArtQuestButton>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 gap-3 overflow-hidden lg:grid-cols-[190px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)] 2xl:grid-cols-[250px_minmax(0,1fr)]">
          <ArtQuestPanel as="section" variant="inner" className="min-h-0 overflow-hidden p-3">
            <ArtQuestSectionTitle className={compactSectionTitleClass}>Key Points</ArtQuestSectionTitle>
            <GuideKeyPoints points={activeTab.keyPoints} />
          </ArtQuestPanel>

          <ArtQuestPanel as="section" variant="inner" className="flex min-h-0 min-w-0 flex-col overflow-hidden p-3">
            <ArtQuestSectionTitle className={compactSectionTitleClass}>Screenshot Guide</ArtQuestSectionTitle>
            <div className="grid min-h-0 flex-1 gap-3 overflow-hidden lg:grid-cols-[minmax(0,1fr)_260px] 2xl:grid-cols-[minmax(0,1fr)_300px]">
              <GuideScreenshot tab={activeTab} />
              <aside className="min-h-0 overflow-hidden" aria-label={`${activeTab.title} screenshot labels`}>
                <h3 className="mb-1 font-serif text-[13px] font-black uppercase text-[#ffd45f]">Screenshot Labels</h3>
                <GuideCalloutList callouts={activeTab.callouts} />
              </aside>
            </div>
          </ArtQuestPanel>
        </div>
      </ArtQuestPanel>
    </ArtQuestPage>
  );
};

export default GameGuideScreen;
