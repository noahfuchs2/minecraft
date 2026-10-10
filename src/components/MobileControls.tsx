import React from 'react';
import { PlayerControls } from '../game/player';
import { Pickaxe, Box, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Plane, Backpack } from 'lucide-react';

interface MobileControlsProps {
  controls: PlayerControls;
  onMine: () => void;
  onPlace: () => void;
  onToggleFlight: () => void;
  onOpenInventory: () => void;
  isFlying: boolean;
}

export const MobileControls: React.FC<MobileControlsProps> = ({
  controls,
  onMine,
  onPlace,
  onToggleFlight,
  onOpenInventory,
  isFlying,
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none select-none z-30">
      {/* Left side: Movement D-Pad */}
      <div className="absolute bottom-20 left-4 pointer-events-auto flex flex-col items-center gap-1.5 opacity-80 active:opacity-100">
        <button
          onTouchStart={() => { controls.forward = true; }}
          onTouchEnd={() => { controls.forward = false; }}
          onMouseDown={() => { controls.forward = true; }}
          onMouseUp={() => { controls.forward = false; }}
          className="w-12 h-12 bg-black/60 active:bg-black/85 border-2 border-white/40 rounded flex items-center justify-center text-white"
        >
          <ArrowUp className="w-6 h-6" />
        </button>

        <div className="flex items-center gap-2">
          <button
            onTouchStart={() => { controls.left = true; }}
            onTouchEnd={() => { controls.left = false; }}
            onMouseDown={() => { controls.left = true; }}
            onMouseUp={() => { controls.left = false; }}
            className="w-12 h-12 bg-black/60 active:bg-black/85 border-2 border-white/40 rounded flex items-center justify-center text-white"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>

          <button
            onTouchStart={() => { controls.backward = true; }}
            onTouchEnd={() => { controls.backward = false; }}
            onMouseDown={() => { controls.backward = true; }}
            onMouseUp={() => { controls.backward = false; }}
            className="w-12 h-12 bg-black/60 active:bg-black/85 border-2 border-white/40 rounded flex items-center justify-center text-white"
          >
            <ArrowDown className="w-6 h-6" />
          </button>

          <button
            onTouchStart={() => { controls.right = true; }}
            onTouchEnd={() => { controls.right = false; }}
            onMouseDown={() => { controls.right = true; }}
            onMouseUp={() => { controls.right = false; }}
            className="w-12 h-12 bg-black/60 active:bg-black/85 border-2 border-white/40 rounded flex items-center justify-center text-white"
          >
            <ArrowRight className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Right side: Action Buttons */}
      <div className="absolute bottom-20 right-4 pointer-events-auto flex flex-col items-end gap-2.5 opacity-85">
        <div className="flex items-center gap-2">
          {/* Mine / Break */}
          <button
            onClick={onMine}
            className="w-14 h-14 bg-red-800/80 active:bg-red-700 border-2 border-red-300 rounded-full flex flex-col items-center justify-center text-white shadow-lg cursor-pointer"
            title="Abbauen"
          >
            <Pickaxe className="w-5 h-5" />
            <span className="text-[9px] font-minecraft mt-0.5">Abbauen</span>
          </button>

          {/* Place / Build */}
          <button
            onClick={onPlace}
            className="w-14 h-14 bg-emerald-800/80 active:bg-emerald-700 border-2 border-emerald-300 rounded-full flex flex-col items-center justify-center text-white shadow-lg cursor-pointer"
            title="Bauen"
          >
            <Box className="w-5 h-5" />
            <span className="text-[9px] font-minecraft mt-0.5">Bauen</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Jump */}
          <button
            onTouchStart={() => { controls.jump = true; }}
            onTouchEnd={() => { controls.jump = false; }}
            onMouseDown={() => { controls.jump = true; }}
            onMouseUp={() => { controls.jump = false; }}
            className="w-12 h-12 bg-black/60 active:bg-black/85 border-2 border-white/40 rounded-full flex items-center justify-center text-white text-xs font-minecraft"
          >
            Sprung
          </button>

          {/* Flight */}
          <button
            onClick={onToggleFlight}
            className={`w-12 h-12 border-2 rounded-full flex items-center justify-center text-white ${
              isFlying ? 'bg-amber-700 border-amber-300' : 'bg-black/60 border-white/40'
            }`}
          >
            <Plane className="w-5 h-5" />
          </button>

          {/* Inventory */}
          <button
            onClick={onOpenInventory}
            className="w-12 h-12 bg-black/60 active:bg-black/85 border-2 border-white/40 rounded-full flex items-center justify-center text-white"
          >
            <Backpack className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
