/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { World } from './game/world';
import { Player, GameMode } from './game/player';
import { Environment } from './game/environment';
import { HandViewmodel } from './game/hand';
import { ParticleSystem } from './game/particles';
import { CrackingOverlay } from './game/cracks';
import { DroppedItemManager } from './game/items';
import { MonsterManager, Monster } from './game/monsters';
import { BulletTracerSystem } from './game/bulletTracer';
import { BlockType, BLOCK_DEFINITIONS } from './game/blocks';
import { soundManager } from './game/audio';
import { HUD } from './components/HUD';
import { SniperScope } from './components/SniperScope';
import { InventoryModal } from './components/InventoryModal';
import { PauseMenu } from './components/PauseMenu';
import { MobileControls } from './components/MobileControls';
import { Play, Target, Skull, ShieldAlert } from 'lucide-react';

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);

  // Core Game Engine References
  const worldRef = useRef<World | null>(null);
  const playerRef = useRef<Player | null>(null);
  const envRef = useRef<Environment | null>(null);
  const handRef = useRef<HandViewmodel | null>(null);
  const particlesRef = useRef<ParticleSystem | null>(null);
  const cracksRef = useRef<CrackingOverlay | null>(null);
  const itemsRef = useRef<DroppedItemManager | null>(null);
  const monstersRef = useRef<MonsterManager | null>(null);
  const tracersRef = useRef<BulletTracerSystem | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // Mining state refs for continuous breaking
  const isMouseDownLeft = useRef<boolean>(false);
  const miningBlockKey = useRef<string | null>(null);
  const miningProgressRef = useRef<number>(0);
  const miningHitSoundTimer = useRef<number>(0);

  // Sniper Rifle & Combat State
  const [ammo, setAmmo] = useState(5);
  const maxAmmo = 5;
  const ammoRef = useRef<number>(5);
  const [isScoped, setIsScoped] = useState(false);
  const isScopedRef = useRef<boolean>(false);
  const [isCyclingBolt, setIsCyclingBolt] = useState(false);
  const isCyclingBoltRef = useRef<boolean>(false);
  const [isReloading, setIsReloading] = useState(false);
  const isReloadingRef = useRef<boolean>(false);
  const [targetDistance, setTargetDistance] = useState<number | null>(null);
  const [hitmarkerTimer, setHitmarkerTimer] = useState(0);
  const [headshotToast, setHeadshotToast] = useState('');

  // Monster hunt score
  const [totalKills, setTotalKills] = useState(0);
  const [headshotKills, setHeadshotKills] = useState(0);
  const [currentWave, setCurrentWave] = useState(1);

  // Game UI State
  const [hasStarted, setHasStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef<boolean>(false);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const isInventoryOpenRef = useRef<boolean>(false);
  const [isFlying, setIsFlying] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [gameMode, setGameMode] = useState<GameMode>('survival');
  const gameModeRef = useRef<GameMode>('survival');
  const [health, setHealth] = useState(20);
  const [hunger, setHunger] = useState(20);
  const [isDead, setIsDead] = useState(false);
  const [damageFlash, setDamageFlash] = useState(false);
  const [miningProgressDisplay, setMiningProgressDisplay] = useState(0);
  const [oxygen, setOxygen] = useState(20);
  const [isHeadUnderwater, setIsHeadUnderwater] = useState(false);
  const [isSprinting, setIsSprinting] = useState(false);
  const lastWPressTime = useRef<number>(0);

  // Settings
  const [fov, setFov] = useState(75);
  const fovRef = useRef<number>(75);
  const [daySpeed, setDaySpeed] = useState(240);
  const daySpeedRef = useRef<number>(240);
  const [renderRadius, setRenderRadius] = useState(3);
  const renderRadiusRef = useRef<number>(3);

  // Hotbar (Slot 0 is Sniper Rifle!)
  const [hotbar, setHotbar] = useState<BlockType[]>([
    BlockType.SNIPER_RIFLE,
    BlockType.SNIPER_AMMO,
    BlockType.DIAMOND_SWORD,
    BlockType.DIAMOND_PICKAXE,
    BlockType.APPLE,
    BlockType.OAK_PLANKS,
    BlockType.COBBLESTONE,
    BlockType.GLASS,
    BlockType.TNT,
  ]);
  const hotbarRef = useRef<BlockType[]>(hotbar);
  const [selectedSlot, setSelectedSlot] = useState(0);
  const selectedSlotRef = useRef<number>(0);

  // Keep refs in sync with React state without triggering Three.js re-mounts
  useEffect(() => {
    hotbarRef.current = hotbar;
  }, [hotbar]);

  useEffect(() => {
    selectedSlotRef.current = selectedSlot;
    if (handRef.current) {
      handRef.current.setHeldBlock(hotbar[selectedSlot]);
    }
    // Exit scope if switching away from sniper
    if (hotbar[selectedSlot] !== BlockType.SNIPER_RIFLE && isScopedRef.current) {
      setIsScoped(false);
      isScopedRef.current = false;
      if (handRef.current) handRef.current.isScoped = false;
    }
  }, [selectedSlot, hotbar]);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    isInventoryOpenRef.current = isInventoryOpen;
  }, [isInventoryOpen]);

  useEffect(() => {
    gameModeRef.current = gameMode;
    if (playerRef.current) {
      playerRef.current.gameMode = gameMode;
    }
  }, [gameMode]);

  useEffect(() => {
    fovRef.current = fov;
    if (cameraRef.current && !isScopedRef.current) {
      cameraRef.current.fov = fov;
      cameraRef.current.updateProjectionMatrix();
    }
  }, [fov]);

  useEffect(() => {
    daySpeedRef.current = daySpeed;
    if (envRef.current) {
      envRef.current.dayDuration = daySpeed;
    }
  }, [daySpeed]);

  useEffect(() => {
    renderRadiusRef.current = renderRadius;
    if (worldRef.current) {
      worldRef.current.renderRadius = renderRadius;
      if (playerRef.current) {
        worldRef.current.updatePlayerPosition(playerRef.current.position, true);
      }
    }
  }, [renderRadius]);

  // Debug & Telemetry for HUD
  const [playerPos, setPlayerPos] = useState({ x: 0, y: 0, z: 0 });
  const [playerYaw, setPlayerYaw] = useState(0);
  const [targetBlock, setTargetBlock] = useState<{
    type: BlockType;
    x: number;
    y: number;
    z: number;
  } | null>(null);
  const [fps, setFps] = useState(60);

  // Check touch capability on mount
  useEffect(() => {
    const isTouch =
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      window.innerWidth <= 768;
    setIsMobile(isTouch);
  }, []);

  // Request Pointer Lock safely
  const requestPointerLock = useCallback(() => {
    if (mountRef.current && !isMobile) {
      mountRef.current.requestPointerLock?.();
    }
  }, [isMobile]);

  // Start the game
  const handleStartGame = () => {
    soundManager.playClick();
    setHasStarted(true);
    setIsPaused(false);
    isPausedRef.current = false;
    requestPointerLock();
  };

  // Resume game from pause
  const handleResumeGame = () => {
    setIsPaused(false);
    isPausedRef.current = false;
    setIsInventoryOpen(false);
    isInventoryOpenRef.current = false;
    playerRef.current?.resetControls();
    requestPointerLock();
  };

  // Toggle flight
  const handleToggleFlight = () => {
    if (playerRef.current) {
      playerRef.current.toggleFlight();
      setIsFlying(playerRef.current.isFlying);
    }
  };

  // Open inventory (KEEP PLAYER EXACTLY WHERE THEY STAND)
  const handleOpenInventory = () => {
    document.exitPointerLock?.();
    setIsInventoryOpen(true);
    isInventoryOpenRef.current = true;
    isMouseDownLeft.current = false;
    if (playerRef.current) {
      playerRef.current.resetControls();
      playerRef.current.velocity.x = 0;
      playerRef.current.velocity.z = 0;
    }
  };

  // Close inventory (KEEP PLAYER EXACTLY WHERE THEY STAND)
  const handleCloseInventory = () => {
    setIsInventoryOpen(false);
    isInventoryOpenRef.current = false;
    if (playerRef.current) {
      playerRef.current.resetControls();
    }
    requestPointerLock();
  };

  // Open Pause Menu
  const handleOpenPauseMenu = () => {
    document.exitPointerLock?.();
    setIsPaused(true);
    isPausedRef.current = true;
    isMouseDownLeft.current = false;
    if (playerRef.current) {
      playerRef.current.resetControls();
      playerRef.current.velocity.x = 0;
      playerRef.current.velocity.z = 0;
    }
  };

  // Set block in hotbar slot (DOES NOT TOUCH PLAYER POSITION)
  const handleSetHotbarSlot = (slot: number, block: BlockType) => {
    setHotbar((prev) => {
      const next = [...prev];
      next[slot] = block;
      return next;
    });
  };

  // Reload Sniper Rifle
  const handleReloadSniper = useCallback(() => {
    if (isReloadingRef.current || ammoRef.current >= maxAmmo) return;
    isReloadingRef.current = true;
    setIsReloading(true);
    soundManager.playSniperReload();

    setTimeout(() => {
      ammoRef.current = maxAmmo;
      setAmmo(maxAmmo);
      isReloadingRef.current = false;
      setIsReloading(false);
      soundManager.playSniperBolt();
    }, 1100);
  }, []);

  // Fire Sniper Rifle
  const handleFireSniper = useCallback(() => {
    const world = worldRef.current;
    const player = playerRef.current;
    const hand = handRef.current;
    const monsters = monstersRef.current;
    const tracers = tracersRef.current;
    const camera = cameraRef.current;
    if (!world || !player || !hand || !monsters || !tracers || !camera || player.isDead) return;

    // Cannot fire if reloading or cycling bolt
    if (isReloadingRef.current || isCyclingBoltRef.current) return;

    // Check ammo
    if (ammoRef.current <= 0) {
      soundManager.playClick();
      handleReloadSniper();
      return;
    }

    // 1. Consume 1 round
    ammoRef.current -= 1;
    setAmmo(ammoRef.current);

    // 2. Gunshot audio
    soundManager.playSniperShot();

    // 3. Recoil animation
    hand.triggerRecoil();
    player.pitch -= 0.04; // gun kicks camera upwards slightly
    player.updateCamera();

    // 4. Direction & Muzzle origin
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    const muzzlePos = hand.getMuzzleWorldPosition();

    // 5. Raycast check against monsters first
    const monsterHit = monsters.raycastMonsters(camera.position, forward, 180);
    const blockHit = world.raycast(camera.position, forward, 180);

    let finalHitPoint = camera.position.clone().addScaledVector(forward, 120);

    if (
      monsterHit &&
      monsterHit.hit &&
      (!blockHit.hit || camera.position.distanceTo(monsterHit.point) <= camera.position.distanceTo(new THREE.Vector3(blockHit.x, blockHit.y, blockHit.z)))
    ) {
      // HIT MONSTER!
      finalHitPoint = monsterHit.point;
      const isHead = monsterHit.isHeadshot;

      if (isHead) {
        soundManager.playHeadshot();
        setHeadshotToast('🎯 KOPFTREFFER! +250');
        setTimeout(() => setHeadshotToast(''), 1600);
      } else {
        soundManager.playHitmarker();
      }

      setHitmarkerTimer(0.22);

      // Spawn blood/voxel sparks
      tracers.spawnImpactSparks(monsterHit.point, new THREE.Vector3(0, 1, 0), true);

      // Deal massive sniper damage (100 body, 250 headshot)
      monsters.damageMonster(
        monsterHit.monsterIndex,
        100,
        isHead,
        forward,
        world
      );

      setTotalKills(monsters.totalKills);
      setHeadshotKills(monsters.headshotKills);
      setCurrentWave(monsters.currentWave);
    } else if (blockHit.hit) {
      // HIT VOXEL BLOCK
      finalHitPoint = new THREE.Vector3(
        blockHit.x + 0.5 + blockHit.normal.x * 0.4,
        blockHit.y + 0.5 + blockHit.normal.y * 0.4,
        blockHit.z + 0.5 + blockHit.normal.z * 0.4
      );

      // Sparks on block
      tracers.spawnImpactSparks(
        finalHitPoint,
        new THREE.Vector3(blockHit.normal.x, blockHit.normal.y, blockHit.normal.z),
        false
      );

      // Glass or leaves shatter when shot by high caliber
      if (blockHit.block === BlockType.GLASS || blockHit.block === BlockType.OAK_LEAVES) {
        soundManager.playBlockBreak('glass');
        world.setBlock(blockHit.x, blockHit.y, blockHit.z, BlockType.AIR);
      }
    }

    // Spawn high-velocity bullet tracer beam
    tracers.spawnTracer(muzzlePos, finalHitPoint);

    // 6. Bolt-Action cycling cycle (0.5s cycle)
    isCyclingBoltRef.current = true;
    setIsCyclingBolt(true);
    setTimeout(() => {
      soundManager.playSniperBolt();
    }, 220);
    setTimeout(() => {
      isCyclingBoltRef.current = false;
      setIsCyclingBolt(false);
    }, 550);
  }, [handleReloadSniper]);

  // Break block completely
  const breakBlock = useCallback((x: number, y: number, z: number, blockType: BlockType) => {
    const world = worldRef.current;
    const hand = handRef.current;
    const particles = particlesRef.current;
    const cracks = cracksRef.current;
    const items = itemsRef.current;
    const player = playerRef.current;
    if (!world || !hand || !particles || !cracks) return;

    soundManager.playBlockBreak(BLOCK_DEFINITIONS[blockType]?.sound || 'stone');
    particles.spawnBlockBreak(x, y, z, blockType);
    hand.triggerSwing();
    cracks.hide();

    // Spawn dropped item in survival mode
    if (player && player.gameMode === 'survival' && items) {
      items.spawnDrop(x, y, z, blockType);
    }

    world.setBlock(x, y, z, BlockType.AIR);

    // Reset mining state
    miningBlockKey.current = null;
    miningProgressRef.current = 0;
    setMiningProgressDisplay(0);
  }, []);

  // Place block or eat food or aim sniper
  const handleRightClick = useCallback(() => {
    const world = worldRef.current;
    const player = playerRef.current;
    const hand = handRef.current;
    if (!world || !player || !hand || player.isDead) return;

    const currentHeld = hotbarRef.current[selectedSlotRef.current];

    // If holding Sniper Rifle: toggle / aim ADS Zoom Scope!
    if (currentHeld === BlockType.SNIPER_RIFLE) {
      const nextScoped = !isScopedRef.current;
      isScopedRef.current = nextScoped;
      setIsScoped(nextScoped);
      hand.isScoped = nextScoped;
      soundManager.playScopeZoom();
      return;
    }

    const itemDef = BLOCK_DEFINITIONS[currentHeld];

    // If holding food, eat it!
    if (itemDef?.category === 'food' && itemDef.foodValue) {
      const eaten = player.eatFood(itemDef.foodValue);
      if (eaten) {
        hand.triggerSwing();
        setHunger(player.hunger);
        setHealth(player.health);
        return;
      }
    }

    // Place block
    if (currentHeld && !itemDef?.isItem && (currentHeld as number) !== BlockType.AIR) {
      const forward = new THREE.Vector3();
      player.camera.getWorldDirection(forward);
      const hit = world.raycast(player.camera.position, forward, 5.5);

      if (hit.hit) {
        const placeX = hit.x + hit.normal.x;
        const placeY = hit.y + hit.normal.y;
        const placeZ = hit.z + hit.normal.z;

        // Player bounding box collision check
        const pMinX = player.position.x - player.width / 2;
        const pMaxX = player.position.x + player.width / 2;
        const pMinY = player.position.y;
        const pMaxY = player.position.y + player.height;
        const pMinZ = player.position.z - player.width / 2;
        const pMaxZ = player.position.z + player.width / 2;

        const collidesWithPlayer =
          placeX + 1 > pMinX &&
          placeX < pMaxX &&
          placeY + 1 > pMinY &&
          placeY < pMaxY &&
          placeZ + 1 > pMinZ &&
          placeZ < pMaxZ;

        if (!collidesWithPlayer && placeY >= 0 && placeY < 32) {
          soundManager.playBlockPlace(BLOCK_DEFINITIONS[currentHeld]?.sound || 'stone');
          hand.triggerSwing();
          world.setBlock(placeX, placeY, placeZ, currentHeld);
        }
      }
    }
  }, []);

  // Respawn after death
  const handleRespawn = () => {
    const world = worldRef.current;
    const player = playerRef.current;
    const monsters = monstersRef.current;
    if (!world || !player) return;

    world.updatePlayerPosition(new THREE.Vector3(0, 0, 0), true);
    const spawn = world.getSpawnPosition();
    player.respawn(spawn);
    player.resolveStuck(world);
    world.updatePlayerPosition(spawn, true);
    if (monsters) monsters.clear();

    setHealth(player.health);
    setHunger(player.hunger);
    setIsDead(false);
    setDamageFlash(false);
    ammoRef.current = maxAmmo;
    setAmmo(maxAmmo);
    requestPointerLock();
  };

  // Reset or create new world
  const handleResetWorld = (seed?: number) => {
    const world = worldRef.current;
    const player = playerRef.current;
    const monsters = monstersRef.current;
    if (!world || !player) return;

    world.seed = seed ?? Math.floor(Math.random() * 999999);
    world.dispose();
    world.updatePlayerPosition(new THREE.Vector3(0, 0, 0), true);
    const spawn = world.getSpawnPosition();
    player.teleport(spawn);
    player.resolveStuck(world);
    world.updatePlayerPosition(spawn, true);
    if (monsters) monsters.clear();
  };

  // Save world to LocalStorage
  const handleSaveWorld = () => {
    if (worldRef.current) {
      worldRef.current.saveWorld();
    }
  };

  // Add collected dropped item to hotbar
  const handlePickupItem = useCallback((block: BlockType): boolean => {
    const currentHotbar = hotbarRef.current;
    const existingIdx = currentHotbar.indexOf(block);
    if (existingIdx !== -1) {
      return true;
    }
    const emptyIdx = currentHotbar.indexOf(BlockType.AIR);
    if (emptyIdx !== -1) {
      setHotbar((prev) => {
        const next = [...prev];
        next[emptyIdx] = block;
        return next;
      });
      return true;
    }
    return true;
  }, []);

  // Initialize Three.js Game World ONCE ON MOUNT
  // By using stable refs, opening inventory or selecting slots NEVER tears down the scene or teleports the player!
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      fovRef.current,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    cameraRef.current = camera;
    scene.add(camera);

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({
      powerPreference: 'high-performance',
      antialias: false,
      alpha: false,
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.BasicShadowMap;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    // 3. World
    const world = new World(133742);
    worldRef.current = world;
    scene.add(world.group);

    // Try loading saved world
    world.loadWorld();

    // Stream initial chunks around origin first so spawn terrain exists
    world.updatePlayerPosition(new THREE.Vector3(0, 15, 0), true);

    // 4. Player
    const spawnPos = world.getSpawnPosition();
    const player = new Player(camera, spawnPos);
    player.gameMode = gameModeRef.current;
    player.resolveStuck(world);
    playerRef.current = player;

    // Stream chunks around player's actual spawn location
    world.updatePlayerPosition(spawnPos, true);

    // 5. Environment (Day/Night, Sun, Moon, Clouds)
    const environment = new Environment(scene, { dayDurationSeconds: daySpeedRef.current });
    envRef.current = environment;

    // 6. Hand Viewmodel & Selection Box
    const hand = new HandViewmodel(camera);
    hand.setHeldBlock(hotbarRef.current[selectedSlotRef.current]);
    handRef.current = hand;
    scene.add(hand.selectionBox);

    // 7. Particle System, Cracking Overlay, Dropped Items
    const particles = new ParticleSystem(scene);
    particlesRef.current = particles;

    const cracks = new CrackingOverlay();
    cracksRef.current = cracks;
    scene.add(cracks.mesh);

    const items = new DroppedItemManager(scene);
    itemsRef.current = items;

    // 8. Monsters & Bullet Tracer System
    const monsters = new MonsterManager(scene);
    monstersRef.current = monsters;

    const tracers = new BulletTracerSystem(scene);
    tracersRef.current = tracers;

    // 9. Pointer Lock & Focus Change Listeners
    const handlePointerLockChange = () => {
      const isLocked = document.pointerLockElement === container;
      if (!isLocked && !isInventoryOpenRef.current) {
        setIsPaused(true);
        isPausedRef.current = true;
        isMouseDownLeft.current = false;
        cracks.hide();
        miningProgressRef.current = 0;
        setMiningProgressDisplay(0);
        player.resetControls();
      }
    };
    document.addEventListener('pointerlockchange', handlePointerLockChange);

    const handleWindowBlur = () => {
      player.resetControls();
      isMouseDownLeft.current = false;
      cracks.hide();
      miningProgressRef.current = 0;
      setMiningProgressDisplay(0);
    };
    window.addEventListener('blur', handleWindowBlur);

    // 10. Mouse Look
    const handleMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement === container) {
        // Reduced sensitivity when looking through sniper scope for precise long-range aim
        const sensMultiplier = isScopedRef.current ? 0.35 : 1.0;
        player.look(e.movementX * sensMultiplier, e.movementY * sensMultiplier);
      }
    };
    window.addEventListener('mousemove', handleMouseMove);

    // 11. Mouse Down & Up (Sniper Fire, Continuous Mining, ADS)
    const handleMouseDown = (e: MouseEvent) => {
      if (document.pointerLockElement !== container) return;

      const heldItem = hotbarRef.current[selectedSlotRef.current];

      if (e.button === 0) {
        // Left click
        if (heldItem === BlockType.SNIPER_RIFLE) {
          // Fire Sniper Rifle!
          handleFireSniper();
        } else {
          // Mining or melee swing
          isMouseDownLeft.current = true;
        }
      } else if (e.button === 2) {
        // Right click: Aim down sights (Sniper) or place block / eat
        handleRightClick();
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) {
        isMouseDownLeft.current = false;
        miningBlockKey.current = null;
        miningProgressRef.current = 0;
        setMiningProgressDisplay(0);
        cracks.hide();
      }
    };

    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    window.addEventListener('contextmenu', handleContextMenu);

    // 12. Mouse Wheel (Hotbar scrolling)
    const handleWheel = (e: WheelEvent) => {
      if (document.pointerLockElement === container) {
        soundManager.playClick();
        if (e.deltaY > 0) {
          setSelectedSlot((prev) => (prev + 1) % 9);
        } else {
          setSelectedSlot((prev) => (prev - 1 + 9) % 9);
        }
      }
    };
    window.addEventListener('wheel', handleWheel, { passive: true });

    // 13. Keyboard Controls
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code >= 'Digit1' && e.code <= 'Digit9') {
        const slotIdx = parseInt(e.code.replace('Digit', ''), 10) - 1;
        soundManager.playClick();
        setSelectedSlot(slotIdx);
        return;
      }

      switch (e.code) {
        case 'KeyW': {
          const now = performance.now();
          if (now - lastWPressTime.current < 320) {
            player.controls.sprint = true;
            player.isSprinting = true;
          }
          lastWPressTime.current = now;
          player.controls.forward = true;
          break;
        }
        case 'KeyS':
          player.controls.backward = true;
          break;
        case 'KeyA':
          player.controls.left = true;
          break;
        case 'KeyD':
          player.controls.right = true;
          break;
        case 'Space':
          player.controls.jump = true;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          player.controls.sneak = true;
          break;
        case 'ControlLeft':
        case 'ControlRight':
          player.controls.sprint = true;
          player.isSprinting = true;
          break;
        case 'KeyR':
          // Reload Sniper Rifle!
          handleReloadSniper();
          break;
        case 'KeyF':
          if (player.gameMode === 'creative') {
            player.toggleFlight();
            setIsFlying(player.isFlying);
          }
          break;
        case 'KeyE':
          if (!isPausedRef.current) {
            handleOpenInventory();
          }
          break;
        case 'Escape':
          setIsPaused((prev) => !prev);
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW':
          player.controls.forward = false;
          player.controls.sprint = false;
          player.isSprinting = false;
          break;
        case 'KeyS':
          player.controls.backward = false;
          break;
        case 'KeyA':
          player.controls.left = false;
          break;
        case 'KeyD':
          player.controls.right = false;
          break;
        case 'Space':
          player.controls.jump = false;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          player.controls.sneak = false;
          break;
        case 'ControlLeft':
        case 'ControlRight':
          player.controls.sprint = false;
          player.isSprinting = false;
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // 14. Window Resize
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // 15. Main Game Loop
    let lastTime = performance.now();
    let frameCount = 0;
    let lastFpsUpdate = performance.now();

    const animate = (currentTime: number) => {
      animFrameIdRef.current = requestAnimationFrame(animate);

      const delta = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      // FPS tracking
      frameCount++;
      if (currentTime - lastFpsUpdate >= 500) {
        setFps(Math.round((frameCount * 1000) / (currentTime - lastFpsUpdate)));
        frameCount = 0;
        lastFpsUpdate = currentTime;
      }

      // Hitmarker ticker
      setHitmarkerTimer((prev) => Math.max(0, prev - delta));

      // Update Player Physics (freeze during inventory or pause to prevent walking into walls)
      const isPlayerMoving =
        !isPausedRef.current &&
        !isInventoryOpenRef.current &&
        !player.isDead &&
        (player.controls.forward ||
          player.controls.backward ||
          player.controls.left ||
          player.controls.right);

      if (!isPausedRef.current && !isInventoryOpenRef.current && !player.isDead) {
        player.update(delta, world);
      } else {
        player.resetControls();
        player.velocity.x = 0;
        player.velocity.z = 0;
      }

      // Smooth Camera FOV: Zoom to 18 when scoped with sniper rifle!
      const targetFov = isScopedRef.current ? 18 : player.isSprinting ? fovRef.current + 8 : fovRef.current;
      if (Math.abs(camera.fov - targetFov) > 0.1) {
        camera.fov += (targetFov - camera.fov) * Math.min(1.0, delta * 20.0);
        camera.updateProjectionMatrix();
      }

      // Infinite Chunk Streaming as player explores
      world.updatePlayerPosition(player.position);

      // Raycast for targeted block or monster distance readout
      const forward = new THREE.Vector3();
      camera.getWorldDirection(forward);
      const hit = world.raycast(camera.position, forward, isScopedRef.current ? 160 : 5.5);

      if (hit.hit) {
        hand.updateSelectionBox(hit.x, hit.y, hit.z, !isScopedRef.current);
        setTargetBlock({
          type: hit.block,
          x: hit.x,
          y: hit.y,
          z: hit.z,
        });

        const dist = camera.position.distanceTo(new THREE.Vector3(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5));
        setTargetDistance(dist);

        // Continuous Mining Mechanics (only when NOT holding sniper rifle)
        const heldItem = hotbarRef.current[selectedSlotRef.current];

        if (heldItem !== BlockType.SNIPER_RIFLE && isMouseDownLeft.current && !player.isDead) {
          const currentKey = `${hit.x},${hit.y},${hit.z}`;
          const blockDef = BLOCK_DEFINITIONS[hit.block];

          if (player.gameMode === 'creative') {
            breakBlock(hit.x, hit.y, hit.z, hit.block);
          } else if (hit.block !== BlockType.BEDROCK && blockDef) {
            if (miningBlockKey.current !== currentKey) {
              miningBlockKey.current = currentKey;
              miningProgressRef.current = 0;
            }

            hand.triggerSwing();

            miningHitSoundTimer.current += delta;
            if (miningHitSoundTimer.current >= 0.22) {
              miningHitSoundTimer.current = 0;
              soundManager.playBlockHit(blockDef.sound);
            }

            let toolMultiplier = 1.0;
            if (heldItem === BlockType.DIAMOND_PICKAXE && blockDef.bestTool === 'pickaxe') {
              toolMultiplier = 4.5;
            } else if (heldItem === BlockType.DIAMOND_SHOVEL && blockDef.bestTool === 'shovel') {
              toolMultiplier = 4.5;
            } else if (heldItem === BlockType.DIAMOND_AXE && blockDef.bestTool === 'axe') {
              toolMultiplier = 4.5;
            } else if (heldItem === BlockType.DIAMOND_SWORD && blockDef.bestTool === 'sword') {
              toolMultiplier = 4.5;
            }

            const breakSpeed = toolMultiplier / Math.max(0.15, blockDef.hardness);
            miningProgressRef.current += delta * breakSpeed;
            setMiningProgressDisplay(miningProgressRef.current);

            cracks.setProgress(hit.x, hit.y, hit.z, miningProgressRef.current);

            if (miningProgressRef.current >= 1.0) {
              breakBlock(hit.x, hit.y, hit.z, hit.block);
            }
          }
        } else {
          if (miningProgressRef.current > 0) {
            miningBlockKey.current = null;
            miningProgressRef.current = 0;
            setMiningProgressDisplay(0);
            cracks.hide();
          }
        }
      } else {
        hand.updateSelectionBox(0, 0, 0, false);
        setTargetBlock(null);
        setTargetDistance(null);
        if (miningProgressRef.current > 0) {
          miningBlockKey.current = null;
          miningProgressRef.current = 0;
          setMiningProgressDisplay(0);
          cracks.hide();
        }
      }

      // Update Monsters (AI, navigation, attacks)
      if (!isPausedRef.current && !isInventoryOpenRef.current && !player.isDead) {
        monsters.update(
          delta,
          player.position,
          camera.position,
          world,
          (dmg) => {
            player.takeDamage(dmg);
            setHealth(player.health);
            setDamageFlash(true);
            setTimeout(() => setDamageFlash(false), 200);
          }
        );
      }

      // Update Bullet Tracers and Sparks
      tracers.update(delta);

      // Update Dropped Item Entities
      items.update(
        delta,
        player.position,
        handlePickupItem,
        (x, y, z) => world.getBlock(x, y, z)
      );

      // Update Environment & Celestial bodies
      environment.update(delta, player.position);

      // Update Hand Viewmodel
      hand.update(delta, isPlayerMoving, player.isGrounded);

      // Update Particles
      particles.update(delta);

      // Sync player stats with React state
      setHealth(player.health);
      setHunger(player.hunger);
      setOxygen(player.oxygen);
      setIsHeadUnderwater(player.isHeadUnderwater);
      setIsSprinting(player.isSprinting);
      setIsDead(player.isDead);
      setDamageFlash(player.damageFlashTimer > 0);
      setPlayerPos({
        x: player.position.x,
        y: player.position.y,
        z: player.position.z,
      });
      setPlayerYaw(player.yaw);

      // Render Scene
      renderer.render(scene, camera);
    };

    animFrameIdRef.current = requestAnimationFrame(animate);

    // Auto-save world periodically (every 45s)
    const autoSaveInterval = setInterval(() => {
      world.saveWorld();
    }, 45000);

    return () => {
      clearInterval(autoSaveInterval);
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', handleResize);

      world.dispose();
      hand.dispose();
      particles.clear();
      cracks.dispose();
      items.clear();
      monsters.clear();
      tracers.clear();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [breakBlock, handleFireSniper, handlePickupItem, handleReloadSniper, handleRightClick]);

  const isSniperHeld = hotbar[selectedSlot] === BlockType.SNIPER_RIFLE;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none font-sans">
      {/* 3D WebGL Canvas Container */}
      <div
        ref={mountRef}
        onClick={() => {
          if (!hasStarted) {
            handleStartGame();
          } else if (isPaused) {
            handleResumeGame();
          } else if (!isInventoryOpen && !isDead) {
            requestPointerLock();
          }
        }}
        className="w-full h-full cursor-crosshair"
      />

      {/* Fullscreen Tactical Sniper Scope Overlay */}
      <SniperScope
        isScoped={isScoped && isSniperHeld && !isDead && !isPaused && !isInventoryOpen}
        targetDistance={targetDistance}
        ammo={ammo}
        maxAmmo={maxAmmo}
        isCyclingBolt={isCyclingBolt}
        isReloading={isReloading}
      />

      {/* Welcome / Start Game Screen */}
      {!hasStarted && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="w-full max-w-lg bg-[#22272e] border-4 border-[#3e4c59] shadow-2xl p-6 flex flex-col items-center text-center gap-4">
            <div className="flex items-center gap-2 text-red-500">
              <Target className="w-7 h-7 text-red-500 animate-pulse" />
              <h1 className="text-2xl sm:text-3xl font-minecraft text-white drop-shadow-[0_3px_3px_#000]">
                VOXEL SNIPER
              </h1>
            </div>

            <p className="text-xs sm:text-sm font-minecraft text-amber-300/90 leading-relaxed max-w-md">
              Jage und eliminiere Monsterwellen mit dem Präzisions-Scharfschützengewehr .50 BMG!
              Baue Verteidigungstürme und überlebe die Nacht!
            </p>

            {/* Controls summary */}
            <div className="bg-[#15191e] border-2 border-[#2d3748] p-3 text-left w-full text-[11px] font-minecraft text-white/80 space-y-1.5">
              <div>🎯 <span className="text-red-400">Rechtsklick</span>: Zielfernrohr (ADS Scope Zoom 8.5x)</div>
              <div>💥 <span className="text-red-400">Linksklick</span>: Scharfschützenschuss / Kopftreffer 250 DMG</div>
              <div>🔄 <span className="text-amber-300">Taste R</span>: Sniper Nachladen (.50 BMG)</div>
              <div>🧟 <span className="text-emerald-400">Monster</span>: Zombies, Creeper (Explosion!), Crawler & Titanen</div>
              <div>🧱 <span className="text-blue-300">Bauen</span>: Blöcke auswählen und Scharfschützentürme errichten</div>
              <div>🏃 <span className="text-amber-300">W, A, S, D</span>: Laufen / <span className="text-amber-300">Strg oder W doppeltippen</span>: Sprinten</div>
              <div>🎒 <span className="text-purple-300">Taste E</span>: Inventar öffnen</div>
              <div>⏸ <span className="text-white/60">Taste ESC</span>: Pausemenü & Einstellungen</div>
            </div>

            <button
              onClick={handleStartGame}
              className="mc-button mc-button-green w-full py-3 text-sm font-minecraft cursor-pointer flex items-center justify-center gap-2 mt-2"
            >
              <Play className="w-5 h-5 fill-white" />
              <span>Jagd beginnen & Spielen</span>
            </button>
          </div>
        </div>
      )}

      {/* Head-Up Display (Scoreboard, Crosshair, Hearts, Hunger, Coordinates, Ammo) */}
      {hasStarted && !isPaused && !isInventoryOpen && (
        <HUD
          hotbar={hotbar}
          selectedSlot={selectedSlot}
          onSelectSlot={setSelectedSlot}
          onOpenInventory={handleOpenInventory}
          onOpenPauseMenu={handleOpenPauseMenu}
          isFlying={isFlying}
          onToggleFlight={handleToggleFlight}
          gameMode={gameMode}
          onToggleGameMode={() => {
            soundManager.playClick();
            setGameMode((prev) => (prev === 'survival' ? 'creative' : 'survival'));
          }}
          health={health}
          hunger={hunger}
          oxygen={oxygen}
          isHeadUnderwater={isHeadUnderwater}
          isSprinting={isSprinting}
          damageFlash={damageFlash}
          isDead={isDead}
          onRespawn={handleRespawn}
          miningProgress={miningProgressDisplay}
          playerPos={playerPos}
          playerYaw={playerYaw}
          targetBlock={targetBlock}
          fps={fps}
          isSniperHeld={isSniperHeld}
          ammo={ammo}
          maxAmmo={maxAmmo}
          isReloading={isReloading}
          isCyclingBolt={isCyclingBolt}
          totalKills={totalKills}
          headshotKills={headshotKills}
          currentWave={currentWave}
          hitmarkerTimer={hitmarkerTimer}
          headshotToast={headshotToast}
          isScoped={isScoped}
        />
      )}

      {/* Mobile Touch Controls for handheld devices */}
      {hasStarted && isMobile && !isPaused && !isInventoryOpen && playerRef.current && (
        <MobileControls
          controls={playerRef.current.controls}
          onMine={() => {
            if (isSniperHeld) {
              handleFireSniper();
            } else if (targetBlock) {
              breakBlock(targetBlock.x, targetBlock.y, targetBlock.z, targetBlock.type);
            }
          }}
          onPlace={handleRightClick}
          onToggleFlight={handleToggleFlight}
          onOpenInventory={handleOpenInventory}
          isFlying={isFlying}
        />
      )}

      {/* Inventory Modal (E key) - DOES NOT TELEPORT */}
      <InventoryModal
        isOpen={isInventoryOpen}
        onClose={handleCloseInventory}
        selectedSlot={selectedSlot}
        hotbar={hotbar}
        onSetHotbarSlot={handleSetHotbarSlot}
      />

      {/* Pause Menu (ESC key) */}
      <PauseMenu
        isOpen={isPaused}
        onResume={handleResumeGame}
        onSaveWorld={handleSaveWorld}
        onResetWorld={handleResetWorld}
        isFlying={isFlying}
        onToggleFlight={handleToggleFlight}
        gameMode={gameMode}
        onToggleGameMode={() => {
          soundManager.playClick();
          setGameMode((prev) => (prev === 'survival' ? 'creative' : 'survival'));
        }}
        fov={fov}
        onChangeFov={setFov}
        daySpeed={daySpeed}
        onChangeDaySpeed={setDaySpeed}
        renderRadius={renderRadius}
        onChangeRenderRadius={setRenderRadius}
      />
    </div>
  );
}
