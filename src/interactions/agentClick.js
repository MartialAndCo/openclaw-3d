import * as THREE from 'three';
import { state } from '../state.js';
import { zoomOnAgent, zoomOnScreen, resetCameraToGlobalView } from './cameraAnimator.js';
import { openAgentPanel, closeAgentPanel, isAgentPanelOpen } from '../ui/agentPanel.js';
import { isEditorActive } from '../editor.js';
import { isWarRoomActive, endWarRoomMode } from './warRoomMode.js';

/**
 * Système de détection de clic sur les agents
 * Utilise un Raycaster pour détecter les interactions
 */

let raycaster = null;
let mouse = null;
let clickables = []; // Liste des objets cliquables (agents et écrans)
let isInitialized = false;
let isZoomedOnScreen = false;

/**
 * Initialise le système de clic sur agents
 */
export function initAgentClickSystem() {
    if (isInitialized) return;

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // Écouter les clics sur le canvas
    const canvas = document.getElementById('canvas');
    canvas.addEventListener('click', onCanvasClick);
    canvas.addEventListener('mousemove', onCanvasMouseMove);

    // Charger la liste des agents cliquables
    refreshClickableAgents();

    isInitialized = true;
    console.log('[AgentClick] Système initialisé');
}

/**
 * Rafraîchit la liste des agents cliquables depuis la scène
 */
export function refreshClickableAgents() {
    clickables = [];

    state.scene.traverse((obj) => {
        // Détecter les modèles d'employés (FBX chargés)
        if (obj.userData && obj.userData.employeeName) {
            // Ajouter tous les meshes de ce modèle comme cliquables
            obj.traverse((child) => {
                if (child.isMesh) {
                    child.userData.isAgent = true;
                    child.userData.agentData = {
                        name: obj.userData.employeeName,
                        role: obj.userData.role || 'Agent',
                        department: obj.userData.department || 'Unknown',
                        model: obj // Référence au modèle parent
                    };
                    clickables.push(child);
                }
            });
        }

        // Détecter les écrans géants
        if (obj.userData && obj.userData.isScreenPanel) {
            obj.traverse((child) => {
                if (child.isMesh) {
                    child.userData.isScreen = true;
                    child.userData.screenData = {
                        id: obj.userData.screenId,
                        title: obj.userData.screenTitle,
                        model: obj
                    };
                    clickables.push(child);
                }
            });
        }
    });

    console.log(`[AgentClick] ${clickables.length} meshes cliquables trouvés`);
}

/**
 * Ajoute un agent à la liste des cliquables (appelé quand un employé est chargé)
 */
export function registerClickableAgent(model, name, role = 'Agent', department = 'Unknown') {
    model.userData.employeeName = name;
    model.userData.role = role;
    model.userData.department = department;

    model.traverse((child) => {
        if (child.isMesh) {
            child.userData.isAgent = true;
            child.userData.agentData = {
                name: name,
                role: role,
                department: department,
                model: model
            };
            clickables.push(child);
        }
    });
}

/**
 * Gestionnaire de clic sur le canvas
 */
function onCanvasClick(event) {
    // Ignorer si on clique sur un élément UI (overlay ou panneau agent)
    if (event.target.closest('.ui-overlay') || event.target.closest('#agent-panel')) {
        return;
    }

    // ⚠️ IMPORTANT : Ne pas interférer avec l'éditeur
    // Si l'éditeur est actif (sélection bureau, mode route, mode sim), on désactive le clic agent
    if (isEditorActive()) {
        return;
    }

    // Calculer la position normalisée de la souris
    const rect = state.renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Lancer le raycaster
    raycaster.setFromCamera(mouse, state.camera);
    const intersects = raycaster.intersectObjects(clickables, false);

    if (intersects.length > 0) {
        const clicked = intersects[0].object;

        if (clicked.userData.isAgent) {
            const agentData = clicked.userData.agentData;
            if (agentData) {
                console.log('[AgentClick] Agent cliqué:', agentData.name);
                handleAgentClick(agentData, clicked);
            }
        } else if (clicked.userData.isScreen) {
            const screenData = clicked.userData.screenData;
            if (screenData) {
                console.log('[AgentClick] Écran cliqué:', screenData.title);
                handleScreenClick(screenData, clicked);
            }
        }
    } else {
        // 📍 CLIC AILLEURS : Si le panneau agent est ouvert, on le ferme, sinon on dézoome l'écran ou le war room
        if (isAgentPanelOpen()) {
            console.log('[AgentClick] Clic ailleurs - fermeture panneau agent');
            closeAgentPanel();
        } else if (isZoomedOnScreen) {
            console.log('[AgentClick] Clic ailleurs - dézoom écran');
            resetCameraToGlobalView();
            isZoomedOnScreen = false;
        } else if (isWarRoomActive()) {
            console.log('[AgentClick] Clic ailleurs - fermeture war room');
            endWarRoomMode();
        }
    }
}

/**
 * Gestionnaire de mouvement souris (pour le curseur)
 */
function onCanvasMouseMove(event) {
    if (!raycaster || !mouse) return;

    // Ne pas changer le curseur si l'éditeur est actif
    if (isEditorActive()) {
        document.getElementById('canvas').style.cursor = 'default';
        return;
    }

    const rect = state.renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, state.camera);
    const intersects = raycaster.intersectObjects(clickables, false);

    const canvas = document.getElementById('canvas');
    if (intersects.length > 0) {
        canvas.style.cursor = 'pointer';
    } else {
        canvas.style.cursor = 'default';
    }
}

/**
 * Gère le clic sur un agent
 */
function handleAgentClick(agentData, mesh) {
    // Zoom sur l'agent
    zoomOnAgent(agentData.model, () => {
        // Ouvrir le panneau avec les infos
        openAgentPanel({
            name: agentData.name,
            role: agentData.role,
            department: agentData.department
        });
        if (isZoomedOnScreen) {
            isZoomedOnScreen = false;
        }
    });
}

/**
 * Gère le clic sur un écran
 */
function handleScreenClick(screenData, mesh) {
    if (isAgentPanelOpen()) {
        closeAgentPanel();
    }

    // Zoom sur l'écran
    zoomOnScreen(screenData.model, () => {
        isZoomedOnScreen = true;
    });
}

/**
 * Vérifie si un point est cliqué (pour debug)
 */
export function debugRaycaster() {
    console.log('[AgentClick] Clickables:', clickables.length);
    console.log('[AgentClick] Liste:', clickables.map(c => c.userData.agentData?.name || c.userData.screenData?.title));
}
