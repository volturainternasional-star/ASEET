import React, { useState } from 'react';
import {
  CROPS,
  CropType,
  getHarvestSprite,
  getSeedBagSprite,
  StarQuality,
  UI_SPRITES,
} from '../data/sprites';
import { AnimalSpecies, InventoryState } from '../types/game';
import { SpriteIcon } from './SpriteIcon';

interface MarketModalProps {
  gold: number;
  inventory: InventoryState;
  onClose: () => void;
  onBuySeed: (crop: CropType, count: number) => void;
  onBuyMapleAcorn: (count: number) => void;
  onBuyLatte: () => void;
  onBuyAnimal: (species: AnimalSpecies, price: number, label: string) => void;
  onSellCrop: (cropKey: string, unitPrice: number, count: number) => void;
  onSellResource: (type: 'eggs' | 'milk' | 'wood' | 'mapleSap', unitPrice: number, count: number) => void;
  onSellAllHarvest: () => void;
}

export const MarketModal: React.FC<MarketModalProps> = ({
  gold,
  inventory,
  onClose,
  onBuySeed,
  onBuyMapleAcorn,
  onBuyLatte,
  onBuyAnimal,
  onSellCrop,
  onSellResource,
  onSellAllHarvest,
}) => {
  const [activeTab, setActiveTab] = useState<'seeds' | 'sell' | 'ranch'>('seeds');

  const qualityMultipliers: Record<StarQuality, { label: string; mult: number; badge: string }> = {
    0: { label: 'Segar Biasa', mult: 1, badge: 'Biasa' },
    1: { label: 'Bintang Perak ★', mult: 1.25, badge: '★ Perak' },
    2: { label: 'Bintang Emas ★', mult: 1.5, badge: '★ Emas' },
    3: { label: 'Bintang Ungu ★', mult: 2.0, badge: '★ Ungu' },
  };

  // List all owned harvested crops
  const ownedCrops: Array<{
    key: string;
    crop: CropType;
    quality: StarQuality;
    count: number;
    unitPrice: number;
  }> = [];

  (Object.keys(CROPS) as CropType[]).forEach((crop) => {
    ([0, 1, 2, 3] as StarQuality[]).forEach((q) => {
      const key = `${crop}_${q}`;
      const count = inventory.crops[key] || 0;
      if (count > 0) {
        const unitPrice = Math.round(CROPS[crop].baseSellPrice * qualityMultipliers[q].mult);
        ownedCrops.push({ key, crop, quality: q, count, unitPrice });
      }
    });
  });

  const totalSellableValue =
    ownedCrops.reduce((acc, c) => acc + c.count * c.unitPrice, 0) +
    inventory.eggs * 35 +
    inventory.milk * 65 +
    inventory.mapleSap * 45;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4">
      <div className="w-full max-w-3xl bg-[#ecdcc2] border-4 border-[#6b4433] rounded-xl shadow-2xl overflow-hidden text-[#3d251a]">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#6b4433] text-[#fdf6e9]">
          <div className="flex items-center gap-3">
            <SpriteIcon sprite={UI_SPRITES.chestOpen} scale={2.4} />
            <div>
              <h2 className="text-xl font-bold tracking-tight font-display">
                Pasar Lembah & Peti Pengiriman
              </h2>
              <p className="text-xs text-[#e6ccb2]">
                Beli bibit musim semi, jual hasil panen bintang, atau adopsi ternak baru
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="px-3.5 py-1.5 bg-[#4a2e21] rounded-lg border border-[#8c5a44] text-sm font-mono-num font-bold text-amber-300">
              {gold.toLocaleString('id-ID')} G
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-[#8c5a44] hover:bg-[#a16950] transition-colors cursor-pointer"
              title="Tutup Pasar"
            >
              <SpriteIcon sprite={UI_SPRITES.iconCloseCream} scale={2} />
            </button>
          </div>
        </div>

        {/* Interactive Filter Tabs */}
        <div className="flex items-center justify-between px-6 py-3 bg-[#dfc8a6] border-b border-[#c5ab86]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('seeds')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'seeds'
                  ? 'bg-[#6b4433] text-[#fdf6e9] shadow-sm'
                  : 'bg-[#ecdcc2] text-[#593828] hover:bg-[#e4d0b1]'
              }`}
            >
              Beli Bibit Tanaman
            </button>
            <button
              onClick={() => setActiveTab('sell')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'sell'
                  ? 'bg-[#6b4433] text-[#fdf6e9] shadow-sm'
                  : 'bg-[#ecdcc2] text-[#593828] hover:bg-[#e4d0b1]'
              }`}
            >
              Jual Panen & Produk ({ownedCrops.length + (inventory.eggs > 0 ? 1 : 0) + (inventory.milk > 0 ? 1 : 0)})
            </button>
            <button
              onClick={() => setActiveTab('ranch')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'ranch'
                  ? 'bg-[#6b4433] text-[#fdf6e9] shadow-sm'
                  : 'bg-[#ecdcc2] text-[#593828] hover:bg-[#e4d0b1]'
              }`}
            >
              Ternak & Kedai Kopi Cozy
            </button>
          </div>

          {totalSellableValue > 0 && (
            <button
              onClick={onSellAllHarvest}
              className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 shadow-sm"
            >
              Jual Semua Hasil (+{totalSellableValue} G)
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[62vh] overflow-y-auto space-y-4">
          {activeTab === 'seeds' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(Object.keys(CROPS) as CropType[]).map((cropKey) => {
                const def = CROPS[cropKey];
                const ownedSeeds = inventory.seeds[cropKey] || 0;
                return (
                  <div
                    key={cropKey}
                    className="flex flex-col justify-between p-4 rounded-xl bg-[#f7efe2] border border-[#cbb28e]"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="p-2.5 rounded-lg bg-[#e8d6b9] border border-[#c7ad88] flex items-center justify-center">
                        <SpriteIcon sprite={getSeedBagSprite(cropKey)} scale={3} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-bold text-base text-[#3d251a] truncate">
                            Bibit {def.indonesianName}
                          </h3>
                          <span className="text-xs font-mono-num text-[#7c533e]">
                            Tas: {ownedSeeds}
                          </span>
                        </div>
                        <p className="text-xs text-[#694635] mt-1 leading-relaxed">
                          {def.description}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-[#7c533e] mt-2 font-mono-num">
                          <span>Panen {def.daysToGrow} hari</span>
                          <span aria-hidden="true">·</span>
                          <span>Harga jual ~{def.baseSellPrice} G</span>
                          {def.regrows && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-emerald-800 font-semibold">Panen Berulang</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-[#e2cfb3]">
                      <button
                        onClick={() => onBuySeed(cropKey, 1)}
                        disabled={gold < def.seedPrice}
                        className="px-3.5 py-1.5 rounded-lg bg-[#6b4433] hover:bg-[#573628] disabled:opacity-40 text-[#fdf6e9] text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0"
                      >
                        Beli 1 ({def.seedPrice} G)
                      </button>
                      <button
                        onClick={() => onBuySeed(cropKey, 5)}
                        disabled={gold < def.seedPrice * 5}
                        className="px-3.5 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-600 disabled:opacity-40 text-white text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0"
                      >
                        Beli 5 ({def.seedPrice * 5} G)
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Maple Tree Sapling Seed */}
              <div className="flex flex-col justify-between p-4 rounded-xl bg-[#f7efe2] border border-[#cbb28e] md:col-span-2">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3.5">
                    <div className="p-2 rounded-lg bg-[#e8d6b9] border border-[#c7ad88]">
                      <SpriteIcon sprite={UI_SPRITES.mapleSapling} scale={2.2} />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-[#3d251a]">
                        Biji Pohon Maple (Maple Acorn)
                      </h3>
                      <p className="text-xs text-[#694635] mt-0.5">
                        Tanam di rumput kosong untuk menumbuhkan Pohon Maple penghasil Kayu & Sirup Maple. (Di tas: {inventory.mapleAcorn})
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => onBuyMapleAcorn(1)}
                    disabled={gold < 30}
                    className="px-4 py-2 rounded-lg bg-[#6b4433] hover:bg-[#573628] disabled:opacity-40 text-[#fdf6e9] text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Beli Biji Maple (30 G)
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sell' && (
            <div className="space-y-4">
              {ownedCrops.length === 0 &&
              inventory.eggs === 0 &&
              inventory.milk === 0 &&
              inventory.wood === 0 &&
              inventory.mapleSap === 0 ? (
                <div className="p-8 text-center rounded-xl bg-[#f7efe2] border border-[#cbb28e]">
                  <p className="text-sm font-semibold text-[#593828]">
                    Keranjang penjualanmu masih kosong.
                  </p>
                  <p className="text-xs text-[#7c533e] mt-1">
                    Panen tanaman yang sudah matang di kebun, kumpulkan telur ayam, atau perah susu sapi terlebih dahulu!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {ownedCrops.map((item) => {
                    const def = CROPS[item.crop];
                    const qInfo = qualityMultipliers[item.quality];
                    return (
                      <div
                        key={item.key}
                        className="flex items-center justify-between p-3.5 rounded-xl bg-[#f7efe2] border border-[#cbb28e]"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-[#e8d6b9] border border-[#c7ad88]">
                            <SpriteIcon
                              sprite={getHarvestSprite(item.crop, item.quality)}
                              scale={2.8}
                            />
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-[#3d251a]">
                              {def.indonesianName}
                            </h4>
                            <div className="flex items-center gap-2 text-xs text-[#7c533e] font-mono-num mt-0.5">
                              <span>{qInfo.label}</span>
                              <span aria-hidden="true">·</span>
                              <span>Stok: {item.count}</span>
                              <span aria-hidden="true">·</span>
                              <span className="font-bold text-amber-800">{item.unitPrice} G/buah</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => onSellCrop(item.key, item.unitPrice, 1)}
                            className="px-3 py-1.5 rounded-lg bg-[#6b4433] hover:bg-[#573628] text-white text-xs font-bold cursor-pointer whitespace-nowrap shrink-0"
                          >
                            Jual 1
                          </button>
                          {item.count > 1 && (
                            <button
                              onClick={() => onSellCrop(item.key, item.unitPrice, item.count)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold cursor-pointer whitespace-nowrap shrink-0"
                            >
                              Semua (+{item.count * item.unitPrice} G)
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Eggs */}
                  {inventory.eggs > 0 && (
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#f7efe2] border border-[#cbb28e]">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-[#e8d6b9] border border-[#c7ad88]">
                          <SpriteIcon sprite={UI_SPRITES.eggWhite} scale={2.8} />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-[#3d251a]">Telur Ayam Kampung</h4>
                          <p className="text-xs text-[#7c533e] font-mono-num">
                            Stok: {inventory.eggs} · 35 G/butir
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => onSellResource('eggs', 35, inventory.eggs)}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold cursor-pointer whitespace-nowrap shrink-0"
                      >
                        Jual Semua (+{inventory.eggs * 35} G)
                      </button>
                    </div>
                  )}

                  {/* Milk */}
                  {inventory.milk > 0 && (
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#f7efe2] border border-[#cbb28e]">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-[#e8d6b9] border border-[#c7ad88]">
                          <SpriteIcon sprite={UI_SPRITES.cowFemaleIcon} scale={1.5} />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-[#3d251a]">Susu Sapi Segar</h4>
                          <p className="text-xs text-[#7c533e] font-mono-num">
                            Stok: {inventory.milk} · 65 G/botol
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => onSellResource('milk', 65, inventory.milk)}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold cursor-pointer whitespace-nowrap shrink-0"
                      >
                        Jual Semua (+{inventory.milk * 65} G)
                      </button>
                    </div>
                  )}

                  {/* Maple Sap */}
                  {inventory.mapleSap > 0 && (
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#f7efe2] border border-[#cbb28e]">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-[#e8d6b9] border border-[#c7ad88]">
                          <SpriteIcon sprite={UI_SPRITES.mapleTreeFull} scale={1} />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-[#3d251a]">Sirup Pohon Maple</h4>
                          <p className="text-xs text-[#7c533e] font-mono-num">
                            Stok: {inventory.mapleSap} · 45 G/botol
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => onSellResource('mapleSap', 45, inventory.mapleSap)}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold cursor-pointer whitespace-nowrap shrink-0"
                      >
                        Jual Semua (+{inventory.mapleSap * 45} G)
                      </button>
                    </div>
                  )}

                  {/* Maple Wood */}
                  {inventory.wood > 0 && (
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#f7efe2] border border-[#cbb28e]">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-[#e8d6b9] border border-[#c7ad88]">
                          <SpriteIcon sprite={UI_SPRITES.mapleStump} scale={1.5} />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-[#3d251a]">Kayu Maple</h4>
                          <p className="text-xs text-[#7c533e] font-mono-num">
                            Stok: {inventory.wood} · 18 G/batang
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => onSellResource('wood', 18, inventory.wood)}
                        className="px-3.5 py-1.5 rounded-lg bg-[#6b4433] hover:bg-[#573628] text-white text-xs font-bold cursor-pointer whitespace-nowrap shrink-0"
                      >
                        Jual Semua (+{inventory.wood * 18} G)
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'ranch' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Cozy Cafe Espresso & Latte */}
              <div className="p-4 rounded-xl bg-[#f7efe2] border border-[#cbb28e] flex items-center justify-between gap-4 md:col-span-2">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-lg bg-[#e8d6b9] border border-[#c7ad88] flex items-center gap-2">
                    <SpriteIcon sprite={UI_SPRITES.mokaPot} scale={1.1} />
                    <SpriteIcon sprite={UI_SPRITES.latteCup} scale={1.5} />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-[#3d251a]">
                      Cozy Valley Latte (Dari Aset UiCozyFree)
                    </h3>
                    <p className="text-xs text-[#694635] mt-0.5">
                      Kopi susu hangat yang memulihkan +45 Energi seketika saat berkebun. (Stok di tas: {inventory.cozyLatte})
                    </p>
                  </div>
                </div>
                <button
                  onClick={onBuyLatte}
                  disabled={gold < 40}
                  className="px-4 py-2 rounded-lg bg-amber-700 hover:bg-amber-600 disabled:opacity-40 text-white text-xs font-bold cursor-pointer whitespace-nowrap shrink-0"
                >
                  Seduh Latte (40 G)
                </button>
              </div>

              {/* Adopt Red Chicken */}
              <div className="p-4 rounded-xl bg-[#f7efe2] border border-[#cbb28e] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-[#e8d6b9] border border-[#c7ad88]">
                    <SpriteIcon sprite={UI_SPRITES.chickenRedIcon} scale={2.8} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[#3d251a]">Ayam Merah Petelur</h4>
                    <p className="text-xs text-[#694635]">Menghasilkan telur segar di kandang setiap pagi.</p>
                  </div>
                </div>
                <button
                  onClick={() => onBuyAnimal('chicken_red', 180, 'Ayam Merah')}
                  disabled={gold < 180}
                  className="px-3.5 py-2 rounded-lg bg-[#6b4433] hover:bg-[#573628] disabled:opacity-40 text-white text-xs font-bold cursor-pointer whitespace-nowrap shrink-0"
                >
                  Adopsi (180 G)
                </button>
              </div>

              {/* Adopt Blonde Chicken */}
              <div className="p-4 rounded-xl bg-[#f7efe2] border border-[#cbb28e] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-[#e8d6b9] border border-[#c7ad88]">
                    <SpriteIcon sprite={UI_SPRITES.chickenBlondeIcon} scale={2.8} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[#3d251a]">Ayam Emas Petelur</h4>
                    <p className="text-xs text-[#694635]">Ayam jinak yang rajin bertelur di padang rumput.</p>
                  </div>
                </div>
                <button
                  onClick={() => onBuyAnimal('chicken_blonde', 200, 'Ayam Emas')}
                  disabled={gold < 200}
                  className="px-3.5 py-2 rounded-lg bg-[#6b4433] hover:bg-[#573628] disabled:opacity-40 text-white text-xs font-bold cursor-pointer whitespace-nowrap shrink-0"
                >
                  Adopsi (200 G)
                </button>
              </div>

              {/* Adopt Baby Chick */}
              <div className="p-4 rounded-xl bg-[#f7efe2] border border-[#cbb28e] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-[#e8d6b9] border border-[#c7ad88]">
                    <SpriteIcon sprite={UI_SPRITES.chickIcon} scale={2.8} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[#3d251a]">Anak Ayam Kuning</h4>
                    <p className="text-xs text-[#694635]">Anak ayam menggemaskan yang membawa keberuntungan kebun.</p>
                  </div>
                </div>
                <button
                  onClick={() => onBuyAnimal('chick_yellow', 120, 'Anak Ayam')}
                  disabled={gold < 120}
                  className="px-3.5 py-2 rounded-lg bg-[#6b4433] hover:bg-[#573628] disabled:opacity-40 text-white text-xs font-bold cursor-pointer whitespace-nowrap shrink-0"
                >
                  Adopsi (120 G)
                </button>
              </div>

              {/* Adopt Female Dairy Cow */}
              <div className="p-4 rounded-xl bg-[#f7efe2] border border-[#cbb28e] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-lg bg-[#e8d6b9] border border-[#c7ad88]">
                    <SpriteIcon sprite={UI_SPRITES.cowFemaleIcon} scale={1.6} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[#3d251a]">Sapi Perah Cokelat</h4>
                    <p className="text-xs text-[#694635]">Menghasilkan Susu Sapi Segar (65 G) setiap hari.</p>
                  </div>
                </div>
                <button
                  onClick={() => onBuyAnimal('cow_female', 380, 'Sapi Perah')}
                  disabled={gold < 380}
                  className="px-3.5 py-2 rounded-lg bg-[#6b4433] hover:bg-[#573628] disabled:opacity-40 text-white text-xs font-bold cursor-pointer whitespace-nowrap shrink-0"
                >
                  Adopsi (380 G)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
