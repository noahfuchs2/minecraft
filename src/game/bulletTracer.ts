import * as THREE from 'three';

interface Tracer {
  line: THREE.Line;
  life: number;
  maxLife: number;
}

interface Spark {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

export class BulletTracerSystem {
  public scene: THREE.Scene;
  private tracers: Tracer[] = [];
  private sparks: Spark[] = [];
  private sparkGeo: THREE.BoxGeometry;
  private sparkMatYellow: THREE.MeshBasicMaterial;
  private sparkMatRed: THREE.MeshBasicMaterial;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.sparkGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
    this.sparkMatYellow = new THREE.MeshBasicMaterial({ color: 0xffdd44 });
    this.sparkMatRed = new THREE.MeshBasicMaterial({ color: 0xee2222 });
  }

  // Spawn a laser-fast sniper bullet tracer line
  public spawnTracer(from: THREE.Vector3, to: THREE.Vector3) {
    const points = [from.clone(), to.clone()];
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({
      color: 0xffea75,
      linewidth: 3,
      transparent: true,
      opacity: 0.95,
    });
    const line = new THREE.Line(geo, mat);
    this.scene.add(line);
    this.tracers.push({ line, life: 0.12, maxLife: 0.12 });
  }

  // Spawn impact sparks or blood burst
  public spawnImpactSparks(pos: THREE.Vector3, normal: THREE.Vector3, isMonster: boolean) {
    const count = isMonster ? 14 : 8;
    const mat = isMonster ? this.sparkMatRed : this.sparkMatYellow;

    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(this.sparkGeo, mat);
      mesh.position.copy(pos);

      // Random scatter reflecting off normal or bursting outwards
      const vel = new THREE.Vector3(
        normal.x * 2 + (Math.random() - 0.5) * 4,
        normal.y * 2 + Math.random() * 3 + 1,
        normal.z * 2 + (Math.random() - 0.5) * 4
      );

      this.scene.add(mesh);
      this.sparks.push({
        mesh,
        velocity: vel,
        life: 0.35 + Math.random() * 0.25,
        maxLife: 0.5,
      });
    }
  }

  public update(delta: number) {
    // 1. Tracers fade out quickly
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.life -= delta;
      const mat = t.line.material as THREE.LineBasicMaterial;
      mat.opacity = Math.max(0, t.life / t.maxLife);

      if (t.life <= 0) {
        this.scene.remove(t.line);
        t.line.geometry.dispose();
        mat.dispose();
        this.tracers.splice(i, 1);
      }
    }

    // 2. Sparks update with gravity
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.life -= delta;
      s.velocity.y -= 14 * delta; // gravity
      s.mesh.position.addScaledVector(s.velocity, delta);

      const scale = Math.max(0.01, s.life / s.maxLife);
      s.mesh.scale.set(scale, scale, scale);

      if (s.life <= 0) {
        this.scene.remove(s.mesh);
        this.sparks.splice(i, 1);
      }
    }
  }

  public clear() {
    for (const t of this.tracers) {
      this.scene.remove(t.line);
      t.line.geometry.dispose();
      (t.line.material as THREE.Material).dispose();
    }
    this.tracers = [];

    for (const s of this.sparks) {
      this.scene.remove(s.mesh);
    }
    this.sparks = [];
  }
}
