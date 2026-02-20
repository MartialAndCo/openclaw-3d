import * as THREE from 'three';
import { state } from '../state.js';

export function createLights() {
    state.scene.add(new THREE.AmbientLight(0xffffff, 0.5));

    const sun = new THREE.DirectionalLight(0xfff5e0, 1.0);
    sun.position.set(10, 15, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 60;
    sun.shadow.camera.left = -12;
    sun.shadow.camera.right = 12;
    sun.shadow.camera.top = 6;
    sun.shadow.camera.bottom = -6;
    sun.shadow.bias = -0.001;
    state.scene.add(sun);

    const fill = new THREE.DirectionalLight(0xd0e8ff, 0.3);
    fill.position.set(-8, 6, -5);
    state.scene.add(fill);
}
