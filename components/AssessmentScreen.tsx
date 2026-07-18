
import React, { useMemo, useState } from 'react';
import { AssessmentScreenProps, JournalEntry, RubricCriterion, WingDefinition } from '../types';
import {
  AssessmentContext,
  SCSA_CURRICULUM_SOURCE_LINKS,
  getAssessmentContext,
  getAssessmentFeedbackNudge,
  getAssessmentRubricForContext,
} from '../data/SCSACurriculum';
import { getResponseExpectation } from '../data/ResponseExpectations';
import { getVisualLanguageGuideForWing } from '../data/VisualLanguageGuide';
import LoadingSpinner from './LoadingSpinner';
import {
  ArtQuestPlayerPanel,
  ArtQuestReturnButton,
  artQuestCx,
} from './ArtQuestUI';

const CRITERION_ICONS: Record<RubricCriterion['id'], string> = {
  artUnderstanding: '🎨',
  visualLanguage: '📜',
  personalInsight: '🔎',
  judgementReflection: '🧭',
  engagementEffort: '⚔',
};

const WING_DISPLAY_LABELS: Record<string, string> = {
  hall_of_line: 'Hall of Line',
  realm_of_colour: 'Realm of Colour',
  shape_form_forge: 'Shape & Form',
  texture_tower: 'Texture',
  space_chamber: 'Space',
  value_vault: 'Value',
  balance_bridge: 'Balance',
  emphasis_arena: 'Emphasis',
  unity_garden: 'Unity',
  rhythm_pattern_pavilion: 'Rhythm & Pattern',
  hall_of_movement: 'Movement',
  final_room: 'Final Room',
};

const getWingDisplayLabel = (wing: WingDefinition): string =>
  WING_DISPLAY_LABELS[wing.id] || wing.name.replace(/^[^\p{L}\p{N}]+/u, '').trim();

const getSourceLabel = (label: string): string =>
  label.includes('Years 11') ? 'SCSA Years 11 & 12 syllabuses & resources' : label;

const levelAccentClasses = (level: number): string => {
  switch (level) {
    case 4:
      return 'border-emerald-300/70 bg-emerald-950/55 text-emerald-100 shadow-emerald-950/40';
    case 3:
      return 'border-teal-300/70 bg-teal-950/55 text-teal-100 shadow-teal-950/40';
    case 2:
      return 'border-amber-300/70 bg-amber-950/55 text-amber-100 shadow-amber-950/40';
    case 1:
      return 'border-rose-300/70 bg-rose-950/55 text-rose-100 shadow-rose-950/40';
    case 0:
      return 'border-slate-400/70 bg-slate-950/70 text-slate-100 shadow-slate-950/40';
    default:
      return 'border-amber-300/40 bg-slate-950/60 text-slate-300 shadow-slate-950/40';
  }
};

const FrameCorners: React.FC<{ className?: string }> = ({ className = '' }) => (
  <>
    <span className={`absolute -left-2 -top-2 h-5 w-5 rotate-45 border-2 border-amber-300 bg-violet-700 shadow-[0_0_14px_rgba(250,204,21,0.55)] ${className}`} aria-hidden="true" />
    <span className={`absolute -right-2 -top-2 h-5 w-5 rotate-45 border-2 border-amber-300 bg-violet-700 shadow-[0_0_14px_rgba(250,204,21,0.55)] ${className}`} aria-hidden="true" />
    <span className={`absolute -bottom-2 -left-2 h-5 w-5 rotate-45 border-2 border-amber-300 bg-violet-700 shadow-[0_0_14px_rgba(250,204,21,0.55)] ${className}`} aria-hidden="true" />
    <span className={`absolute -bottom-2 -right-2 h-5 w-5 rotate-45 border-2 border-amber-300 bg-violet-700 shadow-[0_0_14px_rgba(250,204,21,0.55)] ${className}`} aria-hidden="true" />
  </>
);

const LevelBadge: React.FC<{ level: number; title?: string }> = ({ level, title }) => {
  if (level < 0) {
    return (
      <div className="relative flex min-h-10 min-w-16 flex-col items-center justify-center border-2 border-amber-500/45 bg-slate-950/65 px-1.5 py-1 text-center text-slate-400 shadow-[inset_0_0_0_1px_rgba(245,158,11,0.18)]">
        <FrameCorners className="h-2.5 w-2.5 opacity-70" />
        <span className="font-serif text-base font-black leading-none">N/A</span>
        <span className="mt-0.5 text-[7px] font-black uppercase">No scores yet</span>
      </div>
    );
  }

  return (
    <div className={`relative flex min-h-10 min-w-16 flex-col items-center justify-center border-2 px-1.5 py-1 text-center shadow-lg ${levelAccentClasses(level)}`}>
      <FrameCorners className="h-2.5 w-2.5" />
      <span className="font-serif text-lg font-black leading-none text-amber-200 drop-shadow-[0_2px_0_rgba(0,0,0,0.85)]">{level}</span>
      <span className="mt-0.5 text-[7px] font-black uppercase text-amber-100">{title || 'Level'}</span>
    </div>
  );
};

// Helper component to display star ratings (0-4 score out of 4 stars)
const StarDisplay: React.FC<{ score: number }> = ({ score }) => {
  const filledStars = Math.max(0, Math.min(4, Math.round(score))); // score is the level 0-4
  return (
    <span className="ml-2 inline-flex text-base text-amber-300 drop-shadow-[0_2px_0_rgba(0,0,0,0.85)]" aria-label={`${filledStars} out of 4 stars (representing level ${filledStars})`}>
      <span aria-hidden="true">{'★'.repeat(filledStars)}</span>
      <span className="text-amber-900" aria-hidden="true">{'★'.repeat(4 - filledStars)}</span>
    </span>
  );
};

const countWords = (text: string): number => text.trim().split(/\s+/).filter(Boolean).length;

const getPhaseResponsesForAssessment = (entry: JournalEntry): Record<1 | 2 | 3 | 4, string> => ({
  1: entry.phaseResponses?.[1]?.trim() || "",
  2: entry.phaseResponses?.[2]?.trim() || "",
  3: entry.phaseResponses?.[3]?.trim() || "",
  4: entry.phaseResponses?.[4]?.trim() || entry.playerReflection?.trim() || "",
});

const normalizeForAssessment = (text: string): string => text
  .toLowerCase()
  .replace(/[^\p{L}\p{N}\s]/gu, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const escapeAssessmentRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const containsAssessmentTerm = (text: string, terms: string[]): boolean => {
  const normalized = normalizeForAssessment(text);
  return terms.some((term) => {
    const normalizedTerm = normalizeForAssessment(term);
    if (!normalizedTerm) return false;
    const termPattern = escapeAssessmentRegExp(normalizedTerm).replace(/\s+/g, '\\s+');
    return new RegExp(`(^|\\s)${termPattern}(\\s|$)`, 'u').test(normalized);
  });
};

const countAssessmentSentenceLikeUnits = (text: string): number => {
  const punctuatedSentences = text
    .split(/[.!?]+|\n+/)
    .map(part => part.trim())
    .filter(part => countWords(part) >= 4).length;

  if (punctuatedSentences > 0) return punctuatedSentences;
  return countWords(text) >= 8 ? 1 : 0;
};

const clampScore = (score: number): number => Math.max(0, Math.min(100, score));

const ASSESSMENT_LOCATION_TERMS = ['left', 'right', 'centre', 'center', 'middle', 'top', 'bottom', 'foreground', 'background', 'around', 'behind', 'beside', 'near', 'across', 'through'];
const ASSESSMENT_ANALYSIS_TERMS = ['creates', 'guides', 'leads', 'draws', 'emphasises', 'emphasizes', 'contrasts', 'balances', 'connects', 'repeats', 'affects', 'influences', 'arranged', 'combined', 'because', 'so that'];
const ASSESSMENT_INTERPRETATION_TERMS = ['mood', 'feeling', 'idea', 'message', 'meaning', 'story', 'symbolises', 'symbolizes', 'suggests', 'communicates', 'represents', 'reminds', 'could mean', 'might mean'];
const ASSESSMENT_JUDGEMENT_TERMS = ['successful', 'effective', 'powerful', 'works', 'strong', 'weak', 'partly successful', 'not successful', 'overall', 'i think', 'my judgement'];
const ASSESSMENT_REASONING_TERMS = ['because', 'evidence', 'shows', 'suggests', 'from the artwork', 'this makes', 'this creates', 'therefore', 'however', 'although'];

const getAssessmentWordScore = (wordCount: number, targetWordCount: number): number => {
  if (wordCount <= 0) return 0;
  if (wordCount >= Math.ceil(targetWordCount * 1.5)) return 95;
  if (wordCount >= Math.ceil(targetWordCount * 1.25)) return 85;
  if (wordCount >= targetWordCount) return 65;
  if (wordCount >= Math.ceil(targetWordCount * 0.7)) return 50;
  if (wordCount >= Math.ceil(targetWordCount * 0.4)) return 35;
  return 20;
};

const getAssessmentVisualLanguageTargets = (context: AssessmentContext): { competent: number; excellent: number } => {
  if (context.assessmentStage === 'lowerSecondary') return { competent: 2, excellent: 4 };
  if (context.assessmentStage === 'middleSecondary') return { competent: 3, excellent: 5 };
  if (context.assessmentStage === 'seniorAtar') return { competent: 5, excellent: 7 };
  return { competent: 4, excellent: 6 };
};

const getAssessmentVisualTermsUsed = (
  entry: JournalEntry,
  responseText: string,
  context: AssessmentContext,
): string[] => {
  const guide = getVisualLanguageGuideForWing(entry.wingId, context.yearLevel, context.coursePathway);
  const candidateTerms = [
    ...(entry.visualLanguageLog || []),
    guide.focus,
    ...guide.assessmentVocabulary,
  ];

  return Array.from(new Set(candidateTerms.map(term => term.trim()).filter(Boolean)))
    .filter(term => containsAssessmentTerm(responseText, [term]));
};

// Helper function to generate constructive feedback
const getConstructiveFeedbackForCriterion = (
    criterion: RubricCriterion,
    achievedLevel: number,
    assessmentContext: AssessmentContext
): string => {
    const { id: criterionId, name: criterionName, descriptors } = criterion;
    const yearLevel = assessmentContext.yearLevel;
    const currentDescriptor = descriptors.find(d => d.level === achievedLevel);
    // Find the descriptor for the next level, ensuring it doesn't exceed the max level (4)
    const higherDescriptor = descriptors.find(d => d.level === Math.min(4, achievedLevel + 1));


    let feedbackIntro = `Regarding ${criterionName}, you've achieved Level ${achievedLevel} ('${currentDescriptor?.title || 'N/A'}'). `;
    let positiveObservation = "";
    let suggestionForGrowth = "";

    const adapt = (textForYounger: string, textForOlder: string): string => {
        return yearLevel < 10 ? textForYounger : textForOlder;
    };

    switch (criterionId) {
        case 'artUnderstanding':
            if (achievedLevel === 4) {
                positiveObservation = adapt(
                    "This is fantastic! You're deeply explaining multiple art concepts and how they work together, showing you really get it.",
                    "Excellent work. Your in-depth explanations of multiple art elements and principles demonstrate a sophisticated understanding of their interplay and impact."
                );
                suggestionForGrowth = adapt(
                    "Keep looking for these connections in all sorts of art. How do different artists use these same ideas in surprising ways?",
                    "Continue to analyze how diverse artists synthesize these concepts to achieve their unique visions and challenge conventions."
                );
            } else if (achievedLevel === 3) {
                positiveObservation = adapt(
                    "Great job! You're explaining key art ideas well and showing how the artist used them.",
                    "Solid understanding. You're competently explaining key art elements/principles and their application within the artwork."
                );
                suggestionForGrowth = adapt(
                    `To reach Level 4 ('${higherDescriptor?.title || 'Excellent'}'), try to explain even more art ideas you see in the artwork. Go deeper: *why* did the artist choose that specific line or color? What effect were they going for? For example, instead of just "the artist used lines," explain "the artist used jagged, sharp lines to make it feel energetic and chaotic."`,
                    `To advance to Level 4 ('${higherDescriptor?.title || 'Excellent'}'), aim to provide more in-depth explanations for a broader range of elements/principles. Elaborate on the artist's intent and the nuanced effects of their choices. For instance, analyze specific types of lines (e.g., contour, implied, gestural) and their precise impact on the composition's mood, message, or visual pathway.`
                );
            } else if (achievedLevel === 2) {
                positiveObservation = adapt(
                    "Good start! You're finding some art ideas in the work and making some connections to how they're used.",
                    "You're developing your understanding by identifying some elements and making general links to their use. This shows a growing awareness."
                );
                suggestionForGrowth = adapt(
                    `To get to Level 3 ('${higherDescriptor?.title || 'Competent'}'), focus on explaining the *main* art ideas of the wing more clearly. Give specific examples from the artwork. For instance, if the wing is about 'Color', don't just say 'there is color'; describe a *specific* color you see (like 'bright red') and explain *how* the artist used it (e.g., 'to make that part stand out'). Try using more art vocabulary too!`,
                    `To progress to Level 3 ('${higherDescriptor?.title || 'Competent'}'), focus on clearly explaining the *key* elements/principles relevant to the wing. Provide specific examples of their application within the artwork. For example, if discussing 'Balance', identify whether it's symmetrical or asymmetrical and point to specific parts of the artwork that demonstrate this. Integrating more precise art terminology will also strengthen your analysis.`
                );
            } else if (achievedLevel === 1) {
                positiveObservation = adapt(
                    "You're starting to mention some art ideas you see, which is a good first step! It shows you're looking.",
                    "You've begun to mention relevant elements, which is a foundational step in art analysis. This indicates initial observation."
                );
                suggestionForGrowth = adapt(
                    `For Level 2 ('${higherDescriptor?.title || 'Developing'}'), try to make clearer links between the art ideas you spot and what the artist is actually doing. For example, if you see 'texture', describe what kind of texture (rough, smooth?) and guess why the artist might have wanted it to look that way. What does it make you think of?`,
                    `To reach Level 2 ('${higherDescriptor?.title || 'Developing'}'), aim to establish clearer connections between the identified elements and their function or effect in the artwork. For instance, when discussing 'texture', describe its visual or implied tactile qualities (e.g., 'the impasto technique creates a rough, tangible texture') and analyze its potential purpose or impact.`
                );
            } else { // Level 0
                positiveObservation = adapt(
                    "It looks like this response didn't focus on the specific art ideas the Curator was asking about for this wing.",
                    "There wasn't a clear reference to relevant art elements or principles in this response, as guided by the wing's objectives."
                );
                suggestionForGrowth = adapt(
                    `Next time, carefully read 'Your Challenge' for the wing. It tells you what art ideas to look for (like 'Line' or 'Balance'). Try to find at least one of those in the artwork. Then, describe what you see and how you think the artist is using it. For example, "I see flowing lines that make my eyes move around the picture."`,
                    `For your next response, focus on identifying at least one art element (e.g., line, color, shape) or principle (e.g., balance, contrast) explicitly related to the wing's learning objectives. Then, describe your observation and analyze its potential application or effect intended by the artist. Refer to 'Your Challenge' for specific guidance on the wing's focus.`
                );
            }
            break;

        case 'visualLanguage':
             if (achievedLevel === 4) {
                positiveObservation = adapt("Wow, your descriptions are so vivid and you're using art words like an expert! It really brings the artwork to life.", "Excellent. Your use of expressive, accurate art terms and vivid descriptions significantly enhances your analysis and demonstrates a strong command of visual language.");
                suggestionForGrowth = adapt("Keep painting pictures with your words! Challenge yourself to find even more unique ways to describe what you see and feel.", "Continue to leverage precise and evocative visual language to enrich your interpretations and articulate complex visual phenomena.");
            } else if (achievedLevel === 3) {
                positiveObservation = adapt("Good job using art words correctly and adding some descriptive details! This helps explain what you mean.", "Competent use of art terminology and descriptive language is evident, adding clarity to your observations.");
                suggestionForGrowth = adapt(`To reach Level 4 ('${higherDescriptor?.title || 'Excellent'}'), try to use even more expressive and sensory words. How does the artwork *feel*? Is it sharp, soft, loud, quiet? Try to capture those qualities. For example, instead of "dark color," try "deep, velvety indigo."`, `To advance to Level 4 ('${higherDescriptor?.title || 'Excellent'}'), aim for more expressive and vivid descriptions. Consider how the artwork evokes sensory experiences (e.g., tactile, emotional) and try to articulate those nuances with a richer, more specific vocabulary. For instance, "the artist uses a palette of muted earth tones, creating a somber and reflective mood."`);
            } else if (achievedLevel === 2) {
                positiveObservation = adapt("You're using some art words, that's good! Sometimes they're a bit general, but it's a good start.", "You're incorporating some basic art terms, though consistency and specificity could be improved. This shows an effort to use appropriate language.");
                suggestionForGrowth = adapt(`For Level 3 ('${higherDescriptor?.title || 'Competent'}'), focus on using the *right* art words for what you're describing. The 'Visual Language Guide' in the game is your friend! Look for terms there that perfectly match what you see. For example, instead of "it's not even," try "it's asymmetrical."`, `To progress to Level 3 ('${higherDescriptor?.title || 'Competent'}'), strive for more consistent and precise use of art terminology. The in-game 'Visual Language Guide' is an excellent resource for finding specific terms relevant to the wing's focus. Aim to integrate these terms naturally into your descriptions to enhance their accuracy.`);
            } else if (achievedLevel === 1) {
                positiveObservation = adapt("You used a few art words, which is a start to describing what you see.", "A few art terms were used, indicating an initial attempt at visual description and a step towards specific art vocabulary.");
                suggestionForGrowth = adapt(`To get to Level 2 ('${higherDescriptor?.title || 'Developing'}'), try using more art words from the 'Visual Language Guide'. Even one or two specific words can make your description much clearer and show your understanding. For example, "The lines are curvy" is good, but "The lines are flowing and organic" is even better!`, `To reach Level 2 ('${higherDescriptor?.title || 'Developing'}'), aim to incorporate more art terms from the 'Visual Language Guide'. Using specific vocabulary will significantly clarify your descriptions and demonstrate a more nuanced observation. For instance, specify the type of 'balance' or the quality of 'texture' you observe.`);
            } else { // Level 0
                positiveObservation = adapt("It seems you didn't use many specific art words to describe what you saw in this response.", "There was limited or no use of specific visual art language in this response, making it difficult to understand your visual analysis.");
                suggestionForGrowth = adapt("Next time, look at the 'Visual Language Guide' on the left side of the game screen. Try to use at least one or two of those words in your answer to describe the artwork. It will make your ideas much clearer!", "For future responses, consult the 'Visual Language Guide'. Integrating even a few relevant terms will greatly enhance your ability to describe and analyze the artwork effectively. This is key to communicating your understanding of visual concepts.");
            }
            break;
        case 'personalInsight':
            if (achievedLevel === 4) {
                positiveObservation = adapt("Your ideas are so original and thoughtful! It's great to see your unique take and how you connect the art to bigger ideas or your own life.", "Excellent. Your original and thoughtful ideas or interpretations demonstrate a high level of personal engagement, critical thinking, and insightful connections.");
                suggestionForGrowth = adapt("Keep connecting art to your own experiences and thoughts! What other artworks or ideas does this remind you of?", "Continue to foster these deep connections between art, personal understanding, and broader contexts. Consider exploring interdisciplinary links or alternative interpretations.");
            } else if (achievedLevel === 3) {
                positiveObservation = adapt("You're sharing your own thoughts and connecting them to the art with some good detail, which is great!", "Competent. You're offering personal or thematic reflections with some depth, showing you're thinking beyond just what you see.");
                suggestionForGrowth = adapt(`To reach Level 4 ('${higherDescriptor?.title || 'Excellent'}'), try to make your ideas even more unique or dig deeper into the 'why' behind your thoughts. What makes you think that? How does this artwork challenge or confirm your views? For example, "This artwork makes me think about... because..."`, `To advance to Level 4 ('${higherDescriptor?.title || 'Excellent'}'), aim for more original interpretations or delve deeper into the reasoning behind your reflections. Explore the 'why' more thoroughly by questioning assumptions, considering alternative viewpoints, or exploring the artwork's potential impact on an audience.`);
            } else if (achievedLevel === 2) {
                positiveObservation = adapt("You're starting to show your own understanding and how you feel about the art, that's a good step.", "Developing. You're showing a basic personal understanding of the concepts and are beginning to articulate your own perspective.");
                suggestionForGrowth = adapt(`For Level 3 ('${higherDescriptor?.title || 'Competent'}'), try to explain your personal connection or interpretation more clearly. What does the art make *you* think or feel, and why? Give a specific reason. For example, "The dark colors make me feel a bit sad because they remind me of a rainy day."`, `To progress to Level 3 ('${higherDescriptor?.title || 'Competent'}'), articulate your personal connections or interpretations more explicitly. Explain what the art makes you think or feel, and elaborate on the reasons, linking them to specific visual elements or thematic content in the artwork.`);
            } else if (achievedLevel === 1) {
                positiveObservation = adapt("You made some general statements about your thoughts, good try. It's important to share your perspective.", "Beginning. You've made some general or personal statements, which is a starting point for sharing your own voice.");
                suggestionForGrowth = adapt(`To get to Level 2 ('${higherDescriptor?.title || 'Developing'}'), try to connect your thoughts more directly to what you see in the artwork. How does something specific in the art lead to your idea or feeling? For example, "The way the lines all point upwards makes me feel hopeful."`, `To reach Level 2 ('${higherDescriptor?.title || 'Developing'}'), try to link your thoughts more directly to specific aspects of the artwork. Explain how a particular detail, technique, or subject matter influences your interpretation or emotional response. This helps make your insight more grounded in the artwork itself.`);
            } else { // Level 0
                positiveObservation = adapt("It looks like you didn't share many personal thoughts or insights here. This part is about your interpretation and response.", "There was no clear evidence of personal reflection or insight in this response. The Interpret and Reflect phases are key for this.");
                suggestionForGrowth = adapt(
                    `Next time, think about what the artwork reminds you of, or how it makes you feel. There's no wrong answer when it's your personal insight, just try to share it! For example, "This artwork is confusing to me because..." or "I like this artwork because..." and then say why.`,
                    `For your next response, consider what the artwork reminds you of, how it makes you feel, or what questions it raises for you. Sharing your personal insights is valuable; try to express them clearly and connect them to what you've observed. This is a chance to make the art meaningful to you.`
                );
            }
            break;

        case 'judgementReflection':
             if (achievedLevel === 4) {
                positiveObservation = adapt("Your judgement is clear and well explained. You used details from the artwork to show why you think it works.", "Excellent. Your judgement is clear, well supported, and grounded in visual evidence from your description, analysis, and interpretation.");
                suggestionForGrowth = adapt("Keep backing up your opinions with evidence. You could also compare this artwork with another one to make your judgement even stronger.", "Continue developing evaluative nuance by weighing visual impact, possible intent, audience response, and alternative readings.");
            } else if (achievedLevel === 3) {
                positiveObservation = adapt("You made a relevant judgement and gave some evidence. That's solid reflective thinking.", "Competent. You made a relevant judgement and supported it with some evidence from the artwork.");
                suggestionForGrowth = adapt(`To reach Level 4 ('${higherDescriptor?.title || 'Excellent'}'), make your reason more specific. Point to exact details, like a colour, line, shape, or focal point, and explain why that proves your judgement.`, `To advance to Level 4 ('${higherDescriptor?.title || 'Excellent'}'), strengthen the judgement by drawing on more precise evidence and considering the relationship between visual impact and possible artistic intent.`);
            } else if (achievedLevel === 2) {
                positiveObservation = adapt("You shared a basic opinion about the artwork. Now it needs more explanation.", "Developing. You offered a basic judgement, but it needs clearer explanation and stronger evidence.");
                suggestionForGrowth = adapt(`For Level 3 ('${higherDescriptor?.title || 'Competent'}'), say whether the artwork is successful, partly successful, or not successful. Then give one clear reason from what you can see.`, `To progress to Level 3 ('${higherDescriptor?.title || 'Competent'}'), make the judgement explicit and support it with visual evidence from your earlier description, analysis, or interpretation.`);
            } else if (achievedLevel === 1) {
                positiveObservation = adapt("You started to give an opinion, which is a useful first step.", "Beginning. You began to offer a judgement, but it is minimal or unclear.");
                suggestionForGrowth = adapt(`To get to Level 2 ('${higherDescriptor?.title || 'Developing'}'), use this sentence starter: "I think the artwork is successful because..." Then add one detail from the artwork.`, `To reach Level 2 ('${higherDescriptor?.title || 'Developing'}'), state a clear evaluative position and connect it to at least one specific visual feature.`);
            } else { // Level 0
                positiveObservation = adapt("It looks like there wasn't a clear judgement yet.", "No clear judgement or reflective evaluation was evident in this response.");
                suggestionForGrowth = adapt(
                    `In Reflect, try to decide how well the artwork works. Say what you think, then explain your reason using a detail you noticed.`,
                    `In the Reflect phase, make an evaluative judgement about the artwork's success and support it with evidence from the visual analysis.`
                );
            }
            break;

        case 'engagementEffort':
             if (achievedLevel === 4) {
                positiveObservation = adapt("You really focused and gave a full, deep answer. Amazing effort and thoughtfulness!", "Excellent. Your response is comprehensive, demonstrating depth, focus, and a thorough engagement with the prompt.");
                suggestionForGrowth = adapt("Keep up that fantastic engagement! Your detailed answers show you're really learning.", "Maintain this high level of engagement and thoughtful participation. Your thoroughness is a key to deep learning.");
            } else if (achievedLevel === 3) {
                positiveObservation = adapt("Good job! You put in effort and mostly answered the question fully. Your response is clear.", "Competent. Your response shows good effort and is mostly complete, addressing the main parts of the prompt.");
                suggestionForGrowth = adapt(`To reach Level 4 ('${higherDescriptor?.title || 'Excellent'}'), try to add even more detail or explore different parts of the question if it has multiple points. Make sure every part of the Curator's prompt is addressed with the same level of thought. For example, if asked for two things, explain both fully.`, `To advance to Level 4 ('${higherDescriptor?.title || 'Excellent'}'), aim to provide even more detail or explore various facets of the question with consistent depth. Ensure all aspects of the Curator's prompt are thoroughly addressed and developed in your response.`);
            } else if (achievedLevel === 2) {
                positiveObservation = adapt("Your answer is a bit short or doesn't have a lot of detail. It covers some of what was asked.", "Developing. Your response is partial or lacks sufficient detail, though it addresses some aspects of the prompt.");
                suggestionForGrowth = adapt(`For Level 3 ('${higherDescriptor?.title || 'Competent'}'), try to write a bit more and explain your ideas more fully. Make sure you're answering all parts of what the Curator asked. Breaking the question down into smaller pieces can help make sure you cover everything.`, `To progress to Level 3 ('${higherDescriptor?.title || 'Competent'}'), aim to expand on your ideas and provide more complete explanations. Ensure you address all components of the Curator's prompt. Reviewing the prompt before finalizing your answer can help ensure completeness.`);
            } else if (achievedLevel === 1) {
                positiveObservation = adapt("You made a minimal attempt, which is a starting point. Thanks for responding.", "Beginning. Your attempt was minimal, but it's a start. Every response helps you learn.");
                suggestionForGrowth = adapt(`To get to Level 2 ('${higherDescriptor?.title || 'Developing'}'), try to provide more than just a word or two. Even a short sentence explaining your thought is a great next step! Try to answer the main question the Curator is asking.`, `To reach Level 2 ('${higherDescriptor?.title || 'Developing'}'), aim to provide more than a few words. Even a concise sentence explaining your thought process or observation would be a significant improvement. Focus on directly addressing the core of the Curator's question.`);
            } else { // Level 0
                positiveObservation = adapt("It looks like you didn't attempt to answer this part of the challenge.", "No attempt was made to address this part of the challenge, or the response was unrelated to the prompt.");
                suggestionForGrowth = adapt("Remember to respond to each phase of the challenge (See, Think, Interpret, Reflect). The Curator is waiting to hear your thoughts and help you learn! Even a short answer is better than no answer.", "Ensure you respond to each phase of the challenge: See, Think, Interpret, and Reflect. Active participation is key to making the most of ArtQuest.");
            }
            break;
        default: // Should not happen with defined criteria
            positiveObservation = adapt("Feedback for this area is being polished.", "Feedback for this specific criterion is currently under refinement.");
            suggestionForGrowth = adapt("Keep exploring and trying your best in all aspects of art!", "Continue your artistic exploration and practice across all areas. Every effort contributes to your growth.");
    }

    return `${feedbackIntro} ${positiveObservation} ${suggestionForGrowth} ${getAssessmentFeedbackNudge(criterionId, achievedLevel, assessmentContext)}`;
};


const AssessmentScreen: React.FC<AssessmentScreenProps> = ({
  learningJournal,
  selectedAvatar,
  playerStats,
  wingDefinitions,
  onReturnToMap,
}) => {
  const [selectedFeedbackWingId, setSelectedFeedbackWingId] = useState<string | null>(null);

  const assessmentContext = useMemo(
    () => getAssessmentContext(selectedAvatar || 9),
    [selectedAvatar]
  );
  const rubricData = useMemo(
    () => getAssessmentRubricForContext(assessmentContext),
    [assessmentContext]
  );

  const getRawScoreForEntryCriterion = (entry: JournalEntry, criterionId: RubricCriterion['id']): number => {
    const phaseResponses = getPhaseResponsesForAssessment(entry);
    const personalReflection = entry.playerPersonalReflection?.trim() || "";

    const seeThinkText = `${phaseResponses[1]} ${phaseResponses[2]}`.trim();
    const interpretReflectText = `${phaseResponses[3]} ${phaseResponses[4]}`.trim();
    const allResponseText = `${phaseResponses[1]} ${phaseResponses[2]} ${phaseResponses[3]} ${phaseResponses[4]}`.trim();
    const reflection = phaseResponses[4].trim();
    const visualTermsCount = getAssessmentVisualTermsUsed(entry, allResponseText, assessmentContext).length;

    const seeThinkWordCount = countWords(seeThinkText);
    const interpretReflectWordCount = countWords(interpretReflectText);
    const allResponseWordCount = countWords(allResponseText);
    const reflectionWordCount = countWords(reflection);
    const personalReflectionWordCount = countWords(personalReflection);
    const completedPhaseCount = Object.values(phaseResponses).filter(response => countWords(response) > 0).length;
    const allSentenceCount = countAssessmentSentenceLikeUnits(allResponseText);
    const seeThinkSentenceCount = countAssessmentSentenceLikeUnits(seeThinkText);
    const interpretReflectSentenceCount = countAssessmentSentenceLikeUnits(interpretReflectText);
    const reflectionSentenceCount = countAssessmentSentenceLikeUnits(reflection);
    const hasLocationEvidence = containsAssessmentTerm(allResponseText, ASSESSMENT_LOCATION_TERMS);
    const hasAnalysisLanguage = containsAssessmentTerm(seeThinkText, ASSESSMENT_ANALYSIS_TERMS);
    const hasInterpretationLanguage = containsAssessmentTerm(interpretReflectText, ASSESSMENT_INTERPRETATION_TERMS);
    const hasJudgementLanguage = containsAssessmentTerm(reflection, ASSESSMENT_JUDGEMENT_TERMS);
    const hasReasoning = containsAssessmentTerm(allResponseText, ASSESSMENT_REASONING_TERMS);
    const hasReflectionReasoning = containsAssessmentTerm(reflection, ASSESSMENT_REASONING_TERMS);
    const hasNuancedJudgement = containsAssessmentTerm(reflection, ['partly successful', 'not successful', 'however', 'although', 'overall']);
    const phaseWordTarget = (phase: 1 | 2 | 3 | 4): number => (
      getResponseExpectation(assessmentContext.yearLevel, phase, assessmentContext.coursePathway).minWords
    );
    const artUnderstandingTarget = phaseWordTarget(1) + phaseWordTarget(2);
    const personalInsightTarget = phaseWordTarget(3) + phaseWordTarget(4);
    const engagementTarget = artUnderstandingTarget + personalInsightTarget;

    switch (criterionId) {
      case 'artUnderstanding':
        let auScore = getAssessmentWordScore(seeThinkWordCount, artUnderstandingTarget);
        if (visualTermsCount >= getAssessmentVisualLanguageTargets(assessmentContext).competent) auScore += 4;
        if (hasLocationEvidence) auScore += 4;
        if (hasAnalysisLanguage) auScore += 5;
        if (seeThinkSentenceCount >= 2) auScore += 3;
        return clampScore(auScore);
      
      case 'visualLanguage': 
        {
          const visualTargets = getAssessmentVisualLanguageTargets(assessmentContext);
          let vlScore = 0;
          if (visualTermsCount >= visualTargets.excellent) vlScore = 95;
          else if (visualTermsCount >= visualTargets.competent) vlScore = 72;
          else if (visualTermsCount >= Math.max(1, visualTargets.competent - 1)) vlScore = 52;
          else if (visualTermsCount >= 1) vlScore = 35;
          if (allSentenceCount >= completedPhaseCount && visualTermsCount >= visualTargets.competent) vlScore += 3;
          return clampScore(vlScore);
        }

      case 'personalInsight':
        let piScore = getAssessmentWordScore(interpretReflectWordCount, personalInsightTarget);
        if (hasInterpretationLanguage) piScore += 7;
        if (hasReasoning) piScore += 5;
        if (personalReflectionWordCount >= 8) piScore += 4;
        if (interpretReflectSentenceCount >= 2) piScore += 3;
        return clampScore(piScore);

      case 'judgementReflection': 
        let jrScore = getAssessmentWordScore(reflectionWordCount, phaseWordTarget(4));
        if (hasJudgementLanguage) jrScore += 8;
        if (hasReflectionReasoning) jrScore += 8;
        if (hasNuancedJudgement) jrScore += 4;
        if (reflectionSentenceCount >= getResponseExpectation(assessmentContext.yearLevel, 4, assessmentContext.coursePathway).minSentences) jrScore += 3;
        return clampScore(jrScore);

      case 'engagementEffort':
        let eeScore = getAssessmentWordScore(allResponseWordCount, engagementTarget);
        if (completedPhaseCount < 4) eeScore = Math.min(eeScore, completedPhaseCount >= 3 ? 60 : completedPhaseCount >= 2 ? 45 : 30);
        if (completedPhaseCount === 4) eeScore += 4;
        if (allSentenceCount >= completedPhaseCount && completedPhaseCount >= 2) eeScore += 3;
        if (completedPhaseCount === 4 && visualTermsCount >= getAssessmentVisualLanguageTargets(assessmentContext).competent) eeScore += 3;
        return clampScore(eeScore);
      default:
        return 0;
    }
  };

  const calculateAverageScores = useMemo(() => {
    if (!learningJournal || learningJournal.length === 0) return null;

    const totals = rubricData.reduce((scores, criterion) => {
      scores[criterion.id] = 0;
      return scores;
    }, {} as Record<RubricCriterion['id'], number>);
    const counts: Record<RubricCriterion['id'], number> = { ...totals }; 

    learningJournal.forEach(entry => {
      rubricData.forEach(criterion => {
        totals[criterion.id] += getRawScoreForEntryCriterion(entry, criterion.id);
        counts[criterion.id]++;
      });
    });

    const averages: Record<RubricCriterion['id'], number> = { ...totals };
    rubricData.forEach(criterion => {
      averages[criterion.id] = counts[criterion.id] > 0 ? totals[criterion.id] / counts[criterion.id] : 0;
    });
    return averages;
  }, [learningJournal, selectedAvatar, rubricData]);

  const latestEntryByWingId = useMemo(() => {
    return learningJournal.reduce((entries, entry) => {
      const currentEntry = entries[entry.wingId];
      if (!currentEntry || new Date(entry.completedDate).getTime() > new Date(currentEntry.completedDate).getTime()) {
        entries[entry.wingId] = entry;
      }
      return entries;
    }, {} as Record<string, JournalEntry>);
  }, [learningJournal]);

  const getRubricLevelFromAvgRawScore = (avgRawScore: number, context: AssessmentContext): number => {
    const thresholds = [20, 40, 60, 80, 101]; 
    const adjustment = context.thresholdAdjustment;
    
    if (avgRawScore < thresholds[0] + adjustment) return 0;
    if (avgRawScore < thresholds[1] + adjustment) return 1;
    if (avgRawScore < thresholds[2] + adjustment) return 2;
    if (avgRawScore < thresholds[3] + adjustment) return 3;
    return 4;
  };

  if (!selectedAvatar) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-gray-100 p-6">
        <LoadingSpinner size={12} />
        <p className="mt-4 text-xl text-purple-300">Loading player data...</p>
      </div>
    );
  }

  const hasJournalEntries = learningJournal.length > 0;
  const selectedFeedbackWing = selectedFeedbackWingId
    ? wingDefinitions.find(wing => wing.id === selectedFeedbackWingId) || null
    : null;
  const selectedFeedbackEntry = selectedFeedbackWingId ? latestEntryByWingId[selectedFeedbackWingId] : null;
  
  return (
    <div className="assessment-v3-root relative h-screen overflow-hidden bg-[#030711] p-3 text-[#f8ead1]">
      <style>{`
        @media (max-height: 700px) {
          .assessment-v3-root { padding: 8px; }
          .assessment-v3-header { grid-template-columns: 170px minmax(0, 1fr) 220px; gap: 8px; }
          .assessment-v3-return-wrap { padding-top: 24px; padding-left: 36px; }
          .assessment-v3-return-wrap button { min-height: 32px; padding: 4px 16px; font-size: 12px; }
          .assessment-v3-title { font-size: 30px; }
          .assessment-v3-understand { margin-top: 2px; max-width: 620px; padding: 4px 8px; }
          .assessment-v3-understand h2 { font-size: 14px; }
          .assessment-v3-understand p { font-size: 10px; line-height: 1.15; }
          .assessment-v3-source-links { display: none; }
          .assessment-v3-player-wrap { padding-top: 0; padding-right: 16px; }
          .assessment-v3-rubric-title { font-size: 16px; }
          .assessment-v3-rubric-note { margin-bottom: 2px; padding-top: 0; padding-bottom: 0; font-size: 8px; }
          .assessment-v3-table th { padding: 3px 6px; font-size: 8px; }
          .assessment-v3-table td { padding: 3px 6px; font-size: 8px; line-height: 1.05; }
          .assessment-v3-criteria-icon { width: 24px; height: 24px; font-size: 14px; }
          .assessment-v3-criteria-name { font-size: 8px; }
          .assessment-v3-feedback-strip { margin-right: 32px; margin-bottom: 24px; margin-left: 32px; padding: 2px; }
          .assessment-v3-feedback-title { font-size: 12px; }
          .assessment-v3-feedback-subtitle { display: none; }
          .assessment-v3-wing-button { min-height: 24px; padding: 1px 3px; font-size: 7px; }
          .assessment-v3-wing-button span:first-child { font-size: 11px; }
        }
      `}</style>
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage: [
            'radial-gradient(circle at 50% -8%, rgba(124, 58, 237, 0.28), transparent 31rem)',
            'radial-gradient(circle at 12% 16%, rgba(14, 165, 233, 0.12), transparent 22rem)',
            'radial-gradient(circle at 88% 62%, rgba(217, 70, 239, 0.12), transparent 25rem)',
            'linear-gradient(180deg, rgba(3, 9, 22, 0.98), rgba(2, 6, 18, 1))',
          ].join(', '),
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none fixed inset-0 opacity-50"
        style={{
          backgroundImage: [
            'radial-gradient(circle, rgba(255, 229, 157, 0.72) 0 1px, transparent 1.5px)',
            'radial-gradient(circle, rgba(208, 117, 255, 0.35) 0 1px, transparent 1.7px)',
            'linear-gradient(120deg, transparent 0 49%, rgba(155, 106, 255, 0.08) 50%, transparent 51% 100%)',
          ].join(', '),
          backgroundPosition: '12px 18px, 42px 54px, center',
          backgroundSize: '104px 104px, 152px 152px, 100% 100%',
        }}
        aria-hidden="true"
      />
      <div className="pointer-events-none fixed inset-2 border border-[#d38c2e]/80 shadow-[inset_0_0_0_2px_rgba(17,8,28,0.92),inset_0_0_0_4px_rgba(216,143,45,0.22)]" aria-hidden="true" />
      {['left-2 top-2', 'right-2 top-2', 'bottom-2 left-2', 'bottom-2 right-2'].map(position => (
        <span
          key={position}
          className={artQuestCx(
            'pointer-events-none fixed z-[1] h-8 w-8 rotate-45 border-2 border-[#dca247] bg-gradient-to-br from-[#f68aff] via-[#662c9d] to-[#120b28] shadow-[0_0_16px_rgba(217,70,239,0.5),inset_0_0_0_2px_rgba(0,0,0,0.42)]',
            position,
          )}
          aria-hidden="true"
        />
      ))}

      <div className="relative z-10 flex h-full min-h-0 flex-col gap-2">
        <header className="assessment-v3-header grid shrink-0 grid-cols-[200px_minmax(0,1fr)_260px] items-start gap-3 max-[700px]:grid-cols-[170px_minmax(0,1fr)_220px] max-[700px]:gap-2">
          <div className="assessment-v3-return-wrap pl-12 pt-9 max-[700px]:pl-9 max-[700px]:pt-6">
            <ArtQuestReturnButton onClick={onReturnToMap} className="min-h-10 px-6 py-1.5 text-sm max-[700px]:min-h-8 max-[700px]:px-4 max-[700px]:py-1 max-[700px]:text-xs">
              Return to Map
            </ArtQuestReturnButton>
          </div>

          <div className="min-w-0 text-center">
            <div className="flex items-center justify-center gap-2">
              <span className="hidden h-px min-w-12 flex-1 bg-gradient-to-r from-transparent via-[#bf7c2c] to-[#f2c15c] sm:block" aria-hidden="true" />
              <span className="text-2xl text-[#f6c55b]" aria-hidden="true">✦</span>
              <h1 className="assessment-v3-title whitespace-nowrap bg-gradient-to-b from-[#fff2bc] via-[#f3bd47] to-[#c97921] bg-clip-text font-serif text-4xl font-black uppercase leading-none text-transparent drop-shadow-[0_4px_0_rgba(0,0,0,0.85)] max-[700px]:text-3xl xl:text-5xl 2xl:text-6xl">
                Assessment Summary
              </h1>
              <span className="text-2xl text-[#f6c55b]" aria-hidden="true">✦</span>
              <span className="hidden h-px min-w-12 flex-1 bg-gradient-to-l from-transparent via-[#bf7c2c] to-[#f2c15c] sm:block" aria-hidden="true" />
            </div>

            <section className="assessment-v3-understand mx-auto mt-1 max-w-[720px] rounded-md border border-[#a66c2b]/85 bg-[#061125]/92 px-3 py-1.5 text-center shadow-[inset_0_0_0_1px_rgba(255,236,176,0.08),inset_0_0_34px_rgba(105,46,150,0.12),0_8px_20px_rgba(0,0,0,0.34)] max-[700px]:mt-0.5 max-[700px]:max-w-[620px] max-[700px]:px-2 max-[700px]:py-1">
              <div className="mb-0.5 flex items-center justify-center gap-2">
                <span className="h-2 w-2 rotate-45 border border-[#ffd978] bg-[#772aa8] shadow-[0_0_8px_rgba(217,70,239,0.5)]" aria-hidden="true" />
                <h2 className="font-serif text-base font-black uppercase text-[#ffd45f] drop-shadow-[0_2px_0_rgba(0,0,0,0.8)] max-[700px]:text-sm">Understand Your Assessment</h2>
                <span className="h-2 w-2 rotate-45 border border-[#ffd978] bg-[#772aa8] shadow-[0_0_8px_rgba(217,70,239,0.5)]" aria-hidden="true" />
              </div>
              <p className="mx-auto max-w-[640px] text-xs leading-snug text-[#f7e5c9] max-[700px]:text-[10px] max-[700px]:leading-tight">
                This rubric shows how your ArtQuest responses are reviewed across key Visual Arts skills.
                Scores are estimates only; your teacher will confirm final marks using class expectations and your full body of work.
              </p>
              <div className="assessment-v3-source-links mt-1.5 flex flex-wrap justify-center gap-3 text-[11px] max-[700px]:hidden">
                {SCSA_CURRICULUM_SOURCE_LINKS.map(source => (
                  <a
                    key={source.url}
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="min-w-56 rounded-md border border-cyan-300/45 bg-cyan-400/10 px-3 py-0.5 font-medium text-cyan-100 transition hover:bg-cyan-300/20 focus:outline-none focus:ring-2 focus:ring-cyan-200 max-[700px]:min-w-44 max-[700px]:px-2"
                  >
                    {getSourceLabel(source.label)}
                  </a>
                ))}
              </div>
            </section>
          </div>

          <div className="assessment-v3-player-wrap flex justify-end pt-1 pr-8 max-[700px]:pr-4">
            <ArtQuestPlayerPanel selectedAvatar={selectedAvatar} playerStats={playerStats} className="max-w-[250px] max-[700px]:max-w-[220px]" />
          </div>
        </header>

        <main className="flex min-h-0 flex-1 flex-col gap-1.5">
          <section className="relative flex min-h-0 flex-1 flex-col rounded-md border border-[#a66c2b]/80 bg-[#061125]/70 p-1.5 shadow-[inset_0_0_0_1px_rgba(255,236,176,0.08),inset_0_0_34px_rgba(105,46,150,0.12),0_10px_24px_rgba(0,0,0,0.34)]">
            <div className="mb-0.5 flex shrink-0 items-center justify-center gap-2">
              <span className="h-2 w-2 rotate-45 border border-[#ffd978] bg-[#772aa8] shadow-[0_0_8px_rgba(217,70,239,0.5)]" aria-hidden="true" />
              <h2 className="assessment-v3-rubric-title font-serif text-lg font-black uppercase text-[#ffd45f] drop-shadow-[0_2px_0_rgba(0,0,0,0.8)] max-[700px]:text-base">
                {hasJournalEntries
                  ? `Estimated Summary for ${assessmentContext.label}`
                  : 'Complete Wings to Unlock Estimated Scores'}
              </h2>
              <span className="h-2 w-2 rotate-45 border border-[#ffd978] bg-[#772aa8] shadow-[0_0_8px_rgba(217,70,239,0.5)]" aria-hidden="true" />
            </div>
            <p className="assessment-v3-rubric-note mx-auto mb-1 w-full max-w-4xl shrink-0 rounded-md border border-[#9a6328]/65 bg-[#030817]/80 px-3 py-0.5 text-center font-serif text-[10px] font-black uppercase text-[#ffd45f] max-[700px]:py-0 max-[700px]:text-[8px]">
              {hasJournalEntries
                ? `This formative estimate uses the selected ${assessmentContext.label} expectations, relevant visual evidence, visual language, and complete phase responses — not word count alone.`
                : 'Complete wings to unlock estimated scores. For now, review the assessment standards below.'}
            </p>

            <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden rounded-md border border-[#9a6328]/75 bg-[#061125]/88 narrative-scrollbar">
              <table className="assessment-v3-table h-full w-full min-w-[1050px] table-fixed border-collapse">
                <colgroup>
                  <col className="w-36" />
                  {rubricData[0].descriptors.map(desc => (
                    <col key={`col-${desc.level}`} />
                  ))}
                  <col className="w-32" />
                </colgroup>
                <thead>
                  <tr>
                    <th className="border border-[#9a6328]/70 bg-[#3b1458]/90 px-1.5 py-1 text-center font-serif text-[10px] font-black uppercase text-[#ffe985] max-[700px]:text-[8px]">Criteria</th>
                    {rubricData[0].descriptors.map(desc => (
                      <th key={desc.level} className="border border-[#9a6328]/70 bg-[#3b1458]/90 px-1.5 py-1 text-left font-serif text-[10px] font-black uppercase text-[#ffe985] max-[700px]:text-[8px]">
                        {desc.level} - {desc.title}
                      </th>
                    ))}
                    <th className="border border-[#9a6328]/70 bg-[#3b1458]/90 px-1.5 py-1 text-center font-serif text-[10px] font-black uppercase text-[#ffe985] max-[700px]:text-[8px]">Avg. Score (Level)</th>
                  </tr>
                </thead>
                <tbody>
                  {rubricData.map((criterion) => {
                    let achievedLevel = -1;
                    let levelTitle = '';

                    if (calculateAverageScores && hasJournalEntries) {
                      const averageRawScore = calculateAverageScores[criterion.id];
                      achievedLevel = getRubricLevelFromAvgRawScore(averageRawScore, assessmentContext);
                      const levelDescriptor = criterion.descriptors.find(d => d.level === achievedLevel);
                      levelTitle = levelDescriptor?.title || 'Level';
                    }

                    return (
                      <tr key={criterion.id} className="transition-colors hover:bg-amber-300/5">
                        <td className="border border-[#9a6328]/60 bg-[#061125]/85 px-1.5 py-1 align-middle text-center">
                          <div className="flex min-h-10 flex-col items-center justify-center gap-0.5">
                            <span className="assessment-v3-criteria-icon flex h-7 w-7 items-center justify-center rounded-md border border-[#d59b3c] bg-[#101b35] text-base shadow-[inset_0_0_0_2px_rgba(0,0,0,0.45)]" aria-hidden="true">
                              {CRITERION_ICONS[criterion.id]}
                            </span>
                            <span className="assessment-v3-criteria-name font-serif text-[10px] font-black uppercase leading-tight text-[#ffd45f] max-[700px]:text-[8px]">{criterion.name}</span>
                          </div>
                        </td>
                        {criterion.descriptors.map(desc => {
                          const isAchieved = achievedLevel === desc.level;
                          return (
                            <td
                              key={desc.level}
                              className={`border border-[#9a6328]/60 px-1.5 py-1 align-top text-[9px] leading-[1.08] max-[700px]:text-[8px] xl:text-[10px] ${isAchieved ? `${levelAccentClasses(desc.level)} ring-2 ring-fuchsia-300/35` : 'bg-[#071226]/65 text-[#f7e5c9]'}`}
                            >
                              {desc.description}
                            </td>
                          );
                        })}
                        <td className="border border-[#9a6328]/60 bg-[#061125]/85 px-1.5 py-1 align-middle">
                          <div className="flex justify-center">
                            <LevelBadge level={achievedLevel} title={levelTitle} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="assessment-v3-feedback-strip mx-12 mb-8 shrink-0 rounded-md border border-[#a66c2b]/80 bg-[#061125]/88 p-1.5 shadow-[inset_0_0_0_1px_rgba(255,236,176,0.08),inset_0_0_34px_rgba(105,46,150,0.12),0_10px_24px_rgba(0,0,0,0.34)] max-[700px]:mx-8 max-[700px]:mb-6 max-[700px]:p-0.5">
            <div className="mb-0.5 text-center max-[700px]:mb-0">
              <div className="flex items-center justify-center gap-2">
                <span className="h-2 w-2 rotate-45 border border-[#ffd978] bg-[#772aa8] shadow-[0_0_8px_rgba(217,70,239,0.5)]" aria-hidden="true" />
                <h2 className="assessment-v3-feedback-title font-serif text-base font-black uppercase text-[#ffd45f] drop-shadow-[0_2px_0_rgba(0,0,0,0.8)] max-[700px]:text-xs">Detailed Wing Feedback</h2>
                <span className="h-2 w-2 rotate-45 border border-[#ffd978] bg-[#772aa8] shadow-[0_0_8px_rgba(217,70,239,0.5)]" aria-hidden="true" />
              </div>
              <p className="assessment-v3-feedback-subtitle text-[10px] text-[#f7e5c9] max-[700px]:hidden">Select a wing to view personalised feedback and next steps.</p>
            </div>

            <div className="grid grid-cols-12 gap-1.5">
              {wingDefinitions.map(wing => {
                const wingEntry = latestEntryByWingId[wing.id];
                const isCompleted = !!wingEntry;
                return (
                  <button
                    key={wing.id}
                    type="button"
                    onClick={() => setSelectedFeedbackWingId(wing.id)}
                    className={artQuestCx(
                      'assessment-v3-wing-button flex min-h-9 min-w-0 items-center justify-center gap-1 rounded-md border bg-[#100d25]/90 px-1 py-0.5 text-center font-serif text-[8px] font-black uppercase leading-tight text-[#ffd45f] shadow-[0_4px_0_rgba(0,0,0,0.36),inset_0_0_0_1px_rgba(255,255,255,0.1)] transition hover:brightness-115 focus:outline-none focus:ring-2 focus:ring-[#ffd978] max-[700px]:min-h-6 max-[700px]:text-[7px]',
                      isCompleted ? 'border-[#f287ff]/80' : 'border-[#9a6328]/75',
                    )}
                  >
                    <span className="text-sm" aria-hidden="true">{wingEntry?.gemIcon || wing.icon || '✦'}</span>
                    <span className="min-w-0">{getWingDisplayLabel(wing)}</span>
                  </button>
                );
              })}
            </div>
          </section>
        </main>
      </div>

      {selectedFeedbackWing && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="assessment-wing-feedback-title"
          onClick={() => setSelectedFeedbackWingId(null)}
        >
          <div
            className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-md border border-[#dba44a]/85 bg-[#071226] p-4 shadow-[0_22px_50px_rgba(0,0,0,0.62),inset_0_0_0_1px_rgba(255,238,190,0.1),inset_0_0_42px_rgba(105,46,150,0.18)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-4">
              <div>
                <p className="font-serif text-xs font-black uppercase text-[#ffd45f]">Assigned marks and next steps</p>
                <h2 id="assessment-wing-feedback-title" className="font-serif text-3xl font-black uppercase text-[#ffe7a0]">
                  {selectedFeedbackWing.icon || selectedFeedbackEntry?.gemIcon || '✦'} {getWingDisplayLabel(selectedFeedbackWing)}
                </h2>
                <p className="mt-1 text-sm text-[#d8c29a]">
                  {selectedFeedbackEntry
                    ? `Completed ${new Date(selectedFeedbackEntry.completedDate).toLocaleDateString()}`
                    : 'Complete this wing to unlock personalised feedback and estimated marks.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFeedbackWingId(null)}
                className="rounded-md border border-[#dba44a]/80 bg-[#100d25] px-3 py-1.5 font-serif text-xl font-black text-[#fff3bf] shadow-[0_4px_0_rgba(0,0,0,0.36)] transition hover:brightness-115 focus:outline-none focus:ring-2 focus:ring-[#ffd978]"
                aria-label="Close wing feedback"
              >
                ×
              </button>
            </div>

            {selectedFeedbackEntry ? (
              <div className="min-h-0 overflow-y-auto pr-1 narrative-scrollbar">
                <div className="grid gap-3">
                  {rubricData.map(criterion => {
                    const rawScore = getRawScoreForEntryCriterion(selectedFeedbackEntry, criterion.id);
                    const level = getRubricLevelFromAvgRawScore(rawScore, assessmentContext);
                    const levelDescriptor = criterion.descriptors.find(d => d.level === level);
                    return (
                      <section key={criterion.id} className="grid gap-3 rounded-md border border-[#9a6328]/65 bg-[#08162e]/88 p-3 md:grid-cols-[minmax(0,1fr)_8rem]">
                        <div>
                          <div className="mb-2 flex items-center gap-2">
                            <span className="flex h-9 w-9 items-center justify-center rounded-md border border-[#d59b3c] bg-[#101b35] text-lg" aria-hidden="true">
                              {CRITERION_ICONS[criterion.id]}
                            </span>
                            <div>
                              <h3 className="font-serif text-lg font-black uppercase text-[#ffd45f]">{criterion.name}</h3>
                              <p className="text-xs font-semibold uppercase text-[#ffe7a0]">
                                Level {level} {levelDescriptor ? `- ${levelDescriptor.title}` : ''}
                                <StarDisplay score={level} />
                              </p>
                            </div>
                          </div>
                          <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#f7e5c9]">
                            {getConstructiveFeedbackForCriterion(criterion, level, assessmentContext)}
                          </p>
                        </div>
                        <div className="flex items-center justify-center">
                          <LevelBadge level={level} title={levelDescriptor?.title || 'Level'} />
                        </div>
                      </section>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="rounded-md border border-[#9a6328]/65 bg-[#08162e]/88 p-6 text-center">
                <p className="font-serif text-2xl font-black uppercase text-[#ffd45f]">No marks assigned yet</p>
                <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-[#f7e5c9]">
                  Finish this wing and save a journal entry to see estimated marks for Art Understanding, Visual Language, Personal Insight, Judgement & Reflection, and Engagement & Effort.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AssessmentScreen;
