import * as THREE from 'three';
import { World } from './world';
import { soundManager } from './audio';

export type MonsterType = 'zombie' | 'creeper' | 'crawler' | 'titan';

export interface Monster {
  id: number;
  type: MonsterType;
  group: THREE.Group;
  headMesh: THREE.Mesh;
  bodyMesh: THREE.Mesh;
  leftArm?: THREE.Mesh;
  rightArm?: THREE.Mesh;
  leftLeg: THREE.Mesh;
  rightLeg: THREE.Mesh;
  healthBar: THREE.Mesh;
  healthBarBg: THREE.Mesh;
  
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  yaw: number;
  
  health: number;
  maxHealth: number;
  speed: number;
  attackDamage: number;
  attackCooldown: number;
  
  // Flash red on damage
  hurtTimer: number;
  
  // Creeper explosion state
  fuseTimer: number;
  isFusing: boolean;
  
  // Animation state
  walkCycle: number;
}

export class MonsterManager {
  public scene: THREE.Scene;
  public monsters: Monster[] = [];
  private nextId: number = 1;

  // Wave & Spawn management
  public currentWave: number = 1;
  public totalKills: number = 0;
  public headshotKills: number = 0;
  private spawnTimer: number = 0;
  private soundTimer: number = 0;

  // Callbacks
  public onMonsterKilled?: (monster: Monster, isHeadshot: boolean) => void;
  public onPlayerDamaged?: (damage: number) => void;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  // Create materials
  private getMaterials(type: MonsterType) {
    switch (type) {
      case 'zombie':
        return {
          head: new THREE.MeshLambertMaterial({ color: 0x4f8745 }), // zombie green
          body: new THREE.MeshLambertMaterial({ color: 0x226b80 }), // cyan shirt
          limbs: new THREE.MeshLambertMaterial({ color: 0x4f8745 }),
          pants: new THREE.MeshLambertMaterial({ color: 0x283655 }), // dark blue pants
        };
      case 'creeper':
        return {
          head: new THREE.MeshLambertMaterial({ color: 0x2d8a4e }), // textured green
          body: new THREE.MeshLambertMaterial({ color: 0x38a159 }),
          limbs: new THREE.MeshLambertMaterial({ color: 0x23683a }),
          pants: new THREE.MeshLambertMaterial({ color: 0x23683a }),
        };
      case 'crawler':
        return {
          head: new THREE.MeshLambertMaterial({ color: 0xd90429 }), // dark crimson
          body: new THREE.MeshLambertMaterial({ color: 0x1f1f2e }),
          limbs: new THREE.MeshLambertMaterial({ color: 0x2b2b3d }),
          pants: new THREE.MeshLambertMaterial({ color: 0x1f1f2e }),
        };
      case 'titan':
        return {
          head: new THREE.MeshLambertMaterial({ color: 0x5a189a }), // dark void titan
          body: new THREE.MeshLambertMaterial({ color: 0x3c096c }),
          limbs: new THREE.MeshLambertMaterial({ color: 0x7b2cbf }),
          pants: new THREE.MeshLambertMaterial({ color: 0x240046 }),
        };
    }
  }

  // Spawn monster at given position
  public spawnMonster(type: MonsterType, x: number, y: number, z: number): Monster {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    const mats = this.getMaterials(type);
    const scale = type === 'titan' ? 1.6 : type === 'crawler' ? 0.75 : 1.0;

    let maxHp = 100;
    let speed = 2.8;
    let dmg = 3;

    if (type === 'creeper') {
      maxHp = 70;
      speed = 3.2;
      dmg = 14;
    } else if (type === 'crawler') {
      maxHp = 50;
      speed = 4.6;
      dmg = 4;
    } else if (type === 'titan') {
      maxHp = 350;
      speed = 1.9;
      dmg = 8;
    }

    // 1. Head
    const headGeo = new THREE.BoxGeometry(0.5 * scale, 0.5 * scale, 0.5 * scale);
    const headMesh = new THREE.Mesh(headGeo, mats.head);
    headMesh.position.set(0, 1.45 * scale, 0);
    // Add glowing red eye voxels
    const eyeGeo = new THREE.BoxGeometry(0.1 * scale, 0.08 * scale, 0.05 * scale);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0033 });
    const eyeLeft = new THREE.Mesh(eyeGeo, eyeMat);
    eyeLeft.position.set(-0.13 * scale, 0.05 * scale, 0.26 * scale);
    const eyeRight = new THREE.Mesh(eyeGeo, eyeMat);
    eyeRight.position.set(0.13 * scale, 0.05 * scale, 0.26 * scale);
    headMesh.add(eyeLeft);
    headMesh.add(eyeRight);
    group.add(headMesh);

    // 2. Torso
    const bodyGeo = new THREE.BoxGeometry(0.55 * scale, 0.75 * scale, 0.3 * scale);
    const bodyMesh = new THREE.Mesh(bodyGeo, mats.body);
    bodyMesh.position.set(0, 0.85 * scale, 0);
    group.add(bodyMesh);

    // 3. Arms
    let leftArm: THREE.Mesh | undefined;
    let rightArm: THREE.Mesh | undefined;

    if (type !== 'creeper') {
      const armGeo = new THREE.BoxGeometry(0.2 * scale, 0.7 * scale, 0.2 * scale);
      leftArm = new THREE.Mesh(armGeo, mats.limbs);
      leftArm.position.set(-0.38 * scale, 0.85 * scale, 0);
      rightArm = new THREE.Mesh(armGeo, mats.limbs);
      rightArm.position.set(0.38 * scale, 0.85 * scale, 0);

      // Zombie arms outstretched forward
      if (type === 'zombie' || type === 'titan') {
        leftArm.rotation.x = -Math.PI / 2.2;
        rightArm.rotation.x = -Math.PI / 2.2;
      }
      group.add(leftArm);
      group.add(rightArm);
    }

    // 4. Legs
    const legGeo = new THREE.BoxGeometry(0.24 * scale, 0.65 * scale, 0.24 * scale);
    const leftLeg = new THREE.Mesh(legGeo, mats.pants);
    leftLeg.position.set(-0.15 * scale, 0.32 * scale, 0);
    const rightLeg = new THREE.Mesh(legGeo, mats.pants);
    rightLeg.position.set(0.15 * scale, 0.32 * scale, 0);
    group.add(leftLeg);
    group.add(rightLeg);

    // 5. Billboard Health Bar above monster head
    const hbBgGeo = new THREE.PlaneGeometry(0.8 * scale, 0.1 * scale);
    const hbBgMat = new THREE.MeshBasicMaterial({ color: 0x111111, side: THREE.DoubleSide });
    const healthBarBg = new THREE.Mesh(hbBgGeo, hbBgMat);
    healthBarBg.position.set(0, 1.95 * scale, 0);

    const hbGeo = new THREE.PlaneGeometry(0.76 * scale, 0.07 * scale);
    const hbMat = new THREE.MeshBasicMaterial({ color: 0x22c55e, side: THREE.DoubleSide });
    const healthBar = new THREE.Mesh(hbGeo, hbMat);
    healthBar.position.set(0, 0, 0.01);
    healthBarBg.add(healthBar);
    group.add(healthBarBg);

    this.scene.add(group);

    const monster: Monster = {
      id: this.nextId++,
      type,
      group,
      headMesh,
      bodyMesh,
      leftArm,
      rightArm,
      leftLeg,
      rightLeg,
      healthBar,
      healthBarBg,
      position: new THREE.Vector3(x, y, z),
      velocity: new THREE.Vector3(0, 0, 0),
      yaw: 0,
      health: maxHp,
      maxHealth: maxHp,
      speed,
      attackDamage: dmg,
      attackCooldown: 0,
      hurtTimer: 0,
      fuseTimer: 0,
      isFusing: false,
      walkCycle: Math.random() * Math.PI,
    };

    this.monsters.push(monster);
    return monster;
  }

  // Update monster AI, physics, animations, and combat
  public update(
    delta: number,
    playerPos: THREE.Vector3,
    cameraPos: THREE.Vector3,
    world: World,
    onPlayerDamage?: (amount: number) => void
  ) {
    // 1. Spawning system: spawn enemies around player at safe distance (22 to 45 blocks away)
    this.spawnTimer += delta;
    const targetMonsterCount = Math.min(6 + this.currentWave * 2, 18);

    if (this.spawnTimer >= 2.5 && this.monsters.length < targetMonsterCount) {
      this.spawnTimer = 0;
      this.attemptSpawnAroundPlayer(playerPos, world);
    }

    // 2. Ambient monster audio
    this.soundTimer += delta;
    if (this.soundTimer >= 5.0 && this.monsters.length > 0) {
      this.soundTimer = 0;
      soundManager.playZombieGroan();
    }

    // 3. Process each monster
    for (let i = this.monsters.length - 1; i >= 0; i--) {
      const m = this.monsters[i];

      // Billboard health bar towards player camera
      m.healthBarBg.quaternion.copy(world.group.parent ? world.group.parent.quaternion : new THREE.Quaternion());
      m.healthBarBg.lookAt(cameraPos);

      // Flash red when hurt
      if (m.hurtTimer > 0) {
        m.hurtTimer -= delta;
        const flashColor = m.hurtTimer > 0 ? 0xff2222 : 0xffffff;
        (m.bodyMesh.material as THREE.MeshLambertMaterial).color.setHex(
          m.hurtTimer > 0 ? flashColor : this.getMaterials(m.type).body.color.getHex()
        );
      }

      // Distance to player
      const dx = playerPos.x - m.position.x;
      const dz = playerPos.z - m.position.z;
      const distToPlayer = Math.hypot(dx, dz);

      // Despawn if too far away (> 75 blocks)
      if (distToPlayer > 75) {
        this.despawnMonster(i);
        continue;
      }

      // Look at player
      m.yaw = Math.atan2(dx, dz);
      m.group.rotation.y = m.yaw;

      // Creeper explosive charge
      if (m.type === 'creeper') {
        if (distToPlayer <= 3.8) {
          m.isFusing = true;
          m.fuseTimer += delta;
          // Flash white & expand
          const flash = Math.sin(m.fuseTimer * 20) > 0;
          (m.bodyMesh.material as THREE.MeshLambertMaterial).color.setHex(flash ? 0xffffff : 0x2d8a4e);
          const expand = 1.0 + m.fuseTimer * 0.25;
          m.group.scale.set(expand, expand, expand);

          if (m.fuseTimer >= 1.5) {
            // EXPLODE!
            soundManager.playExplosion();
            if (distToPlayer <= 5.0 && onPlayerDamage) {
              const explodeDmg = Math.round(18 * (1 - distToPlayer / 5.0));
              onPlayerDamage(Math.max(4, explodeDmg));
            }
            this.killMonster(i, false, world);
            continue;
          }
        } else {
          m.isFusing = false;
          m.fuseTimer = Math.max(0, m.fuseTimer - delta);
          m.group.scale.set(1, 1, 1);
        }
      }

      // AI Movement towards player
      if (distToPlayer > 1.2 && (!m.isFusing || m.type !== 'creeper')) {
        const moveSpeed = m.speed;
        m.velocity.x = Math.sin(m.yaw) * moveSpeed;
        m.velocity.z = Math.cos(m.yaw) * moveSpeed;

        // Walking leg swing animation
        m.walkCycle += delta * (moveSpeed * 2.5);
        const legSwing = Math.sin(m.walkCycle) * 0.6;
        m.leftLeg.rotation.x = legSwing;
        m.rightLeg.rotation.x = -legSwing;

        if (m.leftArm && m.rightArm && m.type !== 'zombie' && m.type !== 'titan') {
          m.leftArm.rotation.x = -legSwing;
          m.rightArm.rotation.x = legSwing;
        }
      } else {
        m.velocity.x = 0;
        m.velocity.z = 0;
      }

      // Gravity & Terrain collision check
      m.velocity.y -= 22 * delta; // gravity
      m.position.y += m.velocity.y * delta;

      // Obstacle step-up / jump check
      const nextX = m.position.x + m.velocity.x * delta;
      const nextZ = m.position.z + m.velocity.z * delta;
      const blockAtFeet = world.getBlock(Math.floor(nextX), Math.floor(m.position.y), Math.floor(nextZ));
      const blockAboveFeet = world.getBlock(Math.floor(nextX), Math.floor(m.position.y + 1), Math.floor(nextZ));

      if (blockAtFeet !== 0 && blockAboveFeet === 0) {
        // Can step up 1 block!
        m.velocity.y = 5.5; // auto-jump
      }

      // Ground floor snap
      const currentGroundY = Math.floor(m.position.y);
      const groundBlock = world.getBlock(Math.floor(m.position.x), currentGroundY, Math.floor(m.position.z));
      if (groundBlock !== 0 && m.velocity.y <= 0) {
        m.position.y = currentGroundY + 1.0;
        m.velocity.y = 0;
      }

      // Apply horizontal position
      m.position.x += m.velocity.x * delta;
      m.position.z += m.velocity.z * delta;
      m.group.position.copy(m.position);

      // Melee attack against player
      m.attackCooldown = Math.max(0, m.attackCooldown - delta);
      if (distToPlayer <= 1.5 && Math.abs(playerPos.y - m.position.y) < 2.0) {
        if (m.attackCooldown <= 0) {
          m.attackCooldown = 1.1; // attack every 1.1s
          soundManager.playHurt();
          if (onPlayerDamage) {
            onPlayerDamage(m.attackDamage);
          }
        }
      }
    }
  }

  // Attempt spawning monster safely around player
  private attemptSpawnAroundPlayer(playerPos: THREE.Vector3, world: World) {
    const angle = Math.random() * Math.PI * 2;
    const distance = 24 + Math.random() * 20; // 24 to 44 blocks away
    const spawnX = playerPos.x + Math.sin(angle) * distance;
    const spawnZ = playerPos.z + Math.cos(angle) * distance;

    // Find highest solid block at (spawnX, spawnZ)
    let groundY = -1;
    for (let y = 31; y >= 1; y--) {
      const b = world.getBlock(Math.floor(spawnX), y, Math.floor(spawnZ));
      if (b !== 0) {
        groundY = y + 1;
        break;
      }
    }

    if (groundY > 0 && groundY < 30) {
      // Pick monster type based on wave
      const roll = Math.random();
      let type: MonsterType = 'zombie';
      if (this.currentWave >= 3 && roll < 0.15) {
        type = 'titan';
      } else if (roll < 0.45) {
        type = 'creeper';
      } else if (roll < 0.7) {
        type = 'crawler';
      }

      this.spawnMonster(type, spawnX, groundY, spawnZ);
    }
  }

  // Raycast bullet from player camera against all monsters
  public raycastMonsters(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    maxDistance: number = 180
  ): { hit: boolean; monsterIndex: number; isHeadshot: boolean; point: THREE.Vector3 } | null {
    const ray = new THREE.Ray(origin, direction.clone().normalize());

    let closestHit: {
      hit: boolean;
      monsterIndex: number;
      isHeadshot: boolean;
      point: THREE.Vector3;
      dist: number;
    } | null = null;

    for (let i = 0; i < this.monsters.length; i++) {
      const m = this.monsters[i];
      const scale = m.type === 'titan' ? 1.6 : m.type === 'crawler' ? 0.75 : 1.0;

      // Monster full body AABB
      const bodyBox = new THREE.Box3(
        new THREE.Vector3(m.position.x - 0.45 * scale, m.position.y, m.position.z - 0.45 * scale),
        new THREE.Vector3(m.position.x + 0.45 * scale, m.position.y + 1.9 * scale, m.position.z + 0.45 * scale)
      );

      const intersectPoint = new THREE.Vector3();
      if (ray.intersectBox(bodyBox, intersectPoint)) {
        const dist = origin.distanceTo(intersectPoint);
        if (dist <= maxDistance && (!closestHit || dist < closestHit.dist)) {
          // Check Headshot: head is top 30% of monster
          const headMinY = m.position.y + 1.25 * scale;
          const isHeadshot = intersectPoint.y >= headMinY;

          closestHit = {
            hit: true,
            monsterIndex: i,
            isHeadshot,
            point: intersectPoint.clone(),
            dist,
          };
        }
      }
    }

    return closestHit;
  }

  // Apply sniper bullet damage to a monster
  public damageMonster(
    index: number,
    damage: number,
    isHeadshot: boolean,
    bulletDir: THREE.Vector3,
    world: World
  ): { killed: boolean; monster: Monster } | null {
    if (index < 0 || index >= this.monsters.length) return null;

    const m = this.monsters[index];
    const actualDamage = isHeadshot ? Math.round(damage * 2.5) : damage;

    m.health -= actualDamage;
    m.hurtTimer = 0.25;

    // Knockback
    m.velocity.x += bulletDir.x * (isHeadshot ? 7 : 4);
    m.velocity.z += bulletDir.z * (isHeadshot ? 7 : 4);
    m.velocity.y += 3.0;

    // Update health bar visual
    const healthPercent = Math.max(0, m.health / m.maxHealth);
    m.healthBar.scale.x = healthPercent;
    (m.healthBar.material as THREE.MeshBasicMaterial).color.setHex(
      healthPercent > 0.5 ? 0x22c55e : healthPercent > 0.25 ? 0xf59e0b : 0xef4444
    );

    soundManager.playMonsterHurt();

    if (m.health <= 0) {
      this.killMonster(index, isHeadshot, world);
      return { killed: true, monster: m };
    }

    return { killed: false, monster: m };
  }

  // Kill monster, spawn particle gibs and loot
  private killMonster(index: number, isHeadshot: boolean, world: World) {
    const m = this.monsters[index];
    this.totalKills++;
    if (isHeadshot) {
      this.headshotKills++;
    }

    // Check wave progression (every 5 kills advances wave)
    if (this.totalKills % 6 === 0) {
      this.currentWave++;
    }

    if (this.onMonsterKilled) {
      this.onMonsterKilled(m, isHeadshot);
    }

    this.despawnMonster(index);
  }

  // Remove monster from scene
  private despawnMonster(index: number) {
    if (index < 0 || index >= this.monsters.length) return;
    const m = this.monsters[index];
    this.scene.remove(m.group);
    this.monsters.splice(index, 1);
  }

  public clear() {
    for (const m of this.monsters) {
      this.scene.remove(m.group);
    }
    this.monsters = [];
  }
}
