import * as THREE from 'three';
import { World } from './world';
import { BlockType, BLOCK_DEFINITIONS } from './blocks';
import { soundManager } from './audio';

export interface PlayerControls {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
  sneak: boolean;
  sprint: boolean;
  flyUp: boolean;
  flyDown: boolean;
}

export class Player {
  public position: THREE.Vector3;
  public velocity: THREE.Vector3;
  public camera: THREE.PerspectiveCamera;

  // Rotation angles (radians)
  public yaw: number = 0;
  public pitch: number = 0;

  // Physical dimensions (official Minecraft values)
  public readonly width: number = 0.6;
  public readonly height: number = 1.8;
  public readonly eyeHeight: number = 1.62;

  // State
  public isGrounded: boolean = false;
  public isFlying: boolean = false;
  public isSneaking: boolean = false;
  public isSprinting: boolean = false;

  // Sound triggers
  private distanceTraveled: number = 0;
  private footstepInterval: number = 1.9;

  // Input states
  public controls: PlayerControls = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false,
    sneak: false,
    sprint: false,
    flyUp: false,
    flyDown: false,
  };

  constructor(camera: THREE.PerspectiveCamera, spawnPosition?: THREE.Vector3) {
    this.camera = camera;
    this.position = spawnPosition?.clone() || new THREE.Vector3(0.5, 14, 0.5);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.updateCamera();
  }

  public updateCamera() {
    this.camera.position.set(
      this.position.x,
      this.position.y + (this.isSneaking ? this.eyeHeight - 0.2 : this.eyeHeight),
      this.position.z
    );

    // Apply pitch and yaw
    const euler = new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ');
    this.camera.quaternion.setFromEuler(euler);
  }

  public look(movementX: number, movementY: number, sensitivity = 0.0022) {
    this.yaw -= movementX * sensitivity;
    this.pitch -= movementY * sensitivity;

    // Clamp pitch to [-89deg, +89deg]
    const maxPitch = (Math.PI / 2) - 0.01;
    this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch));

    this.updateCamera();
  }

  public update(delta: number, world: World) {
    // Limit delta time to prevent physics tunneling during frame hiccups
    const dt = Math.min(delta, 0.05);

    // Direction vectors
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

    // Movement input vector
    const moveDir = new THREE.Vector3();
    if (this.controls.forward) moveDir.add(forward);
    if (this.controls.backward) moveDir.sub(forward);
    if (this.controls.right) moveDir.add(right);
    if (this.controls.left) moveDir.sub(right);

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();
    }

    if (this.isFlying) {
      // Creative flight physics
      const flySpeed = this.controls.sprint ? 16.0 : 9.0;
      this.velocity.x = moveDir.x * flySpeed;
      this.velocity.z = moveDir.z * flySpeed;

      if (this.controls.jump || this.controls.flyUp) {
        this.velocity.y = flySpeed * 0.7;
      } else if (this.controls.sneak || this.controls.flyDown) {
        this.velocity.y = -flySpeed * 0.7;
      } else {
        this.velocity.y = 0;
      }

      this.position.addScaledVector(this.velocity, dt);
      this.isGrounded = false;
    } else {
      // Standard Walking & Jumping Physics
      const baseSpeed = this.controls.sprint ? 6.0 : this.controls.sneak ? 2.0 : 4.4;
      const accel = this.isGrounded ? 35.0 : 15.0;

      // Target horizontal velocity
      const targetVx = moveDir.x * baseSpeed;
      const targetVz = moveDir.z * baseSpeed;

      // Smooth horizontal acceleration
      this.velocity.x += (targetVx - this.velocity.x) * Math.min(1.0, accel * dt);
      this.velocity.z += (targetVz - this.velocity.z) * Math.min(1.0, accel * dt);

      // Gravity
      const gravity = 24.0;
      this.velocity.y -= gravity * dt;
      // Terminal velocity
      this.velocity.y = Math.max(-40.0, this.velocity.y);

      // Jump
      if (this.controls.jump && this.isGrounded) {
        this.velocity.y = 8.5;
        this.isGrounded = false;
        soundManager.playJump();
      }

      // Sneak edge fall prevention
      if (this.controls.sneak && this.isGrounded) {
        this.preventSneakFalling(world, dt);
      }

      // Resolve voxel collisions along separate axes
      this.moveAndCollide(world, dt);
    }

    // Footstep sound handler
    if (this.isGrounded && (Math.abs(this.velocity.x) > 0.5 || Math.abs(this.velocity.z) > 0.5)) {
      const horizontalSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
      this.distanceTraveled += horizontalSpeed * dt;

      if (this.distanceTraveled >= this.footstepInterval) {
        this.distanceTraveled = 0;
        const blockBelow = world.getBlock(
          Math.floor(this.position.x),
          Math.floor(this.position.y - 0.2),
          Math.floor(this.position.z)
        );
        const soundType = BLOCK_DEFINITIONS[blockBelow]?.sound || 'grass';
        soundManager.playFootstep(soundType);
      }
    }

    this.updateCamera();
  }

  private preventSneakFalling(world: World, dt: number) {
    const nextX = this.position.x + this.velocity.x * dt;
    const nextZ = this.position.z + this.velocity.z * dt;
    const checkY = Math.floor(this.position.y - 0.5);

    // If no block below next position, arrest horizontal speed in that axis
    const blockBelowNextX = world.getBlock(Math.floor(nextX), checkY, Math.floor(this.position.z));
    if (blockBelowNextX === BlockType.AIR || blockBelowNextX === BlockType.WATER) {
      this.velocity.x = 0;
    }

    const blockBelowNextZ = world.getBlock(Math.floor(this.position.x), checkY, Math.floor(nextZ));
    if (blockBelowNextZ === BlockType.AIR || blockBelowNextZ === BlockType.WATER) {
      this.velocity.z = 0;
    }
  }

  // AABB collision detection vs voxel boxes
  private moveAndCollide(world: World, dt: number) {
    const halfWidth = this.width / 2;
    const currentHeight = this.controls.sneak ? this.height - 0.3 : this.height;

    // 1. Move along X
    this.position.x += this.velocity.x * dt;
    let minX = Math.floor(this.position.x - halfWidth);
    let maxX = Math.floor(this.position.x + halfWidth);
    let minY = Math.floor(this.position.y);
    let maxY = Math.floor(this.position.y + currentHeight);
    let minZ = Math.floor(this.position.z - halfWidth);
    let maxZ = Math.floor(this.position.z + halfWidth);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          if (this.isSolidBlock(world, x, y, z)) {
            if (this.velocity.x > 0) {
              this.position.x = x - halfWidth - 0.001;
            } else if (this.velocity.x < 0) {
              this.position.x = x + 1 + halfWidth + 0.001;
            }
            this.velocity.x = 0;
          }
        }
      }
    }

    // 2. Move along Z
    this.position.z += this.velocity.z * dt;
    minX = Math.floor(this.position.x - halfWidth);
    maxX = Math.floor(this.position.x + halfWidth);
    minZ = Math.floor(this.position.z - halfWidth);
    maxZ = Math.floor(this.position.z + halfWidth);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          if (this.isSolidBlock(world, x, y, z)) {
            if (this.velocity.z > 0) {
              this.position.z = z - halfWidth - 0.001;
            } else if (this.velocity.z < 0) {
              this.position.z = z + 1 + halfWidth + 0.001;
            }
            this.velocity.z = 0;
          }
        }
      }
    }

    // 3. Move along Y
    this.position.y += this.velocity.y * dt;
    minX = Math.floor(this.position.x - halfWidth);
    maxX = Math.floor(this.position.x + halfWidth);
    minY = Math.floor(this.position.y);
    maxY = Math.floor(this.position.y + currentHeight);
    minZ = Math.floor(this.position.z - halfWidth);
    maxZ = Math.floor(this.position.z + halfWidth);

    this.isGrounded = false;

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          if (this.isSolidBlock(world, x, y, z)) {
            if (this.velocity.y < 0) {
              // Landing on top of block
              this.position.y = y + 1;
              this.velocity.y = 0;
              this.isGrounded = true;
            } else if (this.velocity.y > 0) {
              // Hitting head on ceiling
              this.position.y = y - currentHeight - 0.001;
              this.velocity.y = 0;
            }
          }
        }
      }
    }
  }

  private isSolidBlock(world: World, x: number, y: number, z: number): boolean {
    const b = world.getBlock(x, y, z);
    return b !== BlockType.AIR && b !== BlockType.WATER;
  }

  public toggleFlight() {
    this.isFlying = !this.isFlying;
    this.velocity.set(0, 0, 0);
  }

  public teleport(pos: THREE.Vector3) {
    this.position.copy(pos);
    this.velocity.set(0, 0, 0);
    this.updateCamera();
  }
}
