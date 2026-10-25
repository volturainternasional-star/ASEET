import { FarmAnimal, FarmTile, InventoryState, VillageQuest } from '../types/game';
import { CROPS, CropType } from './sprites';

export const MAP_COLS = 24;
export const MAP_ROWS = 16;
export const TILE_PIXEL = 48; // 16x16 base pixel art scaled 3x crisp

export const HOUSE_RECT = {
  x: 16, // occupies cols 16..20 (5 tiles wide = 80px at 16px)
  y: 0,  // occupies rows 0..3.5
  w: 5,
  h: 4,
  doorX: 19,
  doorY: 4,
};

export const CHEST_POS = { x: 15, y: 4 };

export function createInitialGrid(): FarmTile[][] {
  const grid: FarmTile[][] = [];

  for (let y = 0; y < MAP_ROWS; y++) {
    const row: FarmTile[] = [];
    for (let x = 0; x < MAP_COLS; x++) {
      row.push({
        x,
        y,
        ground: 'grass',
        flowerDecor: ((x * 17 + y * 31) % 13 === 0) ? ((x + y) % 3) + 1 : 0,
      });
    }
    grid.push(row);
  }

  // 1. Stone stepping road connecting Farmhouse door (19,4) -> Garden -> Pasture -> Pond
  const roadCoords: Array<[number, number]> = [
    [19, 4], [19, 5], [18, 5], [17, 5], [16, 5], [15, 5], [14, 5], [13, 5], [12, 5],
    [12, 6], [12, 7], [12, 8], [12, 9], [12, 10],
    [11, 8], [10, 8], [9, 8], [8, 8], [7, 8], [6, 8], [5, 8],
    [13, 8], [14, 8], [15, 8], [16, 8], [17, 8], [18, 8],
  ];
  for (const [rx, ry] of roadCoords) {
    if (grid[ry]?.[rx]) {
      grid[ry][rx].ground = 'road';
      grid[ry][rx].flowerDecor = 0;
    }
  }

  // 2. Spring Pond at bottom-right-center (x: 14..18, y: 11..14)
  for (let y = 11; y <= 14; y++) {
    for (let x = 14; x <= 18; x++) {
      grid[y][x].ground = 'water';
      grid[y][x].flowerDecor = 0;
    }
  }

  // 3. Starter Crop Plots (x: 7..11, y: 2..6) & (x: 13..14, y: 6..7)
  // Wooden Crop Signs at x=6, y=2..5
  const cropRows: CropType[] = ['strawberry', 'scallion', 'potato', 'turnip'];
  cropRows.forEach((cropType, idx) => {
    const py = 2 + idx;
    grid[py][6].signCrop = cropType;
    grid[py][6].flowerDecor = 0;

    for (let px = 7; px <= 11; px++) {
      grid[py][px].ground = 'tilled';
      grid[py][px].flowerDecor = 0;
      const maxStage = CROPS[cropType].stages - 1;

      if (px === 7) {
        // Ready to harvest right away!
        grid[py][px].crop = {
          type: cropType,
          stage: maxStage,
          daysGrown: CROPS[cropType].daysToGrow,
          watered: true,
          fertilized: idx === 0,
        };
      } else if (px === 8 || px === 9) {
        // Almost grown (needs watering!)
        grid[py][px].crop = {
          type: cropType,
          stage: Math.max(1, maxStage - 1),
          daysGrown: Math.max(1, CROPS[cropType].daysToGrow - 1),
          watered: false,
          fertilized: false,
        };
      } else if (px === 10) {
        // Young sprout
        grid[py][px].crop = {
          type: cropType,
          stage: 1,
          daysGrown: 1,
          watered: false,
          fertilized: false,
        };
      }
      // px === 11 is empty tilled soil ready for planting!
    }
  });

  // 4. Fenced Animal Pasture (x: 2..10, y: 9..14) with gate at (6, 9) and (7, 9)
  for (let x = 2; x <= 10; x++) {
    if (x !== 6 && x !== 7) {
      grid[9][x].fence = x === 2 ? 'tl' : x === 10 ? 'tr' : 'h';
      grid[9][x].flowerDecor = 0;
    }
    grid[14][x].fence = x === 2 ? 'bl' : x === 10 ? 'br' : 'h';
    grid[14][x].flowerDecor = 0;
  }
  for (let y = 10; y <= 13; y++) {
    grid[y][2].fence = 'v';
    grid[y][2].flowerDecor = 0;
    grid[y][10].fence = 'v';
    grid[y][10].flowerDecor = 0;
  }

  // Starter Eggs in the pasture
  grid[11][4].eggCount = 1;
  grid[12][8].eggCount = 1;

  // 5. Maple Tree Groves (Left forest & Right orchard)
  const treePositions: Array<{ x: number; y: number; stage: 0 | 1 | 2 | 3 | 4 }> = [
    { x: 2, y: 2, stage: 3 },
    { x: 4, y: 3, stage: 3 },
    { x: 2, y: 5, stage: 2 },
    { x: 4, y: 6, stage: 4 }, // Stump
    { x: 1, y: 7, stage: 1 }, // Sapling
    { x: 21, y: 6, stage: 3 },
    { x: 22, y: 9, stage: 3 },
    { x: 20, y: 11, stage: 2 },
    { x: 22, y: 13, stage: 3 },
    { x: 12, y: 2, stage: 3 },
  ];

  for (const tp of treePositions) {
    if (grid[tp.y]?.[tp.x]) {
      grid[tp.y][tp.x].tree = {
        stage: tp.stage,
        hp: tp.stage === 3 ? 3 : tp.stage === 2 ? 2 : 1,
        daysInStage: 0,
      };
      grid[tp.y][tp.x].flowerDecor = 0;
    }
  }

  return grid;
}

export function createInitialAnimals(): FarmAnimal[] {
  return [
    {
      id: 'cow_1',
      name: 'Moomoo',
      species: 'cow_female',
      x: 4.2,
      y: 11.2,
      vx: 0,
      vy: 0,
      dir: 'down',
      state: 'idle',
      stateTimer: 2.5,
      animFrame: 0,
      animTimer: 0,
      pettedToday: false,
      productReady: true,
      hearts: 3,
    },
    {
      id: 'cow_2',
      name: 'Barni',
      species: 'cow_male',
      x: 7.5,
      y: 12.4,
      vx: 0,
      vy: 0,
      dir: 'left',
      state: 'idle',
      stateTimer: 3.1,
      animFrame: 0,
      animTimer: 0,
      pettedToday: false,
      productReady: false,
      hearts: 2,
    },
    {
      id: 'chick_red_1',
      name: 'Koko',
      species: 'chicken_red',
      x: 5.5,
      y: 10.6,
      vx: 0,
      vy: 0,
      dir: 'right',
      state: 'idle',
      stateTimer: 1.8,
      animFrame: 0,
      animTimer: 0,
      pettedToday: false,
      productReady: true,
      hearts: 3,
    },
    {
      id: 'chick_blonde_1',
      name: 'Chika',
      species: 'chicken_blonde',
      x: 8.2,
      y: 11.1,
      vx: 0,
      vy: 0,
      dir: 'left',
      state: 'idle',
      stateTimer: 2.2,
      animFrame: 0,
      animTimer: 0,
      pettedToday: false,
      productReady: true,
      hearts: 2,
    },
    {
      id: 'baby_chick_1',
      name: 'Piyo',
      species: 'chick_yellow',
      x: 6.2,
      y: 12.8,
      vx: 0,
      vy: 0,
      dir: 'right',
      state: 'idle',
      stateTimer: 1.4,
      animFrame: 0,
      animTimer: 0,
      pettedToday: false,
      productReady: false,
      hearts: 4,
    },
  ];
}

export function createInitialInventory(): InventoryState {
  return {
    seeds: {
      strawberry: 5,
      scallion: 8,
      potato: 5,
      turnip: 6,
    },
    mapleAcorn: 3,
    crops: {
      strawberry_0: 1,
      scallion_0: 2,
    },
    eggs: 2,
    milk: 1,
    wood: 6,
    mapleSap: 2,
    cozyLatte: 2,
  };
}

export function createInitialQuests(): VillageQuest[] {
  return [
    {
      id: 'q_strawberry',
      title: 'Pesanan Kafe Lembah',
      description: 'Panen 4 Stroberi Musim Semi segar untuk hidangan pencuci mulut kafe.',
      targetItem: 'strawberry',
      targetCount: 4,
      currentCount: 0,
      rewardGold: 220,
      completed: false,
    },
    {
      id: 'q_breakfast',
      title: 'Sarapan Pagi Desa',
      description: 'Kumpulkan 4 Telur Ayam segar dari kandang rumput.',
      targetItem: 'egg',
      targetCount: 4,
      currentCount: 0,
      rewardGold: 160,
      completed: false,
    },
    {
      id: 'q_carpenter',
      title: 'Kayu Maple Tukang Kayu',
      description: 'Tebang pohon maple dan kumpulkan 8 Kayu Maple.',
      targetItem: 'wood',
      targetCount: 8,
      currentCount: 0,
      rewardGold: 190,
      completed: false,
    },
    {
      id: 'q_milk',
      title: 'Susu Segar untuk Latte',
      description: 'Perah 3 botol Susu Sapi dari sapi betina di padang rumput.',
      targetItem: 'milk',
      targetCount: 3,
      currentCount: 0,
      rewardGold: 210,
      completed: false,
    },
  ];
}
