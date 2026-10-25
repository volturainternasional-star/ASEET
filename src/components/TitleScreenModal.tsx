import React, { useState } from 'react';
import { getHarvestSprite, SPRITE_SHEETS, UI_SPRITES } from '../data/sprites';
import { SpriteIcon } from './SpriteIcon';

interface TitleScreenModalProps {
  onStartGame: () => void;
}

export const TitleScreenModal: React.FC<TitleScreenModalProps> = ({ onStartGame }) => {
  const [pressed, setPressed] = useState(false);

  const handleStart = () => {
    setPressed(true);
    setTimeout(() => {
      onStartGame();
    }, 120);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1c130e]/90 p-4 select-none">
      <div className="w-full max-w-2xl bg-[#ecdcc2] border-4 border-[#6b4433] rounded-2xl shadow-2xl overflow-hidden text-[#3d251a]">
        {/* Hero Banner showcasing the actual sprites from the user's RAR & ZIP packs */}
        <div className="relative bg-gradient-to-b from-[#79c257] to-[#5ea83e] px-6 py-7 border-b-4 border-[#6b4433] flex flex-col items-center text-center overflow-hidden">
          <div className="flex items-end justify-center gap-5 mb-4">
            <SpriteIcon sprite={UI_SPRITES.mapleTreeFull} scale={2.2} />
            <SpriteIcon
              sprite={{ sheet: SPRITE_SHEETS.charIdle, x: 0, y: 0, w: 32, h: 32 }}
              scale={2.8}
            />
            <SpriteIcon sprite={UI_SPRITES.cowFemaleIcon} scale={2.4} />
            <SpriteIcon sprite={UI_SPRITES.chickenRedIcon} scale={2.6} />
            <SpriteIcon sprite={UI_SPRITES.chickIcon} scale={2.5} />
            <SpriteIcon sprite={UI_SPRITES.latteCup} scale={2} />
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-[#fef3c7] drop-shadow-[0_3px_0_#3d251a] font-display tracking-tight">
            Cozy Pixel Valley 16x16
          </h1>
          <p className="text-xs md:text-sm text-[#fef9c3] font-medium mt-1 drop-shadow-[0_1px_0_#3d251a]">
            Dibangun langsung dari aset Farm RPG 16x16 Tiny Asset Pack & UiCozyFree milikmu
          </p>
        </div>

        {/* Game Rules & Asset Showcase */}
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
            <div className="p-3.5 rounded-xl bg-[#f7efe2] border border-[#cbb28e]">
              <div className="flex items-center gap-2 mb-1.5">
                <SpriteIcon sprite={getHarvestSprite('strawberry', 2)} scale={2.2} />
                <span className="font-bold text-sm">4 Tanaman Musim Semi</span>
              </div>
              <p className="text-xs text-[#694635] leading-relaxed">
                Cangkul tanah, tanam Stroberi, Daun Bawang, Kentang & Bawang Manis, lalu siram setiap hari hingga panen bintang!
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#f7efe2] border border-[#cbb28e]">
              <div className="flex items-center gap-2 mb-1.5">
                <SpriteIcon sprite={UI_SPRITES.eggWhite} scale={2.2} />
                <span className="font-bold text-sm">Peternakan & Hutan</span>
              </div>
              <p className="text-xs text-[#694635] leading-relaxed">
                Elus Sapi & Ayam, perah Susu Segar, pungut Telur Ayam di rumput, dan tebang Pohon Maple untuk Kayu & Sirup.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#f7efe2] border border-[#cbb28e]">
              <div className="flex items-center gap-2 mb-1.5">
                <SpriteIcon sprite={UI_SPRITES.mokaPot} scale={0.7} />
                <span className="font-bold text-sm">Rumah & Kafe Cozy</span>
              </div>
              <p className="text-xs text-[#694635] leading-relaxed">
                Masuk ke dalam Farmhouse untuk minum Cozy Latte (+Energi) atau tidur di kasur untuk lanjut ke hari esok.
              </p>
            </div>
          </div>

          {/* Controls Summary */}
          <div className="px-4 py-3 rounded-xl bg-[#dfc8a6] border border-[#c5ab86] flex flex-wrap items-center justify-between gap-2 text-xs text-[#4a2e21]">
            <span>
              <strong>Jalan:</strong> WASD / Tombol Panah / Klik Petak
            </span>
            <span aria-hidden="true">·</span>
            <span>
              <strong>Aksi Alat:</strong> Klik Petak / Tombol Spasi / E
            </span>
            <span aria-hidden="true">·</span>
            <span>
              <strong>Pilih Alat:</strong> Angka 1–9 atau Klik Hotbar Bawah
            </span>
          </div>

          {/* Authentic PLAY Sprite Button from UiCozyFree.png */}
          <div className="flex flex-col items-center pt-1">
            <button
              onClick={handleStart}
              onMouseDown={() => setPressed(true)}
              onMouseUp={() => setPressed(false)}
              className="group relative inline-flex items-center justify-center transition-transform active:scale-95 cursor-pointer focus:outline-none"
              aria-label="Start Game"
            >
              <SpriteIcon
                sprite={pressed ? UI_SPRITES.playBtnPressed : UI_SPRITES.playBtnNormal}
                scale={2.6}
              />
            </button>
            <span className="text-xs text-[#7c533e] mt-2">
              Klik tombol PLAY pixel di atas untuk mulai berkebun
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
