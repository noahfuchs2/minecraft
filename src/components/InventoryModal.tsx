import React, { useState, useEffect } from 'react';
import { BlockType, PLAYABLE_BLOCKS, BLOCK_DEFINITIONS } from '../game/blocks';
import { getBlockIconDataUrl } from '../game/textures';
import { soundManager } from '../game/audio';
import { X, Search } from 'lucide-react';

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSlot: number;
  hotbar: BlockType[];
  onSetHotbarSlot: (slot: number, block: BlockType) => void;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({
  isOpen,
  onClose,
  selectedSlot,
  hotbar,
  onSetHotbarSlot,
}) => {
  const [activeCategory, setActiveCategory] = useState<'all' | 'tools' | 'building' | 'natural' | 'ores' | 'utility'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [hoveredBlock, setHoveredBlock] = useState<BlockType | null>(null);

  // Close on E or Escape key press inside modal
  useEffect(() => {
    if (!isOpen) return;

    soundManager.playClick();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'e' || e.key === 'E' || e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Filter blocks
  const filteredBlocks = PLAYABLE_BLOCKS.filter((block) => {
    const def = BLOCK_DEFINITIONS[block];
    if (!def) return false;

    const matchesCategory = activeCategory === 'all' || def.category === activeCategory;
    const matchesSearch =
      searchTerm.trim() === '' ||
      def.nameDe.toLowerCase().includes(searchTerm.toLowerCase()) ||
      def.nameEn.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  const handleSelectBlock = (block: BlockType) => {
    soundManager.playClick();
    onSetHotbarSlot(selectedSlot, block);
  };

  const hoveredDef = hoveredBlock !== null ? BLOCK_DEFINITIONS[hoveredBlock] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 select-none">
      {/* Minecraft GUI Frame */}
      <div className="mc-window w-full max-w-xl p-4 flex flex-col gap-3 relative text-black">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-[#555555] pb-2">
          <div className="font-minecraft text-xs text-[#2b2b2b] uppercase tracking-wide">
            Kreativinventar
          </div>
          <button
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="mc-button p-1 text-xs cursor-pointer"
            title="Schließen (ESC / E)"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Search bar & Category filters */}
        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
          <div className="flex items-center gap-1 bg-[#8b8b8b] border-t-2 border-l-2 border-[#373737] border-b-2 border-r-2 border-[#ffffff] px-2 py-1">
            <Search className="w-3.5 h-3.5 text-white/70" />
            <input
              type="text"
              placeholder="Suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent text-white font-minecraft text-xs outline-none w-36 placeholder-white/50"
              autoFocus
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'all', label: 'Alle' },
              { id: 'tools', label: 'Waffen' },
              { id: 'building', label: 'Bauen' },
              { id: 'natural', label: 'Natur' },
              { id: 'ores', label: 'Erze' },
              { id: 'utility', label: 'Nützlich' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  soundManager.playClick();
                  setActiveCategory(cat.id as typeof activeCategory);
                }}
                className={`mc-button px-2.5 py-1 text-[10px] font-minecraft cursor-pointer whitespace-nowrap ${
                  activeCategory === cat.id ? 'bg-[#555555]! text-white!' : ''
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Blocks Grid Area */}
        <div className="bg-[#8b8b8b] border-t-2 border-l-2 border-[#373737] border-b-2 border-r-2 border-[#ffffff] p-2 min-h-[220px] max-h-[300px] overflow-y-auto">
          <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5">
            {filteredBlocks.map((block) => {
              const iconUrl = getBlockIconDataUrl(block);
              const def = BLOCK_DEFINITIONS[block];

              return (
                <button
                  key={block}
                  onClick={() => handleSelectBlock(block)}
                  onMouseEnter={() => setHoveredBlock(block)}
                  onMouseLeave={() => setHoveredBlock(null)}
                  className="mc-slot w-11 h-11 flex items-center justify-center cursor-pointer hover:scale-105 hover:bg-[#a0a0a0] transition-transform relative group"
                >
                  <img
                    src={iconUrl}
                    alt={def.nameDe}
                    className="w-8 h-8 pixelated pointer-events-none drop-shadow"
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* Hovered Block Info */}
        <div className="h-6 flex items-center px-1">
          {hoveredDef ? (
            <div className="font-minecraft text-xs text-[#222222] flex items-center gap-2">
              <span className="font-bold">{hoveredDef.nameDe}</span>
              <span className="text-[10px] text-[#555555]">({hoveredDef.nameEn})</span>
            </div>
          ) : (
            <div className="text-[11px] font-minecraft text-[#666666]">
              Klicke auf einen Block, um ihn in Slot {selectedSlot + 1} der Hotbar zu legen.
            </div>
          )}
        </div>

        {/* Active Hotbar Preview in Inventory */}
        <div className="border-t-2 border-[#555555] pt-2 flex flex-col items-center gap-1.5">
          <div className="text-[10px] font-minecraft text-[#444444]">
            Aktuelle Hotbar (Slot {selectedSlot + 1} ausgewählt):
          </div>

          <div className="flex items-center gap-1 bg-[#8b8b8b] border-t-2 border-l-2 border-[#373737] border-b-2 border-r-2 border-[#ffffff] p-1">
            {hotbar.map((blockType, idx) => {
              const isActive = idx === selectedSlot;
              const iconUrl = getBlockIconDataUrl(blockType);
              const def = BLOCK_DEFINITIONS[blockType];

              return (
                <div
                  key={idx}
                  className={`relative w-9 h-9 flex items-center justify-center mc-slot ${
                    isActive ? 'mc-slot-active ring-2 ring-white scale-105' : ''
                  }`}
                  title={`${def?.nameDe} (${idx + 1})`}
                >
                  <img
                    src={iconUrl}
                    alt={def?.nameDe || ''}
                    className="w-6 h-6 pixelated pointer-events-none"
                  />
                  <span className="absolute bottom-0 right-0.5 text-[8px] font-minecraft text-white drop-shadow">
                    {idx + 1}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
