import * as THREE from 'three';
import { state } from './state.js';

export function createLabel(x, y, z, text, color) {
    const labelDiv = document.createElement('div');
    labelDiv.className = 'dept-label';
    labelDiv.innerHTML = `<span style="color: #${color.toString(16).padStart(6, '0')}">●</span> ${text}`;
    document.getElementById('labels-container').appendChild(labelDiv);

    state.labels.push({
        element: labelDiv,
        position: new THREE.Vector3(x, y, z),
        type: 'dept'
    });
}

/**
 * Crée un label pour un écran du mur d'écrans
 */
export function createScreenLabel(text, x, y, z, color = null) {
    const labelDiv = document.createElement('div');
    labelDiv.className = 'screen-label';
    labelDiv.textContent = text;
    if (color) {
        labelDiv.style.borderColor = `#${color.toString(16).padStart(6, '0')}`;
    }
    document.getElementById('labels-container').appendChild(labelDiv);

    state.labels.push({
        element: labelDiv,
        position: new THREE.Vector3(x, y, z),
        type: 'screen'
    });
}

export function updateLabels() {
    if (!state.camera) return;

    state.labels.forEach(label => {
        const screenPos = label.position.clone().project(state.camera);
        const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-screenPos.y * 0.5 + 0.5) * window.innerHeight;

        // Hide if behind camera
        if (screenPos.z > 1) {
            label.element.style.opacity = '0';
        } else {
            label.element.style.opacity = '1';
            label.element.style.setProperty('--x', `${x}px`);
            label.element.style.setProperty('--y', `${y}px`);
        }
    });
}
