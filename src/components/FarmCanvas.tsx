import React, { useEffect, useRef, useState } from 'react';
import {
  CROPS,
  getCropSignSprite,
  getCropStageSprite,
  SPRITE_SHEETS,
  UI_SPRITES,
} from '../data/sprites';
import { CHEST_POS, HOUSE_RECT, MAP_COLS, MAP_ROWS, TILE_PIXEL } from '../data/initialWorld';
import {
  Direction,
  FarmAnimal,
  FarmTile,
  FloatingText,
  ToolType,
  WorldZone,
} from '../types/game';
import { getCachedImage } from './SpriteIcon';

interface FarmCanvasProps {
  zone: WorldZone;
  grid: FarmTile[][];
  animals: FarmAnimal[];
  selectedTool: ToolType;
  waterLevel: number;
  maxWater: number;
  timeOfDay: number; // 6.0 (6:00 AM) to 24.0 (Midnight)
  floatingTexts: FloatingText[];
  onTileInteract: (tx: number, ty: number) => void;
  onAnimalInteract: (animalId: string) => void;
  onEnterHouse: () => void;
  onExitHouse: () => void;
  onSleepInBed: () => void;
  onOpenMarket: () => void;
  onDrinkHouseCoffee: () => void;
}

export const FarmCanvas: React.FC<FarmCanvasProps> = ({
  zone,
  grid,
  animals,
  selectedTool,
  timeOfDay,
  floatingTexts,
  onTileInteract,
  onAnimalInteract,
  onEnterHouse,
  onExitHouse,
  onSleepInBed,
  onOpenMarket,
  onDrinkHouseCoffee,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Player state in ref for 60fps smooth movement without React re-render lag
  const playerRef = useRef<{
    x: number;
    y: number;
    dir: Direction;
    moving: boolean;
    animFrame: number;
    animTimer: number;
    actionTimer: number;
    targetTile: { x: number; y: number; actOnArrive: boolean } | null;
  }>({
    x: 13.5,
    y: 6.2,
    dir: 'down',
    moving: false,
    animFrame: 0,
    animTimer: 0,
    actionTimer: 0,
    targetTile: null,
  });

  const keysRef = useRef<Record<string, boolean>>({});
  const hoverTileRef = useRef<{ x: number; y: number } | null>(null);
  const [hoverHint, setHoverHint] = useState<string>('');

  // Reset player position when switching between Outdoor and Interior
  useEffect(() => {
    if (zone === 'INTERIOR') {
      playerRef.current.x = 11.5;
      playerRef.current.y = 11.2;
      playerRef.current.dir = 'up';
      playerRef.current.targetTile = null;
    } else {
      playerRef.current.x = HOUSE_RECT.doorX + 0.5;
      playerRef.current.y = HOUSE_RECT.doorY + 1.2;
      playerRef.current.dir = 'down';
      playerRef.current.targetTile = null;
    }
  }, [zone]);

  // Preload all spritesheets
  useEffect(() => {
    Object.values(SPRITE_SHEETS).forEach((src) => {
      getCachedImage(src);
    });
  }, []);

  // Keyboard listener (WASD + Arrows + Space/E to interact)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      const k = e.key.toLowerCase();
      keysRef.current[k] = true;

      if (k === ' ' || k === 'e' || k === 'enter') {
        e.preventDefault();
        const p = playerRef.current;
        const offset =
          p.dir === 'up'
            ? { dx: 0, dy: -1 }
            : p.dir === 'down'
            ? { dx: 0, dy: 1 }
            : p.dir === 'left'
            ? { dx: -1, dy: 0 }
            : { dx: 1, dy: 0 };
        const tx = Math.floor(p.x + offset.dx * 0.85);
        const ty = Math.floor(p.y + offset.dy * 0.85);
        p.actionTimer = 0.22;
        triggerInteractionAt(tx, ty);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keysRef.current[k] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  });

  const isTileBlocked = (tx: number, ty: number, currentZone: WorldZone): boolean => {
    if (currentZone === 'INTERIOR') {
      // Room bounds: x: 7..16, y: 4..12
      if (tx < 7 || tx > 16 || ty < 5 || ty > 12) return true;
      // Bed at (8..9, 5..6), Fireplace at (12..13, 4..5), Table at (13..14, 8..9)
      if (tx >= 8 && tx <= 9 && ty >= 5 && ty <= 6) return true;
      if (tx >= 12 && tx <= 13 && ty <= 5) return true;
      return false;
    }

    if (tx < 0 || tx >= MAP_COLS || ty < 0 || ty >= MAP_ROWS) return true;

    // Farmhouse footprint (except door step at 19, 4)
    if (
      tx >= HOUSE_RECT.x &&
      tx < HOUSE_RECT.x + HOUSE_RECT.w &&
      ty >= HOUSE_RECT.y &&
      ty < HOUSE_RECT.y + HOUSE_RECT.h
    ) {
      return true;
    }

    // Chest at (15, 4)
    if (tx === CHEST_POS.x && ty === CHEST_POS.y) return true;

    const tile = grid[ty]?.[tx];
    if (!tile) return true;
    if (tile.ground === 'water') return true;
    if (tile.fence) return true;
    if (tile.signCrop) return true;
    if (tile.tree && tile.tree.stage >= 2) return true;
    return false;
  };

  const triggerInteractionAt = (tx: number, ty: number) => {
    if (zone === 'INTERIOR') {
      // Door exit at (11..12, 12)
      if (ty >= 11 && tx >= 10 && tx <= 13) {
        onExitHouse();
        return;
      }
      // Bed at (7..10, 5..7)
      if (tx >= 7 && tx <= 10 && ty >= 4 && ty <= 7) {
        onSleepInBed();
        return;
      }
      // Coffee Table at (12..15, 7..10)
      if (tx >= 12 && tx <= 15 && ty >= 7 && ty <= 10) {
        onDrinkHouseCoffee();
        return;
      }
      return;
    }

    // Outdoor interactions:
    // 1. Farmhouse door at (19, 4) or (19, 3)
    if (tx >= 18 && tx <= 20 && ty >= 3 && ty <= 4) {
      onEnterHouse();
      return;
    }

    // 2. Shipping/Market Chest at (15, 4)
    if (Math.abs(tx - CHEST_POS.x) <= 0.5 && Math.abs(ty - CHEST_POS.y) <= 0.5) {
      onOpenMarket();
      return;
    }

    // 3. Check if an animal is at or near (tx, ty)
    const clickedAnimal = animals.find(
      (a) => Math.hypot(a.x - (tx + 0.5), a.y - (ty + 0.5)) < 1.15
    );
    if (clickedAnimal) {
      onAnimalInteract(clickedAnimal.id);
      return;
    }

    // 4. Otherwise interact with the tile itself
    onTileInteract(tx, ty);
  };

  // Latest callbacks ref so RAF loop always invokes fresh state handlers
  const callbacksRef = useRef({
    triggerInteractionAt,
    isTileBlocked,
  });
  callbacksRef.current = { triggerInteractionAt, isTileBlocked };

  // Main 60fps Game Loop (Player movement, Animal AI wandering, and Pixel-Art Rendering)
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const renderLoop = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      const p = playerRef.current;
      const keys = keysRef.current;

      // 1. Update Player Movement
      let dx = 0;
      let dy = 0;
      if (keys['w'] || keys['arrowup']) dy -= 1;
      if (keys['s'] || keys['arrowdown']) dy += 1;
      if (keys['a'] || keys['arrowleft']) dx -= 1;
      if (keys['d'] || keys['arrowright']) dx += 1;

      if (dx !== 0 || dy !== 0) {
        // Manual keyboard movement cancels auto-walk target
        p.targetTile = null;
        const len = Math.hypot(dx, dy);
        dx /= len;
        dy /= len;
      } else if (p.targetTile) {
        const targetX = p.targetTile.x + 0.5;
        const targetY = p.targetTile.y + 0.5;
        const dist = Math.hypot(targetX - p.x, targetY - p.y);

        if (dist <= 1.25) {
          // Arrived close enough to interact!
          if (Math.abs(targetX - p.x) > Math.abs(targetY - p.y)) {
            p.dir = targetX > p.x ? 'right' : 'left';
          } else {
            p.dir = targetY > p.y ? 'down' : 'up';
          }
          const toAct = p.targetTile;
          p.targetTile = null;
          if (toAct.actOnArrive) {
            p.actionTimer = 0.22;
            callbacksRef.current.triggerInteractionAt(toAct.x, toAct.y);
          }
        } else {
          dx = (targetX - p.x) / dist;
          dy = (targetY - p.y) / dist;
        }
      }

      const speed = 4.6; // tiles per second
      if (dx !== 0 || dy !== 0) {
        p.moving = true;
        if (Math.abs(dx) > Math.abs(dy)) {
          p.dir = dx > 0 ? 'right' : 'left';
        } else {
          p.dir = dy > 0 ? 'down' : 'up';
        }

        const nextX = p.x + dx * speed * dt;
        const nextY = p.y + dy * speed * dt;

        if (!callbacksRef.current.isTileBlocked(Math.floor(nextX), Math.floor(p.y), zone)) {
          p.x = nextX;
        }
        if (!callbacksRef.current.isTileBlocked(Math.floor(p.x), Math.floor(nextY), zone)) {
          p.y = nextY;
        } else if (p.targetTile) {
          // Stop auto-walk if blocked
          const toAct = p.targetTile;
          p.targetTile = null;
          if (toAct.actOnArrive && Math.hypot(toAct.x + 0.5 - p.x, toAct.y + 0.5 - p.y) <= 2.1) {
            p.actionTimer = 0.22;
            callbacksRef.current.triggerInteractionAt(toAct.x, toAct.y);
          }
        }
      } else {
        p.moving = false;
      }

      // Player animation timer
      p.animTimer += dt;
      const frameDuration = p.moving ? 0.11 : 0.22;
      const maxFrames = p.moving ? 6 : 4;
      if (p.animTimer >= frameDuration) {
        p.animTimer = 0;
        p.animFrame = (p.animFrame + 1) % maxFrames;
      }
      if (p.actionTimer > 0) {
        p.actionTimer = Math.max(0, p.actionTimer - dt);
      }

      // 2. Update Wandering Farm Animals (in Outdoor Zone)
      if (zone === 'OUTDOOR') {
        for (const animal of animals) {
          animal.stateTimer -= dt;
          if (animal.stateTimer <= 0) {
            if (animal.state === 'idle') {
              animal.state = 'walk';
              animal.stateTimer = 1.2 + Math.random() * 1.8;
              const dirs: Direction[] = ['down', 'up', 'left', 'right'];
              animal.dir = dirs[Math.floor(Math.random() * dirs.length)];
              const spd = animal.species.startsWith('cow') ? 0.75 : 1.15;
              animal.vx = animal.dir === 'left' ? -spd : animal.dir === 'right' ? spd : 0;
              animal.vy = animal.dir === 'up' ? -spd : animal.dir === 'down' ? spd : 0;
            } else {
              animal.state = 'idle';
              animal.stateTimer = 1.8 + Math.random() * 2.8;
              animal.vx = 0;
              animal.vy = 0;
            }
          }

          if (animal.state === 'walk') {
            const nx = animal.x + animal.vx * dt;
            const ny = animal.y + animal.vy * dt;
            // Keep animals comfortably inside pasture bounds (x: 3.2..9.6, y: 10.2..13.6)
            if (nx >= 3.2 && nx <= 9.6 && ny >= 10.2 && ny <= 13.6) {
              animal.x = nx;
              animal.y = ny;
            } else {
              animal.vx = -animal.vx;
              animal.vy = -animal.vy;
              if (animal.dir === 'left') animal.dir = 'right';
              else if (animal.dir === 'right') animal.dir = 'left';
              else if (animal.dir === 'up') animal.dir = 'down';
              else animal.dir = 'up';
            }
          }

          animal.animTimer += dt;
          if (animal.animTimer >= (animal.state === 'walk' ? 0.16 : 0.32)) {
            animal.animTimer = 0;
            animal.animFrame = (animal.animFrame + 1) % 4;
          }
        }
      }

      // 3. Draw Scene on Canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = false;
          if (zone === 'INTERIOR') {
            drawInteriorScene(ctx, now);
          } else {
            drawOutdoorScene(ctx, now);
          }
        }
      }

      animationFrameId = requestAnimationFrame(renderLoop);
    };

    animationFrameId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [zone, grid, animals, selectedTool, timeOfDay, floatingTexts]);

  const drawOutdoorScene = (ctx: CanvasRenderingContext2D, now: number) => {
    const W = MAP_COLS * TILE_PIXEL;
    const H = MAP_ROWS * TILE_PIXEL;
    ctx.clearRect(0, 0, W, H);

    const grassImg = getCachedImage(SPRITE_SHEETS.tilesetGrass);
    const roadImg = getCachedImage(SPRITE_SHEETS.road);
    const cropsImg = getCachedImage(SPRITE_SHEETS.springCrops);
    const fencesImg = getCachedImage(SPRITE_SHEETS.fences);
    const chickImg = getCachedImage(SPRITE_SHEETS.chickYellow);
    const houseImg = getCachedImage(SPRITE_SHEETS.house);
    const chestImg = getCachedImage(SPRITE_SHEETS.chest);
    const treeImg = getCachedImage(SPRITE_SHEETS.mapleTree);

    // 1. Base Grass & Ground Tiles
    for (let y = 0; y < MAP_ROWS; y++) {
      for (let x = 0; x < MAP_COLS; x++) {
        const tile = grid[y][x];
        const px = x * TILE_PIXEL;
        const py = y * TILE_PIXEL;

        // Crisp spring grass base fill (#78c257) + tileset_grass center texture
        ctx.fillStyle = (x + y) % 2 === 0 ? '#79c257' : '#73bc52';
        ctx.fillRect(px, py, TILE_PIXEL, TILE_PIXEL);

        if (grassImg.complete && grassImg.naturalWidth > 0) {
          // Center grass tile at (96, 16, 16, 16)
          ctx.drawImage(grassImg, 96, 16, 16, 16, px, py, TILE_PIXEL, TILE_PIXEL);
        }

        // Subtle pixel wildflowers on untouched grass
        if (tile.flowerDecor && tile.ground === 'grass') {
          ctx.fillStyle = tile.flowerDecor === 1 ? '#fde047' : tile.flowerDecor === 2 ? '#f9a8d4' : '#ffffff';
          ctx.fillRect(px + 12, py + 15, 6, 6);
          ctx.fillStyle = '#4d9132';
          ctx.fillRect(px + 12, py + 21, 6, 3);
        }

        // Stone Stepping Path (from road.png)
        if (tile.ground === 'road' && roadImg.complete && roadImg.naturalWidth > 0) {
          const variant = (x + y) % 3;
          const sx = variant === 0 ? 0 : variant === 1 ? 16 : 32;
          ctx.drawImage(roadImg, sx, 0, 16, 16, px, py, TILE_PIXEL, TILE_PIXEL);
        }

        // Spring Water Pond
        if (tile.ground === 'water') {
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(px, py, TILE_PIXEL, TILE_PIXEL);
          ctx.fillStyle = '#0284c7';
          ctx.fillRect(px + 3, py + 3, TILE_PIXEL - 6, TILE_PIXEL - 6);
          // Animated water shimmer
          const waveOffset = Math.sin(now / 420 + x * 0.9 + y * 0.6) * 4;
          ctx.fillStyle = 'rgba(224, 242, 254, 0.55)';
          ctx.fillRect(px + 10 + waveOffset, py + 14, 16, 4);
          ctx.fillRect(px + 18 - waveOffset, py + 30, 12, 4);

          // Grass shoreline border from tileset_grass
          if (grassImg.complete && grassImg.naturalWidth > 0) {
            ctx.drawImage(grassImg, 16, 0, 16, 16, px, py, TILE_PIXEL, TILE_PIXEL);
          }
        }

        // Tilled Soil Plot
        if (tile.ground === 'tilled') {
          const watered = tile.crop?.watered;
          ctx.fillStyle = watered ? '#4a2c1d' : '#7c5036';
          ctx.fillRect(px + 3, py + 3, TILE_PIXEL - 6, TILE_PIXEL - 6);
          ctx.fillStyle = watered ? '#382014' : '#633d28';
          // Pixel soil ridges
          ctx.fillRect(px + 6, py + 9, TILE_PIXEL - 12, 6);
          ctx.fillRect(px + 6, py + 21, TILE_PIXEL - 12, 6);
          ctx.fillRect(px + 6, py + 33, TILE_PIXEL - 12, 6);
        }

        // Wooden Crop Sign (from spring_crops.png Col 13)
        if (tile.signCrop && cropsImg.complete && cropsImg.naturalWidth > 0) {
          const signRect = getCropSignSprite(tile.signCrop);
          ctx.drawImage(
            cropsImg,
            signRect.x,
            signRect.y,
            signRect.w,
            signRect.h,
            px,
            py - 4,
            TILE_PIXEL,
            TILE_PIXEL
          );
        }

        // Planted Crop (from spring_crops.png)
        if (tile.crop && cropsImg.complete && cropsImg.naturalWidth > 0) {
          const cropDef = CROPS[tile.crop.type];
          const maxStage = cropDef.stages - 1;
          const isRipe = tile.crop.stage >= maxStage;
          const sprite = getCropStageSprite(tile.crop.type, tile.crop.stage);
          const bob = isRipe ? Math.sin(now / 240 + x) * 3 : 0;

          ctx.drawImage(
            cropsImg,
            sprite.x,
            sprite.y,
            sprite.w,
            sprite.h,
            px,
            py - 6 + bob,
            TILE_PIXEL,
            TILE_PIXEL
          );

          // Ripe sparkle indicator
          if (isRipe) {
            ctx.fillStyle = '#fef08a';
            const sparkleSize = (Math.sin(now / 180 + x + y) > 0) ? 5 : 3;
            ctx.fillRect(px + 34, py + 4, sparkleSize, sparkleSize);
          } else if (!tile.crop.watered) {
            // Tiny dry soil indicator dot
            ctx.fillStyle = 'rgba(254, 240, 138, 0.75)';
            ctx.fillRect(px + 38, py + 38, 4, 4);
          }
        }

        // Fresh Eggs on Ground (from chick_yellow.png Row 2)
        if (tile.eggCount && tile.eggCount > 0 && chickImg.complete && chickImg.naturalWidth > 0) {
          const eggBob = Math.sin(now / 260 + x * 2) * 2;
          ctx.drawImage(
            chickImg,
            0,
            32,
            16,
            16,
            px + 6,
            py + 4 + eggBob,
            TILE_PIXEL - 12,
            TILE_PIXEL - 12
          );
        }

        // Fences (from fences.png)
        if (tile.fence && fencesImg.complete && fencesImg.naturalWidth > 0) {
          let fx = 16;
          let fy = 32;
          if (tile.fence === 'tl') { fx = 0; fy = 0; }
          else if (tile.fence === 'tr') { fx = 32; fy = 0; }
          else if (tile.fence === 'v') { fx = 0; fy = 16; }
          else if (tile.fence === 'bl') { fx = 0; fy = 32; }
          else if (tile.fence === 'br') { fx = 32; fy = 32; }
          else if (tile.fence === 'h') { fx = 16; fy = 32; }
          ctx.drawImage(fencesImg, fx, fy, 16, 16, px, py - 4, TILE_PIXEL, TILE_PIXEL);
        }
      }
    }

    // 2. Collect Y-Sortable Entities (Farmhouse, Chest, Maple Trees, Animals, Player)
    const renderables: Array<{ sortY: number; draw: () => void }> = [];

    // Farmhouse (house.png at 144, 0, 80, 112)
    if (houseImg.complete && houseImg.naturalWidth > 0) {
      renderables.push({
        sortY: (HOUSE_RECT.y + HOUSE_RECT.h - 0.2) * TILE_PIXEL,
        draw: () => {
          const hx = HOUSE_RECT.x * TILE_PIXEL;
          const hy = (HOUSE_RECT.y - 1.2) * TILE_PIXEL;
          const hw = 5 * TILE_PIXEL; // 80 * 3 = 240
          const hh = 7 * TILE_PIXEL; // 112 * 3 = 336

          // Cozy Chimney Smoke Puffs
          for (let i = 0; i < 3; i++) {
            const t = ((now / 1200 + i * 0.33) % 1);
            const smokeX = hx + 36 + Math.sin(t * 6 + i) * 8;
            const smokeY = hy + 36 - t * 42;
            const size = 8 + t * 12;
            ctx.fillStyle = `rgba(255, 255, 255, ${(1 - t) * 0.55})`;
            ctx.fillRect(smokeX, smokeY, size, size);
          }

          ctx.drawImage(houseImg, 144, 0, 80, 112, hx, hy, hw, hh);

          // Prompt when player is close to the front door (19, 4)
          const p = playerRef.current;
          if (Math.hypot(p.x - (HOUSE_RECT.doorX + 0.5), p.y - (HOUSE_RECT.doorY + 0.8)) < 2.2) {
            drawPixelBadge(ctx, (HOUSE_RECT.doorX + 0.5) * TILE_PIXEL, (HOUSE_RECT.doorY - 0.3) * TILE_PIXEL, 'MASUK [E]', '#fef3c7', '#451a03');
          }
        },
      });
    }

    // Shipping & Market Chest (chest.png at CHEST_POS)
    if (chestImg.complete && chestImg.naturalWidth > 0) {
      renderables.push({
        sortY: (CHEST_POS.y + 0.8) * TILE_PIXEL,
        draw: () => {
          const p = playerRef.current;
          const isNear = Math.hypot(p.x - (CHEST_POS.x + 0.5), p.y - (CHEST_POS.y + 0.5)) < 2.3;
          const sy = isNear ? 16 : 0; // Open lid when player is near!
          ctx.drawImage(
            chestImg,
            0,
            sy,
            32,
            16,
            (CHEST_POS.x - 0.5) * TILE_PIXEL,
            CHEST_POS.y * TILE_PIXEL,
            TILE_PIXEL * 2,
            TILE_PIXEL
          );
          if (isNear) {
            drawPixelBadge(ctx, (CHEST_POS.x + 0.5) * TILE_PIXEL, (CHEST_POS.y - 0.25) * TILE_PIXEL, 'PASAR / JUAL', '#fef08a', '#422006');
          }
        },
      });
    }

    // Maple Trees (maple_tree.png)
    if (treeImg.complete && treeImg.naturalWidth > 0) {
      for (let y = 0; y < MAP_ROWS; y++) {
        for (let x = 0; x < MAP_COLS; x++) {
          const tree = grid[y][x].tree;
          if (!tree) continue;
          renderables.push({
            sortY: (y + 0.9) * TILE_PIXEL,
            draw: () => {
              const px = (x - 0.5) * TILE_PIXEL;
              if (tree.stage === 0) {
                // Acorn
                ctx.drawImage(treeImg, 0, 32, 32, 16, px, y * TILE_PIXEL, TILE_PIXEL * 2, TILE_PIXEL);
              } else if (tree.stage === 1) {
                // Sapling
                ctx.drawImage(treeImg, 32, 32, 32, 16, px, y * TILE_PIXEL - 4, TILE_PIXEL * 2, TILE_PIXEL);
              } else if (tree.stage === 2) {
                // Medium Maple Tree (32x48)
                ctx.drawImage(treeImg, 64, 0, 32, 48, px, (y - 2) * TILE_PIXEL, TILE_PIXEL * 2, TILE_PIXEL * 3);
              } else if (tree.stage === 3) {
                // Full Maple Tree (32x48)
                ctx.drawImage(treeImg, 96, 0, 32, 48, px, (y - 2) * TILE_PIXEL, TILE_PIXEL * 2, TILE_PIXEL * 3);
              } else if (tree.stage === 4) {
                // Chopped Stump (32x16)
                ctx.drawImage(treeImg, 128, 32, 32, 16, px, y * TILE_PIXEL, TILE_PIXEL * 2, TILE_PIXEL);
              }
            },
          });
        }
      }
    }

    // Farm Animals
    for (const animal of animals) {
      renderables.push({
        sortY: animal.y * TILE_PIXEL,
        draw: () => {
          drawAnimal(ctx, animal, now);
        },
      });
    }

    // Player Character
    renderables.push({
      sortY: playerRef.current.y * TILE_PIXEL,
      draw: () => {
        drawPlayer(ctx, playerRef.current);
      },
    });

    // Sort by Y and draw!
    renderables.sort((a, b) => a.sortY - b.sortY);
    for (const item of renderables) {
      item.draw();
    }

    // 3. Draw Hovered Tile Highlight
    if (hoverTileRef.current) {
      const { x: hx, y: hy } = hoverTileRef.current;
      if (hx >= 0 && hx < MAP_COLS && hy >= 0 && hy < MAP_ROWS) {
        const px = hx * TILE_PIXEL;
        const py = hy * TILE_PIXEL;
        ctx.strokeStyle = 'rgba(254, 240, 138, 0.9)';
        ctx.lineWidth = 3;
        ctx.strokeRect(px + 2, py + 2, TILE_PIXEL - 4, TILE_PIXEL - 4);
      }
    }

    // 4. Evening / Sunset Warm Atmosphere Tint
    if (timeOfDay >= 17.0) {
      const progress = Math.min(1, (timeOfDay - 17.0) / 5.0);
      ctx.fillStyle =
        timeOfDay < 19.5
          ? `rgba(245, 158, 11, ${progress * 0.22})` // Golden hour sunset
          : `rgba(15, 23, 42, ${Math.min(0.48, (timeOfDay - 18.5) * 0.12)})`; // Cozy starlight evening
      ctx.fillRect(0, 0, W, H);
    }

    // 5. Floating Texts
    drawFloatingTexts(ctx);
  };

  const drawInteriorScene = (ctx: CanvasRenderingContext2D, now: number) => {
    const W = MAP_COLS * TILE_PIXEL;
    const H = MAP_ROWS * TILE_PIXEL;
    ctx.clearRect(0, 0, W, H);

    // Cozy dark background around cabin
    ctx.fillStyle = '#1c130e';
    ctx.fillRect(0, 0, W, H);

    const intImg = getCachedImage(SPRITE_SHEETS.interior);
    const uiImg = getCachedImage(SPRITE_SHEETS.uiCozy);

    // Cabin Room Bounds: cols 7..16 (10 tiles = 480px), rows 4..12 (9 tiles = 432px)
    const rx = 7 * TILE_PIXEL;
    const ry = 4 * TILE_PIXEL;
    const rw = 10 * TILE_PIXEL;
    const rh = 9 * TILE_PIXEL;

    // Outer wooden cabin frame
    ctx.fillStyle = '#5c3a21';
    ctx.fillRect(rx - 12, ry - 12, rw + 24, rh + 24);

    // Back wall (rows 4..5)
    ctx.fillStyle = '#e7cfa8';
    ctx.fillRect(rx, ry, rw, TILE_PIXEL * 2);
    ctx.fillStyle = '#c8a97e';
    ctx.fillRect(rx, ry + TILE_PIXEL * 2 - 8, rw, 8);

    // Warm plank wood floor (rows 6..12)
    for (let y = 6; y <= 12; y++) {
      for (let x = 7; x <= 16; x++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? '#b87d4b' : '#ad7342';
        ctx.fillRect(x * TILE_PIXEL, y * TILE_PIXEL, TILE_PIXEL, TILE_PIXEL);
        ctx.fillStyle = '#965f32';
        ctx.fillRect(x * TILE_PIXEL, y * TILE_PIXEL + TILE_PIXEL - 3, TILE_PIXEL, 3);
      }
    }

    if (intImg.complete && intImg.naturalWidth > 0) {
      // Green Striped Rug in center (x: 10..13, y: 8..9) -> sprite (0, 82, 48, 30)
      ctx.drawImage(intImg, 0, 82, 48, 30, 10 * TILE_PIXEL, 8 * TILE_PIXEL, 48 * 3, 30 * 3);

      // Window with Blue Curtains on back wall -> sprite (16, 47, 48, 17)
      ctx.drawImage(intImg, 16, 47, 48, 17, 9.5 * TILE_PIXEL, 4.2 * TILE_PIXEL, 48 * 3, 17 * 3);

      // Wall Clock & Framed Flower Painting
      ctx.drawImage(intImg, 1, 18, 13, 13, 7.4 * TILE_PIXEL, 4.3 * TILE_PIXEL, 13 * 3, 13 * 3);
      ctx.drawImage(intImg, 18, 1, 12, 15, 15.1 * TILE_PIXEL, 4.2 * TILE_PIXEL, 12 * 3, 15 * 3);

      // Brick Fireplace at (12.2, 3.8) -> sprite (115, 8, 26, 40)
      ctx.drawImage(intImg, 115, 8, 26, 40, 12.2 * TILE_PIXEL, 3.7 * TILE_PIXEL, 26 * 3, 40 * 3);
      // Warm animated fire glow inside fireplace
      const glowRadius = 56 + Math.sin(now / 140) * 6;
      const grad = ctx.createRadialGradient(
        13 * TILE_PIXEL,
        5.5 * TILE_PIXEL,
        6,
        13 * TILE_PIXEL,
        5.5 * TILE_PIXEL,
        glowRadius
      );
      grad.addColorStop(0, 'rgba(251, 146, 60, 0.45)');
      grad.addColorStop(1, 'rgba(251, 146, 60, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(11 * TILE_PIXEL, 4 * TILE_PIXEL, TILE_PIXEL * 4, TILE_PIXEL * 4);

      // Cozy Bed at left (8, 5.2) -> sprite (87, 8, 18, 34)
      ctx.drawImage(intImg, 87, 8, 18, 34, 8 * TILE_PIXEL, 5.1 * TILE_PIXEL, 18 * 3, 34 * 3);
      drawPixelBadge(ctx, 8.6 * TILE_PIXEL, 4.9 * TILE_PIXEL, 'TIDUR (HARI BARU)', '#dbeafe', '#1e3a8a');

      // Wooden Dressers along top-right (14.2, 5.4) -> sprite (96, 120, 64, 18)
      ctx.drawImage(intImg, 96, 120, 32, 18, 14.3 * TILE_PIXEL, 5.3 * TILE_PIXEL, 32 * 3, 18 * 3);
      // Potted Red Tulip & Lamp on dresser
      ctx.drawImage(intImg, 4, 1, 8, 15, 14.5 * TILE_PIXEL, 4.5 * TILE_PIXEL, 8 * 3, 15 * 3);
      ctx.drawImage(intImg, 34, 0, 11, 16, 15.4 * TILE_PIXEL, 4.4 * TILE_PIXEL, 11 * 3, 16 * 3);

      // Dining Table & Chairs at (13.5, 8.5) -> sprite (68, 120, 24, 23)
      ctx.drawImage(intImg, 35, 125, 10, 18, 12.8 * TILE_PIXEL, 8.6 * TILE_PIXEL, 10 * 3, 18 * 3);
      ctx.drawImage(intImg, 68, 120, 24, 23, 13.4 * TILE_PIXEL, 8.4 * TILE_PIXEL, 24 * 3, 23 * 3);
      ctx.drawImage(intImg, 51, 125, 10, 18, 15.0 * TILE_PIXEL, 8.6 * TILE_PIXEL, 10 * 3, 18 * 3);

      // Cozy Latte Cup & Moka Pot on the Dining Table (from UiCozyFree.png)
      if (uiImg.complete && uiImg.naturalWidth > 0) {
        ctx.drawImage(
          uiImg,
          UI_SPRITES.latteCup.x,
          UI_SPRITES.latteCup.y,
          UI_SPRITES.latteCup.w,
          UI_SPRITES.latteCup.h,
          13.7 * TILE_PIXEL,
          8.3 * TILE_PIXEL,
          36,
          30
        );
        drawPixelBadge(ctx, 14.1 * TILE_PIXEL, 8.1 * TILE_PIXEL, 'MINUM KOPI (+40⚡)', '#fef3c7', '#451a03');
      }

      // Front Door Exit at bottom center (11.5, 12) -> sprite (144, 19, 16, 23)
      ctx.drawImage(intImg, 144, 19, 16, 23, 11.2 * TILE_PIXEL, 11.6 * TILE_PIXEL, 16 * 3, 23 * 3);
      drawPixelBadge(ctx, 11.7 * TILE_PIXEL, 11.4 * TILE_PIXEL, 'KELUAR KE KEBUN', '#dcfce7', '#14532d');
    }

    // Draw Player inside Cabin
    drawPlayer(ctx, playerRef.current);
    drawFloatingTexts(ctx);
  };

  const drawAnimal = (ctx: CanvasRenderingContext2D, animal: FarmAnimal, now: number) => {
    const px = animal.x * TILE_PIXEL;
    const py = animal.y * TILE_PIXEL;

    if (animal.species === 'cow_female' || animal.species === 'cow_male') {
      const img = getCachedImage(
        animal.species === 'cow_female' ? SPRITE_SHEETS.cowFemale : SPRITE_SHEETS.cowMale
      );
      if (!img.complete || img.naturalWidth === 0) return;

      // Cow spritesheet is 128x96 (4 cols x 3 rows of 32x32)
      // Row 0: Side (facing left), Row 1: Down, Row 2: Up
      const frame = animal.state === 'walk' ? animal.animFrame : animal.animFrame % 2;
      let row = 0;
      let flipX = false;
      if (animal.dir === 'down') row = 1;
      else if (animal.dir === 'up') row = 2;
      else if (animal.dir === 'right') {
        row = 0;
        flipX = true;
      }

      const drawW = TILE_PIXEL * 1.85;
      const drawH = TILE_PIXEL * 1.85;

      ctx.save();
      ctx.translate(px, py);
      if (flipX) ctx.scale(-1, 1);
      ctx.drawImage(img, frame * 32, row * 32, 32, 32, -drawW / 2, -drawH * 0.78, drawW, drawH);
      ctx.restore();

      if (animal.productReady && animal.species === 'cow_female') {
        const bob = Math.sin(now / 220) * 3;
        drawPixelBadge(ctx, px, py - TILE_PIXEL * 1.2 + bob, '🥛 SUSU SIAP', '#ffffff', '#1e3a8a');
      }
    } else {
      // Chickens & Baby Chick (64x32 or 64x48 -> 4 cols of 16x16)
      const sheet =
        animal.species === 'chicken_red'
          ? SPRITE_SHEETS.chickenRed
          : animal.species === 'chicken_blonde'
          ? SPRITE_SHEETS.chickenBlonde
          : SPRITE_SHEETS.chickYellow;
      const img = getCachedImage(sheet);
      if (!img.complete || img.naturalWidth === 0) return;

      const frame = animal.state === 'walk' ? animal.animFrame : animal.animFrame % 2;
      const row = animal.dir === 'right' || animal.dir === 'down' ? 1 : 0;
      const drawSize = TILE_PIXEL * 0.95;

      ctx.drawImage(
        img,
        frame * 16,
        row * 16,
        16,
        16,
        px - drawSize / 2,
        py - drawSize * 0.8,
        drawSize,
        drawSize
      );
    }
  };

  const drawPlayer = (
    ctx: CanvasRenderingContext2D,
    p: { x: number; y: number; dir: Direction; moving: boolean; animFrame: number; actionTimer: number }
  ) => {
    const img = getCachedImage(p.moving ? SPRITE_SHEETS.charWalk : SPRITE_SHEETS.charIdle);
    if (!img.complete || img.naturalWidth === 0) return;

    // 32x32 frame size. Row 0: Down, Row 1: Up, Row 2: Right (flip for Left)
    let row = 0;
    let flipX = false;
    if (p.dir === 'down') row = 0;
    else if (p.dir === 'up') row = 1;
    else if (p.dir === 'right') row = 2;
    else if (p.dir === 'left') {
      row = 2;
      flipX = true;
    }

    const maxCols = p.moving ? 6 : 4;
    const col = p.animFrame % maxCols;

    const px = p.x * TILE_PIXEL;
    const py = p.y * TILE_PIXEL;
    const drawSize = TILE_PIXEL * 2.1; // 32x32 scaled to match 16x16 world

    // Subtle ground shadow under player feet
    ctx.fillStyle = 'rgba(0, 0, 0, 0.24)';
    ctx.beginPath();
    ctx.ellipse(px, py + 4, 15, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(px, py);
    if (flipX) ctx.scale(-1, 1);
    if (p.actionTimer > 0) {
      ctx.rotate(Math.sin(p.actionTimer * 28) * 0.14);
    }
    ctx.drawImage(
      img,
      col * 32,
      row * 32,
      32,
      32,
      -drawSize / 2,
      -drawSize * 0.72,
      drawSize,
      drawSize
    );
    ctx.restore();
  };

  const drawPixelBadge = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    text: string,
    bgColor: string,
    textColor: string
  ) => {
    ctx.save();
    ctx.font = 'bold 11px "Plus Jakarta Sans", sans-serif';
    const metrics = ctx.measureText(text);
    const padX = 7;
    const w = metrics.width + padX * 2;
    const h = 20;
    ctx.fillStyle = '#422c22';
    ctx.fillRect(x - w / 2 - 2, y - h - 2, w + 4, h + 4);
    ctx.fillStyle = bgColor;
    ctx.fillRect(x - w / 2, y - h, w, h);
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y - h / 2 + 1);
    ctx.restore();
  };

  const drawFloatingTexts = (ctx: CanvasRenderingContext2D) => {
    for (const ft of floatingTexts) {
      const px = (ft.x + 0.5) * TILE_PIXEL;
      const py = (ft.y - (1 - ft.life) * 0.9) * TILE_PIXEL;
      ctx.save();
      ctx.font = 'bold 14px "Fredoka", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#231915';
      ctx.fillText(ft.text, px + 2, py + 2);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, px, py);
      ctx.restore();
    }
  };

  const getTileFromMouse = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const cx = (e.clientX - rect.left) * scaleX;
    const cy = (e.clientY - rect.top) * scaleY;
    const tx = Math.floor(cx / TILE_PIXEL);
    const ty = Math.floor(cy / TILE_PIXEL);
    return { tx, ty };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getTileFromMouse(e);
    if (!pos) return;
    hoverTileRef.current = { x: pos.tx, y: pos.ty };

    if (zone === 'INTERIOR') {
      if (pos.ty >= 11 && pos.tx >= 10 && pos.tx <= 13) setHoverHint('Keluar ke Kebun Lembah');
      else if (pos.tx >= 7 && pos.tx <= 10 && pos.ty >= 4 && pos.ty <= 7)
        setHoverHint('Tidur di Kasur (Lanjut ke Hari Berikutnya)');
      else if (pos.tx >= 12 && pos.tx <= 15 && pos.ty >= 7 && pos.ty <= 10)
        setHoverHint('Minum Cozy Latte Hangat (+40 Energi)');
      else setHoverHint('Klik lantai untuk berjalan di dalam rumah');
      return;
    }

    const { tx, ty } = pos;
    if (tx >= 18 && tx <= 20 && ty >= 3 && ty <= 4) {
      setHoverHint('Masuk ke Dalam Rumah Pertanian [Klik]');
      return;
    }
    if (tx === CHEST_POS.x && ty === CHEST_POS.y) {
      setHoverHint('Buka Peti Pengiriman & Pasar Desa [Klik]');
      return;
    }

    const nearAnimal = animals.find(
      (a) => Math.hypot(a.x - (tx + 0.5), a.y - (ty + 0.5)) < 1.0
    );
    if (nearAnimal) {
      if (nearAnimal.species === 'cow_female' && nearAnimal.productReady) {
        setHoverHint(`Perah Susu Segar & Elus ${nearAnimal.name}`);
      } else {
        setHoverHint(`Elus ${nearAnimal.name} (+Hati ♥)`);
      }
      return;
    }

    const tile = grid[ty]?.[tx];
    if (!tile) {
      setHoverHint('');
      return;
    }
    if (tile.eggCount && tile.eggCount > 0) {
      setHoverHint('Ambil Telur Ayam Segar');
    } else if (tile.crop) {
      const def = CROPS[tile.crop.type];
      if (tile.crop.stage >= def.stages - 1) {
        setHoverHint(`Panen ${def.indonesianName} (Siap Panen!)`);
      } else if (!tile.crop.watered) {
        setHoverHint(`${def.indonesianName} — Belum Disiram`);
      } else {
        setHoverHint(`${def.indonesianName} — Sudah Disiram ✓`);
      }
    } else if (tile.tree) {
      setHoverHint(
        tile.tree.stage >= 2
          ? 'Pohon Maple (Gunakan Kapak untuk Menebang)'
          : 'Tunas Pohon Maple'
      );
    } else if (tile.ground === 'water') {
      setHoverHint('Kolam Mata Air (Isi Ulang Penyiram)');
    } else if (tile.ground === 'tilled') {
      setHoverHint('Tanah Gembur (Siap Ditanami Bibit)');
    } else {
      setHoverHint(`Petak (${tx}, ${ty}) — Klik untuk jalan / gunakan alat`);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getTileFromMouse(e);
    if (!pos) return;
    const { tx, ty } = pos;
    const p = playerRef.current;
    const dist = Math.hypot(tx + 0.5 - p.x, ty + 0.5 - p.y);

    if (dist <= 1.95) {
      // Face the clicked tile and act immediately
      if (Math.abs(tx + 0.5 - p.x) > Math.abs(ty + 0.5 - p.y)) {
        p.dir = tx + 0.5 > p.x ? 'right' : 'left';
      } else {
        p.dir = ty + 0.5 > p.y ? 'down' : 'up';
      }
      p.actionTimer = 0.22;
      triggerInteractionAt(tx, ty);
    } else {
      // Walk to tile and interact upon arrival!
      p.targetTile = { x: tx, y: ty, actOnArrive: true };
    }
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-[#1c130e] overflow-hidden select-none">
      <canvas
        ref={canvasRef}
        width={MAP_COLS * TILE_PIXEL}
        height={MAP_ROWS * TILE_PIXEL}
        onMouseMove={handleMouseMove}
        onClick={handleCanvasClick}
        className="pixelated max-w-full max-h-full object-contain cursor-pointer shadow-2xl border-4 border-[#5a3b2c] rounded-lg"
      />

      {/* Contextual Hover Action Pill at Top-Center of Canvas */}
      {hoverHint && (
        <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 bg-[#231915]/90 text-[#fef3c7] border border-[#7c533e] px-3.5 py-1 rounded-md text-xs font-medium tracking-wide whitespace-nowrap shadow-md">
          {hoverHint}
        </div>
      )}
    </div>
  );
};
