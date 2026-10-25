import React, { useEffect, useRef } from 'react';
import { SpriteRect } from '../data/sprites';

const imageCache: Record<string, HTMLImageElement> = {};
const loadCallbacks: Record<string, Array<() => void>> = {};

export function getCachedImage(src: string, onLoad?: () => void): HTMLImageElement {
  if (imageCache[src]) {
    if (imageCache[src].complete && onLoad) {
      onLoad();
    } else if (onLoad) {
      loadCallbacks[src] = loadCallbacks[src] || [];
      loadCallbacks[src].push(onLoad);
    }
    return imageCache[src];
  }

  const img = new Image();
  imageCache[src] = img;
  loadCallbacks[src] = onLoad ? [onLoad] : [];

  img.onload = () => {
    const cbs = loadCallbacks[src] || [];
    delete loadCallbacks[src];
    cbs.forEach((cb) => cb());
  };

  img.src = src;
  return img;
}

interface SpriteIconProps {
  sprite: SpriteRect;
  scale?: number;
  className?: string;
  flipX?: boolean;
  title?: string;
}

export const SpriteIcon: React.FC<SpriteIconProps> = ({
  sprite,
  scale = 2.5,
  className = '',
  flipX = false,
  title,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const width = Math.round(sprite.w * scale);
  const height = Math.round(sprite.h * scale);

  useEffect(() => {
    let mounted = true;
    const draw = () => {
      if (!mounted || !canvasRef.current) return;
      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      ctx.imageSmoothingEnabled = false;
      const img = imageCache[sprite.sheet];
      if (!img || !img.complete || img.naturalWidth === 0) return;

      ctx.save();
      if (flipX) {
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(
        img,
        sprite.x,
        sprite.y,
        sprite.w,
        sprite.h,
        0,
        0,
        width,
        height
      );
      ctx.restore();
    };

    getCachedImage(sprite.sheet, draw);
    draw();

    return () => {
      mounted = false;
    };
  }, [sprite.sheet, sprite.x, sprite.y, sprite.w, sprite.h, scale, width, height, flipX]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      title={title}
      className={`pixelated inline-block shrink-0 ${className}`}
    />
  );
};
