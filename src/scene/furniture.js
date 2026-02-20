import * as THREE from 'three';
import { state, updateLoadingProgress } from '../state.js';
import { DEPARTMENTS, CEO } from '../config.js';
import { createLabel } from '../labels.js';
import { loadSeatedEmployeeAtDesk, loadCEOWithAnimation } from '../characters/index.js';
import { registerDesk } from '../editor.js';

// Config par défaut chargée au démarrage
let defaultLayout = null;

// Matériaux partagés pour optimiser la mémoire GPU
const SHARED_MATERIALS = {
    deskLeg: new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.6, roughness: 0.3 }),
    keyboard: new THREE.MeshStandardMaterial({ color: 0x2d2d2d, roughness: 0.5 }),
    mouseBody: new THREE.MeshStandardMaterial({ color: 0x2d2d2d, roughness: 0.4 }),
    mouseButtons: new THREE.MeshStandardMaterial({ color: 0x3d3d3d, roughness: 0.5 }),
    scrollWheel: new THREE.MeshStandardMaterial({ color: 0x666666 }),
    cable: new THREE.MeshStandardMaterial({ color: 0x111111 }),
    monitorStand: new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.4 }),
    monitorBezel: new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.3, metalness: 0.2 }),
    screenGlow: new THREE.MeshStandardMaterial({
        color: 0x2dd4bf, emissive: 0x0d9488, emissiveIntensity: 0.8, roughness: 0.2, metalness: 0.1
    }),
    screenGlare: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.15 }),
    namePlateBase: new THREE.MeshStandardMaterial({ metalness: 0.3 }),
    pyramid: new THREE.MeshStandardMaterial({
        color: 0xffd700, metalness: 0.8, roughness: 0.2, emissive: 0xffa500, emissiveIntensity: 0.3
    }),
    ball: new THREE.MeshStandardMaterial({ color: 0xffffff, emissiveIntensity: 1 }),
    ceoDesk: new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.3 }),
    ceoLeg: new THREE.MeshStandardMaterial({ color: 0x3d2817, metalness: 0.3, roughness: 0.5 }),
    ceoScreen: new THREE.MeshStandardMaterial({
        color: 0x3b82f6, emissive: 0x1d4ed8, emissiveIntensity: 0.8, roughness: 0.2, metalness: 0.1
    }),
    ceoScreenGlare: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.1 })
};

export async function createOfficeLayout() {
    // Charger le layout par défaut s'il existe
    try {
        const response = await fetch('default-layout.json');
        if (response.ok) {
            defaultLayout = await response.json();
            console.log('[Layout] Config par défaut chargée:', defaultLayout.desks.length, 'bureaux');
        }
    } catch (e) {
        console.log('[Layout] Pas de config par défaut, utilisation des positions de secours');
    }

    if (defaultLayout) {
        // Utiliser les positions sauvegardées
        createLayoutFromConfig(defaultLayout);
    } else {
        // Fallback sur les positions par défaut
        createDefaultLayout();
    }
}

function createLayoutFromConfig(config) {
    // Créer d'abord tous les bureaux avec les positions du JSON
    config.desks.forEach(deskConfig => {
        const { id, role, position, rotation, department } = deskConfig;

        if (role === 'Orchestrator') {
            // CEO
            createCEOPlatform(position.x, position.y, position.z, rotation?.y || 0);
        } else if (department) {
            // Trouver le département et l'occupant
            const dept = DEPARTMENTS.find(d => d.name === department);
            if (dept) {
                const isHead = role === dept.head.role;
                const occupant = isHead ? dept.head : dept.agents.find(a => a.name === id);

                if (occupant) {
                    createDeskWithRotation(position.x, position.y, position.z, occupant, dept.color, isHead, dept, rotation?.y || 0);
                    if (isHead) {
                        createLabel(position.x, 2.5, position.z, `${dept.name} - ${role}`, dept.color);
                    }
                }
            }
        }
    });
}

function createDefaultLayout() {
    // CEO au fond
    createCEOPlatform(0, 0, 4);

    const headZ = 1;
    const agentZ1 = -1;
    const agentZ2 = -3;

    const deptPositions = [
        { dept: DEPARTMENTS[0], x: -8 },
        { dept: DEPARTMENTS[1], x: -4 },
        { dept: DEPARTMENTS[2], x: 0 },
        { dept: DEPARTMENTS[3], x: 4 },
        { dept: DEPARTMENTS[4], x: 8 }
    ];

    deptPositions.forEach(({ dept, x }) => {
        createDesk(x, 0, headZ, dept.head, dept.color, true, dept);
        createLabel(x, 2.5, headZ, `${dept.name} - ${dept.head.role}`, dept.color);

        const agentCount = dept.agents.length;
        if (agentCount <= 2) {
            dept.agents.forEach((agent, i) => {
                const offsetX = agentCount === 1 ? 0 : (i === 0 ? -1.2 : 1.2);
                createDesk(x + offsetX, 0, agentZ1, agent, dept.color, false, dept);
            });
        } else {
            dept.agents.forEach((agent, i) => {
                if (i < 2) {
                    const offsetX = i === 0 ? -1.2 : 1.2;
                    createDesk(x + offsetX, 0, agentZ1, agent, dept.color, false, dept);
                } else {
                    const remainingIndex = i - 2;
                    const offsetX = remainingIndex === 0 ? -1.2 : (remainingIndex === 1 ? 0 : 1.2);
                    createDesk(x + offsetX, 0, agentZ2, agent, dept.color, false, dept);
                }
            });
        }
    });
}

export function createCEOPlatform(x, y, z, rotationY = 0) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    group.rotation.y = rotationY;

    const deskY = 0.75;
    const desk = new THREE.Mesh(new THREE.BoxGeometry(2, 0.06, 1.2), SHARED_MATERIALS.ceoDesk);
    desk.position.y = deskY;
    desk.castShadow = true;
    desk.receiveShadow = true;
    group.add(desk);

    // Desk legs
    const legPositions = [[-0.8, -0.4], [0.8, -0.4], [-0.8, 0.4], [0.8, 0.4]];
    legPositions.forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.75, 0.08), SHARED_MATERIALS.ceoLeg);
        leg.position.set(lx, 0.375, lz);
        group.add(leg);
    });

    // Chair - derrière le bureau (côté open space)
    const chairZ = 0.7;
    createExecutiveChair(group, 0, 0, chairZ);

    // Load CEO avec animation séquentielle
    loadCEOWithAnimation(group, chairZ);

    // ========== CEO ULTRAWIDE MONITOR SETUP ==========
    const monitorZ = 0.15;  // Reculé de 0.35 à 0.15 (plus loin du CEO)
    const screenWidth = 1.0;  // Un seul grand écran large
    const screenHeight = 0.35;

    // Stand base
    const standBase = new THREE.Mesh(
        new THREE.BoxGeometry(0.25, 0.015, 0.15),
        SHARED_MATERIALS.monitorStand
    );
    standBase.position.set(0, deskY + 0.02, monitorZ);
    group.add(standBase);

    // Stand neck
    const standNeck = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.2, 0.03),
        SHARED_MATERIALS.monitorStand
    );
    standNeck.position.set(0, deskY + 0.11, monitorZ - 0.04);
    group.add(standNeck);

    // Bezel frame
    const bezel = new THREE.Mesh(
        new THREE.BoxGeometry(screenWidth + 0.025, screenHeight + 0.025, 0.02),
        SHARED_MATERIALS.monitorBezel
    );
    bezel.position.set(0, deskY + 0.35, monitorZ);
    group.add(bezel);

    // Back panel
    const backPanel = new THREE.Mesh(
        new THREE.BoxGeometry(screenWidth * 0.95, screenHeight * 0.9, 0.025),
        SHARED_MATERIALS.monitorBezel
    );
    backPanel.position.set(0, deskY + 0.35, monitorZ - 0.02);
    group.add(backPanel);

    // Lit screen (ultrawide)
    const display = new THREE.Mesh(
        new THREE.PlaneGeometry(screenWidth * 0.94, screenHeight * 0.9),
        SHARED_MATERIALS.ceoScreen
    );
    display.position.set(0, deskY + 0.35, monitorZ + 0.011);
    group.add(display);

    // Glare reflection
    const glare = new THREE.Mesh(
        new THREE.PlaneGeometry(screenWidth * 0.3, screenHeight * 0.25),
        SHARED_MATERIALS.ceoScreenGlare
    );
    glare.position.set(-screenWidth * 0.25, deskY + 0.4, monitorZ + 0.012);
    glare.rotation.z = -0.25;
    group.add(glare);

    // ========== CEO KEYBOARD (simplified) ==========
    const kbWidth = 0.4;
    const kbDepth = 0.14;
    const kbZ = 0.4;

    const keyboard = new THREE.Mesh(
        new THREE.BoxGeometry(kbWidth, 0.015, kbDepth),
        SHARED_MATERIALS.keyboard
    );
    keyboard.position.set(0, 0.765, kbZ);
    group.add(keyboard);

    // ========== CEO MOUSE ==========
    const mouseGroup = new THREE.Group();
    mouseGroup.position.set(0.28, 0.77, kbZ);

    const mouseBody = new THREE.Mesh(
        new THREE.BoxGeometry(0.065, 0.028, 0.095),
        SHARED_MATERIALS.mouseBody
    );
    mouseGroup.add(mouseBody);

    const mouseButtons = new THREE.Mesh(
        new THREE.BoxGeometry(0.045, 0.005, 0.04),
        SHARED_MATERIALS.mouseButtons
    );
    mouseButtons.position.set(0, 0.015, -0.02);
    mouseGroup.add(mouseButtons);

    const scrollWheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.004, 0.004, 0.018),
        SHARED_MATERIALS.scrollWheel
    );
    scrollWheel.rotation.z = Math.PI / 2;
    scrollWheel.position.set(0, 0.016, -0.02);
    mouseGroup.add(scrollWheel);
    group.add(mouseGroup);

    // Mouse cable
    const cableCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.28, 0.77, kbZ - 0.05),
        new THREE.Vector3(0.32, 0.77, kbZ - 0.1),
        new THREE.Vector3(0.3, 0.755, 0)
    ]);
    const cableGeo = new THREE.TubeGeometry(cableCurve, 8, 0.003, 4, false);
    const cable = new THREE.Mesh(cableGeo, SHARED_MATERIALS.cable);
    group.add(cable);

    createLabel(x, 2.2, z, 'CEO - Orchestrator', 0xf97316);

    state.scene.add(group);

    const deskData = {
        position: { x, y: deskY, z },
        occupant: CEO,
        type: 'CEO'
    };
    state.desks.push(deskData);

    // Register for editor
    group.userData.isDesk = true;
    group.userData.deskData = deskData;
    group.userData.originalPosition = group.position.clone();
}

function createDesk(x, y, z, occupant, color, isHead, dept) {
    createDeskWithRotation(x, y, z, occupant, color, isHead, dept, 0);
}

function createDeskWithRotation(x, y, z, occupant, color, isHead, dept, rotationY) {
    const deskGroup = new THREE.Group();
    deskGroup.position.set(x, y, z);
    deskGroup.rotation.y = rotationY;

    const deskWidth = isHead ? 1.6 : 1.3;
    const deskDepth = isHead ? 0.8 : 0.65;

    // Desktop
    const topMat = new THREE.MeshStandardMaterial({
        color: isHead ? 0xf5f0e8 : 0xffffff,
        roughness: 0.5
    });
    const top = new THREE.Mesh(
        new THREE.BoxGeometry(deskWidth, 0.05, deskDepth),
        topMat
    );
    top.position.y = 0.75;
    top.castShadow = true;
    top.receiveShadow = true;
    deskGroup.add(top);

    // Legs (using shared material)
    const legX = deskWidth / 2 - 0.1;
    const legZ = deskDepth / 2 - 0.1;
    [[-legX, -legZ], [legX, -legZ], [-legX, legZ], [legX, legZ]].forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.75, 0.04), SHARED_MATERIALS.deskLeg);
        leg.position.set(lx, 0.375, lz);
        leg.castShadow = true;
        deskGroup.add(leg);
    });

    // ========== MONITOR SETUP ==========
    const screenSize = isHead ? 0.5 : 0.4;
    const bezelThickness = 0.02;
    const screenDepth = 0.015;
    const monitorZ = -deskDepth / 3;

    // Monitor stand base (rectangular base)
    const standBase = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 0.015, 0.12),
        SHARED_MATERIALS.monitorStand
    );
    standBase.position.set(0, 0.76, monitorZ);
    deskGroup.add(standBase);

    // Monitor stand neck
    const standNeck = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, 0.18, 0.02),
        SHARED_MATERIALS.monitorStand
    );
    standNeck.position.set(0, 0.85, monitorZ - 0.02);
    deskGroup.add(standNeck);

    // Monitor bezel (frame around screen)
    const bezelWidth = screenSize + bezelThickness * 2;
    const bezelHeight = screenSize * 0.6 + bezelThickness * 2;
    const bezel = new THREE.Mesh(
        new THREE.BoxGeometry(bezelWidth, bezelHeight, 0.02),
        SHARED_MATERIALS.monitorBezel
    );
    bezel.position.set(0, 1.02, monitorZ);
    deskGroup.add(bezel);

    // Monitor back panel
    const backPanel = new THREE.Mesh(
        new THREE.BoxGeometry(screenSize * 0.9, screenSize * 0.55, 0.025),
        SHARED_MATERIALS.monitorBezel
    );
    backPanel.position.set(0, 1.02, monitorZ - 0.02);
    deskGroup.add(backPanel);

    // Screen (lit display)
    const screenDisplay = new THREE.Mesh(
        new THREE.PlaneGeometry(screenSize * 0.92, screenSize * 0.55),
        SHARED_MATERIALS.screenGlow
    );
    screenDisplay.position.set(0, 1.02, monitorZ + 0.011);
    deskGroup.add(screenDisplay);

    // Screen reflection/glare plane
    const glare = new THREE.Mesh(
        new THREE.PlaneGeometry(screenSize * 0.4, screenSize * 0.2),
        SHARED_MATERIALS.screenGlare
    );
    glare.position.set(-screenSize * 0.2, 1.05, monitorZ + 0.012);
    glare.rotation.z = -0.3;
    deskGroup.add(glare);

    // ========== KEYBOARD (simplified) ==========
    const kbWidth = isHead ? 0.35 : 0.3;
    const kbDepth = isHead ? 0.12 : 0.1;

    const keyboard = new THREE.Mesh(
        new THREE.BoxGeometry(kbWidth, 0.015, kbDepth),
        SHARED_MATERIALS.keyboard
    );
    keyboard.position.set(0, 0.765, -0.05);
    deskGroup.add(keyboard);

    // ========== MOUSE ==========
    const mouseGroup = new THREE.Group();
    mouseGroup.position.set(kbWidth / 2 + 0.08, 0.77, -0.05);

    // Mouse body
    const mouseBody = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.025, 0.09),
        SHARED_MATERIALS.mouseBody
    );
    mouseGroup.add(mouseBody);

    // Mouse buttons (line between them)
    const mouseButtons = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.005, 0.035),
        SHARED_MATERIALS.mouseButtons
    );
    mouseButtons.position.set(0, 0.013, -0.02);
    mouseGroup.add(mouseButtons);

    // Mouse scroll wheel
    const scrollWheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.004, 0.004, 0.015),
        SHARED_MATERIALS.scrollWheel
    );
    scrollWheel.rotation.z = Math.PI / 2;
    scrollWheel.position.set(0, 0.014, -0.02);
    mouseGroup.add(scrollWheel);

    // Mouse cable
    const cableCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(kbWidth / 2 + 0.08, 0.77, -0.09),
        new THREE.Vector3(kbWidth / 2 + 0.1, 0.77, -0.15),
        new THREE.Vector3(kbWidth / 2 + 0.05, 0.755, -0.25)
    ]);
    const cableGeo = new THREE.TubeGeometry(cableCurve, 8, 0.003, 4, false);
    const cable = new THREE.Mesh(cableGeo, SHARED_MATERIALS.cable);
    deskGroup.add(cable);

    deskGroup.add(mouseGroup);

    // Chair - derrière le bureau (positive Z)
    const chairZ = deskDepth / 2 + 0.25;
    createOfficeChair(deskGroup, 0, 0, chairZ, color);

    // L'employé sera chargé dynamiquement si actif (voir main.js initRealtimeSystem)
    // On stocke juste la référence pour le spawn ultérieur
    deskGroup.userData.pendingEmployee = {
        name: occupant.name,
        chairZ: chairZ,
        isHead: isHead
    };

    // Name plate
    const plateMat = SHARED_MATERIALS.namePlateBase.clone();
    plateMat.color.setHex(color);
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.02, 0.08), plateMat);
    plate.position.set(0.4, 0.78, deskDepth / 2 - 0.08);
    deskGroup.add(plate);

    // Signe distinctif pour les HEADS (pyramide dorée sur le bureau)
    if (isHead) {
        // Pyramide dorée
        const pyramidGeo = new THREE.ConeGeometry(0.08, 0.15, 4);
        const pyramid = new THREE.Mesh(pyramidGeo, SHARED_MATERIALS.pyramid);
        pyramid.position.set(-0.5, 0.75 + 0.075, 0); // Sur le bureau, côté gauche
        pyramid.rotation.y = Math.PI / 4; // Aligner la base
        deskGroup.add(pyramid);

        // Petit poteau lumineux
        const poleGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.3);
        const poleMat = SHARED_MATERIALS.namePlateBase.clone();
        poleMat.color.setHex(color);
        poleMat.emissive.setHex(color);
        poleMat.emissiveIntensity = 0.5;
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.set(-0.5, 0.75 + 0.15, 0);
        deskGroup.add(pole);

        // Sphère au sommet
        const ballGeo = new THREE.SphereGeometry(0.04);
        const ballMat = SHARED_MATERIALS.ball.clone();
        ballMat.emissive.setHex(color);
        const ball = new THREE.Mesh(ballGeo, ballMat);
        ball.position.set(-0.5, 0.75 + 0.3, 0);
        deskGroup.add(ball);
    }

    state.scene.add(deskGroup);

    const deskData = {
        position: { x, y: 0.75, z },
        occupant: occupant,
        department: dept
    };
    state.desks.push(deskData);

    // Register for editor
    deskGroup.userData.isDesk = true;
    deskGroup.userData.deskData = deskData;
    deskGroup.userData.originalPosition = deskGroup.position.clone();
}

export function createOfficeChair(group, x, y, z, color, rotationY = 0) {
    const chairGroup = new THREE.Group();
    chairGroup.position.set(x, y, z);
    chairGroup.rotation.y = rotationY;

    const chairMat = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.7
    });

    // Seat
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.06, 0.45), chairMat);
    seat.position.set(0, 0.5, 0);
    chairGroup.add(seat);

    // Back - face vers -Z par défaut (devant)
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.5, 0.05), chairMat);
    back.position.set(0, 0.75, 0.2);
    chairGroup.add(back);

    // Base
    const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.22, 0.04, 5),
        new THREE.MeshStandardMaterial({ color: 0x333333 })
    );
    base.position.set(0, 0.02, 0);
    chairGroup.add(base);

    // Stem
    const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.035, 0.45),
        new THREE.MeshStandardMaterial({ color: 0x666666 })
    );
    stem.position.set(0, 0.25, 0);
    chairGroup.add(stem);

    group.add(chairGroup);
}

export function createExecutiveChair(group, x, y, z) {
    const chairMat = new THREE.MeshStandardMaterial({
        color: 0x3d2817,
        roughness: 0.5
    });

    // Seat
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.08, 0.65), chairMat);
    seat.position.set(x, y + 0.5, z);
    group.add(seat);

    // Back
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.7, 0.08), chairMat);
    back.position.set(x, y + 0.85, z + 0.28);
    group.add(back);

    // Armrests
    [-0.35, 0.35].forEach(ax => {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.4), chairMat);
        arm.position.set(x + ax, y + 0.7, z);
        group.add(arm);
        const support = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.18, 0.04), chairMat);
        support.position.set(x + ax, y + 0.6, z + 0.15);
        group.add(support);
    });

    // Base
    const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.28, 0.04, 5),
        new THREE.MeshStandardMaterial({ color: 0x222222 })
    );
    base.position.set(x, y + 0.02, z);
    group.add(base);

    // Stem
    const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.045, 0.045, 0.45),
        new THREE.MeshStandardMaterial({ color: 0x444444 })
    );
    stem.position.set(x, y + 0.25, z);
    group.add(stem);
}
