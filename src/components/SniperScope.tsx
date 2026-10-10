import React from 'react';
import { Crosshair, Target } from 'lucide-react';

interface SniperScopeProps {
  isScoped: boolean;
  targetDistance: number | null;
  ammo: number;
  maxAmmo: number;
  isCyclingBolt: boolean;
  isReloading: boolean;
}

export const SniperScope: React.FC<SniperScopeProps> = ({
  isScoped,
  targetDistance,
  ammo,
  maxAmmo,
  isCyclingBolt,
  isReloading,
}) => {
  if (!isScoped) return null;

  return (
    <div className="absolute inset-0 z-30 pointer-events-none select-none flex items-center justify-center overflow-hidden">
      {/* 1. Outer Dark Vignette & Mask */}
      <div className="absolute inset-0 bg-black/90" />

      {/* 2. Circular Scope Optic Lens with radial gradient cutout */}
      <div
        className="relative w-[min(85vw,85vh)] h-[min(85vw,85vh)] rounded-full border-4 border-[#1f2937] shadow-[0_0_80px_rgba(0,0,0,0.95)] overflow-hidden flex items-center justify-center bg-radial from-transparent via-[#0f172a]/20 to-black/80"
        style={{
          boxShadow: 'inset 0 0 40px rgba(0,0,0,0.8), 0 0 0 9999px rgba(0,0,0,0.94)',
        }}
      >
        {/* Subtle lens tint / glass glare reflection */}
        <div className="absolute inset-0 bg-gradient-to-tr from-cyan-900/10 via-transparent to-emerald-900/10 pointer-events-none" />

        {/* Outer Mil-Dot Ring */}
        <div className="absolute w-[80%] h-[80%] rounded-full border border-red-500/30 border-dashed pointer-events-none" />
        <div className="absolute w-[45%] h-[45%] rounded-full border border-red-500/20 pointer-events-none" />

        {/* Horizontal Crosshair Line */}
        <div className="absolute w-full h-[1px] bg-red-500/80 shadow-[0_0_2px_#ff0000]" />
        {/* Vertical Crosshair Line */}
        <div className="absolute h-full w-[1px] bg-red-500/80 shadow-[0_0_2px_#ff0000]" />

        {/* Mil-dot ticks on Horizontal Axis */}
        <div className="absolute flex justify-between w-[60%] items-center">
          {[-3, -2, -1, 0, 1, 2, 3].map((val) => (
            <div key={val} className="flex flex-col items-center">
              <div
                className={`w-[1px] ${
                  val === 0 ? 'h-0' : Math.abs(val) === 2 ? 'h-5' : 'h-3'
                } bg-red-500/90`}
              />
              {val !== 0 && (
                <span className="text-[9px] font-mono text-red-400/80 -mt-1 select-none">
                  {Math.abs(val)}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Bullet Drop Elevation Stadia on Vertical Axis */}
        <div className="absolute flex flex-col justify-between h-[65%] items-center">
          {[100, 200, 300, 400].map((dist) => (
            <div key={dist} className="flex items-center gap-1">
              <div className="h-[1px] w-4 bg-red-500/80" />
              <span className="text-[9px] font-mono text-red-400/80">{dist}m</span>
            </div>
          ))}
        </div>

        {/* Center Precision Aim Dot */}
        <div className="absolute w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_#ff2222] ring-1 ring-white/50" />

        {/* Corner Tactical Diagnostics */}
        <div className="absolute top-12 left-14 text-left font-mono text-emerald-400/90 text-xs drop-shadow-[0_1px_2px_#000]">
          <div className="flex items-center gap-1 text-[11px] font-bold tracking-wider">
            <Target className="w-3.5 h-3.5 text-emerald-400" />
            <span>.50 CAL SNIPER OPTIC</span>
          </div>
          <div className="text-[10px] text-emerald-300/80">VERGRÖSSERUNG: 8.5x HD</div>
          <div className="text-[10px] text-emerald-300/80">
            ZIEL-DISTANZ:{' '}
            <span className="text-amber-300 font-bold">
              {targetDistance !== null ? `${targetDistance.toFixed(1)} m` : '---'}
            </span>
          </div>
        </div>

        <div className="absolute top-12 right-14 text-right font-mono text-emerald-400/90 text-xs drop-shadow-[0_1px_2px_#000]">
          <div className="text-[11px] font-bold">STABILITÄT: 100%</div>
          <div className="text-[10px] text-emerald-300/80">WIND: 0.0 M/S</div>
          <div className="text-[10px] text-amber-300 font-bold">
            {isReloading
              ? 'LÄDT NACH...'
              : isCyclingBolt
              ? 'KAMMER-REPETITION...'
              : `MAGAZIN: ${ammo} / ${maxAmmo}`}
          </div>
        </div>

        {/* Bottom Scope Status */}
        <div className="absolute bottom-12 font-mono text-xs text-red-400/80 tracking-widest text-center">
          [ RECHTSKLICK ZUM VERLASSEN • LINKSKLICK ZUM FEUERN ]
        </div>
      </div>
    </div>
  );
};
