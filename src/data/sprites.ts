export interface SpriteRect {
  sheet: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export const SPRITE_SHEETS = {
  charIdle: '/assets/sprites/char_idle.png',
  charWalk: '/assets/sprites/char_walk.png',
  chickYellow: '/assets/sprites/chick_yellow.png',
  chickenBlonde: '/assets/sprites/chicken_blonde.png',
  chickenRed: '/assets/sprites/chicken_red.png',
  cowFemale: '/assets/sprites/cow_female.png',
  cowMale: '/assets/sprites/cow_male.png',
  chest: '/assets/sprites/chest.png',
  fences: '/assets/sprites/fences.png',
  house: '/assets/sprites/house.png',
  interior: '/assets/sprites/interior.png',
  mapleTree: '/assets/sprites/maple_tree.png',
  road: '/assets/sprites/road.png',
  springCrops: '/assets/sprites/spring_crops.png',
  tilesetGrass: '/assets/sprites/tileset_grass.png',
  uiCozy: '/assets/ui/UiCozyFree.png',
} as const;

export type CropType = 'strawberry' | 'scallion' | 'potato' | 'turnip';

export type StarQuality = 0 | 1 | 2 | 3; // 0: Normal, 1: Silver, 2: Gold, 3: Iridium/Purple

export interface CropDefinition {
  id: CropType;
  name: string;
  indonesianName: string;
  rowY: number; // Y offset in spring_crops.png (16, 48, 80, 112)
  stages: number; // Number of growth columns (6 or 7)
  daysToGrow: number;
  seedPrice: number;
  baseSellPrice: number;
  energyRestore: number;
  regrows: boolean;
  description: string;
}

export const CROPS: Record<CropType, CropDefinition> = {
  strawberry: {
    id: 'strawberry',
    name: 'Strawberry',
    indonesianName: 'Stroberi Musim Semi',
    rowY: 16,
    stages: 6, // cols 0..5
    daysToGrow: 4,
    seedPrice: 35,
    baseSellPrice: 95,
    energyRestore: 28,
    regrows: true,
    description: 'Buah manis favorit lembah. Setelah panen pertama, semak tetap tumbuh & berbuah lagi!',
  },
  scallion: {
    id: 'scallion',
    name: 'Spring Onion',
    indonesianName: 'Daun Bawang Segar',
    rowY: 48,
    stages: 6, // cols 0..5
    daysToGrow: 2,
    seedPrice: 15,
    baseSellPrice: 40,
    energyRestore: 15,
    regrows: false,
    description: 'Tumbuh sangat cepat dalam 2 hari. Cocok untuk modal awal berkebun.',
  },
  potato: {
    id: 'potato',
    name: 'Potato',
    indonesianName: 'Kentang Lembah',
    rowY: 80,
    stages: 7, // cols 0..6
    daysToGrow: 3,
    seedPrice: 25,
    baseSellPrice: 70,
    energyRestore: 24,
    regrows: false,
    description: 'Umbi mengenyangkan dengan peluang panen ganda saat tanah subur.',
  },
  turnip: {
    id: 'turnip',
    name: 'Sweet Onion',
    indonesianName: 'Bawang Emas Manis',
    rowY: 112,
    stages: 6, // cols 0..5
    daysToGrow: 3,
    seedPrice: 20,
    baseSellPrice: 58,
    energyRestore: 20,
    regrows: false,
    description: 'Harum dan renyah, sangat dicari oleh pedagang pasar desa.',
  },
};

// Exact sprite slices from spring_crops.png
export function getCropStageSprite(crop: CropType, stageIndex: number): SpriteRect {
  const def = CROPS[crop];
  const clamped = Math.max(0, Math.min(def.stages - 1, stageIndex));
  return {
    sheet: SPRITE_SHEETS.springCrops,
    x: clamped * 16,
    y: def.rowY,
    w: 16,
    h: 16,
  };
}

export function getSeedBagSprite(crop: CropType): SpriteRect {
  return {
    sheet: SPRITE_SHEETS.springCrops,
    x: 7 * 16,
    y: CROPS[crop].rowY,
    w: 16,
    h: 16,
  };
}

export function getHarvestSprite(crop: CropType, quality: StarQuality = 0): SpriteRect {
  return {
    sheet: SPRITE_SHEETS.springCrops,
    x: (8 + quality) * 16,
    y: CROPS[crop].rowY,
    w: 16,
    h: 16,
  };
}

export function getCropSignSprite(crop: CropType): SpriteRect {
  return {
    sheet: SPRITE_SHEETS.springCrops,
    x: 13 * 16,
    y: CROPS[crop].rowY,
    w: 16,
    h: 16,
  };
}

// Exact slices from UiCozyFree.png, chest.png, maple_tree.png, interior.png, chick_yellow.png
export const UI_SPRITES: Record<string, SpriteRect> = {
  playBtnNormal: { sheet: SPRITE_SHEETS.uiCozy, x: 2, y: 5, w: 90, h: 27 },
  playBtnPressed: { sheet: SPRITE_SHEETS.uiCozy, x: 99, y: 7, w: 90, h: 25 },
  latteCup: { sheet: SPRITE_SHEETS.uiCozy, x: 134, y: 41, w: 36, h: 30 },
  mokaPot: { sheet: SPRITE_SHEETS.uiCozy, x: 196, y: 27, w: 54, h: 66 },
  clipboardLarge: { sheet: SPRITE_SHEETS.uiCozy, x: 8, y: 167, w: 87, h: 81 },
  clipboardMedium: { sheet: SPRITE_SHEETS.uiCozy, x: 102, y: 167, w: 57, h: 81 },
  panelNarrow: { sheet: SPRITE_SHEETS.uiCozy, x: 164, y: 167, w: 47, h: 80 },

  // Cream 16x16 UI icons
  iconPlayCream: { sheet: SPRITE_SHEETS.uiCozy, x: 1, y: 33, w: 14, h: 14 },
  iconPauseCream: { sheet: SPRITE_SHEETS.uiCozy, x: 33, y: 33, w: 14, h: 14 },
  iconPlusCream: { sheet: SPRITE_SHEETS.uiCozy, x: 1, y: 49, w: 14, h: 14 },
  iconCheckCream: { sheet: SPRITE_SHEETS.uiCozy, x: 33, y: 49, w: 14, h: 14 },
  iconCloseCream: { sheet: SPRITE_SHEETS.uiCozy, x: 1, y: 65, w: 14, h: 14 },
  iconMinusCream: { sheet: SPRITE_SHEETS.uiCozy, x: 33, y: 65, w: 14, h: 14 },
  iconHelpCream: { sheet: SPRITE_SHEETS.uiCozy, x: 1, y: 81, w: 14, h: 14 },
  iconShopCream: { sheet: SPRITE_SHEETS.uiCozy, x: 33, y: 81, w: 14, h: 14 },

  // Brown 16x16 UI icons
  iconPlayBrown: { sheet: SPRITE_SHEETS.uiCozy, x: 1, y: 97, w: 14, h: 14 },
  iconPauseBrown: { sheet: SPRITE_SHEETS.uiCozy, x: 33, y: 97, w: 14, h: 14 },
  iconPlusBrown: { sheet: SPRITE_SHEETS.uiCozy, x: 1, y: 113, w: 14, h: 14 },
  iconCheckBrown: { sheet: SPRITE_SHEETS.uiCozy, x: 33, y: 113, w: 14, h: 14 },
  iconCloseBrown: { sheet: SPRITE_SHEETS.uiCozy, x: 1, y: 129, w: 14, h: 14 },
  iconMinusBrown: { sheet: SPRITE_SHEETS.uiCozy, x: 33, y: 129, w: 14, h: 14 },
  iconHelpBrown: { sheet: SPRITE_SHEETS.uiCozy, x: 1, y: 145, w: 14, h: 14 },
  iconShopBrown: { sheet: SPRITE_SHEETS.uiCozy, x: 33, y: 145, w: 14, h: 14 },

  // World & item icons
  chestClosed: { sheet: SPRITE_SHEETS.chest, x: 8, y: 3, w: 15, h: 13 },
  chestOpen: { sheet: SPRITE_SHEETS.chest, x: 8, y: 18, w: 15, h: 14 },
  eggWhite: { sheet: SPRITE_SHEETS.chickYellow, x: 0, y: 32, w: 16, h: 16 },
  chickIcon: { sheet: SPRITE_SHEETS.chickYellow, x: 0, y: 0, w: 16, h: 16 },
  chickenRedIcon: { sheet: SPRITE_SHEETS.chickenRed, x: 0, y: 0, w: 16, h: 16 },
  chickenBlondeIcon: { sheet: SPRITE_SHEETS.chickenBlonde, x: 0, y: 0, w: 16, h: 16 },
  cowFemaleIcon: { sheet: SPRITE_SHEETS.cowFemale, x: 0, y: 0, w: 32, h: 32 },
  cowMaleIcon: { sheet: SPRITE_SHEETS.cowMale, x: 0, y: 0, w: 32, h: 32 },
  mapleAcorn: { sheet: SPRITE_SHEETS.mapleTree, x: 0, y: 32, w: 32, h: 16 },
  mapleSapling: { sheet: SPRITE_SHEETS.mapleTree, x: 32, y: 32, w: 32, h: 16 },
  mapleTreeFull: { sheet: SPRITE_SHEETS.mapleTree, x: 96, y: 0, w: 32, h: 48 },
  mapleStump: { sheet: SPRITE_SHEETS.mapleTree, x: 128, y: 32, w: 32, h: 16 },
  houseFull: { sheet: SPRITE_SHEETS.house, x: 144, y: 0, w: 80, h: 112 },
  flowerPot: { sheet: SPRITE_SHEETS.interior, x: 4, y: 1, w: 8, h: 15 },
  bedIcon: { sheet: SPRITE_SHEETS.interior, x: 87, y: 8, w: 18, h: 34 },
  fireplaceIcon: { sheet: SPRITE_SHEETS.interior, x: 115, y: 8, w: 26, h: 40 },
};
