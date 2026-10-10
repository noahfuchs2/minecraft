/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { World } from './game/world';
import { Player } from './game/player';
import { Environment } from './game/environment';
import { HandViewmodel } from './game/hand';
import { ParticleSystem } from './game/particles';
import { BlockType, BLOCK_DEFINITIONS } from './game/blocks';
import { soundManager } from './game/audio';
import { HUD } from './components/HUD';
import { InventoryModal } from './components/InventoryModal';
import { PauseMenu } from './components/PauseMenu';
import { MobileControls } from './components/MobileControls';
import { Play, Sparkles } from 'lucide-react';

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);

  // Core Game Engine References
  const worldRef = useRef<World | null>(null);
  const playerRef = useRef<Player | null>(null);
  const envRef = useRef<Environment | null>(null);
  const handRef = useRef<HandViewmodel | null>(null);
  const particlesRef = useRef<ParticleSystem | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // Game UI State
  const [hasStarted, setHasStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [isFlying, setIsFlying] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [fov, setFov] = useState(75);
  const [daySpeed, setDaySpeed] = useState(240);

  // Hotbar (9 slots)
  const [hotbar, setHotbar] = useState<BlockType[]>([
    BlockType.GRASS,
    BlockType.DIRT,
    BlockType.STONE,
    BlockType.COBBLESTONE,
    BlockType.OAK_PLANKS,
    BlockType.OAK_LOG,
    BlockType.GLASS,
    BlockType.BRICK,
    BlockType.TNT,
  ]);
  const [selectedSlot, setSelectedSlot] = useState(0);

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

  // Update held block in hand viewmodel when slot or hotbar changes
  useEffect(() => {
    if (handRef.current) {
      handRef.current.setHeldBlock(hotbar[selectedSlot]);
    }
  }, [selectedSlot, hotbar]);

  // Update Camera FOV when changed in settings
  useEffect(() => {
    if (cameraRef.current) {
      cameraRef.current.fov = fov;
      cameraRef.current.updateProjectionMatrix();
    }
  }, [fov]);

  // Update Day Duration when changed in settings
  useEffect(() => {
    if (envRef.current) {
      envRef.current.dayDuration = daySpeed;
    }
  }, [daySpeed]);

  // Mine (destroy) targeted block
  const handleMineBlock = useCallback(() => {
    const world = worldRef.current;
    const player = playerRef.current;
    const hand = handRef.current;
    const particles = particlesRef.current;
    if (!world || !player || !hand || !particles) return;

    // Raycast in camera look direction
    const forward = new THREE.Vector3();
    player.camera.getWorldDirection(forward);
    const hit = world.raycast(player.camera.position, forward, 5.5);

    if (hit.hit && hit.block !== BlockType.AIR && hit.block !== BlockType.BEDROCK) {
      soundManager.playBlockBreak(BLOCK_DEFINITIONS[hit.block]?.sound || 'stone');
      particles.spawnBlockBreak(hit.x, hit.y, hit.z, hit.block);
      hand.triggerSwing();
      world.setBlock(hit.x, hit.y, hit.z, BlockType.AIR);
    } else {
      hand.triggerSwing();
    }
  }, []);

  // Place (build) selected block
  const handlePlaceBlock = useCallback(() => {
    const world = worldRef.current;
    const player = playerRef.current;
    const hand = handRef.current;
    if (!world || !player || !hand) return;

    const forward = new THREE.Vector3();
    player.camera.getWorldDirection(forward);
    const hit = world.raycast(player.camera.position, forward, 5.5);

    if (hit.hit) {
      const placeX = hit.x + hit.normal.x;
      const placeY = hit.y + hit.normal.y;
      const placeZ = hit.z + hit.normal.z;

      // Check collision with player's bounding box
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
        const heldBlock = hotbar[selectedSlot];
        if (heldBlock !== BlockType.AIR) {
          soundManager.playBlockPlace(BLOCK_DEFINITIONS[heldBlock]?.sound || 'stone');
          hand.triggerSwing();
          world.setBlock(placeX, placeY, placeZ, heldBlock);
        }
      }
    }
  }, [hotbar, selectedSlot]);

  // Request Pointer Lock to capture mouse
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
    requestPointerLock();
  };

  // Resume game from pause
  const handleResumeGame = () => {
    setIsPaused(false);
    setIsInventoryOpen(false);
    requestPointerLock();
  };

  // Toggle flight
  const handleToggleFlight = () => {
    if (playerRef.current) {
      playerRef.current.toggleFlight();
      setIsFlying(playerRef.current.isFlying);
    }
  };

  // Open inventory
  const handleOpenInventory = () => {
    document.exitPointerLock?.();
    setIsInventoryOpen(true);
  };

  // Close inventory
  const handleCloseInventory = () => {
    setIsInventoryOpen(false);
    requestPointerLock();
  };

  // Open Pause Menu
  const handleOpenPauseMenu = () => {
    document.exitPointerLock?.();
    setIsPaused(true);
  };

  // Set block in hotbar slot
  const handleSetHotbarSlot = (slot: number, block: BlockType) => {
    setHotbar((prev) => {
      const next = [...prev];
      next[slot] = block;
      return next;
    });
  };

  // Reset or create new world
  const handleResetWorld = (seed?: number) => {
    const world = worldRef.current;
    const player = playerRef.current;
    if (!world || !player) return;

    world.seed = seed ?? Math.floor(Math.random() * 999999);
    world.dispose();
    world.generateTerrain();

    const spawn = world.getSpawnPosition();
    player.teleport(spawn);
  };

  // Save world to LocalStorage
  const handleSaveWorld = () => {
    if (worldRef.current) {
      worldRef.current.saveWorld();
    }
  };

  // Initialize Three.js Game World
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      fov,
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

    // Try loading saved world, or generate fresh
    const loaded = world.loadWorld();
    if (!loaded) {
      world.generateTerrain();
    }

    // 4. Player
    const spawnPos = world.getSpawnPosition();
    const player = new Player(camera, spawnPos);
    playerRef.current = player;

    // 5. Environment (Day/Night, Sun, Moon, Clouds)
    const environment = new Environment(scene, { dayDurationSeconds: daySpeed });
    envRef.current = environment;

    // 6. Hand Viewmodel & Selection Box
    const hand = new HandViewmodel(camera);
    handRef.current = hand;
    scene.add(hand.selectionBox);

    // 7. Particle System
    const particles = new ParticleSystem(scene);
    particlesRef.current = particles;

    // 8. Event Listeners: Pointer Lock
    const handlePointerLockChange = () => {
      const isLocked = document.pointerLockElement === container;
      if (!isLocked && !isInventoryOpen) {
        setIsPaused(true);
      }
    };
    document.addEventListener('pointerlockchange', handlePointerLockChange);

    // 9. Mouse Look
    const handleMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement === container) {
        player.look(e.movementX, e.movementY);
      }
    };
    window.addEventListener('mousemove', handleMouseMove);

    // 10. Mouse Clicks (Mine & Place)
    const handleMouseDown = (e: MouseEvent) => {
      if (document.pointerLockElement !== container) return;

      if (e.button === 0) {
        // Left click: Mine block
        handleMineBlock();
      } else if (e.button === 2) {
        // Right click: Place block
        handlePlaceBlock();
      }
    };
    window.addEventListener('mousedown', handleMouseDown);

    // Prevent default context menu on right click
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    window.addEventListener('contextmenu', handleContextMenu);

    // 11. Mouse Wheel (Hotbar scrolling)
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

    // 12. Keyboard Controls
    const handleKeyDown = (e: KeyboardEvent) => {
      // Slot selection 1-9
      if (e.code >= 'Digit1' && e.code <= 'Digit9') {
        const slotIdx = parseInt(e.code.replace('Digit', ''), 10) - 1;
        soundManager.playClick();
        setSelectedSlot(slotIdx);
        return;
      }

      switch (e.code) {
        case 'KeyW':
          player.controls.forward = true;
          break;
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
          break;
        case 'KeyF':
          player.toggleFlight();
          setIsFlying(player.isFlying);
          break;
        case 'KeyE':
          if (!isPaused) {
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
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // 13. Window Resize
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // 14. Main Game Loop
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

      // Update Player Physics
      const isPlayerMoving =
        player.controls.forward ||
        player.controls.backward ||
        player.controls.left ||
        player.controls.right;

      player.update(delta, world);

      // Raycast for targeted block highlight
      const forward = new THREE.Vector3();
      camera.getWorldDirection(forward);
      const hit = world.raycast(camera.position, forward, 5.5);

      if (hit.hit) {
        hand.updateSelectionBox(hit.x, hit.y, hit.z, true);
        setTargetBlock({
          type: hit.block,
          x: hit.x,
          y: hit.y,
          z: hit.z,
        });
      } else {
        hand.updateSelectionBox(0, 0, 0, false);
        setTargetBlock(null);
      }

      // Update Environment & Day/Night
      environment.update(delta, player.position);

      // Update Hand Viewmodel (bobbing & swing)
      hand.update(delta, isPlayerMoving, player.isGrounded);

      // Update Particles
      particles.update(delta);

      // Update Telemetry state (throttled)
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

    // Clean up on unmount
    return () => {
      clearInterval(autoSaveInterval);
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', handleResize);

      world.dispose();
      hand.dispose();
      particles.clear();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [daySpeed, fov, handleMineBlock, handlePlaceBlock, isInventoryOpen, isPaused]);

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
          } else if (!isInventoryOpen) {
            requestPointerLock();
          }
        }}
        className="w-full h-full cursor-crosshair"
      />

      {/* Welcome / Start Game Screen */}
      {!hasStarted && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-lg bg-[#2e2e2e] border-4 border-[#555555] shadow-2xl p-6 flex flex-col items-center text-center gap-4">
            <div className="flex items-center gap-2 text-emerald-400">
              <Sparkles className="w-6 h-6 animate-spin" />
              <h1 className="text-2xl sm:text-3xl font-minecraft text-white drop-shadow-[0_3px_3px_#000]">
                MINECRAFT WEB
              </h1>
            </div>

            <p className="text-xs sm:text-sm font-minecraft text-white/80 leading-relaxed max-w-md">
              Willkommen in deiner Voxel-Welt! Baue, grabe und gestalte mit originalgetreuen Texturen,
              Tag-Nacht-Zyklus, Geräuschen und kreativem Flugmodus.
            </p>

            {/* Controls summary */}
            <div className="bg-[#1e1e1e] border-2 border-[#444444] p-3 text-left w-full text-[11px] font-minecraft text-white/70 space-y-1">
              <div>🖱 <span className="text-amber-300">Linksklick</span>: Block abbauen</div>
              <div>🧱 <span className="text-amber-300">Rechtsklick</span>: Block platzieren</div>
              <div>🏃 <span className="text-amber-300">W, A, S, D</span>: Laufen / Bewegen</div>
              <div>🎒 <span className="text-amber-300">Taste E</span>: Inventar öffnen</div>
              <div>✈ <span className="text-amber-300">Taste F</span>: Flugmodus an/aus</div>
              <div>⏸ <span className="text-amber-300">Taste ESC</span>: Pausemenü & Speichern</div>
            </div>

            <button
              onClick={handleStartGame}
              className="mc-button mc-button-green w-full py-3 text-sm font-minecraft cursor-pointer flex items-center justify-center gap-2 mt-2"
            >
              <Play className="w-5 h-5 fill-white" />
              <span>Welt betreten & Spielen</span>
            </button>
          </div>
        </div>
      )}

      {/* Head-Up Display (Hotbar, Crosshair, Coordinates, Mode) */}
      {hasStarted && !isPaused && !isInventoryOpen && (
        <HUD
          hotbar={hotbar}
          selectedSlot={selectedSlot}
          onSelectSlot={setSelectedSlot}
          onOpenInventory={handleOpenInventory}
          onOpenPauseMenu={handleOpenPauseMenu}
          isFlying={isFlying}
          onToggleFlight={handleToggleFlight}
          playerPos={playerPos}
          playerYaw={playerYaw}
          targetBlock={targetBlock}
          fps={fps}
        />
      )}

      {/* Mobile Touch Controls for handheld devices */}
      {hasStarted && isMobile && !isPaused && !isInventoryOpen && playerRef.current && (
        <MobileControls
          controls={playerRef.current.controls}
          onMine={handleMineBlock}
          onPlace={handlePlaceBlock}
          onToggleFlight={handleToggleFlight}
          onOpenInventory={handleOpenInventory}
          isFlying={isFlying}
        />
      )}

      {/* Creative Inventory Modal (E key) */}
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
        fov={fov}
        onChangeFov={setFov}
        daySpeed={daySpeed}
        onChangeDaySpeed={setDaySpeed}
      />
    </div>
  );
}
