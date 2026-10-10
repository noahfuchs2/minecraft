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

export type GameMode = 'survival' | 'creative';

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
  public isInWater: boolean = false;
  public isHeadUnderwater: boolean = false;

  // Game Mode, Health, Hunger & Oxygen
  public gameMode: GameMode = 'survival';
  public health: number = 20; // 20 HP = 10 Hearts
  public maxHealth: number = 20;
  public hunger: number = 20; // 20 = 10 drumsticks
  public maxHunger: number = 20;
  public oxygen: number = 20; // 20 = 10 air bubbles
  public maxOxygen: number = 20;
  public isDead: boolean = false;

  // Damage effects & timers
  public damageFlashTimer: number = 0;
  private invulnerableTimer: number = 0;
  private fallStartHeight: number = 0;
  private wasFalling: boolean = false;
  private regenTimer: number = 0;
  private hungerDepleteTimer: number = 0;
  private suffocationTimer: number = 0;
  private drownTimer: number = 0;
  private swimSoundTimer: number = 0;

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
    this.fallStartHeight = this.position.y;
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

    // Authentic damage tilt effect (camera tilts sideways briefly when hit)
    if (this.damageFlashTimer > 0) {
      const tilt = Math.sin((this.damageFlashTimer / 0.35) * Math.PI) * 0.12;
      const tiltEuler = new THREE.Euler(0, 0, tilt, 'XYZ');
      const tiltQuat = new THREE.Quaternion().setFromEuler(tiltEuler);
      this.camera.quaternion.multiply(tiltQuat);
    }
  }

  public look(movementX: number, movementY: number, sensitivity = 0.0022) {
    if (this.isDead) return;
    this.yaw -= movementX * sensitivity;
    this.pitch -= movementY * sensitivity;

    // Clamp pitch to [-89deg, +89deg]
    const maxPitch = (Math.PI / 2) - 0.01;
    this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch));

    this.updateCamera();
  }

  public takeDamage(amount: number, knockbackDir?: THREE.Vector3) {
    if (this.gameMode === 'creative' || this.isDead || this.invulnerableTimer > 0) {
      return;
    }

    this.health = Math.max(0, this.health - amount);
    this.damageFlashTimer = 0.35;
    this.invulnerableTimer = 0.45;
    soundManager.playHurt();

    // Knockback
    if (knockbackDir) {
      this.velocity.x += knockbackDir.x * 4.0;
      this.velocity.z += knockbackDir.z * 4.0;
      this.velocity.y += 3.5;
    }

    if (this.health <= 0) {
      this.isDead = true;
      this.velocity.set(0, 0, 0);
    }
  }

  public eatFood(foodPoints: number) {
    if (this.hunger >= this.maxHunger && this.health >= this.maxHealth) {
      return false;
    }
    this.hunger = Math.min(this.maxHunger, this.hunger + foodPoints);
    soundManager.playEat();
    return true;
  }

  public respawn(spawnPosition: THREE.Vector3) {
    this.health = this.maxHealth;
    this.hunger = this.maxHunger;
    this.oxygen = this.maxOxygen;
    this.isDead = false;
    this.damageFlashTimer = 0;
    this.invulnerableTimer = 0;
    this.velocity.set(0, 0, 0);
    this.position.copy(spawnPosition);
    this.fallStartHeight = this.position.y;
    this.updateCamera();
  }

  public update(delta: number, world: World) {
    if (this.isDead) {
      this.updateCamera();
      return;
    }

    const dt = Math.min(delta, 0.05);

    // Timers
    if (this.damageFlashTimer > 0) {
      this.damageFlashTimer = Math.max(0, this.damageFlashTimer - dt);
    }
    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer = Math.max(0, this.invulnerableTimer - dt);
    }

    // Check Water immersion at feet, waist, and head
    const feetBlock = world.getBlock(
      Math.floor(this.position.x),
      Math.floor(this.position.y + 0.2),
      Math.floor(this.position.z)
    );
    const waistBlock = world.getBlock(
      Math.floor(this.position.x),
      Math.floor(this.position.y + 0.8),
      Math.floor(this.position.z)
    );
    const headBlock = world.getBlock(
      Math.floor(this.position.x),
      Math.floor(this.position.y + this.eyeHeight),
      Math.floor(this.position.z)
    );

    const wasInWater = this.isInWater;
    this.isInWater = feetBlock === BlockType.WATER || waistBlock === BlockType.WATER || headBlock === BlockType.WATER;
    this.isHeadUnderwater = headBlock === BlockType.WATER;

    // Splash sound when jumping/falling into water
    if (!wasInWater && this.isInWater) {
      soundManager.playSplash();
      this.fallStartHeight = this.position.y;
      this.wasFalling = false;
    }

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

    // Sprint state check
    this.isSprinting = this.controls.sprint && this.controls.forward;

    if (this.isFlying) {
      // Creative flight physics
      const flySpeed = this.isSprinting ? 16.0 : 9.5;
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
      this.wasFalling = false;
      this.fallStartHeight = this.position.y;
    } else if (this.isInWater) {
      // WATER SWIMMING PHYSICS
      const swimSpeed = this.isSprinting ? 5.2 : 3.4;
      const targetVx = moveDir.x * swimSpeed;
      const targetVz = moveDir.z * swimSpeed;

      this.velocity.x += (targetVx - this.velocity.x) * Math.min(1.0, 12.0 * dt);
      this.velocity.z += (targetVz - this.velocity.z) * Math.min(1.0, 12.0 * dt);

      // Vertical swimming controls
      if (this.controls.jump) {
        // Space to swim up to surface
        this.velocity.y = 4.2;
      } else if (this.controls.sneak) {
        // Shift to dive downwards
        this.velocity.y = -3.8;
      } else {
        // Natural neutral buoyancy near surface
        this.velocity.y += (-0.6 - this.velocity.y) * Math.min(1.0, 5.0 * dt);
      }

      // Swim sound ticker
      if (moveDir.lengthSq() > 0 || this.controls.jump) {
        this.swimSoundTimer += dt;
        if (this.swimSoundTimer >= 0.75) {
          this.swimSoundTimer = 0;
          soundManager.playSwim();
        }
      }

      this.fallStartHeight = this.position.y;
      this.wasFalling = false;

      // Move with water drag
      this.moveAndCollide(world, dt);
    } else {
      // Standard Walking & Sprinting Physics
      const baseSpeed = this.isSprinting ? 6.8 : this.controls.sneak ? 2.2 : 4.4;
      const accel = this.isGrounded ? 35.0 : 15.0;

      const targetVx = moveDir.x * baseSpeed;
      const targetVz = moveDir.z * baseSpeed;

      this.velocity.x += (targetVx - this.velocity.x) * Math.min(1.0, accel * dt);
      this.velocity.z += (targetVz - this.velocity.z) * Math.min(1.0, accel * dt);

      // Track falling for Fall Damage calculation
      if (!this.isGrounded) {
        if (!this.wasFalling) {
          this.fallStartHeight = this.position.y;
          this.wasFalling = true;
        } else if (this.position.y > this.fallStartHeight) {
          this.fallStartHeight = this.position.y;
        }
      }

      // Gravity
      const gravity = 24.0;
      this.velocity.y -= gravity * dt;
      this.velocity.y = Math.max(-40.0, this.velocity.y);

      // Jump
      if (this.controls.jump && this.isGrounded) {
        this.velocity.y = 8.5;
        this.isGrounded = false;
        soundManager.playJump();

        if (this.gameMode === 'survival') {
          this.hunger = Math.max(0, this.hunger - 0.05);
        }
      }

      // Sneak edge fall prevention
      if (this.controls.sneak && this.isGrounded) {
        this.preventSneakFalling(world, dt);
      }

      // Resolve voxel collisions
      const previousGrounded = this.isGrounded;
      this.moveAndCollide(world, dt);

      // Landing: Apply Fall Damage if applicable
      if (!previousGrounded && this.isGrounded && this.wasFalling) {
        const fallDistance = this.fallStartHeight - this.position.y;
        if (this.gameMode === 'survival' && fallDistance > 3.2 && !this.isInWater) {
          const fallDamage = Math.floor((fallDistance - 3.0) * 1.5);
          if (fallDamage > 0) {
            this.takeDamage(fallDamage);
          }
        }
        this.wasFalling = false;
        this.fallStartHeight = this.position.y;
      }
    }

    // Footstep sound handler
    if (!this.isInWater && this.isGrounded && (Math.abs(this.velocity.x) > 0.5 || Math.abs(this.velocity.z) > 0.5)) {
      const horizontalSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
      this.distanceTraveled += horizontalSpeed * dt;

      const currentStepInterval = this.isSprinting ? 1.4 : this.footstepInterval;
      if (this.distanceTraveled >= currentStepInterval) {
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

    // Survival mechanics: Hunger, natural regen, oxygen/drowning, suffocation
    if (this.gameMode === 'survival') {
      this.updateSurvivalMechanics(dt, world);
    }

    this.updateCamera();
  }

  private updateSurvivalMechanics(dt: number, world: World) {
    // 1. Oxygen & Drowning
    if (this.isHeadUnderwater) {
      this.oxygen = Math.max(0, this.oxygen - dt * 1.5);
      if (this.oxygen <= 0) {
        this.drownTimer += dt;
        if (this.drownTimer >= 1.2) {
          this.drownTimer = 0;
          this.takeDamage(2);
        }
      }
    } else {
      this.oxygen = Math.min(this.maxOxygen, this.oxygen + dt * 12.0);
      this.drownTimer = 0;
    }

    // 2. Natural Regeneration when well fed (Hunger >= 18)
    if (this.hunger >= 18 && this.health < this.maxHealth) {
      this.regenTimer += dt;
      if (this.regenTimer >= 3.0) {
        this.regenTimer = 0;
        this.health = Math.min(this.maxHealth, this.health + 1);
        this.hunger = Math.max(0, this.hunger - 0.5);
      }
    } else {
      this.regenTimer = 0;
    }

    // 3. Starvation damage if Hunger == 0
    if (this.hunger <= 0) {
      this.hungerDepleteTimer += dt;
      if (this.hungerDepleteTimer >= 4.0) {
        this.hungerDepleteTimer = 0;
        if (this.health > 1) {
          this.takeDamage(1);
        }
      }
    } else {
      // Normal hunger drain (sprinting drains faster)
      const isMoving = this.controls.forward || this.controls.backward || this.controls.left || this.controls.right;
      const rate = this.isSprinting ? 0.12 : isMoving ? 0.025 : 0.005;
      this.hunger = Math.max(0, this.hunger - rate * dt);
    }

    // 4. Suffocation damage if head is inside a solid opaque block (NOT water)
    const headBlock = world.getBlock(
      Math.floor(this.position.x),
      Math.floor(this.position.y + this.eyeHeight),
      Math.floor(this.position.z)
    );
    const def = BLOCK_DEFINITIONS[headBlock];
    if (headBlock !== BlockType.AIR && headBlock !== BlockType.WATER && def && !def.transparent) {
      this.suffocationTimer += dt;
      if (this.suffocationTimer >= 1.0) {
        this.suffocationTimer = 0;
        this.takeDamage(2);
      }
    } else {
      this.suffocationTimer = 0;
    }
  }

  private preventSneakFalling(world: World, dt: number) {
    const nextX = this.position.x + this.velocity.x * dt;
    const nextZ = this.position.z + this.velocity.z * dt;
    const checkY = Math.floor(this.position.y - 0.5);

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
    let minY = Math.floor(this.position.y + 0.05); // slight inset to ignore ground beneath feet
    let maxY = Math.floor(this.position.y + currentHeight - 0.05);
    let minZ = Math.floor(this.position.z - halfWidth);
    let maxZ = Math.floor(this.position.z + halfWidth);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          if (this.isSolidBlock(world, x, y, z)) {
            if (this.velocity.x > 0 || this.position.x < x + 0.5) {
              this.position.x = x - halfWidth - 0.001;
            } else {
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
            if (this.velocity.z > 0 || this.position.z < z + 0.5) {
              this.position.z = z - halfWidth - 0.001;
            } else {
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
            if (this.velocity.y < 0 || this.position.y > y + 0.5) {
              this.position.y = y + 1;
              this.velocity.y = 0;
              this.isGrounded = true;
            } else {
              this.position.y = y - currentHeight - 0.001;
              this.velocity.y = 0;
            }
          }
        }
      }
    }
  }

  // Precise check if torso/head is genuinely stuck inside a solid block
  public isStuckInsideSolid(world: World): boolean {
    const checkY = this.position.y + 0.9; // center of body
    const b = world.getBlock(Math.floor(this.position.x), Math.floor(checkY), Math.floor(this.position.z));
    return this.isSolidBlock(world, Math.floor(this.position.x), Math.floor(checkY), Math.floor(this.position.z));
  }

  // De-penetration only when genuinely inside solid blocks
  public resolveStuck(world: World) {
    if (!this.isStuckInsideSolid(world)) {
      return;
    }

    // Step up to the surface
    for (let dy = 1; dy <= 12; dy++) {
      const targetY = Math.floor(this.position.y) + dy;
      const bTorso = world.getBlock(Math.floor(this.position.x), targetY, Math.floor(this.position.z));
      const bHead = world.getBlock(Math.floor(this.position.x), targetY + 1, Math.floor(this.position.z));
      if (!this.isSolidBlock(world, Math.floor(this.position.x), targetY, Math.floor(this.position.z)) &&
          !this.isSolidBlock(world, Math.floor(this.position.x), targetY + 1, Math.floor(this.position.z))) {
        this.position.y = targetY + 0.02;
        this.velocity.set(0, 0, 0);
        this.isGrounded = true;
        this.updateCamera();
        return;
      }
    }
  }

  public resetControls() {
    this.controls.forward = false;
    this.controls.backward = false;
    this.controls.left = false;
    this.controls.right = false;
    this.controls.jump = false;
    this.controls.sneak = false;
    this.controls.sprint = false;
    this.controls.flyUp = false;
    this.controls.flyDown = false;
    this.isSprinting = false;
    this.velocity.x = 0;
    this.velocity.z = 0;
  }

  private isSolidBlock(world: World, x: number, y: number, z: number): boolean {
    const b = world.getBlock(x, y, z);
    return b !== BlockType.AIR && b !== BlockType.WATER;
  }

  public toggleFlight() {
    if (this.gameMode === 'creative') {
      this.isFlying = !this.isFlying;
      this.velocity.set(0, 0, 0);
    }
  }

  public teleport(pos: THREE.Vector3) {
    this.position.copy(pos);
    this.velocity.set(0, 0, 0);
    this.fallStartHeight = pos.y;
    this.wasFalling = false;
    this.resetControls();
    this.updateCamera();
  }
}
