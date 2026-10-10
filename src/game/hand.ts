import * as THREE from 'three';
import { BlockType } from './blocks';
import { getBlockMaterials } from './textures';

export class HandViewmodel {
  public group: THREE.Group;
  public blockMesh: THREE.Mesh | null = null;
  public camera: THREE.PerspectiveCamera;

  // Resting transform relative to camera
  private restPos = new THREE.Vector3(0.35, -0.32, -0.55);
  private restRot = new THREE.Euler(-0.2, 0.45, 0.1);

  // Swing animation state
  private isSwinging: boolean = false;
  private swingProgress: number = 0;
  private swingDuration: number = 0.22; // 220ms swing

  // Bobbing state
  private bobTime: number = 0;

  // Target block outline wireframe
  public selectionBox: THREE.LineSegments;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    this.group = new THREE.Group();
    this.camera.add(this.group);

    // Initial default held block (Grass)
    this.setHeldBlock(BlockType.GRASS);

    // Wireframe selection box for targeted block
    const boxGeo = new THREE.BoxGeometry(1.004, 1.004, 1.004);
    const edges = new THREE.EdgesGeometry(boxGeo);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x000000,
      linewidth: 2,
      depthTest: true,
      transparent: true,
      opacity: 0.6,
    });
    this.selectionBox = new THREE.LineSegments(edges, lineMat);
    this.selectionBox.visible = false;
  }

  public setHeldBlock(block: BlockType) {
    if (this.blockMesh) {
      this.group.remove(this.blockMesh);
      this.blockMesh.geometry.dispose();
      this.blockMesh = null;
    }

    if (block === BlockType.AIR) return;

    const materials = getBlockMaterials(block);
    const geo = new THREE.BoxGeometry(0.32, 0.32, 0.32);
    this.blockMesh = new THREE.Mesh(geo, materials);
    this.group.add(this.blockMesh);
  }

  public triggerSwing() {
    this.isSwinging = true;
    this.swingProgress = 0;
  }

  public update(delta: number, isMoving: boolean, isGrounded: boolean) {
    // 1. Bobbing
    if (isMoving && isGrounded) {
      this.bobTime += delta * 9.0;
    } else {
      this.bobTime += delta * 1.5; // subtle breathing when standing still
    }

    const bobX = Math.sin(this.bobTime) * (isMoving && isGrounded ? 0.015 : 0.003);
    const bobY = -Math.abs(Math.cos(this.bobTime)) * (isMoving && isGrounded ? 0.018 : 0.004);

    // 2. Swing animation calculation
    let swingRotX = 0;
    let swingRotY = 0;
    let swingOffsetZ = 0;

    if (this.isSwinging) {
      this.swingProgress += delta / this.swingDuration;
      if (this.swingProgress >= 1.0) {
        this.isSwinging = false;
        this.swingProgress = 0;
      } else {
        // Sine curve for swing: 0 -> peak -> 0
        const sinVal = Math.sin(this.swingProgress * Math.PI);
        swingRotX = -sinVal * 0.7;
        swingRotY = -sinVal * 0.4;
        swingOffsetZ = sinVal * 0.08;
      }
    }

    // Apply combined transform
    this.group.position.set(
      this.restPos.x + bobX,
      this.restPos.y + bobY,
      this.restPos.z + swingOffsetZ
    );

    this.group.rotation.set(
      this.restRot.x + swingRotX,
      this.restRot.y + swingRotY,
      this.restRot.z
    );
  }

  public updateSelectionBox(hitX: number, hitY: number, hitZ: number, visible: boolean) {
    this.selectionBox.visible = visible;
    if (visible) {
      this.selectionBox.position.set(hitX + 0.5, hitY + 0.5, hitZ + 0.5);
    }
  }

  public dispose() {
    if (this.blockMesh) {
      this.group.remove(this.blockMesh);
      this.blockMesh.geometry.dispose();
    }
    this.selectionBox.geometry.dispose();
  }
}
