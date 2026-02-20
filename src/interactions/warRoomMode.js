import * as THREE from 'three';
import { state } from '../state.js';
import { zoomOnWarRoom, resetCameraToGlobalView } from './cameraAnimator.js';
import { openWarRoomPanel, closeWarRoomPanel, participantArrived } from '../ui/warRoomPanel.js';
import { startWarRoomMeeting, endWarRoomMeeting } from './warRoomMeeting.js';

/**
 * Système d'activation du War Room
 * Gère le clic sur la table et le mode réunion
 */

let warRoomZone = null;
let raycaster = null;
let mouse = null;
let isInWarRoomMode = false;
let isInitialized = false;

/**
 * Initialise la zone cliquable du War Room
 */
export function initWarRoomInteraction() {
    if (isInitialized) return;

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // Créer une zone invisible cliquable pour la table
    // Position de la table: (-8, 0, 3)
    const zoneGeometry = new THREE.CylinderGeometry(2, 2, 0.1, 16);
    const zoneMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.0 // Invisible
    });
    
    warRoomZone = new THREE.Mesh(zoneGeometry, zoneMaterial);
    warRoomZone.position.set(-8, 0.05, 3); // Légèrement au-dessus du sol
    warRoomZone.userData.isWarRoomZone = true;
    
    state.scene.add(warRoomZone);

    // Écouter les clics
    const canvas = document.getElementById('canvas');
    canvas.addEventListener('click', onWarRoomClick);
    canvas.addEventListener('mousemove', onWarRoomMouseMove);

    isInitialized = true;
    console.log('[WarRoomMode] Zone cliquable initialisée');
}

/**
 * Gestionnaire de clic sur la zone War Room
 */
function onWarRoomClick(event) {
    // Ignorer si déjà en mode War Room ou si on clique sur UI
    if (isInWarRoomMode) return;
    if (event.target.closest('.ui-overlay') || event.target.closest('#warroom-panel')) {
        return;
    }

    // Calculer position souris
    const rect = state.renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Raycaster
    raycaster.setFromCamera(mouse, state.camera);
    const intersects = raycaster.intersectObject(warRoomZone, false);

    if (intersects.length > 0) {
        console.log('[WarRoomMode] War Room activé');
        activateWarRoomMode();
    }
}

/**
 * Gestionnaire de mouvement souris
 */
function onWarRoomMouseMove(event) {
    if (isInWarRoomMode || !warRoomZone) return;

    const rect = state.renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, state.camera);
    const intersects = raycaster.intersectObject(warRoomZone, false);

    const canvas = document.getElementById('canvas');
    if (intersects.length > 0) {
        canvas.style.cursor = 'pointer';
        // Optionnel: effet visuel hover
        warRoomZone.material.opacity = 0.1;
    } else {
        canvas.style.cursor = 'default';
        warRoomZone.material.opacity = 0.0;
    }
}

/**
 * Active le mode préparation War Room
 * Ouvre le panel avec le bouton "Démarrer"
 */
function activateWarRoomMode() {
    isInWarRoomMode = true;

    // Zoom caméra
    zoomOnWarRoom(() => {
        // Ouvrir le panneau en mode préparation
        openWarRoomPanel({
            onStartMeeting: onStartMeetingClicked,
            onEndMeeting: endWarRoomMode
        });
    });

    // Dispatcher un événement
    window.dispatchEvent(new CustomEvent('warroom-mode-activated'));
}

/**
 * Appelé quand on clique sur "Démarrer la réunion"
 */
function onStartMeetingClicked() {
    console.log('[WarRoomMode] Démarrage de la réunion demandé');
    
    // Lancer l'animation de tous les participants
    // Callback 1: quand un participant arrive (met à jour l'UI)
    // Callback 2: quand tous sont arrivés
    startWarRoomMeeting(
        (name, role) => {
            participantArrived(name, role);
        },
        () => {
            console.log('[WarRoomMode] Tous les participants sont arrivés');
        }
    );
}

/**
 * Termine le mode réunion
 */
export function endWarRoomMode() {
    if (!isInWarRoomMode) return;

    console.log('[WarRoomMode] Fin de la réunion');
    
    // Arrêter la réunion et renvoyer les participants
    endWarRoomMeeting();
    
    closeWarRoomPanel();
    
    // Retour vue globale
    resetCameraToGlobalView(() => {
        isInWarRoomMode = false;
        window.dispatchEvent(new CustomEvent('warroom-mode-deactivated'));
    });
}

/**
 * Vérifie si on est en mode War Room
 */
export function isWarRoomActive() {
    return isInWarRoomMode;
}

/**
 * Active/désactive manuellement
 */
export function toggleWarRoomMode() {
    if (isInWarRoomMode) {
        endWarRoomMode();
    } else {
        activateWarRoomMode();
    }
}
