import * as THREE from 'three';
import { state } from '../state.js';

function createParquetTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    // Wood colors
    const woodColors = ['#d4c4a8', '#c9b896', '#bea684', '#d1c2a0'];

    const plankWidth = 64;  // pixels
    const plankLength = 512; // pixels
    const cols = Math.ceil(canvas.width / plankLength) + 1;
    const rows = Math.ceil(canvas.height / plankWidth) + 1;

    // Draw planks
    for (let row = 0; row < rows; row++) {
        const xOffset = (row % 2 === 0) ? 0 : plankLength / 2;
        for (let col = -1; col < cols; col++) {
            const x = col * plankLength + xOffset;
            const y = row * plankWidth;
            const color = woodColors[(col + row) % woodColors.length];

            ctx.fillStyle = color;
            ctx.fillRect(x + 1, y + 1, plankLength - 2, plankWidth - 2);

            // Add subtle grain
            ctx.fillStyle = 'rgba(0,0,0,0.05)';
            for (let i = 0; i < 5; i++) {
                const gy = y + Math.random() * plankWidth;
                ctx.fillRect(x, gy, plankLength, 1);
            }
        }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 2);
    return texture;
}

export function createRoom() {
    // Floor 24m x 12m - Wood parquet flooring (optimized with texture)
    const floorGeometry = new THREE.PlaneGeometry(24, 12);
    const floorMaterial = new THREE.MeshStandardMaterial({
        map: createParquetTexture(),
        roughness: 0.6,
        metalness: 0.0
    });

    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.01;
    floor.receiveShadow = true;
    state.scene.add(floor);

    const grid = new THREE.GridHelper(24, 24, 0xbbbbbb, 0xbbbbbb);
    grid.position.y = 0.005;
    grid.material.opacity = 0.15;
    grid.material.transparent = true;
    state.scene.add(grid);

    // Diorama base (Socle géant sombre)
    const baseGeometry = new THREE.PlaneGeometry(150, 150);
    const baseMaterial = new THREE.MeshStandardMaterial({
        color: 0x1f2937, // dark gray
        roughness: 0.9,
        metalness: 0.1
    });

    // Le socle est très grand et juste en dessous du niveau de l'herbe/sol (-0.05)
    const baseFloor = new THREE.Mesh(baseGeometry, baseMaterial);
    baseFloor.rotation.x = -Math.PI / 2;
    baseFloor.position.y = -0.05;
    baseFloor.receiveShadow = true;
    state.scene.add(baseFloor);

    const wallMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.6 });

    // Back wall (behind camera, at positive Z) - with door opening
    // Door dimensions: 1.2m wide x 2.2m tall, positioned at center
    const doorWidth = 1.2;
    const doorHeight = 2.2;
    const wallWidth = 24;
    const wallHeight = 4;
    const wallZ = 6;

    // Left segment of back wall
    const backWallSegmentWidth = (wallWidth - doorWidth) / 2;
    const backLeftWall = new THREE.Mesh(
        new THREE.BoxGeometry(backWallSegmentWidth, wallHeight, 0.15),
        wallMat
    );
    backLeftWall.position.set(-(wallWidth / 2 - backWallSegmentWidth / 2), wallHeight / 2, wallZ);
    backLeftWall.receiveShadow = true;
    backLeftWall.castShadow = true;
    state.scene.add(backLeftWall);

    // Right segment of back wall
    const backRightWall = new THREE.Mesh(
        new THREE.BoxGeometry(backWallSegmentWidth, wallHeight, 0.15),
        wallMat
    );
    backRightWall.position.set((wallWidth / 2 - backWallSegmentWidth / 2), wallHeight / 2, wallZ);
    backRightWall.receiveShadow = true;
    backRightWall.castShadow = true;
    state.scene.add(backRightWall);

    // Lintel (above door)
    const lintelHeight = wallHeight - doorHeight;
    const lintel = new THREE.Mesh(
        new THREE.BoxGeometry(doorWidth, lintelHeight, 0.15),
        wallMat
    );
    lintel.position.set(0, doorHeight + lintelHeight / 2, wallZ);
    lintel.receiveShadow = true;
    lintel.castShadow = true;
    state.scene.add(lintel);

    // Door frame
    const frameThickness = 0.08;
    const frameDepth = 0.18;
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.4 });

    // Left frame
    const leftFrame = new THREE.Mesh(
        new THREE.BoxGeometry(frameThickness, doorHeight, frameDepth),
        frameMat
    );
    leftFrame.position.set(-doorWidth / 2 + frameThickness / 2, doorHeight / 2, wallZ);
    leftFrame.castShadow = true;
    state.scene.add(leftFrame);

    // Right frame
    const rightFrame = new THREE.Mesh(
        new THREE.BoxGeometry(frameThickness, doorHeight, frameDepth),
        frameMat
    );
    rightFrame.position.set(doorWidth / 2 - frameThickness / 2, doorHeight / 2, wallZ);
    rightFrame.castShadow = true;
    state.scene.add(rightFrame);

    // Top frame
    const topFrame = new THREE.Mesh(
        new THREE.BoxGeometry(doorWidth + frameThickness * 2, frameThickness, frameDepth),
        frameMat
    );
    topFrame.position.set(0, doorHeight - frameThickness / 2, wallZ);
    topFrame.castShadow = true;
    state.scene.add(topFrame);

    // Door panel (slightly recessed)
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.5 });
    const doorPanel = new THREE.Mesh(
        new THREE.BoxGeometry(doorWidth - 0.05, doorHeight - frameThickness, 0.06),
        doorMat
    );
    doorPanel.name = 'door';
    doorPanel.position.set(0, (doorHeight - frameThickness) / 2, wallZ - 0.04);
    doorPanel.castShadow = true;
    doorPanel.receiveShadow = true;
    state.scene.add(doorPanel);

    // Door handle
    const handleMat = new THREE.MeshStandardMaterial({ color: 0xc0c0c0, metalness: 0.8, roughness: 0.2 });
    const handle = new THREE.Mesh(
        new THREE.SphereGeometry(0.04),
        handleMat
    );
    handle.position.set(0.4, doorHeight / 2, wallZ - 0.02);
    state.scene.add(handle);

    // Left wall
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.15, 4, 12), wallMat);
    leftWall.position.set(-12, 2, 0);
    leftWall.receiveShadow = true;
    state.scene.add(leftWall);

    // Right wall
    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.15, 4, 12), wallMat);
    rightWall.position.set(12, 2, 0);
    rightWall.receiveShadow = true;
    state.scene.add(rightWall);

    // Plants in corners (adjusted for smaller room)
    createPlant(-11, 0, -5);
    createPlant(11, 0, -5);
    createPlant(-11, 0, 5);
    createPlant(11, 0, 5);

    // Tableau "chat" sur le mur gauche
    createCatPainting(-11.9, 2.2, -1, Math.PI / 2);

    // Tableau "chat" sur le mur droit (variation tabby gris)
    createCatPainting(11.9, 2.2, 1, -Math.PI / 2);
}

function createCatPainting(x, y, z, rotationY = Math.PI / 2) {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    // Canvas texture representing a cat
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Background - warm beige
    ctx.fillStyle = '#f0e8d8';
    ctx.fillRect(0, 0, 256, 256);

    // Subtle gradient bg
    const grad = ctx.createRadialGradient(128, 128, 20, 128, 128, 140);
    grad.addColorStop(0, '#fff8f0');
    grad.addColorStop(1, '#e8d5b8');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    // Cat body (low-poly style polygons)
    ctx.fillStyle = '#8b7355';
    // Main body
    ctx.beginPath();
    ctx.moveTo(88, 190);
    ctx.lineTo(168, 190);
    ctx.lineTo(178, 160);
    ctx.lineTo(128, 145);
    ctx.lineTo(78, 160);
    ctx.closePath();
    ctx.fill();

    // Belly highlight
    ctx.fillStyle = '#c4a882';
    ctx.beginPath();
    ctx.moveTo(105, 185);
    ctx.lineTo(151, 185);
    ctx.lineTo(158, 165);
    ctx.lineTo(128, 155);
    ctx.lineTo(98, 165);
    ctx.closePath();
    ctx.fill();

    // Head
    ctx.fillStyle = '#8b7355';
    ctx.beginPath();
    ctx.moveTo(88, 148);
    ctx.lineTo(128, 135);
    ctx.lineTo(168, 148);
    ctx.lineTo(162, 115);
    ctx.lineTo(128, 108);
    ctx.lineTo(94, 115);
    ctx.closePath();
    ctx.fill();

    // Left ear
    ctx.fillStyle = '#8b7355';
    ctx.beginPath();
    ctx.moveTo(100, 120);
    ctx.lineTo(88, 95);
    ctx.lineTo(116, 108);
    ctx.closePath();
    ctx.fill();

    // Right ear
    ctx.beginPath();
    ctx.moveTo(156, 120);
    ctx.lineTo(168, 95);
    ctx.lineTo(140, 108);
    ctx.closePath();
    ctx.fill();

    // Inner ears (pink)
    ctx.fillStyle = '#e8a0a0';
    ctx.beginPath();
    ctx.moveTo(102, 116);
    ctx.lineTo(92, 99);
    ctx.lineTo(112, 109);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(154, 116);
    ctx.lineTo(164, 99);
    ctx.lineTo(144, 109);
    ctx.closePath();
    ctx.fill();

    // Face - muzzle
    ctx.fillStyle = '#d4b896';
    ctx.beginPath();
    ctx.ellipse(128, 128, 18, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#2d5a1b';
    ctx.beginPath();
    ctx.ellipse(113, 118, 7, 8, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(143, 118, 7, 8, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Eye pupils
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.ellipse(113, 118, 3, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(143, 118, 3, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eye shine
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.ellipse(115, 115, 2, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(145, 115, 2, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Nose
    ctx.fillStyle = '#e88080';
    ctx.beginPath();
    ctx.moveTo(128, 126);
    ctx.lineTo(123, 131);
    ctx.lineTo(133, 131);
    ctx.closePath();
    ctx.fill();

    // Whiskers
    ctx.strokeStyle = 'rgba(80,60,40,0.6)';
    ctx.lineWidth = 1.2;
    // Left whiskers
    ctx.beginPath(); ctx.moveTo(110, 130); ctx.lineTo(75, 124); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(110, 132); ctx.lineTo(75, 132); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(110, 134); ctx.lineTo(75, 140); ctx.stroke();
    // Right whiskers
    ctx.beginPath(); ctx.moveTo(146, 130); ctx.lineTo(181, 124); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(146, 132); ctx.lineTo(181, 132); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(146, 134); ctx.lineTo(181, 140); ctx.stroke();

    // Tail (curved to the right and up)
    ctx.strokeStyle = '#8b7355';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(168, 185);
    ctx.bezierCurveTo(200, 180, 210, 150, 190, 130);
    ctx.stroke();
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#a0896b';
    ctx.stroke();

    // Legs
    ctx.fillStyle = '#8b7355';
    ctx.beginPath(); ctx.roundRect(98, 185, 18, 22, 4); ctx.fill();
    ctx.beginPath(); ctx.roundRect(140, 185, 18, 22, 4); ctx.fill();
    ctx.fillStyle = '#c4a882';
    ctx.beginPath(); ctx.roundRect(100, 198, 14, 10, 3); ctx.fill();
    ctx.beginPath(); ctx.roundRect(142, 198, 14, 10, 3); ctx.fill();

    // Label "chat" at bottom
    ctx.fillStyle = 'rgba(80, 55, 30, 0.7)';
    ctx.font = 'italic bold 18px serif';
    ctx.textAlign = 'center';
    ctx.fillText('chat', 128, 242);

    const texture = new THREE.CanvasTexture(canvas);

    // Painting canvas mesh
    const paintingGeo = new THREE.PlaneGeometry(1.4, 1.4);
    const paintingMat = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.8 });
    const painting = new THREE.Mesh(paintingGeo, paintingMat);
    painting.rotation.y = Math.PI / 2; // Face inward (towards +X)
    painting.name = 'painting_chat';
    group.add(painting);

    // Frame (4 bars around)
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.5, metalness: 0.1 });
    const frameThick = 0.07;
    const frameDepth = 0.06;
    const fw = 1.4;
    const fh = 1.4;

    // Top bar
    const topBar = new THREE.Mesh(new THREE.BoxGeometry(frameDepth, frameThick, fw + frameThick * 2), frameMat);
    topBar.rotation.y = Math.PI / 2;
    topBar.position.set(0.01, fh / 2 + frameThick / 2, 0);
    group.add(topBar);

    // Bottom bar
    const bottomBar = new THREE.Mesh(new THREE.BoxGeometry(frameDepth, frameThick, fw + frameThick * 2), frameMat);
    bottomBar.rotation.y = Math.PI / 2;
    bottomBar.position.set(0.01, -fh / 2 - frameThick / 2, 0);
    group.add(bottomBar);

    // Left bar
    const leftBar = new THREE.Mesh(new THREE.BoxGeometry(frameDepth, fh + frameThick * 2, frameThick), frameMat);
    leftBar.rotation.y = Math.PI / 2;
    leftBar.position.set(0.01, 0, -fw / 2 - frameThick / 2);
    group.add(leftBar);

    // Right bar
    const rightBar = new THREE.Mesh(new THREE.BoxGeometry(frameDepth, fh + frameThick * 2, frameThick), frameMat);
    rightBar.rotation.y = Math.PI / 2;
    rightBar.position.set(0.01, 0, fw / 2 + frameThick / 2);
    group.add(rightBar);

    state.scene.add(group);
}

export function createPlant(x, y, z) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.3, 8),
        new THREE.MeshStandardMaterial({ color: 0x8b6914 }));
    pot.position.y = 0.15;
    group.add(pot);
    const leaves = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6),
        new THREE.MeshStandardMaterial({ color: 0x2d8a2d }));
    leaves.position.y = 0.55;
    group.add(leaves);
    state.scene.add(group);
}
