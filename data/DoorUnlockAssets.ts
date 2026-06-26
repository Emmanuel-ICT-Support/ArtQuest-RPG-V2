export interface DoorUnlockAssetSet {
  frames: string[];
  prompt: string;
  frameWidth: number;
  frameHeight: number;
}

const DOOR_SEQUENCE_BASE = './public/assets/door-sequences-normalized';
const DOOR_PROMPT_BASE = './public/assets/door-prompts';

const createDoorAssetSet = (
  sequenceFolder: string,
  frameNames: string[],
  promptName: string,
  frameWidth = 1254,
  frameHeight = 1254,
): DoorUnlockAssetSet => ({
  frames: frameNames.map((frameName) => `${DOOR_SEQUENCE_BASE}/${sequenceFolder}/${frameName}`),
  prompt: `${DOOR_PROMPT_BASE}/${promptName}`,
  frameWidth,
  frameHeight,
});

export const DOOR_UNLOCK_ASSETS: Record<string, DoorUnlockAssetSet> = {
  hall_of_line: createDoorAssetSet(
    'Line sequence',
    [
      'Line closed.png',
      'line opening 1.png',
      'line opening 2.png',
      'line opening 3.png',
      'line opening 4.png',
      'line open.png',
    ],
    'hall-of-line.png',
  ),
  realm_of_colour: createDoorAssetSet(
    'colour sequence',
    [
      'colour closed.png',
      'colour opening 1.png',
      'colour opening 2.png',
      'colour opening 3.png',
      'colour opening 4.png',
      'colour open.png',
    ],
    'realm-of-colour.png',
  ),
  shape_form_forge: createDoorAssetSet(
    'Shape sequence',
    [
      'Shape closed.png',
      'shape opening 1.png',
      'shape opening 2.png',
      'shape opening 3.png',
      'shape opening 4.png',
      'Shape open.png',
    ],
    'shape-form-forge.png',
  ),
  texture_tower: createDoorAssetSet(
    'Texture sequence',
    [
      'texture closed.png',
      'texture opening 1.png',
      'texture opening 2.png',
      'texture opening 3.png',
      'texture opening 4.png',
      'texture open.png',
    ],
    'texture-tower.png',
  ),
  space_chamber: createDoorAssetSet(
    'space sequence',
    [
      'Space closed.png',
      'space opening 1.png',
      'space opening 2.png',
      'space opening 3.png',
      'space opening 4.png',
      'Space open.png',
    ],
    'space-chamber.png',
  ),
  value_vault: createDoorAssetSet(
    'Value sequence',
    [
      'value closed.png',
      'value opening 1.png',
      'value opening 2.png',
      'value opening 3.png',
      'value opening 4.png',
      'value open.png',
    ],
    'value-vault.png',
  ),
  balance_bridge: createDoorAssetSet(
    'Balance sequence',
    [
      'balance closed.png',
      'balance opening 1.png',
      'balance opening 2.png',
      'balance opening 3.png',
      'balance opening 4.png',
      'balance open.png',
    ],
    'balance-bridge.png',
  ),
  emphasis_arena: createDoorAssetSet(
    'Emphasis sequence',
    [
      'emphasis closed.png',
      'emphasis opening 1.png',
      'emphasis opening 2.png',
      'emphasis opening 3.png',
      'emphasis opening 4.png',
      'emphasis open.png',
    ],
    'emphasis-arena.png',
  ),
  unity_garden: createDoorAssetSet(
    'Unity sequence',
    [
      'Unity closed.png',
      'unity opening 1.png',
      'unity opening 2.png',
      'unity opening 3.png',
      'unity opening 4.png',
      'Unity open.png',
    ],
    'unity-garden.png',
  ),
  rhythm_pattern_pavilion: createDoorAssetSet(
    'Pattern Sequence',
    [
      'pattern closed.png',
      'pattern opening 1.png',
      'pattern opening 2.png',
      'pattern opening 3.png',
      'pattern opening 4.png',
      'pattern open.png',
    ],
    'rhythm-pattern-pavilion.png',
  ),
  hall_of_movement: createDoorAssetSet(
    'Movement sequence',
    [
      'movement closed.png',
      'movement opening 1.png',
      'movement opening 2.png',
      'movement opening 3.png',
      'movement opening 4.png',
      'movement open.png',
    ],
    'hall-of-movement.png',
  ),
  final_room: createDoorAssetSet(
    'Final room sequence',
    [
      'final room closed.png',
      'final room opening 1.png',
      'final room opening 2.png',
      'final room opening 3.png',
      'final room opening 4.png',
      'final room open.png',
    ],
    'final-room.png',
  ),
};

export const getDoorUnlockAssets = (wingId: string): DoorUnlockAssetSet => (
  DOOR_UNLOCK_ASSETS[wingId] || DOOR_UNLOCK_ASSETS.hall_of_line
);
