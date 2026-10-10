import * as THREE from 'three';
import { BlockType } from './blocks';
import { Chunk, CHUNK_SIZE_X, CHUNK_SIZE_Y, CHUNK_SIZE_Z } from './chunk';
import { SimplexNoise } from './noise';

export const DEFAULT_RENDER_RADIUS = 3; // 7x7 chunks = 49 chunks active around player
export const WATER_LEVEL = 7;

export interface RaycastHit {
  hit: boolean;
  x: number;
  y: number;
  z: number;
  normal: THREE.Vector3;
  block: BlockType;
  distance: number;
}

export class World {
  public chunks: Map<string, Chunk> = new Map();
  public group: THREE.Group;
  public seed: number;
  public renderRadius: number = DEFAULT_RENDER_RADIUS;
  private noise: SimplexNoise;

  // Track last player chunk to avoid unnecessary streaming checks
  private lastPlayerCx: number = 999999;
  private lastPlayerCz: number = 999999;

  constructor(seed = 133742) {
    this.seed = seed;
    this.noise = new SimplexNoise(seed);
    this.group = new THREE.Group();
  }

  public getChunkKey(cx: number, cz: number): string {
    return `${cx},${cz}`;
  }

  public getChunk(cx: number, cz: number): Chunk | undefined {
    return this.chunks.get(this.getChunkKey(cx, cz));
  }

  // Get or generate a chunk dynamically (for infinite world generation)
  public getOrCreateChunk(cx: number, cz: number): Chunk {
    const key = this.getChunkKey(cx, cz);
    let chunk = this.chunks.get(key);
    if (!chunk) {
      chunk = new Chunk(cx, cz);
      this.chunks.set(key, chunk);
      this.generateChunkTerrain(chunk);
    }
    return chunk;
  }

  public getBlock(wx: number, wy: number, wz: number): BlockType {
    if (wy < 0) return BlockType.BEDROCK;
    if (wy >= CHUNK_SIZE_Y) return BlockType.AIR;

    const cx = Math.floor(wx / CHUNK_SIZE_X);
    const cz = Math.floor(wz / CHUNK_SIZE_Z);
    const chunk = this.getOrCreateChunk(cx, cz);

    const lx = ((wx % CHUNK_SIZE_X) + CHUNK_SIZE_X) % CHUNK_SIZE_X;
    const lz = ((wz % CHUNK_SIZE_Z) + CHUNK_SIZE_Z) % CHUNK_SIZE_Z;

    return chunk.getBlock(lx, wy, lz);
  }

  public setBlock(wx: number, wy: number, wz: number, type: BlockType): boolean {
    if (wy < 0 || wy >= CHUNK_SIZE_Y) return false;

    const cx = Math.floor(wx / CHUNK_SIZE_X);
    const cz = Math.floor(wz / CHUNK_SIZE_Z);
    const chunk = this.getOrCreateChunk(cx, cz);

    const lx = ((wx % CHUNK_SIZE_X) + CHUNK_SIZE_X) % CHUNK_SIZE_X;
    const lz = ((wz % CHUNK_SIZE_Z) + CHUNK_SIZE_Z) % CHUNK_SIZE_Z;

    chunk.setBlock(lx, wy, lz, type);
    chunk.rebuildMesh(this);

    // If on border, also rebuild neighboring chunk to update face culling
    if (lx === 0) {
      this.getChunk(cx - 1, cz)?.rebuildMesh(this);
    } else if (lx === CHUNK_SIZE_X - 1) {
      this.getChunk(cx + 1, cz)?.rebuildMesh(this);
    }

    if (lz === 0) {
      this.getChunk(cx, cz - 1)?.rebuildMesh(this);
    } else if (lz === CHUNK_SIZE_Z - 1) {
      this.getChunk(cx, cz + 1)?.rebuildMesh(this);
    }

    return true;
  }

  // Generate procedural voxel terrain for an individual chunk
  private generateChunkTerrain(chunk: Chunk) {
    const cx = chunk.cx;
    const cz = chunk.cz;

    // 1. Terrain elevation & strata
    for (let lz = 0; lz < CHUNK_SIZE_Z; lz++) {
      for (let lx = 0; lx < CHUNK_SIZE_X; lx++) {
        const wx = cx * CHUNK_SIZE_X + lx;
        const wz = cz * CHUNK_SIZE_Z + lz;

        const baseElevation = 12;
        const hillHeight = 8;
        const heightNoise = this.noise.fbm2D(wx * 0.025, wz * 0.025, 4, 0.5, 2.0);
        const height = Math.floor(baseElevation + heightNoise * hillHeight);
        const clampedHeight = Math.max(1, Math.min(CHUNK_SIZE_Y - 7, height));

        for (let wy = 0; wy < CHUNK_SIZE_Y; wy++) {
          if (wy === 0) {
            chunk.setBlock(lx, wy, lz, BlockType.BEDROCK);
          } else if (wy < clampedHeight - 3) {
            // Stone layer with ores
            const oreNoise = this.noise.noise2D(wx * 0.15 + wy * 0.1, wz * 0.15 - wy * 0.1);
            if (wy <= 4 && oreNoise > 0.65) {
              chunk.setBlock(lx, wy, lz, BlockType.DIAMOND_ORE);
            } else if (wy <= 8 && oreNoise > 0.58) {
              chunk.setBlock(lx, wy, lz, BlockType.GOLD_ORE);
            } else if (wy <= 14 && oreNoise > 0.50) {
              chunk.setBlock(lx, wy, lz, BlockType.IRON_ORE);
            } else if (oreNoise > 0.42) {
              chunk.setBlock(lx, wy, lz, BlockType.COAL_ORE);
            } else {
              chunk.setBlock(lx, wy, lz, BlockType.STONE);
            }
          } else if (wy < clampedHeight) {
            chunk.setBlock(lx, wy, lz, BlockType.DIRT);
          } else if (wy === clampedHeight) {
            if (clampedHeight <= WATER_LEVEL + 1) {
              chunk.setBlock(lx, wy, lz, BlockType.SAND);
            } else {
              chunk.setBlock(lx, wy, lz, BlockType.GRASS);
            }
          } else if (wy <= WATER_LEVEL) {
            chunk.setBlock(lx, wy, lz, BlockType.WATER);
          } else {
            chunk.setBlock(lx, wy, lz, BlockType.AIR);
          }
        }
      }
    }

    // 2. Deterministic Trees in this chunk
    const treeHash = Math.abs(this.noise.noise2D(cx * 3.1415, cz * 2.7182));
    const treeCount = Math.floor(treeHash * 3); // 0 to 2 trees per chunk

    for (let i = 0; i < treeCount; i++) {
      const tlx = 3 + Math.floor(Math.abs(this.noise.noise2D(cx * 11.3 + i * 4.7, cz * 7.1)) * 10);
      const tlz = 3 + Math.floor(Math.abs(this.noise.noise2D(cx * 5.9, cz * 13.7 + i * 8.3)) * 10);
      const twx = cx * CHUNK_SIZE_X + tlx;
      const twz = cz * CHUNK_SIZE_Z + tlz;

      // Find top solid ground block
      let groundY = -1;
      for (let y = CHUNK_SIZE_Y - 7; y >= 2; y--) {
        if (chunk.getBlock(tlx, y, tlz) === BlockType.GRASS) {
          groundY = y;
          break;
        }
      }

      if (groundY > WATER_LEVEL + 1) {
        this.growTreeInChunk(chunk, tlx, groundY + 1, tlz, twx, twz);
      }
    }
  }

  private growTreeInChunk(
    chunk: Chunk,
    lx: number,
    baseY: number,
    lz: number,
    wx: number,
    wz: number
  ) {
    const trunkHeight = 4 + Math.floor(Math.abs(this.noise.noise2D(wx * 0.4, wz * 0.4)) * 2);
    if (baseY + trunkHeight + 2 >= CHUNK_SIZE_Y) return;

    // Trunk
    for (let y = 0; y < trunkHeight; y++) {
      chunk.setBlock(lx, baseY + y, lz, BlockType.OAK_LOG);
    }

    // Leaves crown
    const crownCenterY = baseY + trunkHeight;
    for (let dy = -2; dy <= 1; dy++) {
      const radius = dy >= 0 ? 1 : 2;
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dz = -radius; dz <= radius; dz++) {
          if (Math.abs(dx) === radius && Math.abs(dz) === radius && (dy === 1 || Math.random() > 0.4)) {
            continue;
          }
          const leafLx = lx + dx;
          const leafLy = crownCenterY + dy;
          const leafLz = lz + dz;

          if (
            leafLx >= 0 && leafLx < CHUNK_SIZE_X &&
            leafLz >= 0 && leafLz < CHUNK_SIZE_Z &&
            leafLy < CHUNK_SIZE_Y
          ) {
            if (chunk.getBlock(leafLx, leafLy, leafLz) === BlockType.AIR) {
              chunk.setBlock(leafLx, leafLy, leafLz, BlockType.OAK_LEAVES);
            }
          }
        }
      }
    }
  }

  // Infinite Chunk Streaming & Dynamic Loading around player position
  public updatePlayerPosition(playerPos: THREE.Vector3, force = false) {
    const playerCx = Math.floor(playerPos.x / CHUNK_SIZE_X);
    const playerCz = Math.floor(playerPos.z / CHUNK_SIZE_Z);

    if (!force && playerCx === this.lastPlayerCx && playerCz === this.lastPlayerCz) {
      return;
    }

    this.lastPlayerCx = playerCx;
    this.lastPlayerCz = playerCz;

    const r = this.renderRadius;

    // 1. Ensure all chunks within render radius exist and are added to scene
    for (let cx = playerCx - r; cx <= playerCx + r; cx++) {
      for (let cz = playerCz - r; cz <= playerCz + r; cz++) {
        const chunk = this.getOrCreateChunk(cx, cz);

        // Add to Three.js scene group if not already present
        if (!chunk.group.parent) {
          this.group.add(chunk.group);
        }

        // Rebuild mesh if dirty
        if (chunk.isDirty) {
          chunk.rebuildMesh(this);
        }
      }
    }

    // 2. Unload / detach meshes of distant chunks to keep memory & draw calls low
    const unloadDist = r + 2;
    for (const chunk of this.chunks.values()) {
      const dist = Math.max(Math.abs(chunk.cx - playerCx), Math.abs(chunk.cz - playerCz));
      if (dist > unloadDist) {
        if (chunk.group.parent) {
          this.group.remove(chunk.group);
          chunk.dispose();
          chunk.isDirty = true; // will remesh if player walks back
        }
      }
    }
  }

  // Raycasting
  public raycast(origin: THREE.Vector3, direction: THREE.Vector3, maxDistance = 6.0): RaycastHit {
    let x = Math.floor(origin.x);
    let y = Math.floor(origin.y);
    let z = Math.floor(origin.z);

    const stepX = Math.sign(direction.x);
    const stepY = Math.sign(direction.y);
    const stepZ = Math.sign(direction.z);

    const tDeltaX = stepX !== 0 ? Math.abs(1 / direction.x) : Infinity;
    const tDeltaY = stepY !== 0 ? Math.abs(1 / direction.y) : Infinity;
    const tDeltaZ = stepZ !== 0 ? Math.abs(1 / direction.z) : Infinity;

    const distX = stepX > 0 ? (x + 1 - origin.x) : (origin.x - x);
    const distY = stepY > 0 ? (y + 1 - origin.y) : (origin.y - y);
    const distZ = stepZ > 0 ? (z + 1 - origin.z) : (origin.z - z);

    let tMaxX = stepX !== 0 ? tDeltaX * distX : Infinity;
    let tMaxY = stepY !== 0 ? tDeltaY * distY : Infinity;
    let tMaxZ = stepZ !== 0 ? tDeltaZ * distZ : Infinity;

    const normal = new THREE.Vector3(0, 0, 0);
    let distance = 0;

    while (distance <= maxDistance) {
      const block = this.getBlock(x, y, z);
      if (block !== BlockType.AIR && block !== BlockType.WATER) {
        return {
          hit: true,
          x,
          y,
          z,
          normal,
          block,
          distance,
        };
      }

      if (tMaxX < tMaxY) {
        if (tMaxX < tMaxZ) {
          x += stepX;
          distance = tMaxX;
          tMaxX += tDeltaX;
          normal.set(-stepX, 0, 0);
        } else {
          z += stepZ;
          distance = tMaxZ;
          tMaxZ += tDeltaZ;
          normal.set(0, 0, -stepZ);
        }
      } else {
        if (tMaxY < tMaxZ) {
          y += stepY;
          distance = tMaxY;
          tMaxY += tDeltaY;
          normal.set(0, -stepY, 0);
        } else {
          z += stepZ;
          distance = tMaxZ;
          tMaxZ += tDeltaZ;
          normal.set(0, 0, -stepZ);
        }
      }
    }

    return {
      hit: false,
      x: 0,
      y: 0,
      z: 0,
      normal: new THREE.Vector3(),
      block: BlockType.AIR,
      distance: maxDistance,
    };
  }

  // Find a completely safe, clear spawn position on solid terrain
  public getSpawnPosition(): THREE.Vector3 {
    // Search in an expanding spiral around (0, 0)
    for (let radius = 0; radius <= 12; radius++) {
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dz = -radius; dz <= radius; dz++) {
          if (Math.abs(dx) !== radius && Math.abs(dz) !== radius) continue;

          const sx = dx;
          const sz = dz;

          // Find top solid ground block
          for (let y = CHUNK_SIZE_Y - 4; y >= WATER_LEVEL + 1; y--) {
            const ground = this.getBlock(sx, y, sz);
            const above1 = this.getBlock(sx, y + 1, sz);
            const above2 = this.getBlock(sx, y + 2, sz);
            const above3 = this.getBlock(sx, y + 3, sz);

            // Must be solid ground, not leaves, not water, not air
            const isGoodGround =
              ground === BlockType.GRASS ||
              ground === BlockType.DIRT ||
              ground === BlockType.STONE ||
              ground === BlockType.SAND;

            const isClearAir =
              above1 === BlockType.AIR &&
              above2 === BlockType.AIR &&
              above3 === BlockType.AIR;

            if (isGoodGround && isClearAir) {
              // Ensure immediate feet & head are clear
              this.setBlock(sx, y + 1, sz, BlockType.AIR);
              this.setBlock(sx, y + 2, sz, BlockType.AIR);
              return new THREE.Vector3(sx + 0.5, y + 1.02, sz + 0.5);
            }
          }
        }
      }
    }

    // Fallback: clear spawn at (0, 0)
    let topY = WATER_LEVEL + 3;
    for (let y = CHUNK_SIZE_Y - 4; y >= 2; y--) {
      const b = this.getBlock(0, y, 0);
      if (b !== BlockType.AIR && b !== BlockType.WATER && b !== BlockType.OAK_LEAVES) {
        topY = y + 1;
        break;
      }
    }
    this.setBlock(0, topY, 0, BlockType.AIR);
    this.setBlock(0, topY + 1, 0, BlockType.AIR);
    this.setBlock(0, topY + 2, 0, BlockType.AIR);
    return new THREE.Vector3(0.5, topY + 0.05, 0.5);
  }

  // Save world to localStorage
  public saveWorld(slotName = 'minecraft_world_save'): boolean {
    try {
      const serializedChunks: Record<string, string> = {};
      for (const [key, chunk] of this.chunks.entries()) {
        let binary = '';
        const len = chunk.blocks.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(chunk.blocks[i]);
        }
        serializedChunks[key] = btoa(binary);
      }

      const saveData = {
        seed: this.seed,
        chunks: serializedChunks,
        timestamp: Date.now(),
      };
      localStorage.setItem(slotName, JSON.stringify(saveData));
      return true;
    } catch (e) {
      console.error('Failed to save world:', e);
      return false;
    }
  }

  // Load world from localStorage
  public loadWorld(slotName = 'minecraft_world_save'): boolean {
    try {
      const raw = localStorage.getItem(slotName);
      if (!raw) return false;

      const data = JSON.parse(raw);
      if (!data.chunks) return false;

      this.seed = data.seed || 133742;
      this.noise = new SimplexNoise(this.seed);

      for (const chunk of this.chunks.values()) {
        chunk.dispose();
        if (chunk.group.parent) {
          this.group.remove(chunk.group);
        }
      }
      this.chunks.clear();

      for (const [key, b64] of Object.entries(data.chunks)) {
        const [cxStr, czStr] = key.split(',');
        const cx = parseInt(cxStr, 10);
        const cz = parseInt(czStr, 10);
        const chunk = new Chunk(cx, cz);

        const binary = atob(b64 as string);
        for (let i = 0; i < binary.length; i++) {
          chunk.blocks[i] = binary.charCodeAt(i);
        }
        this.chunks.set(key, chunk);
      }

      this.lastPlayerCx = 999999;
      this.lastPlayerCz = 999999;
      return true;
    } catch (e) {
      console.error('Failed to load world:', e);
      return false;
    }
  }

  public dispose() {
    for (const chunk of this.chunks.values()) {
      chunk.dispose();
      if (chunk.group.parent) {
        this.group.remove(chunk.group);
      }
    }
    this.chunks.clear();
  }
}
