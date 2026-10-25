import React, { useCallback, useEffect, useState } from 'react';
import { Shovel, Droplets, Axe, Hand, Volume2, VolumeX, Music, Sparkles } from 'lucide-react';
import {
  CROPS,
  CropType,
  getHarvestSprite,
  getSeedBagSprite,
  StarQuality,
  UI_SPRITES,
} from './data/sprites';
import {
  createInitialAnimals,
  createInitialGrid,
  createInitialInventory,
  createInitialQuests,
} from './data/initialWorld';
import {
  AnimalSpecies,
  DaySummaryData,
  FarmAnimal,
  FarmTile,
  FloatingText,
  GameState,
  InventoryState,
  ToolType,
  VillageQuest,
  WorldZone,
} from './types/game';
import { FarmCanvas } from './components/FarmCanvas';
import { MarketModal } from './components/MarketModal';
import { SpriteIcon } from './components/SpriteIcon';
import { TitleScreenModal } from './components/TitleScreenModal';
import { sound } from './utils/sound';

export function App() {
  const [gameState, setGameState] = useState<GameState>('TITLE_MENU');
  const [zone, setZone] = useState<WorldZone>('OUTDOOR');
  const [day, setDay] = useState<number>(1);
  const [timeOfDay, setTimeOfDay] = useState<number>(8.0); // 08:00 AM
  const [gold, setGold] = useState<number>(250);
  const [energy, setEnergy] = useState<number>(100);
  const maxEnergy = 100;
  const [waterLevel, setWaterLevel] = useState<number>(20);
  const maxWater = 20;

  const [selectedTool, setSelectedTool] = useState<ToolType>('hand');
  const [grid, setGrid] = useState<FarmTile[][]>(() => createInitialGrid());
  const [animals, setAnimals] = useState<FarmAnimal[]>(() => createInitialAnimals());
  const [inventory, setInventory] = useState<InventoryState>(() => createInitialInventory());
  const [quests, setQuests] = useState<VillageQuest[]>(() => createInitialQuests());
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);

  const [isMarketOpen, setIsMarketOpen] = useState<boolean>(false);
  const [daySummary, setDaySummary] = useState<DaySummaryData | null>(null);
  const [dayEarningsTracker, setDayEarningsTracker] = useState({
    cropsSoldCount: 0,
    cropsRevenue: 0,
    ranchRevenue: 0,
    forageRevenue: 0,
    questBonus: 0,
  });

  const [sfxOn, setSfxOn] = useState<boolean>(true);
  const [bgmOn, setBgmOn] = useState<boolean>(false);

  const addFloatingText = useCallback((x: number, y: number, text: string, color = '#fef08a') => {
    const id = `${Date.now()}_${Math.random()}`;
    setFloatingTexts((prev) => [...prev, { id, x, y, text, color, life: 1 }]);
  }, []);

  // Decay floating texts smoothly
  useEffect(() => {
    if (floatingTexts.length === 0) return;
    const interval = setInterval(() => {
      setFloatingTexts((prev) =>
        prev
          .map((ft) => ({ ...ft, life: ft.life - 0.08 }))
          .filter((ft) => ft.life > 0)
      );
    }, 50);
    return () => clearInterval(interval);
  }, [floatingTexts.length]);

  // Gentle Daytime Clock Progression while playing
  useEffect(() => {
    if (gameState !== 'PLAYING' || isMarketOpen) return;
    const timer = setInterval(() => {
      setTimeOfDay((prev) => {
        if (prev >= 22.0) return 22.0; // Pause at 22:00 Cozy Night until player sleeps
        return Number((prev + 0.05).toFixed(2));
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [gameState, isMarketOpen]);

  // Number keys 1..9 hotbar selection
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      const toolMap: Record<string, ToolType> = {
        '1': 'hoe',
        '2': 'water',
        '3': 'axe',
        '4': 'hand',
        '5': 'seed_strawberry',
        '6': 'seed_scallion',
        '7': 'seed_potato',
        '8': 'seed_turnip',
        '9': 'seed_maple',
      };
      if (toolMap[e.key]) {
        setSelectedTool(toolMap[e.key]);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const incrementQuestProgress = useCallback(
    (targetItem: VillageQuest['targetItem'], amount: number) => {
      setQuests((prev) =>
        prev.map((q) => {
          if (q.targetItem !== targetItem || q.completed) return q;
          const nextCount = Math.min(q.targetCount, q.currentCount + amount);
          return { ...q, currentCount: nextCount };
        })
      );
    },
    []
  );

  // Interact with a farm tile at (tx, ty)
  const handleTileInteract = useCallback(
    (tx: number, ty: number) => {
      const tile = grid[ty]?.[tx];
      if (!tile) return;

      // 1. Always allow picking up fresh Chicken Eggs on the ground!
      if (tile.eggCount && tile.eggCount > 0) {
        const count = tile.eggCount;
        setGrid((prev) => {
          const next = prev.map((r) => [...r]);
          next[ty][tx] = { ...next[ty][tx], eggCount: 0 };
          return next;
        });
        setInventory((prev) => ({ ...prev, eggs: prev.eggs + count }));
        incrementQuestProgress('egg', count);
        sound.playHarvest();
        addFloatingText(tx, ty, `+${count} Telur Ayam 🥚`, '#fef08a');
        return;
      }

      // 2. Always allow harvesting a fully ripe crop regardless of active tool (or with hand/hoe/water)!
      if (tile.crop) {
        const def = CROPS[tile.crop.type];
        const maxStage = def.stages - 1;
        if (tile.crop.stage >= maxStage) {
          const cropType = tile.crop.type;
          // Determine star quality (0: Normal, 1: Silver, 2: Gold, 3: Purple)
          const roll = Math.random();
          const quality: StarQuality =
            roll > 0.88 ? 3 : roll > 0.65 ? 2 : roll > 0.35 ? 1 : 0;
          const starLabel =
            quality === 3 ? '★Ungu' : quality === 2 ? '★Emas' : quality === 1 ? '★Perak' : '';

          // Potato can yield bonus double harvest!
          const harvestQty = cropType === 'potato' && Math.random() > 0.5 ? 2 : 1;
          const invKey = `${cropType}_${quality}`;

          setInventory((prev) => ({
            ...prev,
            crops: {
              ...prev.crops,
              [invKey]: (prev.crops[invKey] || 0) + harvestQty,
            },
          }));

          incrementQuestProgress(cropType, harvestQty);

          setGrid((prev) => {
            const next = prev.map((r) => [...r]);
            if (def.regrows) {
              // Strawberry bushes regrow from stage 3!
              next[ty][tx] = {
                ...next[ty][tx],
                crop: {
                  type: cropType,
                  stage: 3,
                  daysGrown: 2,
                  watered: false,
                  fertilized: true,
                },
              };
            } else {
              next[ty][tx] = {
                ...next[ty][tx],
                crop: undefined,
              };
            }
            return next;
          });

          sound.playHarvest();
          addFloatingText(
            tx,
            ty,
            `+${harvestQty} ${def.indonesianName} ${starLabel}`,
            quality >= 2 ? '#fde047' : '#86efac'
          );
          return;
        }
      }

      // 3. Refill Watering Can when clicking pond water
      if (tile.ground === 'water') {
        setWaterLevel(maxWater);
        sound.playWater();
        addFloatingText(tx, ty, 'Penyiram Penuh! 💧', '#7dd3fc');
        return;
      }

      // 4. Tool-Specific Actions
      if (selectedTool === 'hoe') {
        if (energy < 2) {
          addFloatingText(tx, ty, 'Energi Habis! Minum Latte / Tidur', '#fca5a5');
          return;
        }
        if (tile.ground === 'grass' && !tile.tree && !tile.fence && !tile.signCrop) {
          setGrid((prev) => {
            const next = prev.map((r) => [...r]);
            next[ty][tx] = { ...next[ty][tx], ground: 'tilled', flowerDecor: 0 };
            return next;
          });
          setEnergy((e) => Math.max(0, e - 2));
          sound.playHoe();
          addFloatingText(tx, ty, 'Tanah Dicangkul', '#d6d3d1');
        } else {
          addFloatingText(tx, ty, 'Tidak bisa dicangkul', '#fca5a5');
        }
        return;
      }

      if (selectedTool === 'water') {
        if (waterLevel <= 0) {
          addFloatingText(tx, ty, 'Air Habis! Klik Kolam Air 💧', '#7dd3fc');
          return;
        }
        if (tile.ground === 'tilled' || tile.crop) {
          setGrid((prev) => {
            const next = prev.map((r) => [...r]);
            const current = next[ty][tx];
            next[ty][tx] = {
              ...current,
              ground: 'tilled',
              crop: current.crop ? { ...current.crop, watered: true } : undefined,
            };
            return next;
          });
          setWaterLevel((w) => Math.max(0, w - 1));
          setEnergy((e) => Math.max(0, e - 1));
          sound.playWater();
          addFloatingText(tx, ty, 'Disiram 💧', '#7dd3fc');
        } else {
          addFloatingText(tx, ty, 'Cangkul tanah dulu!', '#fcd34d');
        }
        return;
      }

      if (selectedTool === 'axe') {
        if (tile.tree) {
          if (energy < 3) {
            addFloatingText(tx, ty, 'Energi Habis! Minum Latte / Tidur', '#fca5a5');
            return;
          }
          setEnergy((e) => Math.max(0, e - 3));
          sound.playChop();

          if (tile.tree.stage === 3 || tile.tree.stage === 2) {
            const nextHp = tile.tree.hp - 1;
            if (nextHp <= 0) {
              const woodGain = tile.tree.stage === 3 ? 3 : 2;
              const sapGain = tile.tree.stage === 3 ? 1 : 0;
              setInventory((prev) => ({
                ...prev,
                wood: prev.wood + woodGain,
                mapleSap: prev.mapleSap + sapGain,
              }));
              incrementQuestProgress('wood', woodGain);
              setGrid((prev) => {
                const next = prev.map((r) => [...r]);
                next[ty][tx] = {
                  ...next[ty][tx],
                  tree: { stage: 4, hp: 1, daysInStage: 0 }, // Turns into Stump!
                };
                return next;
              });
              addFloatingText(
                tx,
                ty,
                `+${woodGain} Kayu Maple${sapGain ? ' +1 Sirup' : ''}`,
                '#fdba74'
              );
            } else {
              setGrid((prev) => {
                const next = prev.map((r) => [...r]);
                next[ty][tx] = {
                  ...next[ty][tx],
                  tree: { ...tile.tree!, hp: nextHp },
                };
                return next;
              });
              addFloatingText(tx, ty, 'Chop! 🪓', '#fed7aa');
            }
          } else {
            // Clear stump or sapling
            setInventory((prev) => ({ ...prev, wood: prev.wood + 1 }));
            incrementQuestProgress('wood', 1);
            setGrid((prev) => {
              const next = prev.map((r) => [...r]);
              next[ty][tx] = { ...next[ty][tx], tree: undefined };
              return next;
            });
            addFloatingText(tx, ty, '+1 Kayu Maple', '#fdba74');
          }
        } else {
          addFloatingText(tx, ty, 'Arahkan Kapak ke Pohon Maple', '#fcd34d');
        }
        return;
      }

      // 5. Planting Crop Seeds
      if (selectedTool.startsWith('seed_') && selectedTool !== 'seed_maple') {
        const cropKey = selectedTool.replace('seed_', '') as CropType;
        const seedCount = inventory.seeds[cropKey] || 0;
        if (seedCount <= 0) {
          addFloatingText(tx, ty, 'Bibit Habis! Beli di Pasar Desa', '#fca5a5');
          return;
        }
        if (tile.crop || tile.tree || tile.fence || tile.signCrop || tile.ground === 'water' || tile.ground === 'road') {
          addFloatingText(tx, ty, 'Petak sudah terisi!', '#fca5a5');
          return;
        }

        // Auto-till grass if planting directly for extra smooth UX!
        setGrid((prev) => {
          const next = prev.map((r) => [...r]);
          next[ty][tx] = {
            ...next[ty][tx],
            ground: 'tilled',
            flowerDecor: 0,
            crop: {
              type: cropKey,
              stage: 0,
              daysGrown: 0,
              watered: false,
              fertilized: false,
            },
          };
          return next;
        });

        setInventory((prev) => ({
          ...prev,
          seeds: {
            ...prev.seeds,
            [cropKey]: Math.max(0, prev.seeds[cropKey] - 1),
          },
        }));
        sound.playPlant();
        addFloatingText(tx, ty, `Tanam ${CROPS[cropKey].indonesianName}`, '#a7f3d0');
        return;
      }

      // 6. Planting Maple Tree Acorn
      if (selectedTool === 'seed_maple') {
        if (inventory.mapleAcorn <= 0) {
          addFloatingText(tx, ty, 'Biji Maple Habis!', '#fca5a5');
          return;
        }
        if (tile.ground === 'grass' && !tile.crop && !tile.tree && !tile.fence && !tile.signCrop) {
          setGrid((prev) => {
            const next = prev.map((r) => [...r]);
            next[ty][tx] = {
              ...next[ty][tx],
              flowerDecor: 0,
              tree: { stage: 0, hp: 1, daysInStage: 0 },
            };
            return next;
          });
          setInventory((prev) => ({ ...prev, mapleAcorn: prev.mapleAcorn - 1 }));
          sound.playPlant();
          addFloatingText(tx, ty, 'Tanam Biji Pohon Maple 🌰', '#a7f3d0');
        } else {
          addFloatingText(tx, ty, 'Tanam di rumput kosong!', '#fca5a5');
        }
        return;
      }

      // 7. Smart Hand Interaction fallback
      if (selectedTool === 'hand') {
        if (tile.crop && !tile.crop.watered && waterLevel > 0) {
          // Conveniently water if holding hand tool on unwatered crop
          setGrid((prev) => {
            const next = prev.map((r) => [...r]);
            next[ty][tx] = {
              ...next[ty][tx],
              crop: { ...next[ty][tx].crop!, watered: true },
            };
            return next;
          });
          setWaterLevel((w) => Math.max(0, w - 1));
          sound.playWater();
          addFloatingText(tx, ty, 'Disiram 💧', '#7dd3fc');
        } else if (tile.ground === 'grass' && !tile.tree && !tile.fence && !tile.signCrop) {
          addFloatingText(tx, ty, 'Pilih Cangkul [1] atau Bibit [5-8]', '#fde68a');
        }
      }
    },
    [grid, selectedTool, energy, waterLevel, inventory, addFloatingText, incrementQuestProgress]
  );

  // Interact with a wandering farm animal
  const handleAnimalInteract = useCallback(
    (animalId: string) => {
      const target = animals.find((a) => a.id === animalId);
      if (!target) return;

      const isCow = target.species.startsWith('cow');
      sound.playAnimalHappy(isCow);

      if (target.species === 'cow_female' && target.productReady) {
        setInventory((prev) => ({ ...prev, milk: prev.milk + 1 }));
        incrementQuestProgress('milk', 1);
        setAnimals((prev) =>
          prev.map((a) =>
            a.id === animalId
              ? { ...a, productReady: false, pettedToday: true, hearts: Math.min(5, a.hearts + 1) }
              : a
          )
        );
        addFloatingText(target.x, target.y - 0.5, `+1 Susu Sapi Segar 🥛 ♥`, '#fef08a');
        return;
      }

      setAnimals((prev) =>
        prev.map((a) =>
          a.id === animalId
            ? { ...a, pettedToday: true, hearts: Math.min(5, a.hearts + 1) }
            : a
        )
      );
      addFloatingText(
        target.x,
        target.y - 0.5,
        `${target.name} Senang! ♥ (${Math.min(5, target.hearts + 1)}/5)`,
        '#f472b6'
      );
    },
    [animals, addFloatingText, incrementQuestProgress]
  );

  // Drink Cozy Latte from Hotbar or Farmhouse Table
  const handleDrinkLatte = useCallback(
    (freeFromTable = false) => {
      if (!freeFromTable && inventory.cozyLatte <= 0) return;
      if (!freeFromTable) {
        setInventory((prev) => ({ ...prev, cozyLatte: prev.cozyLatte - 1 }));
      }
      setEnergy((prev) => Math.min(maxEnergy, prev + 45));
      sound.playCoffeeSip();
      addFloatingText(12, 7, 'Cozy Latte Hangat! +45 Energi ☕', '#fde047');
    },
    [inventory.cozyLatte, addFloatingText]
  );

  // Advance to Next Day (Sleep in Bed or Top Bar Button)
  const handleSleepNextDay = useCallback(() => {
    sound.playSleep();

    // Grow watered crops & advance maple trees
    setGrid((prev) =>
      prev.map((row) =>
        row.map((tile) => {
          const nextTile = { ...tile };

          if (nextTile.crop) {
            const def = CROPS[nextTile.crop.type];
            const maxStage = def.stages - 1;
            if (nextTile.crop.watered && nextTile.crop.stage < maxStage) {
              const newDays = nextTile.crop.daysGrown + 1;
              const stageRatio = Math.min(1, newDays / def.daysToGrow);
              const nextStage = Math.min(
                maxStage,
                Math.max(nextTile.crop.stage + 1, Math.floor(stageRatio * maxStage))
              );
              nextTile.crop = {
                ...nextTile.crop,
                daysGrown: newDays,
                stage: nextStage,
                watered: false, // Reset watered status for the new morning
              };
            } else {
              nextTile.crop = {
                ...nextTile.crop,
                watered: false,
              };
            }
          }

          // Advance Maple Trees & regrow stumps!
          if (nextTile.tree) {
            if (nextTile.tree.stage < 3) {
              const nextStage = (nextTile.tree.stage + 1) as 0 | 1 | 2 | 3;
              nextTile.tree = {
                stage: nextStage,
                hp: nextStage === 3 ? 3 : 2,
                daysInStage: 0,
              };
            } else if (nextTile.tree.stage === 4) {
              // Stump regrows into a medium tree
              nextTile.tree = {
                stage: 2,
                hp: 2,
                daysInStage: 0,
              };
            }
          }

          return nextTile;
        })
      )
    );

    // Spawn fresh morning eggs in the pasture (x: 3..9, y: 10..13)
    setGrid((prev) => {
      const next = prev.map((r) => [...r]);
      const chickenCount = animals.filter((a) => a.species.startsWith('chicken')).length;
      let laid = 0;
      for (let attempt = 0; attempt < 12 && laid < chickenCount; attempt++) {
        const rx = 3 + Math.floor(Math.random() * 6);
        const ry = 10 + Math.floor(Math.random() * 4);
        if (!next[ry][rx].fence && !next[ry][rx].eggCount) {
          next[ry][rx] = { ...next[ry][rx], eggCount: 1 };
          laid++;
        }
      }
      return next;
    });

    // Reset animals' daily milk & petted flags
    setAnimals((prev) =>
      prev.map((a) => ({
        ...a,
        pettedToday: false,
        productReady: a.species === 'cow_female' || a.species.startsWith('chicken'),
      }))
    );

    const totalEarned =
      dayEarningsTracker.cropsRevenue +
      dayEarningsTracker.ranchRevenue +
      dayEarningsTracker.forageRevenue +
      dayEarningsTracker.questBonus;

    setDaySummary({
      dayCompleted: day,
      ...dayEarningsTracker,
      totalEarned,
    });
    setGameState('ROUND_SUMMARY');
  }, [animals, day, dayEarningsTracker]);

  const handleConfirmNextDay = () => {
    setDay((d) => d + 1);
    setTimeOfDay(7.5); // 07:30 AM Fresh Morning
    setEnergy(maxEnergy);
    setWaterLevel(maxWater);
    setDayEarningsTracker({
      cropsSoldCount: 0,
      cropsRevenue: 0,
      ranchRevenue: 0,
      forageRevenue: 0,
      questBonus: 0,
    });
    setDaySummary(null);
    setGameState('PLAYING');
  };

  // Market & Shop Handlers
  const handleBuySeed = (crop: CropType, count: number) => {
    const cost = CROPS[crop].seedPrice * count;
    if (gold < cost) return;
    setGold((g) => g - cost);
    setInventory((prev) => ({
      ...prev,
      seeds: {
        ...prev.seeds,
        [crop]: (prev.seeds[crop] || 0) + count,
      },
    }));
    sound.playCoin();
  };

  const handleBuyMapleAcorn = (count: number) => {
    const cost = 30 * count;
    if (gold < cost) return;
    setGold((g) => g - cost);
    setInventory((prev) => ({ ...prev, mapleAcorn: prev.mapleAcorn + count }));
    sound.playCoin();
  };

  const handleBuyLatte = () => {
    if (gold < 40) return;
    setGold((g) => g - 40);
    setInventory((prev) => ({ ...prev, cozyLatte: prev.cozyLatte + 1 }));
    sound.playCoffeeSip();
  };

  const handleBuyAnimal = (species: AnimalSpecies, price: number, label: string) => {
    if (gold < price) return;
    setGold((g) => g - price);
    const newAnimal: FarmAnimal = {
      id: `${species}_${Date.now()}`,
      name: `${label} #${animals.length + 1}`,
      species,
      x: 4.5 + Math.random() * 3.5,
      y: 10.8 + Math.random() * 2.2,
      vx: 0,
      vy: 0,
      dir: 'down',
      state: 'idle',
      stateTimer: 1.5,
      animFrame: 0,
      animTimer: 0,
      pettedToday: false,
      productReady: species === 'cow_female',
      hearts: 2,
    };
    setAnimals((prev) => [...prev, newAnimal]);
    sound.playAnimalHappy(species.startsWith('cow'));
  };

  const handleSellCrop = (cropKey: string, unitPrice: number, count: number) => {
    const current = inventory.crops[cropKey] || 0;
    const toSell = Math.min(current, count);
    if (toSell <= 0) return;
    const revenue = toSell * unitPrice;

    setGold((g) => g + revenue);
    setInventory((prev) => ({
      ...prev,
      crops: {
        ...prev.crops,
        [cropKey]: current - toSell,
      },
    }));
    setDayEarningsTracker((prev) => ({
      ...prev,
      cropsSoldCount: prev.cropsSoldCount + toSell,
      cropsRevenue: prev.cropsRevenue + revenue,
    }));
    sound.playCoin();
  };

  const handleSellResource = (
    type: 'eggs' | 'milk' | 'wood' | 'mapleSap',
    unitPrice: number,
    count: number
  ) => {
    const current = inventory[type];
    const toSell = Math.min(current, count);
    if (toSell <= 0) return;
    const revenue = toSell * unitPrice;

    setGold((g) => g + revenue);
    setInventory((prev) => ({
      ...prev,
      [type]: current - toSell,
    }));
    setDayEarningsTracker((prev) => ({
      ...prev,
      ranchRevenue:
        type === 'eggs' || type === 'milk' ? prev.ranchRevenue + revenue : prev.ranchRevenue,
      forageRevenue:
        type === 'wood' || type === 'mapleSap' ? prev.forageRevenue + revenue : prev.forageRevenue,
    }));
    sound.playCoin();
  };

  const handleSellAllHarvest = () => {
    const qualityMults: Record<number, number> = { 0: 1, 1: 1.25, 2: 1.5, 3: 2.0 };
    let cropRev = 0;
    let cropCnt = 0;
    const nextCrops = { ...inventory.crops };

    Object.entries(nextCrops).forEach(([key, cnt]) => {
      if (cnt > 0) {
        const [cropId, qStr] = key.split('_') as [CropType, string];
        const q = Number(qStr) || 0;
        const unit = Math.round(CROPS[cropId].baseSellPrice * (qualityMults[q] || 1));
        cropRev += cnt * unit;
        cropCnt += cnt;
        nextCrops[key] = 0;
      }
    });

    const ranchRev = inventory.eggs * 35 + inventory.milk * 65;
    const forageRev = inventory.mapleSap * 45;
    const total = cropRev + ranchRev + forageRev;
    if (total <= 0) return;

    setGold((g) => g + total);
    setInventory((prev) => ({
      ...prev,
      crops: nextCrops,
      eggs: 0,
      milk: 0,
      mapleSap: 0,
    }));
    setDayEarningsTracker((prev) => ({
      ...prev,
      cropsSoldCount: prev.cropsSoldCount + cropCnt,
      cropsRevenue: prev.cropsRevenue + cropRev,
      ranchRevenue: prev.ranchRevenue + ranchRev,
      forageRevenue: prev.forageRevenue + forageRev,
    }));
    sound.playCoin();
  };

  const handleClaimQuest = (questId: string) => {
    const q = quests.find((item) => item.id === questId);
    if (!q || q.completed || q.currentCount < q.targetCount) return;
    setGold((g) => g + q.rewardGold);
    setQuests((prev) =>
      prev.map((item) => (item.id === questId ? { ...item, completed: true } : item))
    );
    setDayEarningsTracker((prev) => ({
      ...prev,
      questBonus: prev.questBonus + q.rewardGold,
    }));
    sound.playCoin();
    addFloatingText(12, 5, `Target Desa Selesai! +${q.rewardGold} G 🎉`, '#fde047');
  };

  // Format in-game clock (e.g., 8.5 -> 08:30)
  const formatClock = (t: number) => {
    const hrs = Math.floor(t);
    const mins = Math.floor((t - hrs) * 60);
    const roundedMins = Math.floor(mins / 10) * 10;
    return `${String(hrs).padStart(2, '0')}:${String(roundedMins).padStart(2, '0')}`;
  };

  // Total harvested crops in bag
  const totalHarvestedCrops = Object.values(inventory.crops).reduce((a, b) => a + b, 0);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#231915] text-[#3d251a] overflow-hidden select-none">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="flex items-center justify-between gap-8 px-6 py-3 bg-[#4a2e21] border-b-2 border-[#6b4433] text-[#fdf6e9] shrink-0">
        {/* Zone 1: Single-line Brand Wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setZone('OUTDOOR');
          }}
          className="text-lg font-bold tracking-tight text-[#fef3c7] font-display whitespace-nowrap shrink-0"
        >
          Cozy Pixel Valley
        </a>

        {/* Zone 2: 4–5 Single-Line Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-[#e6ccb2]">
          <button
            onClick={() => {
              sound.playDoor();
              setZone('OUTDOOR');
            }}
            className={`hover:text-white hover:underline underline-offset-4 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              zone === 'OUTDOOR' ? 'text-[#fef08a] underline' : ''
            }`}
          >
            Kebun Lembah
          </button>
          <button
            onClick={() => {
              sound.playDoor();
              setZone('INTERIOR');
            }}
            className={`hover:text-white hover:underline underline-offset-4 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              zone === 'INTERIOR' ? 'text-[#fef08a] underline' : ''
            }`}
          >
            Dalam Rumah
          </button>
          <button
            onClick={() => setIsMarketOpen(true)}
            className="hover:text-white hover:underline underline-offset-4 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Pasar & Bibit
          </button>
          <button
            onClick={() => {
              const next = sound.toggleBgm();
              setBgmOn(next);
            }}
            className="hover:text-white hover:underline underline-offset-4 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            {bgmOn ? 'Musik: Aktif' : 'Musik: Mati'}
          </button>
          <button
            onClick={() => setGameState('TITLE_MENU')}
            className="hover:text-white hover:underline underline-offset-4 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Panduan Bermain
          </button>
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="flex items-center shrink-0">
          <button
            onClick={handleSleepNextDay}
            className="px-4 py-2 text-xs font-bold text-[#3d251a] bg-[#fbbf24] hover:bg-[#f59e0b] rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 shadow-sm"
          >
            Tidur (Hari Esok)
          </button>
        </div>
      </header>

      {/* Main Workspace: Game Viewport (Left/Center) + Cozy Clipboard Sidebar (Right) */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* Left/Center: Interactive Canvas + Bottom Hotbar */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-[#1c130e] p-3 gap-3">
          {/* Canvas Container */}
          <div className="flex-1 min-h-0 relative">
            <FarmCanvas
              zone={zone}
              grid={grid}
              animals={animals}
              selectedTool={selectedTool}
              waterLevel={waterLevel}
              maxWater={maxWater}
              timeOfDay={timeOfDay}
              floatingTexts={floatingTexts}
              onTileInteract={handleTileInteract}
              onAnimalInteract={handleAnimalInteract}
              onEnterHouse={() => {
                sound.playDoor();
                setZone('INTERIOR');
              }}
              onExitHouse={() => {
                sound.playDoor();
                setZone('OUTDOOR');
              }}
              onSleepInBed={handleSleepNextDay}
              onOpenMarket={() => setIsMarketOpen(true)}
              onDrinkHouseCoffee={() => handleDrinkLatte(true)}
            />
          </div>

          {/* Bottom 9-Slot Pixel Tool & Seed Hotbar + Quick Cozy Latte Button */}
          <div className="flex items-center justify-between gap-2 px-3 py-2 bg-[#4a2e21] border-2 border-[#6b4433] rounded-xl overflow-x-auto shrink-0">
            <div className="flex items-center gap-1.5">
              {/* 1: Hoe */}
              <HotbarButton
                shortcut="1"
                label="Cangkul"
                active={selectedTool === 'hoe'}
                onClick={() => setSelectedTool('hoe')}
              >
                <Shovel className="w-5 h-5 text-amber-200" />
              </HotbarButton>

              {/* 2: Watering Can */}
              <HotbarButton
                shortcut="2"
                label="Penyiram"
                count={`${waterLevel}/${maxWater}`}
                active={selectedTool === 'water'}
                onClick={() => setSelectedTool('water')}
              >
                <Droplets className="w-5 h-5 text-sky-300" />
              </HotbarButton>

              {/* 3: Axe */}
              <HotbarButton
                shortcut="3"
                label="Kapak"
                active={selectedTool === 'axe'}
                onClick={() => setSelectedTool('axe')}
              >
                <Axe className="w-5 h-5 text-orange-300" />
              </HotbarButton>

              {/* 4: Hand / Harvest / Pet */}
              <HotbarButton
                shortcut="4"
                label="Tangan"
                active={selectedTool === 'hand'}
                onClick={() => setSelectedTool('hand')}
              >
                <Hand className="w-5 h-5 text-emerald-300" />
              </HotbarButton>

              <div className="w-px h-8 bg-[#6b4433] mx-1 shrink-0" />

              {/* 5: Strawberry Seeds */}
              <HotbarButton
                shortcut="5"
                label="Stroberi"
                count={inventory.seeds.strawberry}
                active={selectedTool === 'seed_strawberry'}
                onClick={() => setSelectedTool('seed_strawberry')}
              >
                <SpriteIcon sprite={getSeedBagSprite('strawberry')} scale={1.9} />
              </HotbarButton>

              {/* 6: Spring Onion Seeds */}
              <HotbarButton
                shortcut="6"
                label="D.Bawang"
                count={inventory.seeds.scallion}
                active={selectedTool === 'seed_scallion'}
                onClick={() => setSelectedTool('seed_scallion')}
              >
                <SpriteIcon sprite={getSeedBagSprite('scallion')} scale={1.9} />
              </HotbarButton>

              {/* 7: Potato Seeds */}
              <HotbarButton
                shortcut="7"
                label="Kentang"
                count={inventory.seeds.potato}
                active={selectedTool === 'seed_potato'}
                onClick={() => setSelectedTool('seed_potato')}
              >
                <SpriteIcon sprite={getSeedBagSprite('potato')} scale={1.9} />
              </HotbarButton>

              {/* 8: Sweet Onion / Turnip Seeds */}
              <HotbarButton
                shortcut="8"
                label="Bawang"
                count={inventory.seeds.turnip}
                active={selectedTool === 'seed_turnip'}
                onClick={() => setSelectedTool('seed_turnip')}
              >
                <SpriteIcon sprite={getSeedBagSprite('turnip')} scale={1.9} />
              </HotbarButton>

              {/* 9: Maple Tree Acorn */}
              <HotbarButton
                shortcut="9"
                label="Maple"
                count={inventory.mapleAcorn}
                active={selectedTool === 'seed_maple'}
                onClick={() => setSelectedTool('seed_maple')}
              >
                <SpriteIcon sprite={UI_SPRITES.mapleSapling} scale={1.3} />
              </HotbarButton>
            </div>

            {/* Quick Cozy Latte Drink & Zone Toggle */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleDrinkLatte(false)}
                disabled={inventory.cozyLatte <= 0}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#6b4433] hover:bg-[#7d503c] disabled:opacity-40 text-[#fef3c7] text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 border border-[#8c5a44]"
                title="Minum Cozy Latte (+45 Energi)"
              >
                <SpriteIcon sprite={UI_SPRITES.latteCup} scale={0.9} />
                <span>Minum Latte ({inventory.cozyLatte})</span>
              </button>

              <button
                onClick={() => setIsMarketOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <SpriteIcon sprite={UI_SPRITES.iconShopCream} scale={1.4} />
                <span>Pasar</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Cozy Clipboard Sidebar (340px on desktop) */}
        <aside className="w-full lg:w-[340px] bg-[#ecdcc2] border-t-4 lg:border-t-0 lg:border-l-4 border-[#6b4433] p-4 flex flex-col gap-4 overflow-y-auto shrink-0">
          {/* Section 1: Day, Time, Gold & Stamina Meters */}
          <div className="p-4 rounded-xl bg-[#f7efe2] border border-[#cbb28e] space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-[#694635]">
                <span>Hari ke-{day}</span>
                <span aria-hidden="true"> · </span>
                <span>Musim Semi</span>
                <span aria-hidden="true"> · </span>
                <span className="font-mono-num font-bold text-[#3d251a]">
                  {formatClock(timeOfDay)}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    sound.sfxEnabled = !sfxOn;
                    setSfxOn(!sfxOn);
                  }}
                  className="p-1.5 rounded-md bg-[#e8d6b9] hover:bg-[#dfc8a6] text-[#4a2e21] cursor-pointer"
                  title={sfxOn ? 'Matikan Efek Suara' : 'Nyalakan Efek Suara'}
                >
                  {sfxOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => {
                    const next = sound.toggleBgm();
                    setBgmOn(next);
                  }}
                  className={`p-1.5 rounded-md cursor-pointer ${
                    bgmOn ? 'bg-amber-600 text-white' : 'bg-[#e8d6b9] text-[#4a2e21]'
                  }`}
                  title="Musik Latar 8-Bit Cozy"
                >
                  <Music className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Gold & Location Row */}
            <div className="flex items-center justify-between pt-1 border-t border-[#e4d2b6]">
              <div>
                <div className="text-xs text-[#7c533e]">Uang Kebun</div>
                <div className="text-xl font-bold font-mono-num text-amber-800">
                  {gold.toLocaleString('id-ID')} G
                </div>
              </div>
              <button
                onClick={() => {
                  sound.playDoor();
                  setZone((z) => (z === 'OUTDOOR' ? 'INTERIOR' : 'OUTDOOR'));
                }}
                className="px-3 py-1.5 rounded-lg bg-[#6b4433] hover:bg-[#573628] text-[#fdf6e9] text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                {zone === 'OUTDOOR' ? 'Masuk Rumah' : 'Keluar ke Kebun'}
              </button>
            </div>

            {/* Energy & Water Bars (Non-hue-only affordances with explicit counts) */}
            <div className="space-y-2 pt-1">
              <div>
                <div className="flex items-center justify-between text-xs font-semibold mb-1">
                  <span>Energi Petani</span>
                  <span className="font-mono-num">
                    {energy}/{maxEnergy} · {energy > 30 ? 'Bugar' : 'Lelah'}
                  </span>
                </div>
                <div className="w-full h-2.5 bg-[#dfc8a6] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 transition-all duration-150"
                    style={{ width: `${(energy / maxEnergy) * 100}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-semibold mb-1">
                  <span>Air Penyiram</span>
                  <span className="font-mono-num">
                    {waterLevel}/{maxWater} Tetes
                  </span>
                </div>
                <div className="w-full h-2.5 bg-[#dfc8a6] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-sky-600 transition-all duration-150"
                    style={{ width: `${(waterLevel / maxWater) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Harvest Basket & Ranch Products */}
          <div className="p-4 rounded-xl bg-[#f7efe2] border border-[#cbb28e] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-[#3d251a] font-display">
                Keranjang Hasil Kebun
              </h3>
              <button
                onClick={() => setIsMarketOpen(true)}
                className="text-xs font-bold text-amber-800 hover:underline cursor-pointer whitespace-nowrap shrink-0"
              >
                Jual di Pasar →
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-[#ecdcc2]/70">
                <SpriteIcon sprite={getHarvestSprite('strawberry', 2)} scale={1.8} />
                <div className="min-w-0">
                  <div className="font-semibold truncate">Hasil Panen</div>
                  <div className="font-mono-num font-bold text-[#6b4433]">
                    {totalHarvestedCrops} buah
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2 rounded-lg bg-[#ecdcc2]/70">
                <SpriteIcon sprite={UI_SPRITES.eggWhite} scale={1.8} />
                <div className="min-w-0">
                  <div className="font-semibold truncate">Telur Ayam</div>
                  <div className="font-mono-num font-bold text-[#6b4433]">
                    {inventory.eggs} butir
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2 rounded-lg bg-[#ecdcc2]/70">
                <SpriteIcon sprite={UI_SPRITES.cowFemaleIcon} scale={1} />
                <div className="min-w-0">
                  <div className="font-semibold truncate">Susu Sapi</div>
                  <div className="font-mono-num font-bold text-[#6b4433]">
                    {inventory.milk} botol
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2 rounded-lg bg-[#ecdcc2]/70">
                <SpriteIcon sprite={UI_SPRITES.mapleStump} scale={1} />
                <div className="min-w-0">
                  <div className="font-semibold truncate">Kayu & Sirup</div>
                  <div className="font-mono-num font-bold text-[#6b4433]">
                    {inventory.wood}k · {inventory.mapleSap}s
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Village Orders / Quests */}
          <div className="p-4 rounded-xl bg-[#f7efe2] border border-[#cbb28e] space-y-3 flex-1">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-[#3d251a] font-display">
                Papan Pesanan Desa
              </h3>
              <span className="text-xs font-mono-num text-[#7c533e]">
                {quests.filter((q) => q.completed).length}/{quests.length} Selesai
              </span>
            </div>

            <div className="space-y-2.5">
              {quests.map((q) => {
                const isReady = q.currentCount >= q.targetCount && !q.completed;
                return (
                  <div
                    key={q.id}
                    className={`p-3 rounded-lg border transition-colors ${
                      q.completed
                        ? 'bg-[#e8decb] border-[#d3c2a6] opacity-65'
                        : isReady
                        ? 'bg-amber-50 border-amber-500'
                        : 'bg-[#ecdcc2]/60 border-[#d5be9b]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-xs text-[#3d251a]">{q.title}</span>
                      <span className="text-xs font-mono-num font-bold text-amber-800 shrink-0">
                        +{q.rewardGold} G
                      </span>
                    </div>
                    <p className="text-xs text-[#694635] mt-1 leading-snug">{q.description}</p>

                    <div className="flex items-center justify-between gap-2 mt-2">
                      <span className="text-xs font-mono-num text-[#593828]">
                        Progres: {q.currentCount}/{q.targetCount}
                      </span>
                      {q.completed ? (
                        <span className="text-xs font-bold text-emerald-800">Terklaim ✓</span>
                      ) : isReady ? (
                        <button
                          onClick={() => handleClaimQuest(q.id)}
                          className="px-2.5 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold cursor-pointer whitespace-nowrap shrink-0"
                        >
                          Klaim +{q.rewardGold} G
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </div>

      {/* Title Screen Modal */}
      {gameState === 'TITLE_MENU' && (
        <TitleScreenModal onStartGame={() => setGameState('PLAYING')} />
      )}

      {/* Market & Shipping Chest Modal */}
      {isMarketOpen && (
        <MarketModal
          gold={gold}
          inventory={inventory}
          onClose={() => setIsMarketOpen(false)}
          onBuySeed={handleBuySeed}
          onBuyMapleAcorn={handleBuyMapleAcorn}
          onBuyLatte={handleBuyLatte}
          onBuyAnimal={handleBuyAnimal}
          onSellCrop={handleSellCrop}
          onSellResource={handleSellResource}
          onSellAllHarvest={handleSellAllHarvest}
        />
      )}

      {/* End-of-Day Summary Modal (ROUND_SUMMARY) */}
      {gameState === 'ROUND_SUMMARY' && daySummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-md bg-[#ecdcc2] border-4 border-[#6b4433] rounded-2xl shadow-2xl overflow-hidden text-[#3d251a]">
            <div className="px-6 py-4 bg-[#6b4433] text-[#fdf6e9] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-amber-300" />
                <h2 className="text-lg font-bold font-display">
                  Ringkasan Hari ke-{daySummary.dayCompleted}
                </h2>
              </div>
              <span className="text-xs text-[#e6ccb2]">Musim Semi</span>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-[#593828] leading-relaxed">
                Malam yang tenang di Cozy Pixel Valley. Semua tanaman yang disiram telah tumbuh satu tahap, pohon maple bertunas, dan ayam-ayam siap bertelur kembali pagi ini!
              </p>

              <div className="p-4 rounded-xl bg-[#f7efe2] border border-[#cbb28e] space-y-2.5 text-xs font-mono-num">
                <div className="flex items-center justify-between">
                  <span>Hasil Panen Terjual ({daySummary.cropsSoldCount} buah)</span>
                  <span className="font-bold">+{daySummary.cropsRevenue} G</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Produk Ternak (Telur & Susu)</span>
                  <span className="font-bold">+{daySummary.ranchRevenue} G</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Hasil Hutan (Kayu & Sirup Maple)</span>
                  <span className="font-bold">+{daySummary.forageRevenue} G</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Bonus Pesanan Desa</span>
                  <span className="font-bold">+{daySummary.questBonus} G</span>
                </div>
                <div className="pt-2 border-t border-[#d8c19e] flex items-center justify-between text-sm font-bold text-amber-900">
                  <span>Total Pendapatan Hari Ini</span>
                  <span>+{daySummary.totalEarned} G</span>
                </div>
              </div>

              <button
                onClick={handleConfirmNextDay}
                className="w-full py-2.5 rounded-xl bg-[#6b4433] hover:bg-[#573628] text-[#fef3c7] font-bold text-sm transition-colors cursor-pointer whitespace-nowrap"
              >
                Bangun Pagi — Mulai Hari ke-{daySummary.dayCompleted + 1}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface HotbarButtonProps {
  shortcut: string;
  label: string;
  count?: number | string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

const HotbarButton: React.FC<HotbarButtonProps> = ({
  shortcut,
  label,
  count,
  active,
  onClick,
  children,
}) => {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center w-14 h-14 rounded-lg border-2 transition-all cursor-pointer shrink-0 ${
        active
          ? 'bg-[#ecdcc2] border-[#fbbf24] text-[#3d251a] -translate-y-0.5 shadow-md'
          : 'bg-[#382218] border-[#6b4433] text-[#e6ccb2] hover:bg-[#472b1e]'
      }`}
    >
      <span
        className={`absolute top-0.5 left-1 text-[10px] font-mono-num font-bold ${
          active ? 'text-[#6b4433]' : 'text-[#a67c63]'
        }`}
      >
        {shortcut}
      </span>

      {count !== undefined && (
        <span
          className={`absolute top-0.5 right-1 text-[10px] font-mono-num font-bold ${
            active ? 'text-amber-900' : 'text-amber-300'
          }`}
        >
          {count}
        </span>
      )}

      <div className="mt-2 flex items-center justify-center h-6">{children}</div>
      <span className="text-[10px] font-semibold leading-none mt-1 truncate max-w-[50px]">
        {label}
      </span>
    </button>
  );
};
