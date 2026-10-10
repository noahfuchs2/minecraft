import * as THREE from 'three';
import { BlockType } from './blocks';

// Face indices in Three.js BoxGeometry material array:
// 0: +X (Right), 1: -X (Left), 2: +Y (Top), 3: -Y (Bottom), 4: +Z (Front), 5: -Z (Back)
export type BlockFace = 'top' | 'bottom' | 'side' | 'front' | 'back' | 'left' | 'right';

// Random with seed helper for deterministic texture generation
function pseudoRandom(seed: number) {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

// 16x16 canvas texture creator
function create16x16Canvas(): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = false;
  return [canvas, ctx];
}

// Generator functions for distinct textures
type TextureDrawer = (ctx: CanvasRenderingContext2D) => void;

function drawDirt(ctx: CanvasRenderingContext2D, seed = 42) {
  const basePalette = ['#866043', '#79553a', '#91694a', '#6f4e35', '#5e412b'];
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const r = Math.floor(pseudoRandom(seed + y * 16 + x) * basePalette.length);
      ctx.fillStyle = basePalette[r];
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

function drawGrassTop(ctx: CanvasRenderingContext2D, seed = 101) {
  const basePalette = ['#5b8f3c', '#4d7c32', '#679e44', '#426d2a', '#74b04d'];
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const r = Math.floor(pseudoRandom(seed + y * 16 + x) * basePalette.length);
      ctx.fillStyle = basePalette[r];
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

function drawGrassSide(ctx: CanvasRenderingContext2D) {
  // First draw dirt background
  drawDirt(ctx, 42);
  // Then overlay grass blades dripping down 2 to 5 pixels
  const grassPalette = ['#5b8f3c', '#4d7c32', '#679e44', '#74b04d'];
  for (let x = 0; x < 16; x++) {
    const dripHeight = 2 + Math.floor(pseudoRandom(x * 7 + 13) * 3);
    for (let y = 0; y <= dripHeight; y++) {
      const c = grassPalette[Math.floor(pseudoRandom(x * 19 + y * 31) * grassPalette.length)];
      ctx.fillStyle = c;
      ctx.fillRect(x, y, 1, 1);
    }
    // Occasional hanging tip
    if (pseudoRandom(x * 23) > 0.5) {
      ctx.fillStyle = grassPalette[0];
      ctx.fillRect(x, dripHeight + 1, 1, 1);
    }
  }
}

function drawStone(ctx: CanvasRenderingContext2D, seed = 55) {
  const basePalette = ['#757575', '#6b6b6b', '#808080', '#5e5e5e', '#8a8a8a'];
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const r = Math.floor(pseudoRandom(seed + y * 16 + x) * basePalette.length);
      ctx.fillStyle = basePalette[r];
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

function drawCobblestone(ctx: CanvasRenderingContext2D) {
  drawStone(ctx, 88);
  // Dark borders and stone clumps
  ctx.fillStyle = '#3a3a3a';
  const cracks = [
    [0, 4, 16, 1], [0, 9, 16, 1], [0, 14, 16, 1],
    [5, 0, 1, 5], [11, 4, 1, 6], [6, 9, 1, 6], [13, 9, 1, 6]
  ];
  for (const [x, y, w, h] of cracks) {
    ctx.fillRect(x, y, w, h);
  }
  // Light highlights
  ctx.fillStyle = '#9e9e9e';
  const highlights = [[1, 1], [7, 1], [1, 5], [12, 5], [7, 10], [1, 10], [14, 10]];
  for (const [x, y] of highlights) {
    ctx.fillRect(x, y, 2, 1);
  }
}

function drawOakPlanks(ctx: CanvasRenderingContext2D) {
  const woodLight = ['#b89464', '#a88454', '#997444', '#b38f5e'];
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const r = Math.floor(pseudoRandom(y * 16 + x * 3) * woodLight.length);
      ctx.fillStyle = woodLight[r];
      ctx.fillRect(x, y, 1, 1);
    }
  }
  // 4 horizontal plank dividers
  ctx.fillStyle = '#684e2e';
  ctx.fillRect(0, 3, 16, 1);
  ctx.fillRect(0, 7, 16, 1);
  ctx.fillRect(0, 11, 16, 1);
  ctx.fillRect(0, 15, 16, 1);
  // Vertical nail/joint slits
  ctx.fillRect(7, 0, 1, 3);
  ctx.fillRect(12, 4, 1, 3);
  ctx.fillRect(4, 8, 1, 3);
  ctx.fillRect(10, 12, 1, 3);
}

function drawOakLogSide(ctx: CanvasRenderingContext2D) {
  const barkPalette = ['#6a5132', '#584328', '#7c5f3b', '#48371f'];
  for (let x = 0; x < 16; x++) {
    const colIdx = Math.floor(pseudoRandom(x * 13) * barkPalette.length);
    for (let y = 0; y < 16; y++) {
      const shift = Math.floor(pseudoRandom(x * 17 + y * 7) * 3) - 1;
      const idx = Math.max(0, Math.min(barkPalette.length - 1, colIdx + shift));
      ctx.fillStyle = barkPalette[idx];
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

function drawOakLogTop(ctx: CanvasRenderingContext2D) {
  // Wood rings
  ctx.fillStyle = '#584328';
  ctx.fillRect(0, 0, 16, 16); // Bark rim
  ctx.fillStyle = '#b89464';
  ctx.fillRect(2, 2, 12, 12);
  ctx.fillStyle = '#9e7b4c';
  ctx.fillRect(4, 4, 8, 8);
  ctx.fillStyle = '#b89464';
  ctx.fillRect(5, 5, 6, 6);
  ctx.fillStyle = '#7a5a32';
  ctx.fillRect(7, 7, 2, 2);
}

function drawOakLeaves(ctx: CanvasRenderingContext2D) {
  ctx.clearRect(0, 0, 16, 16);
  const foliage = ['#386927', '#2e571f', '#447f30', '#254719', '#4d9036'];
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const p = pseudoRandom(x * 19 + y * 31);
      if (p > 0.22) { // semi-transparent cutouts for realistic foliage
        const r = Math.floor(p * foliage.length);
        ctx.fillStyle = foliage[r];
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
}

function drawGlass(ctx: CanvasRenderingContext2D) {
  ctx.clearRect(0, 0, 16, 16);
  // Subtle tinted translucent background
  ctx.fillStyle = 'rgba(215, 238, 245, 0.25)';
  ctx.fillRect(0, 0, 16, 16);
  // Light border
  ctx.fillStyle = 'rgba(240, 250, 255, 0.7)';
  ctx.strokeRect(0.5, 0.5, 15, 15);
  // Diagonal shine streaks
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.fillRect(3, 3, 2, 1);
  ctx.fillRect(4, 4, 2, 1);
  ctx.fillRect(5, 5, 2, 1);
  ctx.fillRect(11, 11, 2, 1);
  ctx.fillRect(12, 12, 2, 1);
}

function drawBricks(ctx: CanvasRenderingContext2D) {
  // Mortar
  ctx.fillStyle = '#cfc6b8';
  ctx.fillRect(0, 0, 16, 16);
  // Brick rows
  const brickPalette = ['#9c4c3b', '#8a4031', '#aa5442', '#7b382b'];
  for (let row = 0; row < 4; row++) {
    const y = row * 4 + 1;
    const offset = (row % 2) * 4;
    for (let b = 0; b < 3; b++) {
      const x = ((b * 8 + offset) % 16);
      const color = brickPalette[Math.floor(pseudoRandom(row * 7 + b * 11) * brickPalette.length)];
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 7, 3);
      if (x + 7 > 16) {
        ctx.fillRect(0, y, (x + 7) - 16, 3);
      }
    }
  }
}

function drawSand(ctx: CanvasRenderingContext2D) {
  const sandPalette = ['#ded39f', '#d2c691', '#e8ddaa', '#c5b880', '#f0e6b6'];
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const r = Math.floor(pseudoRandom(x * 29 + y * 43) * sandPalette.length);
      ctx.fillStyle = sandPalette[r];
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

function drawOre(ctx: CanvasRenderingContext2D, gemColor: string, gemGlint: string) {
  drawStone(ctx, 33);
  // Cluster of gem pixels
  const gemPositions = [
    [3, 3], [4, 3], [3, 4], [4, 4],
    [9, 5], [10, 5], [10, 6], [11, 6],
    [5, 10], [6, 10], [6, 11], [7, 11],
    [12, 11], [13, 11], [13, 12],
    [2, 12], [3, 13]
  ];
  for (const [x, y] of gemPositions) {
    ctx.fillStyle = gemColor;
    ctx.fillRect(x, y, 1, 1);
  }
  // Sparkling highlights
  ctx.fillStyle = gemGlint;
  const glints = [[3, 3], [10, 5], [6, 10], [13, 11]];
  for (const [x, y] of glints) {
    ctx.fillRect(x, y, 1, 1);
  }
}

function drawBedrock(ctx: CanvasRenderingContext2D) {
  const basePalette = ['#111111', '#282828', '#383838', '#1a1a1a', '#444444'];
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const r = Math.floor(pseudoRandom(x * 67 + y * 89) * basePalette.length);
      ctx.fillStyle = basePalette[r];
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

function drawBookshelf(ctx: CanvasRenderingContext2D) {
  // Wood shelf
  drawOakPlanks(ctx);
  // Books in the middle rows
  const bookColors = ['#9e2a2b', '#2b580c', '#33658a', '#d4a373', '#e07a5f', '#6a4c93'];
  for (const shelfY of [1, 8]) {
    let curX = 1;
    let idx = 0;
    while (curX < 15) {
      const width = 1 + (idx % 2);
      ctx.fillStyle = bookColors[idx % bookColors.length];
      ctx.fillRect(curX, shelfY + 2, width, 4);
      // Gold/white bookmark or pages line
      ctx.fillStyle = '#f4e04d';
      ctx.fillRect(curX, shelfY + 3, width, 1);
      curX += width + 1;
      idx++;
    }
  }
}

function drawTNT(ctx: CanvasRenderingContext2D, face: 'top' | 'side' | 'bottom') {
  if (face === 'top' || face === 'bottom') {
    // Top surface with fuse
    drawOakPlanks(ctx);
    ctx.fillStyle = '#db3222';
    ctx.fillRect(2, 2, 12, 12);
    ctx.fillStyle = '#222222';
    ctx.fillRect(7, 7, 2, 2); // Center fuse hole
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(6, 6, 1, 1);
    ctx.fillRect(7, 5, 1, 1); // Fuse cord
  } else {
    // Side: Red top and bottom with white center stripe and 'TNT' text
    ctx.fillStyle = '#db3222';
    ctx.fillRect(0, 0, 16, 16);
    // White banner
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 5, 16, 6);
    // Dark TNT letters
    ctx.fillStyle = '#111111';
    // 'T'
    ctx.fillRect(2, 6, 3, 1);
    ctx.fillRect(3, 7, 1, 3);
    // 'N'
    ctx.fillRect(6, 6, 1, 4);
    ctx.fillRect(7, 7, 1, 1);
    ctx.fillRect(8, 8, 1, 1);
    ctx.fillRect(9, 6, 1, 4);
    // 'T'
    ctx.fillRect(11, 6, 3, 1);
    ctx.fillRect(12, 7, 1, 3);
  }
}

function drawGlowstone(ctx: CanvasRenderingContext2D) {
  const glowPalette = ['#ffdd67', '#f4c430', '#f9e8a2', '#d8a928', '#b5851d'];
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const r = Math.floor(pseudoRandom(x * 47 + y * 59) * glowPalette.length);
      ctx.fillStyle = glowPalette[r];
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

function drawCraftingTable(ctx: CanvasRenderingContext2D, face: 'top' | 'side') {
  if (face === 'top') {
    // Wood table with 3x3 crafting grid inlay
    drawOakPlanks(ctx);
    ctx.fillStyle = '#543b1f';
    ctx.strokeRect(2.5, 2.5, 11, 11);
    // 3x3 grid lines
    ctx.fillRect(6, 3, 1, 10);
    ctx.fillRect(10, 3, 1, 10);
    ctx.fillRect(3, 6, 10, 1);
    ctx.fillRect(3, 10, 10, 1);
  } else {
    // Side with saw / tools silhouette
    drawOakPlanks(ctx);
    ctx.fillStyle = '#3a2714';
    ctx.fillRect(3, 4, 10, 8);
    // Tools
    ctx.fillStyle = '#c0c0c0';
    ctx.fillRect(5, 5, 2, 4);
    ctx.fillStyle = '#654321';
    ctx.fillRect(9, 5, 1, 5);
  }
}

function drawWool(ctx: CanvasRenderingContext2D, baseColor: string, darkColor: string, lightColor: string) {
  const woolPalette = [baseColor, darkColor, lightColor, baseColor];
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const r = Math.floor(pseudoRandom(x * 37 + y * 41) * woolPalette.length);
      ctx.fillStyle = woolPalette[r];
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

function drawWater(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = 'rgba(55, 104, 200, 0.75)';
  ctx.fillRect(0, 0, 16, 16);
  // Gentle wave specks
  ctx.fillStyle = 'rgba(120, 160, 240, 0.85)';
  const waves = [[2, 4], [3, 4], [8, 9], [9, 9], [13, 3], [14, 3], [5, 14], [6, 14]];
  for (const [x, y] of waves) {
    ctx.fillRect(x, y, 1, 1);
  }
}

// Map from BlockType and face to specific drawer
function getTextureDrawer(block: BlockType, face: BlockFace): TextureDrawer {
  switch (block) {
    case BlockType.GRASS:
      if (face === 'top') return (ctx) => drawGrassTop(ctx);
      if (face === 'bottom') return (ctx) => drawDirt(ctx);
      return (ctx) => drawGrassSide(ctx);

    case BlockType.DIRT:
      return (ctx) => drawDirt(ctx);

    case BlockType.STONE:
      return (ctx) => drawStone(ctx);

    case BlockType.COBBLESTONE:
      return (ctx) => drawCobblestone(ctx);

    case BlockType.OAK_PLANKS:
      return (ctx) => drawOakPlanks(ctx);

    case BlockType.OAK_LOG:
      if (face === 'top' || face === 'bottom') return (ctx) => drawOakLogTop(ctx);
      return (ctx) => drawOakLogSide(ctx);

    case BlockType.OAK_LEAVES:
      return (ctx) => drawOakLeaves(ctx);

    case BlockType.GLASS:
      return (ctx) => drawGlass(ctx);

    case BlockType.BRICK:
      return (ctx) => drawBricks(ctx);

    case BlockType.SAND:
      return (ctx) => drawSand(ctx);

    case BlockType.DIAMOND_ORE:
      return (ctx) => drawOre(ctx, '#4ce3d8', '#b8f8f5');

    case BlockType.GOLD_ORE:
      return (ctx) => drawOre(ctx, '#fcee4c', '#fffbd1');

    case BlockType.IRON_ORE:
      return (ctx) => drawOre(ctx, '#d8af93', '#f5e4da');

    case BlockType.COAL_ORE:
      return (ctx) => drawOre(ctx, '#222222', '#555555');

    case BlockType.BEDROCK:
      return (ctx) => drawBedrock(ctx);

    case BlockType.BOOKSHELF:
      if (face === 'top' || face === 'bottom') return (ctx) => drawOakPlanks(ctx);
      return (ctx) => drawBookshelf(ctx);

    case BlockType.TNT:
      return (ctx) => drawTNT(ctx, face === 'top' ? 'top' : face === 'bottom' ? 'bottom' : 'side');

    case BlockType.GLOWSTONE:
      return (ctx) => drawGlowstone(ctx);

    case BlockType.CRAFTING_TABLE:
      if (face === 'top') return (ctx) => drawCraftingTable(ctx, 'top');
      if (face === 'bottom') return (ctx) => drawOakPlanks(ctx);
      return (ctx) => drawCraftingTable(ctx, 'side');

    case BlockType.RED_WOOL:
      return (ctx) => drawWool(ctx, '#a12822', '#801b17', '#bf3a33');

    case BlockType.BLUE_WOOL:
      return (ctx) => drawWool(ctx, '#35439c', '#273277', '#4b5bb8');

    case BlockType.GREEN_WOOL:
      return (ctx) => drawWool(ctx, '#496d1e', '#395517', '#5f8c27');

    case BlockType.YELLOW_WOOL:
      return (ctx) => drawWool(ctx, '#e2b327', '#b88f1c', '#f5cb4a');

    case BlockType.WHITE_WOOL:
      return (ctx) => drawWool(ctx, '#e4e7e7', '#c2c6c6', '#ffffff');

    case BlockType.WATER:
      return (ctx) => drawWater(ctx);

    case BlockType.DIAMOND_PICKAXE:
      return (ctx) => drawPickaxe(ctx);

    case BlockType.DIAMOND_SWORD:
      return (ctx) => drawSword(ctx);

    case BlockType.DIAMOND_SHOVEL:
      return (ctx) => drawShovel(ctx);

    case BlockType.DIAMOND_AXE:
      return (ctx) => drawAxe(ctx);

    case BlockType.APPLE:
      return (ctx) => drawApple(ctx);

    case BlockType.BREAD:
      return (ctx) => drawBread(ctx);

    case BlockType.SNIPER_RIFLE:
      return (ctx) => drawSniper(ctx);

    case BlockType.SNIPER_AMMO:
      return (ctx) => drawSniperAmmo(ctx);

    default:
      return (ctx) => drawStone(ctx);
  }
}

function drawPickaxe(ctx: CanvasRenderingContext2D) {
  ctx.clearRect(0, 0, 16, 16);
  ctx.fillStyle = '#6e4b23';
  for (let i = 2; i <= 9; i++) ctx.fillRect(i, 15 - i, 1, 1);
  ctx.fillStyle = '#4ce3d8';
  const head = [[8, 4], [9, 3], [10, 2], [11, 2], [12, 3], [13, 4], [14, 6], [10, 4], [11, 5]];
  for (const [x, y] of head) ctx.fillRect(x, y, 1, 1);
  ctx.fillStyle = '#bdf6f2';
  ctx.fillRect(10, 2, 2, 1);
}

function drawSword(ctx: CanvasRenderingContext2D) {
  ctx.clearRect(0, 0, 16, 16);
  ctx.fillStyle = '#6e4b23';
  ctx.fillRect(2, 13, 2, 2);
  ctx.fillStyle = '#3a2714';
  ctx.fillRect(3, 11, 3, 1);
  ctx.fillRect(2, 12, 1, 3);
  ctx.fillStyle = '#4ce3d8';
  for (let i = 4; i <= 12; i++) ctx.fillRect(i, 15 - i, 2, 1);
  ctx.fillRect(13, 2, 1, 1);
  ctx.fillStyle = '#bdf6f2';
  for (let i = 5; i <= 11; i++) ctx.fillRect(i, 15 - i, 1, 1);
}

function drawShovel(ctx: CanvasRenderingContext2D) {
  ctx.clearRect(0, 0, 16, 16);
  ctx.fillStyle = '#6e4b23';
  for (let i = 2; i <= 10; i++) ctx.fillRect(i, 15 - i, 1, 1);
  ctx.fillStyle = '#4ce3d8';
  const spade = [[11, 4], [12, 3], [13, 2], [12, 4], [11, 5], [13, 3]];
  for (const [x, y] of spade) ctx.fillRect(x, y, 1, 1);
  ctx.fillStyle = '#bdf6f2';
  ctx.fillRect(12, 3, 1, 1);
}

function drawAxe(ctx: CanvasRenderingContext2D) {
  ctx.clearRect(0, 0, 16, 16);
  ctx.fillStyle = '#6e4b23';
  for (let i = 2; i <= 11; i++) ctx.fillRect(i, 15 - i, 1, 1);
  ctx.fillStyle = '#4ce3d8';
  const axeHead = [[9, 3], [10, 2], [11, 2], [12, 3], [11, 4], [10, 4], [9, 5], [8, 5]];
  for (const [x, y] of axeHead) ctx.fillRect(x, y, 1, 1);
  ctx.fillStyle = '#bdf6f2';
  ctx.fillRect(10, 2, 2, 1);
}

function drawApple(ctx: CanvasRenderingContext2D) {
  ctx.clearRect(0, 0, 16, 16);
  ctx.fillStyle = '#d62828';
  ctx.fillRect(5, 5, 6, 8);
  ctx.fillRect(4, 6, 8, 6);
  ctx.fillStyle = '#f77f00';
  ctx.fillRect(5, 6, 2, 2);
  ctx.fillStyle = '#6e4b23';
  ctx.fillRect(7, 3, 1, 3);
  ctx.fillStyle = '#55a630';
  ctx.fillRect(8, 3, 2, 1);
}

function drawBread(ctx: CanvasRenderingContext2D) {
  ctx.clearRect(0, 0, 16, 16);
  ctx.fillStyle = '#b08953';
  ctx.fillRect(3, 7, 10, 5);
  ctx.fillRect(4, 6, 8, 7);
  ctx.fillStyle = '#7f5539';
  ctx.fillRect(5, 7, 1, 4);
  ctx.fillRect(8, 7, 1, 4);
  ctx.fillRect(11, 7, 1, 4);
}

function drawSniper(ctx: CanvasRenderingContext2D) {
  ctx.clearRect(0, 0, 16, 16);
  // Stock (wooden/dark composite)
  ctx.fillStyle = '#4a3728';
  ctx.fillRect(1, 11, 4, 3);
  ctx.fillRect(3, 10, 3, 2);
  // Receiver & Action
  ctx.fillStyle = '#22252a';
  ctx.fillRect(5, 9, 4, 3);
  // Bolt handle
  ctx.fillStyle = '#7a8288';
  ctx.fillRect(6, 8, 2, 1);
  // Long barrel
  ctx.fillStyle = '#181a1d';
  ctx.fillRect(9, 9, 6, 2);
  // Muzzle brake
  ctx.fillStyle = '#0f1113';
  ctx.fillRect(14, 8, 2, 3);
  // Scope mount & optic cylinder
  ctx.fillStyle = '#111315';
  ctx.fillRect(6, 6, 5, 2);
  ctx.fillStyle = '#38bdf8'; // scope lens glass reflection
  ctx.fillRect(10, 6, 1, 2);
  // Bipod legs
  ctx.fillStyle = '#4b5563';
  ctx.fillRect(12, 11, 1, 3);
  ctx.fillRect(14, 11, 1, 3);
}

function drawSniperAmmo(ctx: CanvasRenderingContext2D) {
  ctx.clearRect(0, 0, 16, 16);
  // Brass cartridge case
  ctx.fillStyle = '#eab308';
  ctx.fillRect(4, 7, 7, 4);
  ctx.fillRect(2, 8, 2, 2);
  // Bullet tip (copper/steel jacket)
  ctx.fillStyle = '#c2410c';
  ctx.fillRect(11, 8, 3, 2);
  ctx.fillRect(14, 8, 1, 1);
  // Highlight reflection
  ctx.fillStyle = '#fef08a';
  ctx.fillRect(4, 7, 7, 1);
}


// Cache textures for Three.js
const textureCache = new Map<string, THREE.CanvasTexture>();
const dataUrlCache = new Map<BlockType, string>();

export function getBlockTexture(block: BlockType, face: BlockFace): THREE.CanvasTexture {
  const cacheKey = `${block}_${face}`;
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey)!;
  }

  const [canvas, ctx] = create16x16Canvas();
  const drawer = getTextureDrawer(block, face);
  drawer(ctx);

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;

  textureCache.set(cacheKey, texture);
  return texture;
}

// 6 materials for BoxGeometry [right, left, top, bottom, front, back]
const materialsCache = new Map<BlockType, THREE.Material[]>();

export function getBlockMaterials(block: BlockType): THREE.Material[] {
  if (materialsCache.has(block)) {
    return materialsCache.get(block)!;
  }

  const isTransparent = block === BlockType.GLASS || block === BlockType.WATER;
  const isCutout = block === BlockType.OAK_LEAVES;
  const opacity = block === BlockType.WATER ? 0.75 : block === BlockType.GLASS ? 0.4 : 1.0;

  const faces: BlockFace[] = ['side', 'side', 'top', 'bottom', 'side', 'side'];
  const mats = faces.map((face) => {
    const tex = getBlockTexture(block, face);
    return new THREE.MeshLambertMaterial({
      map: tex,
      transparent: isTransparent || isCutout,
      opacity: opacity,
      alphaTest: isCutout ? 0.5 : 0,
      depthWrite: !isTransparent,
    });
  });

  materialsCache.set(block, mats);
  return mats;
}

// Generate high quality preview 2D icon DataURL for HUD & Inventory
export function getBlockIconDataUrl(block: BlockType): string {
  if (dataUrlCache.has(block)) {
    return dataUrlCache.get(block)!;
  }

  const [canvas, ctx] = create16x16Canvas();
  // Usually the side or top texture makes a recognizable icon
  const drawer = getTextureDrawer(block, block === BlockType.GRASS ? 'side' : 'top');
  drawer(ctx);

  const dataUrl = canvas.toDataURL();
  dataUrlCache.set(block, dataUrl);
  return dataUrl;
}
