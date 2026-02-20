import * as THREE from 'three';
import { state } from '../state.js';

/**
 * Système d'animation fluide de la caméra
 * Gère les transitions entre vue globale et focus sur éléments
 */

const CAMERA_ANIMATION = {
    isAnimating: false,
    startPos: null,
    targetPos: null,
    startTarget: null,
    endTarget: null,
    startTime: 0,
    duration: 1500, // ms
    onComplete: null
};

/**
 * Anime la caméra vers une position cible avec un lookAt cible
 * @param {THREE.Vector3} targetPosition - Position finale de la caméra
 * @param {THREE.Vector3} lookAtTarget - Point à regarder
 * @param {number} duration - Durée en ms (défaut: 1500)
 * @param {Function} onComplete - Callback à la fin
 */
export function animateCameraTo(targetPosition, lookAtTarget, duration = 1500, onComplete = null) {
    if (CAMERA_ANIMATION.isAnimating) {
        // Interrompre l'animation en cours
        CAMERA_ANIMATION.isAnimating = false;
    }

    CAMERA_ANIMATION.startPos = state.camera.position.clone();
    CAMERA_ANIMATION.targetPos = targetPosition.clone();
    CAMERA_ANIMATION.startTarget = state.controls.target.clone();
    CAMERA_ANIMATION.endTarget = lookAtTarget.clone();
    CAMERA_ANIMATION.startTime = Date.now();
    CAMERA_ANIMATION.duration = duration;
    CAMERA_ANIMATION.onComplete = onComplete;
    CAMERA_ANIMATION.isAnimating = true;

    // Désactiver les contrôles pendant l'animation
    state.controls.enabled = false;

    console.log('[CameraAnimator] Début animation vers:', targetPosition);
}

let previousCameraPos = null;
let previousTargetPos = null;

export function saveCameraState() {
    if (!previousCameraPos) {
        previousCameraPos = state.camera.position.clone();
        previousTargetPos = state.controls.target.clone();
    }
}

export function clearCameraState() {
    previousCameraPos = null;
    previousTargetPos = null;
}

/**
 * Retourne la caméra à sa position précédente ou à la vue globale par défaut
 */
export function resetCameraToGlobalView(onComplete = null) {
    let targetPos, targetLookAt;

    if (previousCameraPos && previousTargetPos) {
        targetPos = previousCameraPos.clone();
        targetLookAt = previousTargetPos.clone();

        // Réinitialiser l'état puisqu'on y retourne
        previousCameraPos = null;
        previousTargetPos = null;
    } else {
        targetPos = new THREE.Vector3(0, 13, 8);
        targetLookAt = new THREE.Vector3(0, 1, 0);
    }

    animateCameraTo(targetPos, targetLookAt, 1200, () => {
        state.controls.enabled = true;
        if (onComplete) onComplete();
    });
}

/**
 * Zoom sur un agent spécifique
 * @param {THREE.Object3D} agentObject - L'objet 3D de l'agent
 * @param {Function} onComplete - Callback quand le zoom est terminé
 */
export function zoomOnAgent(agentObject, onComplete = null) {
    saveCameraState();

    // Obtenir la position mondiale de l'agent
    const agentPos = new THREE.Vector3();
    agentObject.getWorldPosition(agentPos);

    // Calculer une position de caméra adaptée (devant et légèrement au-dessus)
    const offset = new THREE.Vector3(2, 3, 2); // Offset relatif
    const cameraPos = agentPos.clone().add(offset);

    // LookAt légèrement au-dessus de l'agent (tête)
    const lookAtPos = agentPos.clone().add(new THREE.Vector3(0, 1.2, 0));

    animateCameraTo(cameraPos, lookAtPos, 1200, () => {
        state.controls.enabled = true;
        if (onComplete) onComplete();
    });
}

/**
 * Zoom sur un écran spécifique du mur
 * @param {THREE.Object3D} screenObject - Le groupe 3D de l'écran
 * @param {Function} onComplete - Callback quand le zoom est terminé
 */
export function zoomOnScreen(screenObject, onComplete = null) {
    saveCameraState();

    const screenPos = new THREE.Vector3();
    screenObject.getWorldPosition(screenPos);

    // L'écran est sur le mur avant (Z = 5.9), face vers l'intérieur (Z négatif)
    // On avance la caméra devant l'écran (-2.0 en Z pour un zoom plus serré)
    const cameraPos = new THREE.Vector3(screenPos.x, screenPos.y, screenPos.z - 2.0);

    // LookAt le centre de l'écran
    const lookAtPos = screenPos.clone();

    animateCameraTo(cameraPos, lookAtPos, 1200, () => {
        state.controls.enabled = true;
        if (onComplete) onComplete();
    });
}

/**
 * Zoom sur le War Room (table ronde)
 */
export function zoomOnWarRoom(onComplete = null) {
    saveCameraState();

    // Position de la table War Room: (-8, 0, 3)
    const tablePos = new THREE.Vector3(-8, 0, 3);

    // Position de caméra en hauteur et légèrement décalée pour voir toute la table
    // On la place à l'intérieur de la pièce (z=-2) plutôt que derrière le mur (z=8)
    const cameraPos = new THREE.Vector3(-5, 8, -2);

    // LookAt au centre de la table
    const lookAtPos = tablePos.clone().add(new THREE.Vector3(0, 0.5, 0));

    animateCameraTo(cameraPos, lookAtPos, 1200, () => {
        state.controls.enabled = true;
        state.controls.minDistance = 3;
        state.controls.maxDistance = 20;
        if (onComplete) onComplete();
    });
}

/**
 * Met à jour l'animation de caméra (à appeler dans la boucle principale)
 */
export function updateCameraAnimation() {
    if (!CAMERA_ANIMATION.isAnimating) return;

    const now = Date.now();
    const elapsed = now - CAMERA_ANIMATION.startTime;
    const t = Math.min(elapsed / CAMERA_ANIMATION.duration, 1);

    // Easing smooth (easeInOutCubic)
    const easeT = t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;

    // Interpoler la position de la caméra
    state.camera.position.lerpVectors(
        CAMERA_ANIMATION.startPos,
        CAMERA_ANIMATION.targetPos,
        easeT
    );

    // Interpoler le target des controls
    state.controls.target.lerpVectors(
        CAMERA_ANIMATION.startTarget,
        CAMERA_ANIMATION.endTarget,
        easeT
    );

    // Mettre à jour la caméra
    state.camera.lookAt(state.controls.target);

    if (t >= 1) {
        CAMERA_ANIMATION.isAnimating = false;
        state.controls.enabled = true;
        console.log('[CameraAnimator] Animation terminée');
        if (CAMERA_ANIMATION.onComplete) {
            CAMERA_ANIMATION.onComplete();
        }
    }
}

/**
 * Vérifie si une animation est en cours
 */
export function isCameraAnimating() {
    return CAMERA_ANIMATION.isAnimating;
}
