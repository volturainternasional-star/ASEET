import { CropType, StarQuality } from '../data/sprites';

export type GameState = 'TITLE_MENU' | 'PLAYING' | 'PAUSED' | 'ROUND_SUMMARY' | 'GAME_OVER';

export type WorldZone = 'OUTDOOR' | 'INTERIOR';

export type Direction = 'down' | 'up' | 'left' | 'right';

export type ToolType =
  | 'hoe'
  | 'water'
  | 'axe'
  | 'hand'
  | 'seed_strawberry'
  | 'seed_scallion'
  | 'seed_potato'
  | 'seed_turnip'
  | 'seed_maple';

export type TileGround = 'grass' | 'dirt' | 'tilled' | 'water' | 'road' | 'wood_floor';

export interface CropState {
  type: CropType;
  stage: number; // 0 to stages-1
  daysGrown: number;
  watered: boolean;
  fertilized: boolean;
}

export interface TreeState {
  stage: 0 | 1 | 2 | 3 | 4; // 0: acorn, 1: sapling, 2: medium, 3: full tree, 4: stump
  hp: number;
  daysInStage: number;
}

export interface FarmTile {
  x: number;
  y: number;
  ground: TileGround;
  crop?: CropState;
  tree?: TreeState;
  fence?: 'tl' | 'tr' | 'bl' | 'br' | 'h' | 'v' | 'post';
  signCrop?: CropType;
  eggCount?: number;
  flowerDecor?: number;
}

export type AnimalSpecies = 'cow_female' | 'cow_male' | 'chicken_red' | 'chicken_blonde' | 'chick_yellow';

export interface FarmAnimal {
  id: string;
  name: string;
  species: AnimalSpecies;
  x: number; // In tile coordinates (float)
  y: number;
  vx: number;
  vy: number;
  dir: Direction;
  state: 'idle' | 'walk';
  stateTimer: number;
  animFrame: number;
  animTimer: number;
  pettedToday: boolean;
  productReady: boolean; // Milk for cow_female, Egg for chickens
  hearts: number; // 0..5
}

export interface FloatingText {
  id: string;
  x: number; // Tile X
  y: number; // Tile Y
  text: string;
  color: string;
  life: number; // 0..1
}

export interface HarvestItemKey {
  crop: CropType;
  quality: StarQuality;
}

export interface InventoryState {
  seeds: Record<CropType, number>;
  mapleAcorn: number;
  crops: Record<string, number>; // key: `${crop}_${quality}`
  eggs: number;
  milk: number;
  wood: number;
  mapleSap: number;
  cozyLatte: number;
}

export interface VillageQuest {
  id: string;
  title: string;
  description: string;
  targetItem: 'strawberry' | 'scallion' | 'potato' | 'turnip' | 'egg' | 'milk' | 'wood';
  targetCount: number;
  currentCount: number;
  rewardGold: number;
  completed: boolean;
}

export interface DaySummaryData {
  dayCompleted: number;
  cropsSoldCount: number;
  cropsRevenue: number;
  ranchRevenue: number;
  forageRevenue: number;
  questBonus: number;
  totalEarned: number;
}
