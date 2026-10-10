import * as THREE from 'three';
import { BlockType } from './blocks';
import { getBlockMaterials } from './textures';

export class HandViewmodel {
  public group: THREE.Group;
  public blockMesh: THREE.Object3D | null = null;
  public camera: THREE.PerspectiveCamera;

  // Resting transform relative to camera
  private restPos = new THREE.Vector3(0.35, -0.32, -0.55);
  private restRot = new THREE.Euler(-0.2, 0.45, 0.1);

  // Swing animation state (for mining / melee)
  private isSwinging: boolean = false;
  private swingProgress: number = 0;
  private swingDuration: number = 0.22; // 220ms swing

  // Recoil kickback state (for sniper shots)
  private recoilZ: number = 0;
  private recoilRotX: number = 0;

  // Scope state
  public isScoped: boolean = false;

  // Bobbing state
  private bobTime: number = 0;

  // Current held item
  public currentItem: BlockType = BlockType.GRASS;

  // Target block outline wireframe
  public selectionBox: THREE.LineSegments;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    this.group = new THREE.Group();
    this.camera.add(this.group);

    // Initial default held item
    this.setHeldBlock(BlockType.SNIPER_RIFLE);

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
    this.currentItem = block;

    if (this.blockMesh) {
      this.group.remove(this.blockMesh);
      this.blockMesh = null;
    }

    if (block === BlockType.AIR) return;

    if (block === BlockType.SNIPER_RIFLE) {
      // Build 3D Voxel Tactical Sniper Rifle
      const rifleGroup = new THREE.Group();

      const matMetalDark = new THREE.MeshLambertMaterial({ color: 0x1e232a });
      const matStock = new THREE.MeshLambertMaterial({ color: 0x3d2b1f });
      const matBolt = new THREE.MeshLambertMaterial({ color: 0x64748b });
      const matGlass = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

      // 1. Stock
      const stockGeo = new THREE.BoxGeometry(0.06, 0.12, 0.32);
      const stock = new THREE.Mesh(stockGeo, matStock);
      stock.position.set(0, 0, 0.15);
      rifleGroup.add(stock);

      // 2. Receiver & Chamber
      const receiverGeo = new THREE.BoxGeometry(0.07, 0.1, 0.28);
      const receiver = new THREE.Mesh(receiverGeo, matMetalDark);
      receiver.position.set(0, 0.02, -0.1);
      rifleGroup.add(receiver);

      // 3. Bolt Handle
      const boltGeo = new THREE.BoxGeometry(0.06, 0.03, 0.03);
      const bolt = new THREE.Mesh(boltGeo, matBolt);
      bolt.position.set(0.05, 0.05, -0.05);
      rifleGroup.add(bolt);

      // 4. Long Sniper Barrel
      const barrelGeo = new THREE.BoxGeometry(0.045, 0.045, 0.7);
      const barrel = new THREE.Mesh(barrelGeo, matMetalDark);
      barrel.position.set(0, 0.04, -0.55);
      rifleGroup.add(barrel);

      // 5. Muzzle Brake
      const muzzleGeo = new THREE.BoxGeometry(0.06, 0.06, 0.08);
      const muzzle = new THREE.Mesh(muzzleGeo, matMetalDark);
      muzzle.position.set(0, 0.04, -0.92);
      rifleGroup.add(muzzle);

      // 6. Tactical Scope Mount & Tube
      const scopeMountGeo = new THREE.BoxGeometry(0.03, 0.05, 0.08);
      const scopeMount = new THREE.Mesh(scopeMountGeo, matMetalDark);
      scopeMount.position.set(0, 0.09, -0.12);
      rifleGroup.add(scopeMount);

      const scopeTubeGeo = new THREE.BoxGeometry(0.06, 0.06, 0.34);
      const scopeTube = new THREE.Mesh(scopeTubeGeo, matMetalDark);
      scopeTube.position.set(0, 0.13, -0.12);
      rifleGroup.add(scopeTube);

      // 7. Scope Lenses
      const lensGeo = new THREE.BoxGeometry(0.05, 0.05, 0.01);
      const lensFront = new THREE.Mesh(lensGeo, matGlass);
      lensFront.position.set(0, 0.13, -0.29);
      rifleGroup.add(lensFront);

      const lensBack = new THREE.Mesh(lensGeo, matGlass);
      lensBack.position.set(0, 0.13, 0.05);
      rifleGroup.add(lensBack);

      // Position in first-person view
      rifleGroup.position.set(0.12, -0.06, -0.15);
      rifleGroup.rotation.set(0.05, -0.1, 0);

      this.blockMesh = rifleGroup;
      this.group.add(rifleGroup);
    } else {
      // Regular block cube or tool
      const materials = getBlockMaterials(block);
      const geo = new THREE.BoxGeometry(0.32, 0.32, 0.32);
      const mesh = new THREE.Mesh(geo, materials);
      this.blockMesh = mesh;
      this.group.add(mesh);
    }
  }

  public triggerSwing() {
    this.isSwinging = true;
    this.swingProgress = 0;
  }

  // Trigger sniper rifle kickback recoil
  public triggerRecoil() {
    this.recoilZ = 0.14; // kick backwards
    this.recoilRotX = -0.25; // barrel kicks upward
  }

  // Get approximate muzzle world position for tracer beam
  public getMuzzleWorldPosition(): THREE.Vector3 {
    const muzzle = new THREE.Vector3(0.25, -0.2, -1.1);
    muzzle.applyQuaternion(this.camera.quaternion);
    muzzle.add(this.camera.position);
    return muzzle;
  }

  public update(delta: number, isMoving: boolean, isGrounded: boolean) {
    // Hide or lower weapon when looking through sniper scope
    this.group.visible = !this.isScoped;
    if (this.isScoped) return;

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
        const sinVal = Math.sin(this.swingProgress * Math.PI);
        swingRotX = -sinVal * 0.7;
        swingRotY = -sinVal * 0.4;
        swingOffsetZ = sinVal * 0.08;
      }
    }

    // 3. Recoil spring recovery
    this.recoilZ = Math.max(0, this.recoilZ - delta * 0.75);
    this.recoilRotX = Math.min(0, this.recoilRotX + delta * 1.4);

    // Apply combined transform
    this.group.position.set(
      this.restPos.x + bobX,
      this.restPos.y + bobY,
      this.restPos.z + swingOffsetZ + this.recoilZ
    );

    this.group.rotation.set(
      this.restRot.x + swingRotX + this.recoilRotX,
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
      this.blockMesh = null;
    }
    this.camera.remove(this.group);
  }
}
