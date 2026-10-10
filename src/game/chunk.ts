import * as THREE from 'three';
import { BlockType, BLOCK_DEFINITIONS } from './blocks';
import { getAtlasTile, getTileUVs, getAtlasMaterials } from './atlas';

export const CHUNK_SIZE_X = 16;
export const CHUNK_SIZE_Y = 32;
export const CHUNK_SIZE_Z = 16;
export const CHUNK_VOLUME = CHUNK_SIZE_X * CHUNK_SIZE_Y * CHUNK_SIZE_Z;

export interface BlockNeighborGetter {
  getBlock(wx: number, wy: number, wz: number): BlockType;
}

export class Chunk {
  public cx: number;
  public cz: number;
  public blocks: Uint8Array;
  public mesh: THREE.Mesh | null = null;
  public transparentMesh: THREE.Mesh | null = null;
  public group: THREE.Group;
  public isDirty: boolean = true;

  constructor(cx: number, cz: number) {
    this.cx = cx;
    this.cz = cz;
    this.blocks = new Uint8Array(CHUNK_VOLUME);
    this.group = new THREE.Group();
    this.group.position.set(cx * CHUNK_SIZE_X, 0, cz * CHUNK_SIZE_Z);
  }

  public getIndex(lx: number, ly: number, lz: number): number {
    return (ly * CHUNK_SIZE_Z + lz) * CHUNK_SIZE_X + lx;
  }

  public getBlock(lx: number, ly: number, lz: number): BlockType {
    if (lx < 0 || lx >= CHUNK_SIZE_X || ly < 0 || ly >= CHUNK_SIZE_Y || lz < 0 || lz >= CHUNK_SIZE_Z) {
      return BlockType.AIR;
    }
    return this.blocks[this.getIndex(lx, ly, lz)];
  }

  public setBlock(lx: number, ly: number, lz: number, type: BlockType) {
    if (lx < 0 || lx >= CHUNK_SIZE_X || ly < 0 || ly >= CHUNK_SIZE_Y || lz < 0 || lz >= CHUNK_SIZE_Z) {
      return;
    }
    this.blocks[this.getIndex(lx, ly, lz)] = type;
    this.isDirty = true;
  }

  // Build culled-face chunk geometry
  public rebuildMesh(world: BlockNeighborGetter) {
    const worldOffsetX = this.cx * CHUNK_SIZE_X;
    const worldOffsetZ = this.cz * CHUNK_SIZE_Z;

    // Buffers for opaque mesh
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];
    let vertexCount = 0;

    // Buffers for transparent mesh (glass, water)
    const tPositions: number[] = [];
    const tNormals: number[] = [];
    const tUvs: number[] = [];
    const tColors: number[] = [];
    const tIndices: number[] = [];
    let tVertexCount = 0;

    for (let ly = 0; ly < CHUNK_SIZE_Y; ly++) {
      for (let lz = 0; lz < CHUNK_SIZE_Z; lz++) {
        for (let lx = 0; lx < CHUNK_SIZE_X; lx++) {
          const block = this.getBlock(lx, ly, lz);
          if (block === BlockType.AIR) continue;

          const blockDef = BLOCK_DEFINITIONS[block];
          const isTransparentBlock = block === BlockType.GLASS || block === BlockType.WATER;

          const wx = worldOffsetX + lx;
          const wy = ly;
          const wz = worldOffsetZ + lz;

          // Helper to check neighbor visibility
          const shouldRenderFace = (nBlock: BlockType) => {
            if (nBlock === BlockType.AIR) return true;
            const nDef = BLOCK_DEFINITIONS[nBlock];
            if (nDef.transparent) {
              // Don't render water-against-water face
              if (block === BlockType.WATER && nBlock === BlockType.WATER) return false;
              // Don't render glass-against-glass internal face
              if (block === BlockType.GLASS && nBlock === BlockType.GLASS) return false;
              return true;
            }
            if (nDef.semiTransparent && block !== nBlock) return true;
            return false;
          };

          // Check all 6 faces
          // 0: +Y (Top)
          const topNeighbor = world.getBlock(wx, wy + 1, wz);
          if (shouldRenderFace(topNeighbor)) {
            this.addFace(
              lx, ly, lz, 'top', block, 1.0,
              isTransparentBlock ? tPositions : positions,
              isTransparentBlock ? tNormals : normals,
              isTransparentBlock ? tUvs : uvs,
              isTransparentBlock ? tColors : colors,
              isTransparentBlock ? tIndices : indices,
              isTransparentBlock ? tVertexCount : vertexCount
            );
            if (isTransparentBlock) tVertexCount += 4; else vertexCount += 4;
          }

          // 1: -Y (Bottom)
          const bottomNeighbor = world.getBlock(wx, wy - 1, wz);
          if (shouldRenderFace(bottomNeighbor)) {
            this.addFace(
              lx, ly, lz, 'bottom', block, 0.5,
              isTransparentBlock ? tPositions : positions,
              isTransparentBlock ? tNormals : normals,
              isTransparentBlock ? tUvs : uvs,
              isTransparentBlock ? tColors : colors,
              isTransparentBlock ? tIndices : indices,
              isTransparentBlock ? tVertexCount : vertexCount
            );
            if (isTransparentBlock) tVertexCount += 4; else vertexCount += 4;
          }

          // 2: +X (Right / East)
          const rightNeighbor = world.getBlock(wx + 1, wy, wz);
          if (shouldRenderFace(rightNeighbor)) {
            this.addFace(
              lx, ly, lz, 'right', block, 0.8,
              isTransparentBlock ? tPositions : positions,
              isTransparentBlock ? tNormals : normals,
              isTransparentBlock ? tUvs : uvs,
              isTransparentBlock ? tColors : colors,
              isTransparentBlock ? tIndices : indices,
              isTransparentBlock ? tVertexCount : vertexCount
            );
            if (isTransparentBlock) tVertexCount += 4; else vertexCount += 4;
          }

          // 3: -X (Left / West)
          const leftNeighbor = world.getBlock(wx - 1, wy, wz);
          if (shouldRenderFace(leftNeighbor)) {
            this.addFace(
              lx, ly, lz, 'left', block, 0.8,
              isTransparentBlock ? tPositions : positions,
              isTransparentBlock ? tNormals : normals,
              isTransparentBlock ? tUvs : uvs,
              isTransparentBlock ? tColors : colors,
              isTransparentBlock ? tIndices : indices,
              isTransparentBlock ? tVertexCount : vertexCount
            );
            if (isTransparentBlock) tVertexCount += 4; else vertexCount += 4;
          }

          // 4: +Z (Front / South)
          const frontNeighbor = world.getBlock(wx, wy, wz + 1);
          if (shouldRenderFace(frontNeighbor)) {
            this.addFace(
              lx, ly, lz, 'front', block, 0.65,
              isTransparentBlock ? tPositions : positions,
              isTransparentBlock ? tNormals : normals,
              isTransparentBlock ? tUvs : uvs,
              isTransparentBlock ? tColors : colors,
              isTransparentBlock ? tIndices : indices,
              isTransparentBlock ? tVertexCount : vertexCount
            );
            if (isTransparentBlock) tVertexCount += 4; else vertexCount += 4;
          }

          // 5: -Z (Back / North)
          const backNeighbor = world.getBlock(wx, wy, wz - 1);
          if (shouldRenderFace(backNeighbor)) {
            this.addFace(
              lx, ly, lz, 'back', block, 0.65,
              isTransparentBlock ? tPositions : positions,
              isTransparentBlock ? tNormals : normals,
              isTransparentBlock ? tUvs : uvs,
              isTransparentBlock ? tColors : colors,
              isTransparentBlock ? tIndices : indices,
              isTransparentBlock ? tVertexCount : vertexCount
            );
            if (isTransparentBlock) tVertexCount += 4; else vertexCount += 4;
          }
        }
      }
    }

    const materials = getAtlasMaterials();

    // Update Opaque Mesh
    if (this.mesh) {
      this.group.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh = null;
    }

    if (positions.length > 0) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      geo.setIndex(indices);

      this.mesh = new THREE.Mesh(geo, materials.opaque);
      this.mesh.castShadow = true;
      this.mesh.receiveShadow = true;
      this.group.add(this.mesh);
    }

    // Update Transparent Mesh
    if (this.transparentMesh) {
      this.group.remove(this.transparentMesh);
      this.transparentMesh.geometry.dispose();
      this.transparentMesh = null;
    }

    if (tPositions.length > 0) {
      const tGeo = new THREE.BufferGeometry();
      tGeo.setAttribute('position', new THREE.Float32BufferAttribute(tPositions, 3));
      tGeo.setAttribute('normal', new THREE.Float32BufferAttribute(tNormals, 3));
      tGeo.setAttribute('uv', new THREE.Float32BufferAttribute(tUvs, 2));
      tGeo.setAttribute('color', new THREE.Float32BufferAttribute(tColors, 3));
      tGeo.setIndex(tIndices);

      this.transparentMesh = new THREE.Mesh(tGeo, materials.transparent);
      this.group.add(this.transparentMesh);
    }

    this.isDirty = false;
  }

  private addFace(
    x: number,
    y: number,
    z: number,
    face: 'top' | 'bottom' | 'right' | 'left' | 'front' | 'back',
    block: BlockType,
    shade: number,
    positions: number[],
    normals: number[],
    uvs: number[],
    colors: number[],
    indices: number[],
    vCount: number
  ) {
    const tile = getAtlasTile(block, face);
    const [u0, v0, u1, v1_dummy, u1_dup, v1, u0_dup, v0_dup] = getTileUVs(tile);

    // Quad geometry definitions relative to block local (x, y, z) to (x+1, y+1, z+1)
    let p: number[] = [];
    let n: number[] = [];

    switch (face) {
      case 'top':
        p = [
          x, y + 1, z + 1,
          x + 1, y + 1, z + 1,
          x + 1, y + 1, z,
          x, y + 1, z,
        ];
        n = [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0];
        break;
      case 'bottom':
        p = [
          x, y, z,
          x + 1, y, z,
          x + 1, y, z + 1,
          x, y, z + 1,
        ];
        n = [0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0];
        break;
      case 'right': // +X
        p = [
          x + 1, y, z + 1,
          x + 1, y, z,
          x + 1, y + 1, z,
          x + 1, y + 1, z + 1,
        ];
        n = [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0];
        break;
      case 'left': // -X
        p = [
          x, y, z,
          x, y, z + 1,
          x, y + 1, z + 1,
          x, y + 1, z,
        ];
        n = [-1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0];
        break;
      case 'front': // +Z
        p = [
          x, y, z + 1,
          x + 1, y, z + 1,
          x + 1, y + 1, z + 1,
          x, y + 1, z + 1,
        ];
        n = [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1];
        break;
      case 'back': // -Z
        p = [
          x + 1, y, z,
          x, y, z,
          x, y + 1, z,
          x + 1, y + 1, z,
        ];
        n = [0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1];
        break;
    }

    positions.push(...p);
    normals.push(...n);

    // Quad UV mapping: 0, 1, 2, 3
    uvs.push(
      u0, v0,
      u1, v0,
      u1, v1,
      u0, v1
    );

    // Vertex colors for Minecraft face directional shading
    for (let i = 0; i < 4; i++) {
      colors.push(shade, shade, shade);
    }

    // 2 triangles per quad
    indices.push(
      vCount, vCount + 1, vCount + 2,
      vCount, vCount + 2, vCount + 3
    );
  }

  public dispose() {
    if (this.mesh) {
      this.mesh.geometry.dispose();
      this.mesh = null;
    }
    if (this.transparentMesh) {
      this.transparentMesh.geometry.dispose();
      this.transparentMesh = null;
    }
  }
}
