import React, { useEffect, useState } from 'react';
import { BlockType, BLOCK_DEFINITIONS } from '../game/blocks';
import { getBlockIconDataUrl } from '../game/textures';
import { Volume2, VolumeX, Menu, Compass } from 'lucide-react';
import { soundManager } from '../game/audio';

interface HUDProps {
  hotbar: BlockType[];
  selectedSlot: number;
  onSelectSlot: (slot: number) => void;
  onOpenInventory: () => void;
  onOpenPauseMenu: () => void;
  isFlying: boolean;
  onToggleFlight: () => void;
  playerPos: { x: number; y: number; z: number };
  playerYaw: number;
  targetBlock: { type: BlockType; x: number; y: number; z: number } | null;
  fps: number;
}

export const HUD: React.FC<HUDProps> = ({
  hotbar,
  selectedSlot,
  onSelectSlot,
  onOpenInventory,
  onOpenPauseMenu,
  isFlying,
  onToggleFlight,
  playerPos,
  playerYaw,
  targetBlock,
  fps,
}) => {
  const [showF3, setShowF3] = useState(false);
  const [itemNameToast, setItemNameToast] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState(soundManager.enabled);

  // Show block name briefly when slot changes
  useEffect(() => {
    const curBlock = hotbar[selectedSlot];
    if (curBlock !== undefined) {
      const def = BLOCK_DEFINITIONS[curBlock];
      setItemNameToast(def ? def.nameDe : '');
      const timer = setTimeout(() => setItemNameToast(''), 1800);
      return () => clearTimeout(timer);
    }
  }, [selectedSlot, hotbar]);

  // Compute Cardinal Facing direction
  const getFacingDirection = (yaw: number): string => {
    // Yaw: 0 is -Z (North), PI/2 is -X (West), PI is +Z (South), -PI/2 is +X (East)
    const normalized = ((yaw % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const deg = (normalized * 180) / Math.PI;
    if (deg >= 315 || deg < 45) return 'Norden (-Z)';
    if (deg >= 45 && deg < 135) return 'Westen (-X)';
    if (deg >= 135 && deg < 225) return 'Süden (+Z)';
    return 'Osten (+X)';
  };

  const toggleSound = () => {
    soundManager.enabled = !soundManager.enabled;
    setSoundEnabled(soundManager.enabled);
  };

  return (
    <div className="absolute inset-0 pointer-events-none select-none flex flex-col justify-between p-3">
      {/* Top Header Bar */}
      <div className="flex items-start justify-between">
        {/* Left: Quick Actions & Brand */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={onOpenPauseMenu}
            className="mc-button px-3 py-1.5 text-xs font-minecraft flex items-center gap-1.5 cursor-pointer shadow-md"
            title="Pausemenü (ESC)"
          >
            <Menu className="w-3.5 h-3.5" />
            <span>Menü</span>
          </button>

          <button
            onClick={onOpenInventory}
            className="mc-button px-3 py-1.5 text-xs font-minecraft flex items-center gap-1.5 cursor-pointer shadow-md"
            title="Inventar öffnen (E)"
          >
            <span>Inventar (E)</span>
          </button>

          <button
            onClick={() => setShowF3(!showF3)}
            className={`mc-button px-2.5 py-1.5 text-xs font-minecraft flex items-center gap-1 cursor-pointer ${
              showF3 ? 'bg-amber-700!' : ''
            }`}
            title="F3 Koordinaten anzeigen"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>F3</span>
          </button>

          <button
            onClick={toggleSound}
            className="mc-button p-1.5 text-xs font-minecraft cursor-pointer"
            title="Ton an/aus"
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5 text-red-400" />}
          </button>
        </div>

        {/* Right: Flight badge & Mode */}
        <div className="flex items-center gap-2">
          {isFlying && (
            <div className="bg-black/60 border border-amber-500/80 px-2.5 py-1 text-[11px] font-minecraft text-amber-300 animate-pulse">
              ✈ FLUGMODUS (F)
            </div>
          )}
          <div className="bg-black/50 border border-white/20 px-2.5 py-1 text-[11px] font-minecraft text-white/90">
            Kreativmodus
          </div>
        </div>
      </div>

      {/* F3 Debug Information Overlay */}
      {showF3 && (
        <div className="absolute top-14 left-3 bg-black/75 border border-white/20 p-3 text-xs font-mono text-emerald-400 max-w-sm space-y-1 rounded shadow-lg pointer-events-auto">
          <div className="font-bold text-white font-minecraft text-[11px] mb-1">MineCraft Web Debug [F3]</div>
          <div>FPS: <span className="text-white font-bold">{fps}</span></div>
          <div>XYZ: <span className="text-white">{playerPos.x.toFixed(2)} / {playerPos.y.toFixed(2)} / {playerPos.z.toFixed(2)}</span></div>
          <div>Block: <span className="text-white">{Math.floor(playerPos.x)} {Math.floor(playerPos.y)} {Math.floor(playerPos.z)}</span></div>
          <div>Blickrichtung: <span className="text-white">{getFacingDirection(playerYaw)}</span></div>
          <div>Flugmodus: <span className="text-white">{isFlying ? 'Aktiv (F)' : 'Inaktiv'}</span></div>
          {targetBlock ? (
            <div className="text-amber-300 pt-1 border-t border-white/10">
              Fokus: {BLOCK_DEFINITIONS[targetBlock.type]?.nameDe || 'Unbekannt'} ({targetBlock.x}, {targetBlock.y}, {targetBlock.z})
            </div>
          ) : (
            <div className="text-white/40 pt-1 border-t border-white/10">Kein Block im Fokus</div>
          )}
        </div>
      )}

      {/* Center Screen Crosshair (+) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <div className="relative w-5 h-5 flex items-center justify-center">
          <div className="absolute w-[2px] h-4 bg-white/90 shadow-[0_0_1px_#000]"></div>
          <div className="absolute h-[2px] w-4 bg-white/90 shadow-[0_0_1px_#000]"></div>
        </div>
      </div>

      {/* Bottom Area: Item Name, Hearts & Hunger, Hotbar */}
      <div className="flex flex-col items-center gap-1.5 pb-2">
        {/* Selected Item Toast Name */}
        <div
          className={`text-sm font-minecraft text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.9)] transition-opacity duration-300 ${
            itemNameToast ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {itemNameToast}
        </div>

        {/* Hearts (Health) and Hunger Bars */}
        <div className="flex items-center justify-between w-[370px] px-1 text-xs">
          {/* 10 Hearts */}
          <div className="flex items-center gap-0.5">
            {Array.from({ length: 10 }).map((_, i) => (
              <span key={i} className="text-red-500 drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)] text-sm">
                ❤
              </span>
            ))}
          </div>

          {/* 10 Food / Drumsticks */}
          <div className="flex items-center gap-0.5">
            {Array.from({ length: 10 }).map((_, i) => (
              <span key={i} className="text-amber-500 drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)] text-sm">
                🍖
              </span>
            ))}
          </div>
        </div>

        {/* Minecraft Hotbar (9 slots) */}
        <div className="flex items-center gap-1 p-1 bg-[#8f8f8f] border-t-2 border-l-2 border-[#ffffff] border-b-2 border-r-2 border-[#373737] shadow-2xl pointer-events-auto">
          {hotbar.map((blockType, idx) => {
            const isActive = idx === selectedSlot;
            const iconUrl = getBlockIconDataUrl(blockType);
            const blockDef = BLOCK_DEFINITIONS[blockType];

            return (
              <button
                key={idx}
                onClick={() => {
                  soundManager.playClick();
                  onSelectSlot(idx);
                }}
                className={`relative w-10 h-10 flex items-center justify-center mc-slot transition-transform cursor-pointer ${
                  isActive ? 'mc-slot-active scale-105 z-10' : 'hover:bg-[#9c9c9c]'
                }`}
                title={`${blockDef?.nameDe || 'Slot'} (${idx + 1})`}
              >
                {/* 2D pixel icon */}
                <img
                  src={iconUrl}
                  alt={blockDef?.nameDe || ''}
                  className="w-7 h-7 pixelated pointer-events-none drop-shadow"
                />

                {/* Hotbar Slot Number */}
                <span className="absolute top-0.5 left-1 text-[9px] font-minecraft text-white/60 drop-shadow">
                  {idx + 1}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
