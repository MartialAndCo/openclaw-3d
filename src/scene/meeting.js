import * as THREE from 'three';
import { state } from '../state.js';
import { createLabel } from '../labels.js';
import { createOfficeChair } from './furniture.js';

export function createMeetingArea() {
    // War Room - front left (bottom left corner), moved inward for visibility
    const group = new THREE.Group();
    group.position.set(-8, 0, 3);

    // Smaller table
    const tableTop = new THREE.Mesh(
        new THREE.CylinderGeometry(1.2, 1.2, 0.05, 8),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 })
    );
    tableTop.position.y = 0.75;
    tableTop.castShadow = true;
    tableTop.receiveShadow = true;
    group.add(tableTop);

    const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25, 0.3, 0.75),
        new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.5 })
    );
    leg.position.y = 0.375;
    group.add(leg);

    // 6 chairs - all facing the center of the table
    for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const cx = Math.cos(angle) * 1.6;
        const cz = Math.sin(angle) * 1.6;
        // To face center: rotation = PI/2 - angle (vector math: atan2(cos, sin))
        const chairRotation = Math.PI / 2 - angle;
        createOfficeChair(group, cx, 0, cz, 0x888888, chairRotation);
    }

    state.scene.add(group);
    createLabel(-8, 2, 3, 'War Room', 0x666666);
}

export function createLoungeArea() {
    // Coffee area - back right
    const group = new THREE.Group();
    group.position.set(10, 0, -6);

    // Small coffee table
    const table = new THREE.Mesh(
        new THREE.CylinderGeometry(0.6, 0.6, 0.04),
        new THREE.MeshStandardMaterial({ color: 0x333333 })
    );
    table.position.y = 0.35;
    table.castShadow = true;
    group.add(table);

    // Simple legs
    [0, Math.PI / 2, Math.PI, -Math.PI / 2].forEach(angle => {
        const lx = Math.cos(angle) * 0.4;
        const lz = Math.sin(angle) * 0.4;
        const leg = new THREE.Mesh(
            new THREE.CylinderGeometry(0.025, 0.025, 0.35),
            new THREE.MeshStandardMaterial({ color: 0x222222 })
        );
        leg.position.set(lx, 0.175, lz);
        group.add(leg);
    });

    // Small sofa
    const sofa = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 0.35, 0.5),
        new THREE.MeshStandardMaterial({ color: 0x4a5568, roughness: 0.9 })
    );
    sofa.position.set(0, 0.175, -0.8);
    sofa.castShadow = true;
    group.add(sofa);

    // Coffee machine
    const machine = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.4, 0.3),
        new THREE.MeshStandardMaterial({ color: 0x111111 })
    );
    machine.position.set(-0.8, 0.2, -0.8);
    group.add(machine);

    state.scene.add(group);
    createLabel(10, 2, -6, 'Coffee Corner', 0x8b5cf6);
}
