import React, { useState } from 'react';
import { soundManager } from '../game/audio';
import { Volume2, VolumeX, Save, RotateCcw, Sliders, Keyboard, Play } from 'lucide-react';

interface PauseMenuProps {
  isOpen: boolean;
  onResume: () => void;
  onSaveWorld: () => void;
  onResetWorld: (seed?: number) => void;
  isFlying: boolean;
  onToggleFlight: () => void;
  gameMode: 'survival' | 'creative';
  onToggleGameMode: () => void;
  fov: number;
  onChangeFov: (fov: number) => void;
  daySpeed: number; // in seconds
  onChangeDaySpeed: (speed: number) => void;
  renderRadius: number;
  onChangeRenderRadius: (radius: number) => void;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({
  isOpen,
  onResume,
  onSaveWorld,
  onResetWorld,
  isFlying,
  onToggleFlight,
  gameMode,
  onToggleGameMode,
  fov,
  onChangeFov,
  daySpeed,
  onChangeDaySpeed,
  renderRadius,
  onChangeRenderRadius,
}) => {
  const [tab, setTab] = useState<'menu' | 'settings' | 'controls'>('menu');
  const [saveToast, setSaveToast] = useState(false);
  const [soundVolume, setSoundVolume] = useState(soundManager.volume * 100);

  if (!isOpen) return null;

  const handleSave = () => {
    soundManager.playClick();
    onSaveWorld();
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2500);
  };

  const handleVolumeChange = (v: number) => {
    setSoundVolume(v);
    soundManager.volume = v / 100;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm select-none p-4">
      <div className="w-full max-w-md flex flex-col items-center gap-4 text-center">
        {/* Title */}
        <h1 className="text-xl sm:text-2xl font-minecraft text-white drop-shadow-[0_3px_3px_#000]">
          Spiel pausiert
        </h1>

        {saveToast && (
          <div className="bg-emerald-800/90 border border-emerald-400 text-white px-4 py-2 font-minecraft text-xs rounded shadow-lg animate-bounce">
            ✔ Welt erfolgreich gespeichert!
          </div>
        )}

        {/* Main Menu View */}
        {tab === 'menu' && (
          <div className="w-full flex flex-col gap-2.5">
            <button
              onClick={() => {
                soundManager.playClick();
                onResume();
              }}
              className="mc-button mc-button-green w-full py-2.5 text-xs sm:text-sm font-minecraft cursor-pointer flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Zurück zum Spiel</span>
            </button>

            <button
              onClick={() => {
                soundManager.playClick();
                onToggleGameMode();
              }}
              className="mc-button w-full py-2 text-xs font-minecraft cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Spielmodus:</span>
              <span className={gameMode === 'creative' ? 'text-purple-300 font-bold' : 'text-emerald-300 font-bold'}>
                {gameMode === 'creative' ? 'Kreativ' : 'Überleben'}
              </span>
            </button>

            <button
              onClick={() => {
                soundManager.playClick();
                onToggleFlight();
              }}
              className="mc-button w-full py-2 text-xs font-minecraft cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Flugmodus:</span>
              <span className={isFlying ? 'text-amber-300 font-bold' : 'text-gray-300'}>
                {isFlying ? 'AN' : 'AUS'}
              </span>
            </button>

            <button
              onClick={handleSave}
              className="mc-button w-full py-2 text-xs font-minecraft cursor-pointer flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Welt speichern</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  soundManager.playClick();
                  setTab('settings');
                }}
                className="mc-button py-2 text-xs font-minecraft cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Optionen...</span>
              </button>

              <button
                onClick={() => {
                  soundManager.playClick();
                  setTab('controls');
                }}
                className="mc-button py-2 text-xs font-minecraft cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Keyboard className="w-3.5 h-3.5" />
                <span>Steuerung...</span>
              </button>
            </div>

            <button
              onClick={() => {
                if (confirm('Möchtest du wirklich eine neue Welt generieren? Deine aktuellen Änderungen werden überschrieben.')) {
                  soundManager.playClick();
                  onResetWorld(Math.floor(Math.random() * 999999));
                  onResume();
                }
              }}
              className="mc-button w-full py-2 text-xs font-minecraft cursor-pointer flex items-center justify-center gap-2 text-red-300! hover:text-red-200!"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Neue Welt generieren</span>
            </button>
          </div>
        )}

        {/* Settings View */}
        {tab === 'settings' && (
          <div className="w-full flex flex-col gap-3 bg-[#444444]/90 p-4 border-2 border-[#777777] shadow-xl text-left">
            <h2 className="text-sm font-minecraft text-center text-white mb-2">Einstellungen</h2>

            {/* Sound Volume */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs font-minecraft text-white/90">
                <span className="flex items-center gap-1">
                  {soundVolume > 0 ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                  Lautstärke:
                </span>
                <span>{Math.round(soundVolume)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={soundVolume}
                onChange={(e) => handleVolumeChange(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            {/* FOV (Sichtfeld) */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs font-minecraft text-white/90">
                <span>Sichtfeld (FOV):</span>
                <span>{fov}°</span>
              </div>
              <input
                type="range"
                min="60"
                max="100"
                value={fov}
                onChange={(e) => onChangeFov(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            {/* Day/Night cycle duration */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs font-minecraft text-white/90">
                <span>Tag-Nacht-Dauer:</span>
                <span>{daySpeed}s</span>
              </div>
              <input
                type="range"
                min="60"
                max="600"
                step="30"
                value={daySpeed}
                onChange={(e) => onChangeDaySpeed(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            {/* Render Distance (Sichtweite) */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs font-minecraft text-white/90">
                <span>Sichtweite (Chunks):</span>
                <span>{renderRadius * 2 + 1}x{renderRadius * 2 + 1} Chunks ({renderRadius})</span>
              </div>
              <input
                type="range"
                min="2"
                max="5"
                value={renderRadius}
                onChange={(e) => onChangeRenderRadius(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            <button
              onClick={() => {
                soundManager.playClick();
                setTab('menu');
              }}
              className="mc-button w-full mt-2 py-2 text-xs font-minecraft cursor-pointer"
            >
              Fertig
            </button>
          </div>
        )}

        {/* Controls View */}
        {tab === 'controls' && (
          <div className="w-full flex flex-col gap-2.5 bg-[#444444]/90 p-4 border-2 border-[#777777] shadow-xl text-left max-h-[360px] overflow-y-auto">
            <h2 className="text-sm font-minecraft text-center text-white mb-2">Tastenbelegung</h2>

            <div className="grid grid-cols-2 gap-y-2 text-xs font-minecraft">
              <span className="text-amber-300">W, A, S, D</span>
              <span className="text-white/90">Bewegen</span>

              <span className="text-amber-300">Maus</span>
              <span className="text-white/90">Umschauen</span>

              <span className="text-amber-300">Linksklick</span>
              <span className="text-white/90">Block abbauen</span>

              <span className="text-amber-300">Rechtsklick</span>
              <span className="text-white/90">Block bauen</span>

              <span className="text-amber-300">W (Doppelt) / Strg</span>
              <span className="text-white/90">Sprinten</span>

              <span className="text-amber-300">Im Wasser</span>
              <span className="text-white/90">Leertaste = Schwimmen / Shift = Tauchen</span>

              <span className="text-amber-300">Leertaste</span>
              <span className="text-white/90">Springen</span>

              <span className="text-amber-300">Taste F</span>
              <span className="text-white/90">Flugmodus</span>

              <span className="text-amber-300">Taste Shift</span>
              <span className="text-white/90">Schleichen</span>

              <span className="text-amber-300">Taste E</span>
              <span className="text-white/90">Inventar</span>

              <span className="text-amber-300">1 bis 9 / Rad</span>
              <span className="text-white/90">Hotbar-Slot</span>

              <span className="text-amber-300">Taste F3</span>
              <span className="text-white/90">Debug-Info</span>

              <span className="text-amber-300">Taste ESC</span>
              <span className="text-white/90">Pausemenü</span>
            </div>

            <button
              onClick={() => {
                soundManager.playClick();
                setTab('menu');
              }}
              className="mc-button w-full mt-3 py-2 text-xs font-minecraft cursor-pointer"
            >
              Zurück
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
