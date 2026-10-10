import * as THREE from 'three';
import { BlockType } from './blocks';
import { getBlockMaterials } from './textures';
import { soundManager } from './audio';

export interface DroppedItem {
  id: number;
  block: BlockType;
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  age: number;
  spawnTime: number;
}

export class DroppedItemManager {
  public scene: THREE.Scene;
  public items: DroppedItem[] = [];
  private nextId: number = 1;
  private itemGeo = new THREE.BoxGeometry(0.25, 0.25, 0.25);

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public spawnDrop(x: number, y: number, z: number, block: BlockType) {
    // Air, Bedrock, and Water don't drop items
    if (block === BlockType.AIR || block === BlockType.BEDROCK || block === BlockType.WATER) {
      return;
    }

    const materials = getBlockMaterials(block);
    const mesh = new THREE.Mesh(this.itemGeo, materials);
    mesh.position.set(x + 0.5, y + 0.5, z + 0.5);
    this.scene.add(mesh);

    const drop: DroppedItem = {
      id: this.nextId++,
      block,
      mesh,
      position: mesh.position,
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 1.5,
        2.5,
        (Math.random() - 0.5) * 1.5
      ),
      age: 0,
      spawnTime: performance.now(),
    };

    this.items.push(drop);
  }

  public update(
    delta: number,
    playerPos: THREE.Vector3,
    onPickup: (block: BlockType) => boolean,
    getBlock: (x: number, y: number, z: number) => BlockType
  ) {
    const gravity = 15.0;

    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      item.age += delta;

      // Rotate continuously
      item.mesh.rotation.y += delta * 2.5;

      // Check distance to player
      const distSq = item.position.distanceToSquared(playerPos);

      // Magnetic pull when close
      if (distSq < 3.5 && item.age > 0.4) {
        const pullDir = new THREE.Vector3().subVectors(playerPos, item.position).normalize();
        item.position.addScaledVector(pullDir, 8.0 * delta);

        // Pickup threshold
        if (distSq < 1.0) {
          const collected = onPickup(item.block);
          if (collected) {
            soundManager.playPickup();
            this.scene.remove(item.mesh);
            this.items.splice(i, 1);
            continue;
          }
        }
      } else {
        // Physical gravity & bounce
        item.velocity.y -= gravity * delta;
        item.position.y += item.velocity.y * delta;
        item.position.x += item.velocity.x * delta;
        item.position.z += item.velocity.z * delta;

        // Ground collision
        const groundY = Math.floor(item.position.y);
        const blockBelow = getBlock(
          Math.floor(item.position.x),
          groundY,
          Math.floor(item.position.z)
        );

        if (blockBelow !== BlockType.AIR && blockBelow !== BlockType.WATER) {
          item.position.y = groundY + 1.15;
          item.velocity.y = 0;
          item.velocity.x *= 0.8;
          item.velocity.z *= 0.8;
        }

        // Gentle floating bob
        item.mesh.position.y = item.position.y + Math.sin(item.age * 3) * 0.05;
      }

      // Despawn after 5 minutes
      if (item.age > 300) {
        this.scene.remove(item.mesh);
        this.items.splice(i, 1);
      }
    }
  }

  public clear() {
    for (const item of this.items) {
      this.scene.remove(item.mesh);
    }
    this.items = [];
  }
}
