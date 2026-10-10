import * as THREE from 'three';

// Generate 10 progressive cracking textures (0 to 9)
const crackTextures: THREE.CanvasTexture[] = [];

function generateCrackTextures() {
  if (crackTextures.length > 0) return crackTextures;

  for (let stage = 0; stage < 10; stage++) {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, 16, 16);

    // Dark crack lines with white outline
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';

    // Deterministic crack branches radiating outward
    const numBranches = 3 + Math.floor(stage * 0.8);
    const branchLength = 2 + stage * 1.4;

    for (let b = 0; b < numBranches; b++) {
      const angle = (b / numBranches) * Math.PI * 2 + (b * 0.3);
      let cx = 8;
      let cy = 8;
      for (let step = 0; step < branchLength; step++) {
        cx += Math.cos(angle + Math.sin(step) * 0.5) * 1.1;
        cy += Math.sin(angle + Math.cos(step) * 0.5) * 1.1;
        const px = Math.floor(cx);
        const py = Math.floor(cy);
        if (px >= 0 && px < 16 && py >= 0 && py < 16) {
          ctx.fillRect(px, py, 1, 1);
          // Thicker cracks in later stages
          if (stage >= 5 && Math.random() > 0.4) {
            ctx.fillRect(Math.min(15, px + 1), py, 1, 1);
          }
        }
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    crackTextures.push(tex);
  }

  return crackTextures;
}

export class CrackingOverlay {
  public mesh: THREE.Mesh;
  private material: THREE.MeshBasicMaterial;
  private textures: THREE.CanvasTexture[];

  constructor() {
    this.textures = generateCrackTextures();

    // Box slightly larger than 1 block to sit just above block faces
    const geo = new THREE.BoxGeometry(1.006, 1.006, 1.006);
    this.material = new THREE.MeshBasicMaterial({
      map: this.textures[0],
      transparent: true,
      opacity: 0.9,
      depthTest: true,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });

    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.visible = false;
  }

  public setProgress(x: number, y: number, z: number, progress: number) {
    // progress: 0.0 to 1.0
    if (progress <= 0 || progress >= 1.0) {
      this.mesh.visible = false;
      return;
    }

    const stage = Math.min(9, Math.floor(progress * 10));
    this.material.map = this.textures[stage];
    this.material.needsUpdate = true;
    this.mesh.position.set(x + 0.5, y + 0.5, z + 0.5);
    this.mesh.visible = true;
  }

  public hide() {
    this.mesh.visible = false;
  }

  public dispose() {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
