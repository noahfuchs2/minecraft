import * as THREE from 'three';
import { BlockType } from './blocks';
import { getBlockTexture, BlockFace } from './textures';

// 16 tiles per row in a 256x256 texture (each tile is 16x16 pixels)
export const ATLAS_TILES_PER_ROW = 16;
export const TILE_SIZE = 16;
export const ATLAS_SIZE = ATLAS_TILES_PER_ROW * TILE_SIZE; // 256

export enum AtlasTile {
  AIR = 0,
  GRASS_TOP = 1,
  GRASS_SIDE = 2,
  DIRT = 3,
  STONE = 4,
  COBBLESTONE = 5,
  OAK_PLANKS = 6,
  OAK_LOG_TOP = 7,
  OAK_LOG_SIDE = 8,
  OAK_LEAVES = 9,
  GLASS = 10,
  BRICK = 11,
  SAND = 12,
  DIAMOND_ORE = 13,
  GOLD_ORE = 14,
  IRON_ORE = 15,
  COAL_ORE = 16,
  BEDROCK = 17,
  BOOKSHELF = 18,
  TNT_TOP = 19,
  TNT_SIDE = 20,
  GLOWSTONE = 21,
  CRAFTING_TOP = 22,
  CRAFTING_SIDE = 23,
  RED_WOOL = 24,
  BLUE_WOOL = 25,
  GREEN_WOOL = 26,
  YELLOW_WOOL = 27,
  WHITE_WOOL = 28,
  WATER = 29,
}

// Map BlockType and Face to AtlasTile
export function getAtlasTile(block: BlockType, face: BlockFace): AtlasTile {
  switch (block) {
    case BlockType.GRASS:
      if (face === 'top') return AtlasTile.GRASS_TOP;
      if (face === 'bottom') return AtlasTile.DIRT;
      return AtlasTile.GRASS_SIDE;

    case BlockType.DIRT:
      return AtlasTile.DIRT;

    case BlockType.STONE:
      return AtlasTile.STONE;

    case BlockType.COBBLESTONE:
      return AtlasTile.COBBLESTONE;

    case BlockType.OAK_PLANKS:
      return AtlasTile.OAK_PLANKS;

    case BlockType.OAK_LOG:
      if (face === 'top' || face === 'bottom') return AtlasTile.OAK_LOG_TOP;
      return AtlasTile.OAK_LOG_SIDE;

    case BlockType.OAK_LEAVES:
      return AtlasTile.OAK_LEAVES;

    case BlockType.GLASS:
      return AtlasTile.GLASS;

    case BlockType.BRICK:
      return AtlasTile.BRICK;

    case BlockType.SAND:
      return AtlasTile.SAND;

    case BlockType.DIAMOND_ORE:
      return AtlasTile.DIAMOND_ORE;

    case BlockType.GOLD_ORE:
      return AtlasTile.GOLD_ORE;

    case BlockType.IRON_ORE:
      return AtlasTile.IRON_ORE;

    case BlockType.COAL_ORE:
      return AtlasTile.COAL_ORE;

    case BlockType.BEDROCK:
      return AtlasTile.BEDROCK;

    case BlockType.BOOKSHELF:
      if (face === 'top' || face === 'bottom') return AtlasTile.OAK_PLANKS;
      return AtlasTile.BOOKSHELF;

    case BlockType.TNT:
      if (face === 'top' || face === 'bottom') return AtlasTile.TNT_TOP;
      return AtlasTile.TNT_SIDE;

    case BlockType.GLOWSTONE:
      return AtlasTile.GLOWSTONE;

    case BlockType.CRAFTING_TABLE:
      if (face === 'top') return AtlasTile.CRAFTING_TOP;
      if (face === 'bottom') return AtlasTile.OAK_PLANKS;
      return AtlasTile.CRAFTING_SIDE;

    case BlockType.RED_WOOL:
      return AtlasTile.RED_WOOL;

    case BlockType.BLUE_WOOL:
      return AtlasTile.BLUE_WOOL;

    case BlockType.GREEN_WOOL:
      return AtlasTile.GREEN_WOOL;

    case BlockType.YELLOW_WOOL:
      return AtlasTile.YELLOW_WOOL;

    case BlockType.WHITE_WOOL:
      return AtlasTile.WHITE_WOOL;

    case BlockType.WATER:
      return AtlasTile.WATER;

    default:
      return AtlasTile.STONE;
  }
}

let cachedAtlasTexture: THREE.CanvasTexture | null = null;
let cachedOpaqueMaterial: THREE.MeshLambertMaterial | null = null;
let cachedTransparentMaterial: THREE.MeshLambertMaterial | null = null;

export function getAtlasTexture(): THREE.CanvasTexture {
  if (cachedAtlasTexture) return cachedAtlasTexture;

  const canvas = document.createElement('canvas');
  canvas.width = ATLAS_SIZE;
  canvas.height = ATLAS_SIZE;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  // Clear
  ctx.clearRect(0, 0, ATLAS_SIZE, ATLAS_SIZE);

  // Paint each tile into the atlas
  const tileMapping: [AtlasTile, BlockType, BlockFace][] = [
    [AtlasTile.GRASS_TOP, BlockType.GRASS, 'top'],
    [AtlasTile.GRASS_SIDE, BlockType.GRASS, 'side'],
    [AtlasTile.DIRT, BlockType.DIRT, 'side'],
    [AtlasTile.STONE, BlockType.STONE, 'side'],
    [AtlasTile.COBBLESTONE, BlockType.COBBLESTONE, 'side'],
    [AtlasTile.OAK_PLANKS, BlockType.OAK_PLANKS, 'side'],
    [AtlasTile.OAK_LOG_TOP, BlockType.OAK_LOG, 'top'],
    [AtlasTile.OAK_LOG_SIDE, BlockType.OAK_LOG, 'side'],
    [AtlasTile.OAK_LEAVES, BlockType.OAK_LEAVES, 'side'],
    [AtlasTile.GLASS, BlockType.GLASS, 'side'],
    [AtlasTile.BRICK, BlockType.BRICK, 'side'],
    [AtlasTile.SAND, BlockType.SAND, 'side'],
    [AtlasTile.DIAMOND_ORE, BlockType.DIAMOND_ORE, 'side'],
    [AtlasTile.GOLD_ORE, BlockType.GOLD_ORE, 'side'],
    [AtlasTile.IRON_ORE, BlockType.IRON_ORE, 'side'],
    [AtlasTile.COAL_ORE, BlockType.COAL_ORE, 'side'],
    [AtlasTile.BEDROCK, BlockType.BEDROCK, 'side'],
    [AtlasTile.BOOKSHELF, BlockType.BOOKSHELF, 'side'],
    [AtlasTile.TNT_TOP, BlockType.TNT, 'top'],
    [AtlasTile.TNT_SIDE, BlockType.TNT, 'side'],
    [AtlasTile.GLOWSTONE, BlockType.GLOWSTONE, 'side'],
    [AtlasTile.CRAFTING_TOP, BlockType.CRAFTING_TABLE, 'top'],
    [AtlasTile.CRAFTING_SIDE, BlockType.CRAFTING_TABLE, 'side'],
    [AtlasTile.RED_WOOL, BlockType.RED_WOOL, 'side'],
    [AtlasTile.BLUE_WOOL, BlockType.BLUE_WOOL, 'side'],
    [AtlasTile.GREEN_WOOL, BlockType.GREEN_WOOL, 'side'],
    [AtlasTile.YELLOW_WOOL, BlockType.YELLOW_WOOL, 'side'],
    [AtlasTile.WHITE_WOOL, BlockType.WHITE_WOOL, 'side'],
    [AtlasTile.WATER, BlockType.WATER, 'side'],
  ];

  for (const [tileId, blockType, face] of tileMapping) {
    const tileX = (tileId % ATLAS_TILES_PER_ROW) * TILE_SIZE;
    const tileY = Math.floor(tileId / ATLAS_TILES_PER_ROW) * TILE_SIZE;

    const sourceTexture = getBlockTexture(blockType, face);
    const sourceImage = sourceTexture.image as HTMLCanvasElement;
    ctx.drawImage(sourceImage, tileX, tileY, TILE_SIZE, TILE_SIZE);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  cachedAtlasTexture = texture;
  return texture;
}

export function getAtlasMaterials() {
  const atlas = getAtlasTexture();

  if (!cachedOpaqueMaterial) {
    cachedOpaqueMaterial = new THREE.MeshLambertMaterial({
      map: atlas,
      transparent: true,
      alphaTest: 0.2, // Leaves cutout support
    });
  }

  if (!cachedTransparentMaterial) {
    cachedTransparentMaterial = new THREE.MeshLambertMaterial({
      map: atlas,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    });
  }

  return {
    opaque: cachedOpaqueMaterial,
    transparent: cachedTransparentMaterial,
  };
}

// Compute UV coordinates in the atlas for a quad
// Returns [u0, v0, u1, v1, u2, v2, u3, v3]
export function getTileUVs(tile: AtlasTile): number[] {
  const col = tile % ATLAS_TILES_PER_ROW;
  const row = Math.floor(tile / ATLAS_TILES_PER_ROW);

  // In WebGL, UV (0,0) is bottom-left, (1,1) is top-right
  const u0 = col / ATLAS_TILES_PER_ROW;
  const u1 = (col + 1) / ATLAS_TILES_PER_ROW;
  // Canvas row 0 is at top, so invert Y
  const v1 = 1.0 - (row / ATLAS_TILES_PER_ROW);
  const v0 = 1.0 - ((row + 1) / ATLAS_TILES_PER_ROW);

  // Slight inset (0.001) to prevent texture bleeding at edges
  const eps = 0.0005;
  const su0 = u0 + eps;
  const su1 = u1 - eps;
  const sv0 = v0 + eps;
  const sv1 = v1 - eps;

  // Quad vertices order: [bottom-left, bottom-right, top-right, top-left]
  return [
    su0, sv0,
    su1, sv0,
    su1, sv1,
    su0, sv1,
  ];
}
