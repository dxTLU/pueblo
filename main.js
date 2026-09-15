import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

// --- Global Engine State ---
let scene, camera, renderer;
let orbitControls, walkControls;
let isWalkMode = false;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false, isRunning = false;
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const clock = new THREE.Clock();

// Animated scene elements
let waterMaterial, smokeParticles = [];
let lightingMode = 'goldenHour'; // 'goldenHour' or 'midday'
let dirLight, ambientLight, hemiLight;

// --- Initialization ---
init();
animate();

function init() {
    const container = document.getElementById('canvas-container');

    // Scene & Fog
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xe0a96d); // High-desert ambient sky
    scene.fog = new THREE.FogExp2(0xd19359, 0.0035);

    // Camera
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.5, 1000);
    camera.position.set(120, 45, 160);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);

    // Controls
    setupControls();

    // Lighting
    setupLighting();

    // World Generation
    createTerrainAndCanyon();
    createPuebloArchitecture();
    createKivas();
    createHydraulicSystem();
    createAgriculture();
    createSmokeSystem();

    // Event Listeners & UI Integration
    window.addEventListener('resize', onWindowResize);
    setupUIControls();

    // Add Walk Instructions Overlay
    createWalkOverlay();
}

// --- Controls Setup ---
function setupControls() {
    // 1. Orbit Controls (Overview Mode)
    orbitControls = new OrbitControls(camera, renderer.domElement);
    orbitControls.enableDamping = true;
    orbitControls.dampingFactor = 0.05;
    orbitControls.maxPolarAngle = Math.PI / 2 - 0.02; // Prevent going under floor
    orbitControls.target.set(0, 18, 0);

    // 2. Pointer Lock Controls (Walk Mode)
    walkControls = new PointerLockControls(camera, document.body);

    walkControls.addEventListener('lock', () => {
        isWalkMode = true;
        orbitControls.enabled = false;
        document.getElementById('walk-instructions').style.display = 'none';
    });

    walkControls.addEventListener('unlock', () => {
        isWalkMode = false;
        orbitControls.enabled = true;
        // Reset camera tilt when exiting walk mode
        camera.position.set(120, 45, 160);
        orbitControls.target.set(0, 18, 0);
    });

    // Keyboard Inputs
    const onKeyDown = (e) => {
        switch (e.code) {
            case 'KeyW': case 'ArrowUp': moveForward = true; break;
            case 'KeyS': case 'ArrowDown': moveBackward = true; break;
            case 'KeyA': case 'ArrowLeft': moveLeft = true; break;
            case 'KeyD': case 'ArrowRight': moveRight = true; break;
            case 'ShiftLeft': case 'ShiftRight': isRunning = true; break;
        }
    };

    const onKeyUp = (e) => {
        switch (e.code) {
            case 'KeyW': case 'ArrowUp': moveForward = false; break;
            case 'KeyS': case 'ArrowDown': moveBackward = false; break;
            case 'KeyA': case 'ArrowLeft': moveLeft = false; break;
            case 'KeyD': case 'ArrowRight': moveRight = false; break;
            case 'ShiftLeft': case 'ShiftRight': isRunning = false; break;
        }
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
}

// --- Lighting & Golden Hour Atmosphere ---
function setupLighting() {
    // Hemispheric Ambient Light (Sky / Earth reaction)
    hemiLight = new THREE.HemisphereLight(0xffbe86, 0x5c3317, 0.75);
    scene.add(hemiLight);

    // Ambient Warm Fill
    ambientLight = new THREE.AmbientLight(0xff9e59, 0.35);
    scene.add(ambientLight);

    // Golden Hour Directional Sunlight
    dirLight = new THREE.DirectionalLight(0xffb05b, 2.8);
    dirLight.position.set(160, 50, 120); // Low angle for deep canyon shadows
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 10;
    dirLight.shadow.camera.far = 400;
    const d = 150;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    dirLight.shadow.bias = -0.0005;
    scene.add(dirLight);
}

// --- Procedural Terrain, Canyon Recess, & Mesa ---
function createTerrainAndCanyon() {
    // Sandstone Ground & Cliff Materials
    const cliffMat = new THREE.MeshStandardMaterial({
        color: 0xba6c38,
        roughness: 0.9,
        metalness: 0.05,
        flatShading: true
    });

    const mesaMat = new THREE.MeshStandardMaterial({
        color: 0xd6894c,
        roughness: 0.85
    });

    // 1. Valley Floor
    const valleyGeo = new THREE.PlaneGeometry(350, 350, 64, 64);
    valleyGeo.rotateX(-Math.PI / 2);
    const pos = valleyGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        let x = pos.getX(i);
        let z = pos.getZ(i);
        // Subtle undulating ground + wash trough
        let y = Math.sin(x * 0.02) * Math.cos(z * 0.02) * 3 - (x * 0.03);
        pos.setY(i, Math.max(-5, y));
    }
    valleyGeo.computeVertexNormals();
    const valleyMesh = new THREE.Mesh(valleyGeo, mesaMat);
    valleyMesh.receiveShadow = true;
    scene.add(valleyMesh);

    // 2. Canyon Alcove Wall (Cliff Palace style recess)
    const cliffGeo = new THREE.BoxGeometry(160, 80, 70, 32, 32, 16);
    const cPos = cliffGeo.attributes.position;
    for (let i = 0; i < cPos.count; i++) {
        let x = cPos.getX(i);
        let y = cPos.getY(i);
        let z = cPos.getZ(i);

        // Carve natural curved cliff recess (alcove) in center back
        if (z < 0) {
            let alcoveFactor = Math.cos((x / 80) * (Math.PI / 2));
            if (alcoveFactor > 0 && Math.abs(y) < 30) {
                cPos.setZ(i, z + alcoveFactor * 28);
            }
        }
        // Organic stone rough noise
        cPos.setX(i, x + (Math.random() - 0.5) * 2);
        cPos.setY(i, y + (Math.random() - 0.5) * 2);
    }
    cliffGeo.computeVertexNormals();
    const cliffMesh = new THREE.Mesh(cliffGeo, cliffMat);
    cliffMesh.position.set(-10, 40, -40);
    cliffMesh.castShadow = true;
    cliffMesh.receiveShadow = true;
    scene.add(cliffMesh);

    // 3. Upper Mesa Plateau
    const mesaTopGeo = new THREE.BoxGeometry(220, 10, 120);
    const mesaTop = new THREE.Mesh(mesaTopGeo, cliffMat);
    mesaTop.position.set(-10, 75, -60);
    mesaTop.receiveShadow = true;
    scene.add(mesaTop);
}

// --- Tiered Multi-Story Adobe Pueblo Architecture ---
function createPuebloArchitecture() {
    // Textures & Materials
    const adobeMat = new THREE.MeshStandardMaterial({
        color: 0xc4804d, // Hand-applied ochre/mud plaster
        roughness: 0.95,
        metalness: 0.0
    });

    const vigaWoodMat = new THREE.MeshStandardMaterial({
        color: 0x3d271d, // Weathered pine logs
        roughness: 0.8
    });

    const darkInteriorMat = new THREE.MeshBasicMaterial({ color: 0x0f0b08 });

    // Grid layout for stacked cliff dwellings inside recess & tiered down
    const tiers = [
        { level: 0, baseY: 8, baseZ: -25, rows: 4, cols: 9, boxH: 7 },
        { level: 1, baseY: 15, baseZ: -30, rows: 3, cols: 8, boxH: 6.5 },
        { level: 2, baseY: 21.5, baseZ: -34, rows: 2, cols: 6, boxH: 6 },
        { level: 3, baseY: 27.5, baseZ: -38, rows: 1, cols: 4, boxH: 5.5 }
    ];

    tiers.forEach(tier => {
        for (let c = 0; c < tier.cols; c++) {
            for (let r = 0; r < tier.rows; r++) {
                // Random variation in room size for authentic organic feel
                const width = 6 + Math.random() * 2;
                const depth = 6 + Math.random() * 2;
                const height = tier.boxH;

                const posX = (c - tier.cols / 2) * 7.5 + (Math.random() - 0.5) * 1.5;
                const posZ = tier.baseZ - (r * 6) + (Math.random() - 0.5) * 1;
                const posY = tier.baseY + (height / 2);

                // Room block
                const roomGeo = new THREE.BoxGeometry(width, height, depth);
                const roomMesh = new THREE.Mesh(roomGeo, adobeMat);
                roomMesh.position.set(posX, posY, posZ);
                roomMesh.castShadow = true;
                roomMesh.receiveShadow = true;
                scene.add(roomMesh);

                // 1. Protruding Viga Beams (Support logs)
                const vigaCount = Math.floor(width / 1.8);
                for (let v = 0; v < vigaCount; v++) {
                    const vigaGeo = new THREE.CylinderGeometry(0.2, 0.22, depth + 1.8, 8);
                    vigaGeo.rotateX(Math.PI / 2);
                    const viga = new THREE.Mesh(vigaGeo, vigaWoodMat);
                    viga.position.set(
                        posX - (width / 2) + 0.9 + (v * 1.6),
                        posY + (height / 2) - 0.5,
                        posZ
                    );
                    viga.castShadow = true;
                    scene.add(viga);
                }

                // 2. Authentic T-Shaped Doorways & Ventilation Ports
                if (r === 0 && Math.random() > 0.3) {
                    // T-Door Top (Wide)
                    const tTop = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.8), darkInteriorMat);
                    tTop.position.set(posX, posY + 0.4, posZ + (depth / 2) + 0.02);
                    scene.add(tTop);
                    // T-Door Bottom (Narrow)
                    const tBot = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.2), darkInteriorMat);
                    tBot.position.set(posX, posY - 0.5, posZ + (depth / 2) + 0.02);
                    scene.add(tBot);
                } else if (Math.random() > 0.5) {
                    // Small square vent port
                    const vent = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), darkInteriorMat);
                    vent.position.set(posX + (width / 4), posY + (height / 4), posZ + (depth / 2) + 0.02);
                    scene.add(vent);
                }
            }
        }
    });

    // 3. Wooden Access Ladders
    createLadder(-25, 8, -20, -23, 15, -27);
    createLadder(15, 8, -20, 13, 15, -27);
    createLadder(-5, 15, -27, -4, 21.5, -32);
}

function createLadder(x1, y1, z1, x2, y2, z2) {
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x4a3222, roughness: 0.9 });
    const group = new THREE.Group();

    // Side poles
    const poleGeo = new THREE.CylinderGeometry(0.12, 0.12, 10, 6);
    const p1 = new THREE.Mesh(poleGeo, woodMat);
    const p2 = new THREE.Mesh(poleGeo, woodMat);
    p1.position.set(-0.6, 0, 0);
    p2.position.set(0.6, 0, 0);
    group.add(p1, p2);

    // Rungs
    for (let r = -4; r <= 4; r += 1.2) {
        const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.3, 6), woodMat);
        rung.rotateZ(Math.PI / 2);
        rung.position.set(0, r, 0);
        group.add(rung);
    }

    // Orient group between points
    group.position.set((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2);
    group.lookAt(x2, y2, z2);
    group.rotateX(Math.PI / 4); // Angle ladder against wall
    scene.add(group);
}

// --- Subterranean Kivas (Ceremonial Structures) ---
function createKivas() {
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x8a6b52, roughness: 0.9 });
    const timberMat = new THREE.MeshStandardMaterial({ color: 0x2e1d14, roughness: 0.8 });

    const kivaPositions = [
        { x: -18, z: -8, radius: 6 },
        { x: 12, z: -5, radius: 7.5 }
    ];

    kivaPositions.forEach(k => {
        // Subterranean Outer Stone Ring Wall
        const wallGeo = new THREE.CylinderGeometry(k.radius, k.radius, 3.5, 32, 1, true);
        const wall = new THREE.Mesh(wallGeo, stoneMat);
        wall.position.set(k.x, 3.5 / 2, k.z);
        wall.receiveShadow = true;
        scene.add(wall);

        // Circular Stone Bench inside floor
        const benchGeo = new THREE.CylinderGeometry(k.radius - 0.8, k.radius - 0.8, 0.6, 32);
        const bench = new THREE.Mesh(benchGeo, stoneMat);
        bench.position.set(k.x, 0.3, k.z);
        scene.add(bench);

        // Timber-Cribbed Roof Beams (Radiating cribbed wood framework)
        const roofGroup = new THREE.Group();
        const beamCount = 10;
        for (let i = 0; i < beamCount; i++) {
            const angle = (i / beamCount) * Math.PI * 2;
            const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, k.radius * 1.8), timberMat);
            beam.rotation.y = angle;
            beam.rotation.z = Math.PI / 2;
            beam.position.set(k.x, 3.6, k.z);
            roofGroup.add(beam);
        }
        scene.add(roofGroup);

        // Center Square Hatch Entryway with Ladder Top
        const hatchMat = new THREE.MeshBasicMaterial({ color: 0x0a0705 });
        const hatch = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 2.5), hatchMat);
        hatch.rotateX(-Math.PI / 2);
        hatch.position.set(k.x, 3.7, k.z);
        scene.add(hatch);
    });
}

// --- Hydraulic Engineering (Reservoir, Canals & Check-Dams) ---
function createHydraulicSystem() {
    // Water Material with Animated Flow Shader Look
    waterMaterial = new THREE.MeshStandardMaterial({
        color: 0x2a6f7d,
        roughness: 0.1,
        metalness: 0.8,
        transparent: true,
        opacity: 0.85
    });

    const clayMat = new THREE.MeshStandardMaterial({ color: 0x735a4a, roughness: 0.95 });

    // 1. Upper Mesa Clay-Lined Hand-Dug Reservoir (Far View style)
    const resRimGeo = new THREE.TorusGeometry(18, 2.5, 12, 32);
    const resRim = new THREE.Mesh(resRimGeo, clayMat);
    resRim.rotateX(Math.PI / 2);
    resRim.position.set(-60, 78, -60);
    resRim.castShadow = true;
    scene.add(resRim);

    const waterGeo = new THREE.CircleGeometry(17.5, 32);
    const reservoirWater = new THREE.Mesh(waterGeo, waterMaterial);
    reservoirWater.rotateX(-Math.PI / 2);
    reservoirWater.position.set(-60, 77.8, -60);
    scene.add(reservoirWater);

    // 2. Distributary Canal Network (Winding down from mesa to fields)
    const canalCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-60, 77, -42),
        new THREE.Vector3(-55, 55, -25),
        new THREE.Vector3(-45, 35, -10),
        new THREE.Vector3(-30, 15, 10),
        new THREE.Vector3(-10, 2, 40),
        new THREE.Vector3(40, 0, 80)
    ]);

    const canalGeo = new THREE.TubeGeometry(canalCurve, 64, 1.2, 8, false);
    const canalWater = new THREE.Mesh(canalGeo, waterMaterial);
    canalWater.position.y -= 0.3;
    scene.add(canalWater);

    // Stone Sluice Gates along canal
    const gateGeo = new THREE.BoxGeometry(0.4, 3, 2.5);
    const stoneGateMat = new THREE.MeshStandardMaterial({ color: 0x54493f, roughness: 0.9 });
    const gate1 = new THREE.Mesh(gateGeo, stoneGateMat);
    gate1.position.set(-30, 15, 10);
    scene.add(gate1);

    // 3. Erosion Check-Dams along slope contours
    for (let i = 0; i < 5; i++) {
        const checkDam = new THREE.Mesh(new THREE.BoxGeometry(12, 1.8, 2), stoneGateMat);
        checkDam.position.set(-40 + i * 8, 10 - i * 2, 5 + i * 12);
        checkDam.rotation.y = Math.PI / 6;
        checkDam.castShadow = true;
        scene.add(checkDam);
    }
}

// --- Botanically Accurate Agriculture ---
function createAgriculture() {
    // 1. "Three Sisters" Companion Planting (Corn, Beans, Squash)
    const cornGroup = new THREE.Group();
    const stalkMat = new THREE.MeshStandardMaterial({ color: 0x5c8a32, roughness: 0.7 });
    const squashMat = new THREE.MeshStandardMaterial({ color: 0x3d5e20, roughness: 0.8 });

    // Stalk Geometry
    const stalkGeo = new THREE.CylinderGeometry(0.08, 0.12, 4.5, 6);
    const leafGeo = new THREE.PlaneGeometry(1.2, 0.4);

    for (let row = 0; row < 12; row++) {
        for (let col = 0; col < 18; col++) {
            const x = 10 + col * 4 + (Math.random() - 0.5);
            const z = 30 + row * 4 + (Math.random() - 0.5);

            // Corn Stalk (Trellis)
            const stalk = new THREE.Mesh(stalkGeo, stalkMat);
            stalk.position.set(x, 2.25, z);
            stalk.castShadow = true;
            cornGroup.add(stalk);

            // Leaves attached to stalk
            for (let l = 0; l < 3; l++) {
                const leaf = new THREE.Mesh(leafGeo, stalkMat);
                leaf.position.set(x, 1.5 + l * 0.9, z);
                leaf.rotation.y = (l * Math.PI) / 1.5;
                leaf.rotation.z = 0.4;
                cornGroup.add(leaf);
            }

            // Low-lying Squash broad leaves (Living Mulch on ground)
            const squash = new THREE.Mesh(new THREE.CircleGeometry(1.6, 6), squashMat);
            squash.rotateX(-Math.PI / 2);
            squash.position.set(x + 0.8, 0.1, z + 0.8);
            cornGroup.add(squash);
        }
    }
    scene.add(cornGroup);

    // 2. Waffle Gardens (Sun-dried mud grids near domestic quarters for herbs/tobacco)
    const waffleGrid = new THREE.Group();
    const mudRimMat = new THREE.MeshStandardMaterial({ color: 0x9e653d, roughness: 0.9 });

    for (let gx = 0; gx < 4; gx++) {
        for (let gz = 0; gz < 6; gz++) {
            const wx = 35 + gx * 3.5;
            const wz = -10 + gz * 3.5;

            // Sunken Cell Border
            const cell = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.3, 3.2), mudRimMat);
            cell.position.set(wx, 0.15, wz);
            waffleGrid.add(cell);
        }
    }
    scene.add(waffleGrid);
}

// --- Smoke Particle Effects (Kivas & Domestic Fires) ---
function createSmokeSystem() {
    const pCount = 60;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(pCount * 3);

    for (let i = 0; i < pCount; i++) {
        pPos[i * 3] = -18 + (Math.random() - 0.5) * 1.5; // Kiva 1 location
        pPos[i * 3 + 1] = 3.8 + Math.random() * 12;
        pPos[i * 3 + 2] = -8 + (Math.random() - 0.5) * 1.5;
    }

    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));

    const pMat = new THREE.PointsMaterial({
        color: 0xe6d3c3,
        size: 1.2,
        transparent: true,
        opacity: 0.35,
        depthWrite: false
    });

    const particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);
    smokeParticles.push(particles);
}

// --- Animation Loop ---
function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    const time = clock.getElapsedTime();

    // 1. Water Ripple Animation
    if (waterMaterial) {
        waterMaterial.opacity = 0.8 + Math.sin(time * 2) * 0.05;
    }

    // 2. Smoke Particles Rising & Drifting in Desert Wind
    smokeParticles.forEach(p => {
        const positions = p.geometry.attributes.position.array;
        for (let i = 0; i < positions.length / 3; i++) {
            positions[i * 3 + 1] += delta * 2.5; // Rise
            positions[i * 3] += Math.sin(time + i) * 0.03; // Drift
            if (positions[i * 3 + 1] > 20) {
                positions[i * 3 + 1] = 3.8;
                positions[i * 3] = -18 + (Math.random() - 0.5) * 1.5;
            }
        }
        p.geometry.attributes.position.needsUpdate = true;
    });

    // 3. First-Person Walk Mode Physics & Collision Movement
    if (isWalkMode) {
        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;

        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        direction.normalize();

        const speed = isRunning ? 40.0 : 18.0;

        if (moveForward || moveBackward) velocity.z -= direction.z * speed * delta;
        if (moveLeft || moveRight) velocity.x -= direction.x * speed * delta;

        walkControls.moveRight(-velocity.x * delta);
        walkControls.moveForward(-velocity.z * delta);

        // Terrain Elevation Clamping (Player Walk Height ~1.7m above ground level)
        const currentPos = walkControls.getObject().position;
        let groundY = getTerrainHeight(currentPos.x, currentPos.z);
        currentPos.y = groundY + 1.7; // Keep camera at human eye-level above ground/pueblo levels
    } else {
        orbitControls.update();
    }

    renderer.render(scene, camera);
}

// --- Helper: Sample Terrain & Pueblo Ground Elevation ---
function getTerrainHeight(x, z) {
    // Check if walking on pueblo structures
    if (z < -15 && z > -50 && Math.abs(x) < 40) {
        if (z < -35) return 27.5;
        if (z < -30) return 21.5;
        if (z < -25) return 15.0;
        return 8.0;
    }
    // Check Mesa height
    if (z < -50) return 75.0;

    // Valley floor level
    return Math.max(0, Math.sin(x * 0.02) * Math.cos(z * 0.02) * 3 - (x * 0.03));
}

// --- Dynamic Walk Overlay & UI Controller ---
function createWalkOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'walk-instructions';
    overlay.style.cssText = `
        position: absolute;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(28, 21, 18, 0.88);
        border: 1px solid #c26a38;
        color: #f1e5d1;
        padding: 12px 24px;
        border-radius: 30px;
        font-size: 0.85rem;
        pointer-events: auto;
        cursor: pointer;
        box-shadow: 0 4px 20px rgba(0,0,0,0.6);
        text-align: center;
        z-index: 20;
    `;
    overlay.innerHTML = `<strong>Click Here to Walk Around Site</strong> (WASD + Mouse | Shift to Run | ESC to Exit)`;
    document.body.appendChild(overlay);

    overlay.addEventListener('click', () => {
        walkControls.lock();
    });
}

function setupUIControls() {
    // Toggle Lighting Mode (Golden Hour vs Midday Sunlight)
    const btnSunlight = document.getElementById('btn-sunlight');
    if (btnSunlight) {
        btnSunlight.addEventListener('click', () => {
            if (lightingMode === 'goldenHour') {
                lightingMode = 'midday';
                dirLight.position.set(0, 180, 0);
                dirLight.intensity = 3.2;
                dirLight.color.setHex(0xffffff);
                scene.background.setHex(0xa8c8e6);
                scene.fog.color.setHex(0xa8c8e6);
            } else {
                lightingMode = 'goldenHour';
                dirLight.position.set(160, 50, 120);
                dirLight.intensity = 2.8;
                dirLight.color.setHex(0xffb05b);
                scene.background.setHex(0xe0a96d);
                scene.fog.color.setHex(0xd19359);
            }
        });
    }

    // Toggle Water Flow Canal Opacity
    const btnWater = document.getElementById('btn-water');
    if (btnWater) {
        btnWater.addEventListener('click', () => {
            if (waterMaterial) {
                waterMaterial.opacity = waterMaterial.opacity > 0.3 ? 0.15 : 0.85;
            }
        });
    }
}

// --- Window Resize Handler ---
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
