import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { BallSkin, ColorTheme, Direction, GridCoord, ParsedBoard, RollResult } from '../game/types';
import { applyRoll, calculateProgress, getValidDirections } from '../game/mazeLogic';
import { sound } from '../game/audio';

interface Amaze3DViewProps {
  board: ParsedBoard;
  currentLevelId: number;
  theme: ColorTheme;
  ballSkin: BallSkin;
  showArrowGuide: boolean;
  onProgressUpdate: (progress: { total: number; painted: number; percentage: number; isComplete: boolean }) => void;
  onVictory: (stats: { moves: number; seconds: number }) => void;
  isPaused: boolean;
  isTitle: boolean;
  moves: number;
  setMoves: React.Dispatch<React.SetStateAction<number>>;
}

interface DirectionalArrow {
  direction: Direction;
  group: THREE.Group;
  hitbox: THREE.Mesh;
  arrowMat: THREE.MeshStandardMaterial;
  baseOffset: { x: number; z: number };
}

export const Amaze3DView: React.FC<Amaze3DViewProps> = ({
  board,
  currentLevelId,
  theme,
  ballSkin,
  showArrowGuide,
  onProgressUpdate,
  onVictory,
  isPaused,
  isTitle,
  moves,
  setMoves
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  // Mutable refs to prevent React state tearing down Three.js canvas
  const boardRef = useRef<ParsedBoard>(board);
  boardRef.current = board;

  const themeRef = useRef<ColorTheme>(theme);
  themeRef.current = theme;

  const skinRef = useRef<BallSkin>(ballSkin);
  skinRef.current = ballSkin;

  const showArrowGuideRef = useRef<boolean>(showArrowGuide);
  showArrowGuideRef.current = showArrowGuide;

  const isPausedRef = useRef<boolean>(isPaused);
  isPausedRef.current = isPaused;

  const isTitleRef = useRef<boolean>(isTitle);
  isTitleRef.current = isTitle;

  const movesRef = useRef<number>(moves);
  movesRef.current = moves;

  const onProgressUpdateRef = useRef(onProgressUpdate);
  onProgressUpdateRef.current = onProgressUpdate;

  const onVictoryRef = useRef(onVictory);
  onVictoryRef.current = onVictory;

  // Level start time for stats
  const levelStartTimeRef = useRef<number>(Date.now());
  const hasWonRef = useRef<boolean>(false);

  // Ball position and movement state
  const playerPosRef = useRef<GridCoord>({ ...board.spawn });
  const isRollingRef = useRef<boolean>(false);
  const queuedDirectionRef = useRef<Direction | null>(null);

  // Scene references for updates
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const ballGroupRef = useRef<THREE.Group | null>(null);
  const shadowMeshRef = useRef<THREE.Mesh | null>(null);
  const paintMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const mazeGroupRef = useRef<THREE.Group | null>(null);
  const ballMaterialRef = useRef<THREE.MeshPhysicalMaterial | null>(null);
  const ballAccentMatRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const floorMaterialRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const wallMaterialRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const wallTopMaterialRef = useRef<THREE.MeshStandardMaterial | null>(null);

  // 3D Directional Arrows around the ball
  const arrowsGroupRef = useRef<THREE.Group | null>(null);
  const arrowsListRef = useRef<DirectionalArrow[]>([]);
  const arrowHitboxesRef = useRef<THREE.Mesh[]>([]);

  // Ball visual animation
  const ballVisualPos = useRef<{ x: number; z: number }>({ x: board.spawn.x, z: board.spawn.y });
  const ballRollQueue = useRef<GridCoord[]>([]);
  const ballSquash = useRef<{ x: number; y: number; z: number }>({ x: 1, y: 1, z: 1 });
  const rollDirectionRef = useRef<Direction | null>(null);

  // Particles
  interface SplashParticle {
    mesh: THREE.Mesh;
    vx: number;
    vy: number;
    vz: number;
    life: number;
    maxLife: number;
    active: boolean;
  }
  const particlesPool = useRef<SplashParticle[]>([]);

  // Trigger a roll from player action (swipe / key / 3D arrow click)
  const triggerRoll = (direction: Direction) => {
    if (isPausedRef.current || hasWonRef.current) return;

    if (isRollingRef.current) {
      // Buffer the next input direction for seamless fluid control
      queuedDirectionRef.current = direction;
      return;
    }

    const currentPos = playerPosRef.current;
    const currentBoard = boardRef.current;

    const result: RollResult = applyRoll(currentBoard, currentPos, direction);

    if (!result.didMove) {
      // Small bump in place
      sound.playWallHit();
      return;
    }

    // Play roll start whoosh and sound reset
    sound.resetConsecutive();
    sound.playRollStart();

    setMoves(m => m + 1);
    isRollingRef.current = true;
    rollDirectionRef.current = direction;

    // Queue intermediate steps for smooth tile-by-tile traversal
    ballRollQueue.current = [...result.traversed.slice(1)];
    playerPosRef.current = { ...result.endPos };
  };

  // Build the 4 3D Directional Arrows around player
  const buildDirectionalArrows = (): THREE.Group => {
    const parentGroup = new THREE.Group();
    parentGroup.name = 'DirectionalArrowsParent';
    const curTheme = themeRef.current;

    arrowsListRef.current = [];
    arrowHitboxesRef.current = [];

    // Flat 2D Chevron Arrow Shape (sharp, modern, high contrast)
    const arrowShape = new THREE.Shape();
    arrowShape.moveTo(0, 0.32);       // Arrow tip forward
    arrowShape.lineTo(0.18, 0.08);     // Right barb
    arrowShape.lineTo(0.08, 0.08);     // Right notch
    arrowShape.lineTo(0.08, -0.16);    // Right tail
    arrowShape.lineTo(-0.08, -0.16);   // Left tail
    arrowShape.lineTo(-0.08, 0.08);    // Left notch
    arrowShape.lineTo(-0.18, 0.08);    // Left barb
    arrowShape.closePath();

    const arrowGeo = new THREE.ShapeGeometry(arrowShape);

    // Mini secondary chevron behind main arrow for speed feel
    const chevronShape = new THREE.Shape();
    chevronShape.moveTo(0, -0.06);
    chevronShape.lineTo(0.15, -0.22);
    chevronShape.lineTo(0.08, -0.22);
    chevronShape.lineTo(0, -0.12);
    chevronShape.lineTo(-0.08, -0.22);
    chevronShape.lineTo(-0.15, -0.22);
    chevronShape.closePath();
    const chevronGeo = new THREE.ShapeGeometry(chevronShape);

    const dirsConfig: { dir: Direction; offset: { x: number; z: number }; rotZ: number }[] = [
      { dir: 'UP', offset: { x: 0, z: -0.65 }, rotZ: 0 },
      { dir: 'DOWN', offset: { x: 0, z: 0.65 }, rotZ: Math.PI },
      { dir: 'LEFT', offset: { x: -0.65, z: 0 }, rotZ: Math.PI / 2 },
      { dir: 'RIGHT', offset: { x: 0.65, z: 0 }, rotZ: -Math.PI / 2 }
    ];

    dirsConfig.forEach(({ dir, offset, rotZ }) => {
      const arrowGroup = new THREE.Group();
      arrowGroup.position.set(offset.x, 0.22, offset.z);

      // Rotate to lie flat on XZ floor and point in direction
      // Default Shape lies in XY plane. Rotation around X by -PI/2 puts it in XZ plane.
      // Rotation around Z points it in direction!
      const rotGroup = new THREE.Group();
      rotGroup.rotation.x = -Math.PI / 2;
      rotGroup.rotation.z = rotZ;

      // Glow material for arrows (always vibrant and bright)
      const arrowMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(curTheme.trailColor),
        emissive: new THREE.Color(curTheme.paintColor),
        emissiveIntensity: 0.85,
        roughness: 0.1,
        metalness: 0.2,
        side: THREE.DoubleSide
      });

      const arrowMesh = new THREE.Mesh(arrowGeo, arrowMat);
      rotGroup.add(arrowMesh);

      const chevronMesh = new THREE.Mesh(chevronGeo, arrowMat);
      rotGroup.add(chevronMesh);

      arrowGroup.add(rotGroup);

      // Interactive Hitbox (invisible box for easy click/tap)
      const hitboxGeo = new THREE.BoxGeometry(0.65, 0.45, 0.65);
      const hitboxMat = new THREE.MeshBasicMaterial({ visible: false });
      const hitboxMesh = new THREE.Mesh(hitboxGeo, hitboxMat);
      hitboxMesh.userData = { isArrowHitbox: true, direction: dir };
      arrowGroup.add(hitboxMesh);

      parentGroup.add(arrowGroup);

      arrowsListRef.current.push({
        direction: dir,
        group: arrowGroup,
        hitbox: hitboxMesh,
        arrowMat,
        baseOffset: offset
      });
      arrowHitboxesRef.current.push(hitboxMesh);
    });

    return parentGroup;
  };

  // Re-build 3D board whenever level or dimensions change
  const buildBoardScene = () => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Remove old maze group
    if (mazeGroupRef.current) {
      scene.remove(mazeGroupRef.current);
      mazeGroupRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
        }
      });
    }

    paintMeshesRef.current.clear();
    const curBoard = boardRef.current;
    const currentTheme = themeRef.current;

    const newMazeGroup = new THREE.Group();
    mazeGroupRef.current = newMazeGroup;

    // Dimensions
    const bWidth = curBoard.width;
    const bHeight = curBoard.height;
    const offsetX = -bWidth / 2 + 0.5;
    const offsetZ = -bHeight / 2 + 0.5;

    // Materials
    floorMaterialRef.current = new THREE.MeshStandardMaterial({
      color: new THREE.Color(currentTheme.floorColor),
      roughness: 0.45,
      metalness: 0.05
    });

    wallMaterialRef.current = new THREE.MeshStandardMaterial({
      color: new THREE.Color(currentTheme.wallColor),
      roughness: 0.5,
      metalness: 0.1
    });

    wallTopMaterialRef.current = new THREE.MeshStandardMaterial({
      color: new THREE.Color(currentTheme.wallTopColor),
      roughness: 0.35,
      metalness: 0.15
    });

    // Board Base Platform
    const baseGeo = new THREE.BoxGeometry(bWidth + 0.8, 0.4, bHeight + 0.8);
    const baseMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(currentTheme.wallColor).multiplyScalar(0.7),
      roughness: 0.8,
      metalness: 0.1
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.set(0, -0.21, 0);
    baseMesh.receiveShadow = true;
    newMazeGroup.add(baseMesh);

    // Floor tile geometry with subtle bevel
    const floorTileGeo = new THREE.BoxGeometry(0.96, 0.1, 0.96);
    const wallTileGeo = new THREE.BoxGeometry(0.98, 0.85, 0.98);
    const wallCapGeo = new THREE.BoxGeometry(0.92, 0.1, 0.92);
    const paintTileGeo = new THREE.BoxGeometry(0.96, 0.04, 0.96);

    for (let y = 0; y < bHeight; y++) {
      for (let x = 0; x < bWidth; x++) {
        const tile = curBoard.tiles[y][x];
        const worldX = x + offsetX;
        const worldZ = y + offsetZ;

        if (tile.type === 'floor') {
          // White unpainted floor tile
          const floorMesh = new THREE.Mesh(floorTileGeo, floorMaterialRef.current);
          floorMesh.position.set(worldX, 0.04, worldZ);
          floorMesh.receiveShadow = true;
          newMazeGroup.add(floorMesh);

          // Paint cap mesh (on top of floor)
          const paintMat = new THREE.MeshPhysicalMaterial({
            color: new THREE.Color(currentTheme.paintColor),
            roughness: 0.12,
            metalness: 0.08,
            clearcoat: 0.9,
            clearcoatRoughness: 0.1
          });
          const paintMesh = new THREE.Mesh(paintTileGeo, paintMat);
          paintMesh.position.set(worldX, 0.09, worldZ);
          paintMesh.receiveShadow = true;

          // If tile is painted initially, scale is 1, else 0
          paintMesh.scale.set(tile.painted ? 1 : 0.001, 1, tile.painted ? 1 : 0.001);
          newMazeGroup.add(paintMesh);
          paintMeshesRef.current.set(`${x},${y}`, paintMesh);

        } else if (tile.type === 'wall') {
          // 3D Wall block with top cap
          const wallMesh = new THREE.Mesh(wallTileGeo, wallMaterialRef.current);
          wallMesh.position.set(worldX, 0.42, worldZ);
          wallMesh.castShadow = true;
          wallMesh.receiveShadow = true;
          newMazeGroup.add(wallMesh);

          // Wall top cap
          const capMesh = new THREE.Mesh(wallCapGeo, wallTopMaterialRef.current);
          capMesh.position.set(worldX, 0.86, worldZ);
          capMesh.castShadow = true;
          newMazeGroup.add(capMesh);
        }
      }
    }

    scene.add(newMazeGroup);

    // Adjust camera to frame board nicely
    if (cameraRef.current) {
      const maxDim = Math.max(bWidth, bHeight);
      const camDist = Math.max(9, maxDim * 1.35);
      cameraRef.current.position.set(0, camDist * 1.15, camDist * 0.95);
      cameraRef.current.lookAt(0, 0, 0);
    }

    // Reset ball position
    playerPosRef.current = { ...curBoard.spawn };
    ballVisualPos.current = { x: curBoard.spawn.x + offsetX, z: curBoard.spawn.y + offsetZ };
    if (ballGroupRef.current) {
      ballGroupRef.current.position.set(ballVisualPos.current.x, 0.42, ballVisualPos.current.z);
    }
    if (shadowMeshRef.current) {
      shadowMeshRef.current.position.set(ballVisualPos.current.x, 0.11, ballVisualPos.current.z);
    }

    // Update initial progress
    const initProgress = calculateProgress(curBoard);
    onProgressUpdateRef.current(initProgress);
    hasWonRef.current = false;
    levelStartTimeRef.current = Date.now();
  };

  // Spawn paint splash particles at given world position
  const spawnSplashes = (wx: number, wz: number, count: number = 8) => {
    const curTheme = themeRef.current;
    let spawned = 0;
    for (const p of particlesPool.current) {
      if (!p.active) {
        p.active = true;
        p.life = 0;
        p.maxLife = 0.25 + Math.random() * 0.2;
        p.mesh.visible = true;
        p.mesh.position.set(wx + (Math.random() - 0.5) * 0.2, 0.15, wz + (Math.random() - 0.5) * 0.2);

        const angle = Math.random() * Math.PI * 2;
        const speed = 1.2 + Math.random() * 2.2;
        p.vx = Math.cos(angle) * speed;
        p.vy = 2.0 + Math.random() * 2.5;
        p.vz = Math.sin(angle) * speed;

        const pMat = p.mesh.material as THREE.MeshBasicMaterial;
        pMat.color.set(curTheme.paintColor);
        p.mesh.scale.setScalar(0.08 + Math.random() * 0.08);

        spawned++;
        if (spawned >= count) break;
      }
    }
  };

  // Build the 3–12 part composite hero Player Ball mesh
  const createBallGroup = (): THREE.Group => {
    const group = new THREE.Group();
    const curTheme = themeRef.current;
    const curSkin = skinRef.current;

    // Part 1: Main Glossy Sphere Body (Primary silhouette)
    const sphereGeo = new THREE.SphereGeometry(0.36, 32, 24);
    ballMaterialRef.current = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(curTheme.ballColor),
      roughness: 0.1,
      metalness: 0.05,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1
    });
    const mainSphere = new THREE.Mesh(sphereGeo, ballMaterialRef.current);
    mainSphere.castShadow = true;
    mainSphere.name = 'mainSphere';
    group.add(mainSphere);

    // Part 2: Accent Core / Eyes / Gem (Secondary silhouette)
    ballAccentMatRef.current = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.2,
      metalness: 0.2
    });

    if (curSkin === 'star') {
      const starGeo = new THREE.OctahedronGeometry(0.18, 0);
      const starMesh = new THREE.Mesh(starGeo, ballAccentMatRef.current);
      starMesh.position.set(0, 0.34, 0);
      starMesh.rotation.set(0.4, 0.4, 0);
      starMesh.name = 'skinAccent';
      group.add(starMesh);
    } else if (curSkin === 'donut') {
      const torusGeo = new THREE.TorusGeometry(0.38, 0.08, 16, 32);
      const torusMesh = new THREE.Mesh(torusGeo, ballAccentMatRef.current);
      torusMesh.rotation.x = Math.PI / 2;
      torusMesh.name = 'skinAccent';
      group.add(torusMesh);
    } else if (curSkin === 'stripes') {
      const ring1 = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.04, 12, 28), ballAccentMatRef.current);
      ring1.rotation.y = Math.PI / 4;
      ring1.name = 'skinAccent';
      group.add(ring1);
      const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.04, 12, 28), ballAccentMatRef.current);
      ring2.rotation.y = -Math.PI / 4;
      ring2.name = 'skinAccent2';
      group.add(ring2);
    } else if (curSkin === 'gem') {
      const gemGeo = new THREE.IcosahedronGeometry(0.2, 0);
      const gemMesh = new THREE.Mesh(gemGeo, ballAccentMatRef.current);
      gemMesh.position.set(0, 0.32, 0);
      gemMesh.name = 'skinAccent';
      group.add(gemMesh);
    } else {
      const eyeGeo = new THREE.SphereGeometry(0.09, 16, 12);
      const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const eyePupilMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
      const pupilGeo = new THREE.SphereGeometry(0.045, 12, 8);

      const leftEye = new THREE.Mesh(eyeGeo, eyeWhiteMat);
      leftEye.position.set(-0.13, 0.1, 0.32);
      const leftPupil = new THREE.Mesh(pupilGeo, eyePupilMat);
      leftPupil.position.set(-0.13, 0.11, 0.37);

      const rightEye = new THREE.Mesh(eyeGeo, eyeWhiteMat);
      rightEye.position.set(0.13, 0.1, 0.32);
      const rightPupil = new THREE.Mesh(pupilGeo, eyePupilMat);
      rightPupil.position.set(0.13, 0.11, 0.37);

      const eyesGroup = new THREE.Group();
      eyesGroup.name = 'skinAccent';
      eyesGroup.add(leftEye, leftPupil, rightEye, rightPupil);
      group.add(eyesGroup);
    }

    return group;
  };

  // Re-skin ball when skin or theme changes
  const updateBallMaterials = () => {
    const curTheme = themeRef.current;
    if (ballMaterialRef.current) {
      ballMaterialRef.current.color.set(curTheme.ballColor);
    }
    if (wallMaterialRef.current) {
      wallMaterialRef.current.color.set(curTheme.wallColor);
    }
    if (wallTopMaterialRef.current) {
      wallTopMaterialRef.current.color.set(curTheme.wallTopColor);
    }
    if (floorMaterialRef.current) {
      floorMaterialRef.current.color.set(curTheme.floorColor);
    }
    // Update painted tile colors
    paintMeshesRef.current.forEach(mesh => {
      const mat = mesh.material as THREE.MeshPhysicalMaterial;
      mat.color.set(curTheme.paintColor);
    });
    // Update arrow colors
    arrowsListRef.current.forEach(({ arrowMat }) => {
      arrowMat.color.set(curTheme.paintColor);
      arrowMat.emissive.set(curTheme.paintColor);
    });
  };

  // Setup Three.js scene once
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Detect software WebGL as mandated
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    cameraRef.current = camera;
    camera.position.set(0, 14, 11);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: true
    });
    rendererRef.current = renderer;
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // Studio Environment map via RoomEnvironment
    try {
      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
      pmremGenerator.dispose();
    } catch {
      // Fallback ambient
    }

    // Warm Key Light with tight orthographic shadow frustum
    const keyLight = new THREE.DirectionalLight(0xfff5ea, 1.8);
    keyLight.position.set(8, 16, 10);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 40;
    keyLight.shadow.camera.left = -12;
    keyLight.shadow.camera.right = 12;
    keyLight.shadow.camera.top = 12;
    keyLight.shadow.camera.bottom = -12;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    // Cool Hemisphere fill
    const hemiLight = new THREE.HemisphereLight(0xddeeff, 0x332244, 1.0);
    scene.add(hemiLight);

    // Contact shadow disc for player ball
    const shadowGeo = new THREE.CircleGeometry(0.34, 24);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.38,
      depthWrite: false
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.set(0, 0.11, 0);
    shadowMeshRef.current = shadowMesh;
    scene.add(shadowMesh);

    // Ball Group
    const ballGroup = createBallGroup();
    ballGroupRef.current = ballGroup;
    scene.add(ballGroup);

    // 3D Directional Arrows Group
    const arrowsGroup = buildDirectionalArrows();
    arrowsGroupRef.current = arrowsGroup;
    scene.add(arrowsGroup);

    // Particle pool for paint splashes
    const pGeo = new THREE.SphereGeometry(1, 8, 8);
    const pMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    particlesPool.current = [];
    for (let i = 0; i < 40; i++) {
      const pMesh = new THREE.Mesh(pGeo, pMat.clone());
      pMesh.visible = false;
      scene.add(pMesh);
      particlesPool.current.push({
        mesh: pMesh,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 0.3,
        active: false
      });
    }

    // Build the initial board
    buildBoardScene();

    // Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
      }
    });
    resizeObserver.observe(container);

    // Animation & Game loop
    let frameId = 0;
    let lastTime = performance.now();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const tick = () => {
      const now = performance.now();
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(rawDt, 0.05);

      // Title idle animation: camera gentle orbit
      if (isTitleRef.current && cameraRef.current) {
        const angle = now * 0.0006;
        const radius = 13;
        cameraRef.current.position.x = Math.sin(angle) * radius * 0.3;
        cameraRef.current.position.z = Math.cos(angle) * radius * 0.8 + 8;
        cameraRef.current.lookAt(0, 0, 0);
      }

      // Ball Rolling Movement Animation
      if (isRollingRef.current && ballGroupRef.current) {
        const curBoard = boardRef.current;
        const offsetX = -curBoard.width / 2 + 0.5;
        const offsetZ = -curBoard.height / 2 + 0.5;

        // Current sub-target in queue
        if (ballRollQueue.current.length > 0) {
          const nextGridPos = ballRollQueue.current[0];
          const targetWorldX = nextGridPos.x + offsetX;
          const targetWorldZ = nextGridPos.y + offsetZ;

          const dx = targetWorldX - ballVisualPos.current.x;
          const dz = targetWorldZ - ballVisualPos.current.z;
          const dist = Math.hypot(dx, dz);

          // Fast roll speed (16 tiles per second)
          const rollSpeed = 16 * dt;

          if (dist <= rollSpeed) {
            // Arrived at intermediate tile!
            ballVisualPos.current.x = targetWorldX;
            ballVisualPos.current.z = targetWorldZ;
            ballRollQueue.current.shift();

            // Paint this tile!
            const tileKey = `${nextGridPos.x},${nextGridPos.y}`;
            const paintMesh = paintMeshesRef.current.get(tileKey);
            if (paintMesh) {
              paintMesh.scale.set(1.0, 1.0, 1.0);
            }

            // Play bloop sound & spawn paint splashes
            sound.playTilePaint();
            spawnSplashes(targetWorldX, targetWorldZ, 4);

            // Update progress
            const prog = calculateProgress(curBoard);
            onProgressUpdateRef.current(prog);

            if (prog.isComplete && !hasWonRef.current) {
              hasWonRef.current = true;
              isRollingRef.current = false;
              ballRollQueue.current = [];
              sound.playVictoryFanfare();
              const elapsedSec = Math.max(1, Math.round((Date.now() - levelStartTimeRef.current) / 1000));
              onVictoryRef.current({ moves: movesRef.current, seconds: elapsedSec });
            }
          } else {
            // Step toward sub-target
            ballVisualPos.current.x += (dx / dist) * rollSpeed;
            ballVisualPos.current.z += (dz / dist) * rollSpeed;

            // Rotate ball mesh in roll direction
            const dir = rollDirectionRef.current;
            if (dir === 'RIGHT') {
              ballGroupRef.current.rotation.z -= rollSpeed * 2.5;
            } else if (dir === 'LEFT') {
              ballGroupRef.current.rotation.z += rollSpeed * 2.5;
            } else if (dir === 'UP') {
              ballGroupRef.current.rotation.x -= rollSpeed * 2.5;
            } else if (dir === 'DOWN') {
              ballGroupRef.current.rotation.x += rollSpeed * 2.5;
            }
          }
        } else {
          // Finished rolling queue -> Hit the wall!
          isRollingRef.current = false;
          sound.playWallHit();

          // Squish squash on impact
          const dir = rollDirectionRef.current;
          if (dir === 'LEFT' || dir === 'RIGHT') {
            ballSquash.current.x = 0.72;
            ballSquash.current.y = 1.25;
            ballSquash.current.z = 1.15;
          } else {
            ballSquash.current.z = 0.72;
            ballSquash.current.y = 1.25;
            ballSquash.current.x = 1.15;
          }

          // Check if user buffered an input while rolling!
          if (queuedDirectionRef.current && !hasWonRef.current) {
            const nextDir = queuedDirectionRef.current;
            queuedDirectionRef.current = null;
            setTimeout(() => triggerRoll(nextDir), 20);
          }
        }
      }

      // Recover squash & stretch back to 1.0 smoothly
      ballSquash.current.x += (1 - ballSquash.current.x) * (1 - Math.exp(-18 * dt));
      ballSquash.current.y += (1 - ballSquash.current.y) * (1 - Math.exp(-18 * dt));
      ballSquash.current.z += (1 - ballSquash.current.z) * (1 - Math.exp(-18 * dt));

      if (ballGroupRef.current) {
        ballGroupRef.current.position.x = ballVisualPos.current.x;
        ballGroupRef.current.position.z = ballVisualPos.current.z;
        ballGroupRef.current.scale.set(
          ballSquash.current.x,
          ballSquash.current.y,
          ballSquash.current.z
        );
      }

      if (shadowMeshRef.current) {
        shadowMeshRef.current.position.x = ballVisualPos.current.x;
        shadowMeshRef.current.position.z = ballVisualPos.current.z;
        shadowMeshRef.current.scale.set(
          ballSquash.current.x,
          ballSquash.current.z,
          1
        );
      }

      // Update 3D Directional Arrows
      if (arrowsGroupRef.current) {
        const shouldShowArrows =
          showArrowGuideRef.current &&
          !isRollingRef.current &&
          !isPausedRef.current &&
          !isTitleRef.current &&
          !hasWonRef.current;

        arrowsGroupRef.current.visible = shouldShowArrows;

        if (shouldShowArrows) {
          // Keep arrows pinned around ball with gentle floating pulse
          arrowsGroupRef.current.position.x = ballVisualPos.current.x;
          arrowsGroupRef.current.position.z = ballVisualPos.current.z;

          const pulseY = 0.16 + Math.sin(now * 0.007) * 0.035;
          const pulseScale = 1.0 + Math.sin(now * 0.007) * 0.08;
          const validDirs = getValidDirections(boardRef.current, playerPosRef.current);

          arrowsListRef.current.forEach(({ direction, group, baseOffset }) => {
            const isValid = validDirs.includes(direction);
            group.visible = isValid;
            if (isValid) {
              group.position.y = pulseY;
              // Subtle dynamic breathing offset
              const breathingDist = 1.0 + Math.sin(now * 0.007) * 0.05;
              group.position.x = baseOffset.x * breathingDist;
              group.position.z = baseOffset.z * breathingDist;
              group.scale.setScalar(pulseScale);
            }
          });
        }
      }

      // Update splash particles
      for (const p of particlesPool.current) {
        if (p.active) {
          p.life += dt;
          if (p.life >= p.maxLife) {
            p.active = false;
            p.mesh.visible = false;
          } else {
            p.mesh.position.x += p.vx * dt;
            p.mesh.position.y += p.vy * dt;
            p.mesh.position.z += p.vz * dt;
            p.vy -= 12 * dt; // gravity

            const progress = p.life / p.maxLife;
            const s = (1 - progress) * 0.12;
            p.mesh.scale.setScalar(Math.max(0.001, s));
          }
        }
      }

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    if (isSoftwareGl) {
      afterDraw(tick);
    } else {
      frameId = requestAnimationFrame(tick);
    }

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // When currentLevelId or board changes, rebuild the board
  useEffect(() => {
    buildBoardScene();
  }, [currentLevelId, board]);

  // When theme or ball skin changes, update visual materials
  useEffect(() => {
    updateBallMaterials();
  }, [theme, ballSkin]);

  // Keyboard navigation on window
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isPausedRef.current || isTitleRef.current || hasWonRef.current) return;

      let dir: Direction | null = null;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        dir = 'UP';
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        dir = 'DOWN';
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        dir = 'LEFT';
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        dir = 'RIGHT';
      }

      if (dir) {
        e.preventDefault();
        triggerRoll(dir);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Raycasting for direct click on 3D arrows or swipe gestures
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const raycaster = useRef(new THREE.Raycaster());
  const mouseNdc = useRef(new THREE.Vector2());

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isPaused || isTitle || hasWonRef.current) return;
    pointerStart.current = { x: e.clientX, y: e.clientY };

    // Check if user clicked directly on one of the 3D Directional Arrows
    if (cameraRef.current && mountRef.current && showArrowGuideRef.current && !isRollingRef.current) {
      const rect = mountRef.current.getBoundingClientRect();
      mouseNdc.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseNdc.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.current.setFromCamera(mouseNdc.current, cameraRef.current);
      const activeHitboxes = arrowHitboxesRef.current.filter(h => h.parent?.visible);
      const intersects = raycaster.current.intersectObjects(activeHitboxes, false);

      if (intersects.length > 0) {
        const clickedHitbox = intersects[0].object as THREE.Mesh;
        const dir = clickedHitbox.userData.direction as Direction;
        if (dir) {
          triggerRoll(dir);
          pointerStart.current = null; // Consume action
          return;
        }
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!pointerStart.current || isPaused || isTitle || hasWonRef.current) return;

    const dx = e.clientX - pointerStart.current.x;
    const dy = e.clientY - pointerStart.current.y;
    pointerStart.current = null;

    const minSwipeDist = 20;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (absX < minSwipeDist && absY < minSwipeDist) {
      return;
    }

    if (absX > absY) {
      triggerRoll(dx > 0 ? 'RIGHT' : 'LEFT');
    } else {
      triggerRoll(dy > 0 ? 'DOWN' : 'UP');
    }
  };

  // Expose virtual D-pad trigger to parent via window
  useEffect(() => {
    const handleCustomTrigger = (e: CustomEvent<{ direction: Direction }>) => {
      if (e.detail?.direction) {
        triggerRoll(e.detail.direction);
      }
    };
    window.addEventListener('amaze-roll' as never, handleCustomTrigger as never);
    return () => window.removeEventListener('amaze-roll' as never, handleCustomTrigger as never);
  }, []);

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing touch-none select-none"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => { pointerStart.current = null; }}
      data-testid="amaze-canvas-mount"
    />
  );
};
