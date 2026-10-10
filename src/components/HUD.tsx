import React, { useEffect, useState } from 'react';
import { BlockType, BLOCK_DEFINITIONS } from '../game/blocks';
import { getBlockIconDataUrl } from '../game/textures';
import { Volume2, VolumeX, Menu, Compass, RotateCcw, Zap, Target, Crosshair, Skull, ShieldAlert } from 'lucide-react';
import { soundManager } from '../game/audio';
import { GameMode } from '../game/player';

interface HUDProps {
  hotbar: BlockType[];
  selectedSlot: number;
  onSelectSlot: (slot: number) => void;
  onOpenInventory: () => void;
  onOpenPauseMenu: () => void;
  isFlying: boolean;
  onToggleFlight: () => void;
  gameMode: GameMode;
  onToggleGameMode: () => void;
  health: number;
  hunger: number;
  oxygen: number;
  isHeadUnderwater: boolean;
  isSprinting: boolean;
  damageFlash: boolean;
  isDead: boolean;
  onRespawn: () => void;
  miningProgress: number;
  playerPos: { x: number; y: number; z: number };
  playerYaw: number;
  targetBlock: { type: BlockType; x: number; y: number; z: number } | null;
  fps: number;

  // Sniper & Monster Hunt features
  isSniperHeld?: boolean;
  ammo?: number;
  maxAmmo?: number;
  isReloading?: boolean;
  isCyclingBolt?: boolean;
  totalKills?: number;
  headshotKills?: number;
  currentWave?: number;
  hitmarkerTimer?: number;
  headshotToast?: string;
  isScoped?: boolean;
}

export const HUD: React.FC<HUDProps> = ({
  hotbar,
  selectedSlot,
  onSelectSlot,
  onOpenInventory,
  onOpenPauseMenu,
  isFlying,
  onToggleFlight,
  gameMode,
  onToggleGameMode,
  health,
  hunger,
  oxygen,
  isHeadUnderwater,
  isSprinting,
  damageFlash,
  isDead,
  onRespawn,
  miningProgress,
  playerPos,
  playerYaw,
  targetBlock,
  fps,
  isSniperHeld = false,
  ammo = 5,
  maxAmmo = 5,
  isReloading = false,
  isCyclingBolt = false,
  totalKills = 0,
  headshotKills = 0,
  currentWave = 1,
  hitmarkerTimer = 0,
  headshotToast = '',
  isScoped = false,
}) => {
  const [showF3, setShowF3] = useState(false);
  const [itemNameToast, setItemNameToast] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState(soundManager.enabled);

  // Show item name briefly when slot changes
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

  // Render 10 Hearts for Health (20 HP)
  const renderHearts = () => {
    const hearts = [];
    for (let i = 0; i < 10; i++) {
      const heartHealth = health - i * 2;
      let colorClass = 'text-red-500';

      if (heartHealth <= 0) {
        colorClass = 'text-black/60';
      } else if (heartHealth === 1) {
        colorClass = 'text-red-400 opacity-80';
      }

      hearts.push(
        <div key={i} className="relative w-4 h-4 flex items-center justify-center">
          <span className="text-black/80 text-sm absolute select-none">♥</span>
          <span className={`text-sm absolute select-none ${colorClass}`}>♥</span>
        </div>
      );
    }
    return hearts;
  };

  // Render 10 Hunger drumsticks (20 Hunger)
  const renderHunger = () => {
    const drumsticks = [];
    for (let i = 0; i < 10; i++) {
      const hungerValue = hunger - i * 2;
      let colorClass = 'text-amber-600';

      if (hungerValue <= 0) {
        colorClass = 'text-black/50';
      } else if (hungerValue === 1) {
        colorClass = 'text-amber-500 opacity-70';
      }

      drumsticks.push(
        <div key={i} className="relative w-4 h-4 flex items-center justify-center">
          <span className={`text-sm select-none drop-shadow ${colorClass}`}>🍗</span>
        </div>
      );
    }
    return drumsticks;
  };

  // Render Oxygen air bubbles (20 Oxygen = 10 Bubbles)
  const renderOxygen = () => {
    const bubbles = [];
    for (let i = 0; i < 10; i++) {
      const bubbleVal = oxygen - i * 2;
      const isActive = bubbleVal > 0;
      bubbles.push(
        <div key={i} className="relative w-4 h-4 flex items-center justify-center">
          <span
            className={`text-xs select-none transition-opacity duration-150 ${
              isActive ? 'text-cyan-400 drop-shadow-[0_0_2px_#38bdf8]' : 'text-black/30'
            }`}
          >
            🫧
          </span>
        </div>
      );
    }
    return bubbles;
  };

  return (
    <div className="absolute inset-0 pointer-events-none select-none flex flex-col justify-between p-3 font-sans">
      {/* Damage Flash Red Overlay */}
      {damageFlash && (
        <div className="absolute inset-0 bg-red-600/35 pointer-events-none transition-opacity duration-75 z-20" />
      )}

      {/* Underwater Tint Overlay */}
      {isHeadUnderwater && (
        <div className="absolute inset-0 bg-blue-700/30 backdrop-blur-[0.5px] pointer-events-none z-10" />
      )}

      {/* Headshot Kill Banner Alert */}
      {headshotToast && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-red-950/90 border-2 border-amber-400 text-amber-300 px-6 py-2 rounded shadow-2xl font-minecraft text-sm tracking-widest animate-bounce z-40 flex items-center gap-2">
          <Target className="w-5 h-5 text-red-500 animate-spin" />
          <span>{headshotToast}</span>
        </div>
      )}

      {/* Death Screen */}
      {isDead && (
        <div className="absolute inset-0 bg-red-950/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-6 pointer-events-auto">
          <div className="text-4xl sm:text-5xl font-minecraft text-red-500 drop-shadow-[0_4px_4px_#000] text-center">
            DU BIST GESTORBEN!
          </div>
          <div className="text-white/80 font-minecraft text-sm text-center">
            Die Monster haben dich erwischt.
          </div>
          <div className="bg-black/60 border border-white/20 p-4 font-minecraft text-xs text-amber-300 space-y-1">
            <div>Monster eliminiert: {totalKills}</div>
            <div>Kopftreffer: {headshotKills}</div>
            <div>Erreichte Welle: {currentWave}</div>
          </div>
          <button
            onClick={onRespawn}
            className="mc-button mc-button-green px-8 py-3.5 text-base font-minecraft flex items-center gap-2 cursor-pointer shadow-2xl"
          >
            <RotateCcw className="w-5 h-5" />
            <span>Wiederbeleben</span>
          </button>
        </div>
      )}

      {/* Top Bar: Monster Hunt Stats & Quick Controls */}
      <div className="flex items-start justify-between w-full z-30">
        {/* Left: Quick Actions */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={onOpenPauseMenu}
            className="mc-button px-3 py-1.5 text-xs font-minecraft flex items-center gap-1.5 cursor-pointer shadow-md"
            title="Menü öffnen (ESC)"
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

        {/* Center: Monster Hunter Scoreboard */}
        <div className="bg-[#1e1e1e]/90 border-2 border-[#555555] px-4 py-1.5 shadow-xl flex items-center gap-4 text-xs font-minecraft">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span>WELLE {currentWave}</span>
          </div>
          <div className="w-[1px] h-4 bg-white/20" />
          <div className="flex items-center gap-1.5 text-red-400">
            <Skull className="w-4 h-4 text-red-400" />
            <span>KILLS: {totalKills}</span>
          </div>
          <div className="w-[1px] h-4 bg-white/20" />
          <div className="flex items-center gap-1.5 text-amber-300">
            <Target className="w-4 h-4 text-amber-300" />
            <span>HEADSHOTS: {headshotKills}</span>
          </div>
        </div>

        {/* Right: Mode, Sprint & Flight status */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {isSprinting && (
            <div className="bg-amber-950/80 border border-amber-400 px-2.5 py-1 text-[11px] font-minecraft text-amber-300 flex items-center gap-1 shadow-md">
              <Zap className="w-3 h-3 fill-amber-300" />
              <span>Sprinten</span>
            </div>
          )}

          {isFlying && (
            <div className="bg-black/60 border border-amber-500/80 px-2.5 py-1 text-[11px] font-minecraft text-amber-300 animate-pulse">
              ✈ FLUGMODUS (F)
            </div>
          )}

          <button
            onClick={onToggleGameMode}
            className={`px-3 py-1 text-[11px] font-minecraft border shadow-md cursor-pointer transition-colors ${
              gameMode === 'creative'
                ? 'bg-purple-900/80 border-purple-400 text-purple-200 hover:bg-purple-800'
                : 'bg-emerald-900/80 border-emerald-400 text-emerald-200 hover:bg-emerald-800'
            }`}
            title="Klicken zum Umschalten zwischen Kreativ- und Überlebensmodus"
          >
            {gameMode === 'creative' ? '✨ Kreativmodus' : '🛡 Überleben'}
          </button>
        </div>
      </div>

      {/* F3 Debug Information Overlay */}
      {showF3 && (
        <div className="absolute top-14 left-3 bg-black/80 border border-white/20 p-3 text-xs font-mono text-emerald-400 max-w-sm space-y-1 rounded shadow-lg pointer-events-auto z-30">
          <div className="font-bold text-white font-minecraft text-[11px] mb-1">Voxel Sniper Monster Hunter [F3]</div>
          <div>FPS: <span className="text-white font-bold">{fps}</span></div>
          <div>XYZ: <span className="text-white">{playerPos.x.toFixed(2)} / {playerPos.y.toFixed(2)} / {playerPos.z.toFixed(2)}</span></div>
          <div>Blickrichtung: <span className="text-white">{getFacingDirection(playerYaw)}</span></div>
          <div>Welle: <span className="text-white">{currentWave}</span> | Kills: <span className="text-white">{totalKills}</span></div>
          <div>Leben / Hunger: <span className="text-white">{health}/20 | {Math.round(hunger)}/20</span></div>
          {targetBlock ? (
            <div className="text-amber-300 pt-1 border-t border-white/10">
              Fokus: {BLOCK_DEFINITIONS[targetBlock.type]?.nameDe || 'Unbekannt'} ({targetBlock.x}, {targetBlock.y}, {targetBlock.z})
            </div>
          ) : (
            <div className="text-white/40 pt-1 border-t border-white/10">Kein Block im Fokus</div>
          )}
        </div>
      )}

      {/* Center Screen Crosshair (+) & Hitmarker (hidden when scoped) */}
      {!isScoped && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center z-30">
          {/* Default or Sniper Crosshair */}
          <div className="relative w-6 h-6 flex items-center justify-center">
            {isSniperHeld ? (
              // Tactical Sniper Hipfire Crosshair
              <>
                <div className="absolute w-[2px] h-3 -top-2 bg-red-500/90 shadow-[0_0_2px_#ff0000]" />
                <div className="absolute w-[2px] h-3 -bottom-2 bg-red-500/90 shadow-[0_0_2px_#ff0000]" />
                <div className="absolute h-[2px] w-3 -left-2 bg-red-500/90 shadow-[0_0_2px_#ff0000]" />
                <div className="absolute h-[2px] w-3 -right-2 bg-red-500/90 shadow-[0_0_2px_#ff0000]" />
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_4px_#ff0000]" />
              </>
            ) : (
              // Standard crosshair
              <>
                <div className="absolute w-[2px] h-4 bg-white/90 shadow-[0_0_1px_#000]"></div>
                <div className="absolute h-[2px] w-4 bg-white/90 shadow-[0_0_1px_#000]"></div>
              </>
            )}

            {/* Hitmarker X ticks on monster hit */}
            {hitmarkerTimer > 0 && (
              <div className="absolute w-5 h-5 flex items-center justify-center">
                <div className="absolute w-3.5 h-[2px] bg-red-400 rotate-45 shadow-[0_0_4px_#f87171]" />
                <div className="absolute w-3.5 h-[2px] bg-red-400 -rotate-45 shadow-[0_0_4px_#f87171]" />
              </div>
            )}
          </div>

          {/* Block Mining Progress Bar */}
          {miningProgress > 0 && (
            <div className="mt-3 w-12 h-1.5 bg-black/60 border border-white/40 overflow-hidden rounded-full">
              <div
                className="h-full bg-amber-400 transition-all duration-75"
                style={{ width: `${Math.min(100, miningProgress * 100)}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Bottom Area: Item Name, Sniper Ammo, Oxygen, Hearts & Hunger, Hotbar */}
      <div className="flex flex-col items-center gap-1.5 pb-2 z-30">
        {/* Selected Item Toast Name & Sniper Instructions */}
        <div className="flex flex-col items-center">
          <div
            className={`text-sm font-minecraft text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.9)] transition-opacity duration-300 ${
              itemNameToast ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {itemNameToast}
          </div>

          {/* Sniper Action Bar & Ammo indicator */}
          {isSniperHeld && (
            <div className="mt-1 flex items-center gap-3 bg-black/85 border-2 border-red-500/80 px-4 py-1 rounded shadow-2xl font-minecraft text-xs text-white">
              <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                <Target className="w-4 h-4 text-red-500" />
                <span>MAGAZIN: {ammo} / {maxAmmo}</span>
              </div>
              <div className="w-[1px] h-3 bg-white/30" />
              <div className="text-[10px] text-emerald-400">
                {isReloading ? (
                  <span className="text-amber-400 animate-pulse">LÄDT NACH...</span>
                ) : isCyclingBolt ? (
                  <span className="text-cyan-400 animate-pulse">KAMMER REPETIERT...</span>
                ) : ammo === 0 ? (
                  <span className="text-red-400 animate-bounce font-bold">TASTE R: NACHLADEN</span>
                ) : (
                  <span>RECHTSKLICK: ZIELFERNROHR | LINKSKLICK: SCHUSS</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Oxygen Bubbles (shown right above hunger when submerged or losing air) */}
        {gameMode === 'survival' && (isHeadUnderwater || oxygen < 20) && (
          <div className="flex items-center justify-end w-[370px] px-1 text-xs mb-[-2px]">
            <div className="flex items-center gap-0.5">{renderOxygen()}</div>
          </div>
        )}

        {/* Hearts (Health) and Hunger Bars (Only visible in Survival mode) */}
        {gameMode === 'survival' && (
          <div className="flex items-center justify-between w-[370px] px-1 text-xs">
            {/* 10 Hearts */}
            <div className="flex items-center gap-0.5">{renderHearts()}</div>

            {/* 10 Drumsticks */}
            <div className="flex items-center gap-0.5">{renderHunger()}</div>
          </div>
        )}

        {/* Hotbar (9 slots) */}
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
