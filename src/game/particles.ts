import * as THREE from 'three';
import { BLOCK_DEFINITIONS, BlockType } from './blocks';

interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

export class ParticleSystem {
  public scene: THREE.Scene;
  private particles: Particle[] = [];
  private particleGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public spawnBlockBreak(x: number, y: number, z: number, blockType: BlockType) {
    const blockDef = BLOCK_DEFINITIONS[blockType];
    const colorHex = blockDef?.color && blockDef.color !== 'transparent' ? blockDef.color : '#888888';
    const mat = new THREE.MeshBasicMaterial({ color: colorHex });

    const count = 12;
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(this.particleGeo, mat);
      // Spawn within block volume
      mesh.position.set(
        x + 0.2 + Math.random() * 0.6,
        y + 0.2 + Math.random() * 0.6,
        z + 0.2 + Math.random() * 0.6
      );

      // Random bursting velocity
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 4.0,
        1.5 + Math.random() * 3.5,
        (Math.random() - 0.5) * 4.0
      );

      this.scene.add(mesh);
      this.particles.push({
        mesh,
        velocity,
        life: 0,
        maxLife: 0.35 + Math.random() * 0.25,
      });
    }
  }

  public update(delta: number) {
    const gravity = 18.0;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += delta;

      if (p.life >= p.maxLife) {
        this.scene.remove(p.mesh);
        this.particles.splice(i, 1);
        continue;
      }

      // Physics
      p.velocity.y -= gravity * delta;
      p.mesh.position.addScaledVector(p.velocity, delta);

      // Shrink towards end of life
      const scale = Math.max(0.01, 1.0 - (p.life / p.maxLife));
      p.mesh.scale.setScalar(scale);
    }
  }

  public clear() {
    for (const p of this.particles) {
      this.scene.remove(p.mesh);
    }
    this.particles = [];
  }
}
