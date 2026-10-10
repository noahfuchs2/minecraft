import * as THREE from 'three';
import { BlockType } from './blocks';
import { Chunk, CHUNK_SIZE_X, CHUNK_SIZE_Y, CHUNK_SIZE_Z } from './chunk';
import { SimplexNoise } from './noise';

export const CHUNK_RADIUS = 2; // -2 to +2 = 5x5 = 25 chunks (80x80 blocks)
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
  private noise: SimplexNoise;

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

  public getOrCreateChunk(cx: number, cz: number): Chunk {
    const key = this.getChunkKey(cx, cz);
    let chunk = this.chunks.get(key);
    if (!chunk) {
      chunk = new Chunk(cx, cz);
      this.chunks.set(key, chunk);
      this.group.add(chunk.group);
    }
    return chunk;
  }

  public getBlock(wx: number, wy: number, wz: number): BlockType {
    if (wy < 0) return BlockType.BEDROCK;
    if (wy >= CHUNK_SIZE_Y) return BlockType.AIR;

    const cx = Math.floor(wx / CHUNK_SIZE_X);
    const cz = Math.floor(wz / CHUNK_SIZE_Z);
    const chunk = this.chunks.get(this.getChunkKey(cx, cz));
    if (!chunk) return BlockType.AIR;

    const lx = ((wx % CHUNK_SIZE_X) + CHUNK_SIZE_X) % CHUNK_SIZE_X;
    const lz = ((wz % CHUNK_SIZE_Z) + CHUNK_SIZE_Z) % CHUNK_SIZE_Z;

    return chunk.getBlock(lx, wy, lz);
  }

  public setBlock(wx: number, wy: number, wz: number, type: BlockType): boolean {
    if (wy < 0 || wy >= CHUNK_SIZE_Y) return false;

    const cx = Math.floor(wx / CHUNK_SIZE_X);
    const cz = Math.floor(wz / CHUNK_SIZE_Z);
    const chunk = this.chunks.get(this.getChunkKey(cx, cz));
    if (!chunk) return false;

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

  // Generate initial procedural terrain
  public generateTerrain() {
    // 1. Generate bedrock, stone, dirt, grass, sand, water, ores
    for (let cx = -CHUNK_RADIUS; cx <= CHUNK_RADIUS; cx++) {
      for (let cz = -CHUNK_RADIUS; cz <= CHUNK_RADIUS; cz++) {
        const chunk = this.getOrCreateChunk(cx, cz);

        for (let lz = 0; lz < CHUNK_SIZE_Z; lz++) {
          for (let lx = 0; lx < CHUNK_SIZE_X; lx++) {
            const wx = cx * CHUNK_SIZE_X + lx;
            const wz = cz * CHUNK_SIZE_Z + lz;

            // Heightmap using multi-octave noise
            const baseElevation = 12;
            const hillHeight = 7;
            const heightNoise = this.noise.fbm2D(wx * 0.03, wz * 0.03, 3, 0.5, 2.0);
            const height = Math.floor(baseElevation + heightNoise * hillHeight);
            const clampedHeight = Math.max(1, Math.min(CHUNK_SIZE_Y - 6, height));

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
      }
    }

    // 2. Generate trees on grass surfaces
    for (let cx = -CHUNK_RADIUS; cx <= CHUNK_RADIUS; cx++) {
      for (let cz = -CHUNK_RADIUS; cz <= CHUNK_RADIUS; cz++) {
        // Pseudo-random tree positions in chunk
        const treeCount = 1 + Math.floor(Math.abs(this.noise.noise2D(cx * 1.7, cz * 1.7)) * 3);
        for (let i = 0; i < treeCount; i++) {
          const tlx = 3 + Math.floor(Math.abs(this.noise.noise2D(cx * 7.1 + i * 3.3, cz * 5.7)) * 10);
          const tlz = 3 + Math.floor(Math.abs(this.noise.noise2D(cx * 3.9, cz * 9.1 + i * 4.7)) * 10);
          const twx = cx * CHUNK_SIZE_X + tlx;
          const twz = cz * CHUNK_SIZE_Z + tlz;

          // Find top solid block
          let groundY = -1;
          for (let y = CHUNK_SIZE_Y - 7; y >= 2; y--) {
            if (this.getBlock(twx, y, twz) === BlockType.GRASS) {
              groundY = y;
              break;
            }
          }

          if (groundY > WATER_LEVEL + 1) {
            this.growTree(twx, groundY + 1, twz);
          }
        }
      }
    }

    // 3. Rebuild all chunk meshes
    for (const chunk of this.chunks.values()) {
      chunk.rebuildMesh(this);
    }
  }

  // Plant an Oak Tree
  private growTree(x: number, baseY: number, z: number) {
    const trunkHeight = 4 + Math.floor(Math.abs(this.noise.noise2D(x * 0.4, z * 0.4)) * 2);
    if (baseY + trunkHeight + 2 >= CHUNK_SIZE_Y) return;

    // Trunk
    for (let y = 0; y < trunkHeight; y++) {
      const cx = Math.floor(x / CHUNK_SIZE_X);
      const cz = Math.floor(z / CHUNK_SIZE_Z);
      const lx = ((x % CHUNK_SIZE_X) + CHUNK_SIZE_X) % CHUNK_SIZE_X;
      const lz = ((z % CHUNK_SIZE_Z) + CHUNK_SIZE_Z) % CHUNK_SIZE_Z;
      this.getChunk(cx, cz)?.setBlock(lx, baseY + y, lz, BlockType.OAK_LOG);
    }

    // Leaves crown (dome shape 5x5 bottom, 3x3 top)
    const crownCenterY = baseY + trunkHeight;
    for (let dy = -2; dy <= 1; dy++) {
      const radius = dy >= 0 ? 1 : 2;
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dz = -radius; dz <= radius; dz++) {
          // Trim corners on outer layer
          if (Math.abs(dx) === radius && Math.abs(dz) === radius && (dy === 1 || Math.random() > 0.4)) {
            continue;
          }
          const lx = x + dx;
          const ly = crownCenterY + dy;
          const lz = z + dz;
          if (this.getBlock(lx, ly, lz) === BlockType.AIR) {
            const ccx = Math.floor(lx / CHUNK_SIZE_X);
            const ccz = Math.floor(lz / CHUNK_SIZE_Z);
            const clx = ((lx % CHUNK_SIZE_X) + CHUNK_SIZE_X) % CHUNK_SIZE_X;
            const clz = ((lz % CHUNK_SIZE_Z) + CHUNK_SIZE_Z) % CHUNK_SIZE_Z;
            this.getChunk(ccx, ccz)?.setBlock(clx, ly, clz, BlockType.OAK_LEAVES);
          }
        }
      }
    }
  }

  // High performance voxel DDA Raycaster
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

  // Find a safe spawn position on the terrain
  public getSpawnPosition(): THREE.Vector3 {
    let topY = WATER_LEVEL + 2;
    for (let y = CHUNK_SIZE_Y - 2; y >= 1; y--) {
      const b = this.getBlock(0, y, 0);
      if (b !== BlockType.AIR && b !== BlockType.WATER) {
        topY = y + 1;
        break;
      }
    }
    return new THREE.Vector3(0.5, topY + 0.1, 0.5);
  }

  // Save world to localStorage
  public saveWorld(slotName = 'minecraft_world_save'): boolean {
    try {
      const serializedChunks: Record<string, string> = {};
      for (const [key, chunk] of this.chunks.entries()) {
        // Store Uint8Array as base64 string
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

      // Clear existing meshes
      for (const chunk of this.chunks.values()) {
        chunk.dispose();
        this.group.remove(chunk.group);
      }
      this.chunks.clear();

      // Load chunks
      for (const [key, b64] of Object.entries(data.chunks)) {
        const [cxStr, czStr] = key.split(',');
        const cx = parseInt(cxStr, 10);
        const cz = parseInt(czStr, 10);
        const chunk = this.getOrCreateChunk(cx, cz);

        const binary = atob(b64 as string);
        for (let i = 0; i < binary.length; i++) {
          chunk.blocks[i] = binary.charCodeAt(i);
        }
      }

      // Rebuild meshes
      for (const chunk of this.chunks.values()) {
        chunk.rebuildMesh(this);
      }
      return true;
    } catch (e) {
      console.error('Failed to load world:', e);
      return false;
    }
  }

  public dispose() {
    for (const chunk of this.chunks.values()) {
      chunk.dispose();
      this.group.remove(chunk.group);
    }
    this.chunks.clear();
  }
}
