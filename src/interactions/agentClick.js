import * as THREE from 'three';
import { state } from '../state.js';
import { zoomOnAgent, zoomOnScreen, resetCameraToGlobalView, superZoomOnScreen, zoomOnCEOScreen } from './cameraAnimator.js';
import { openAgentPanel, closeAgentPanel, isAgentPanelOpen } from '../ui/agentPanel.js';
import { setScreenZoomState, getScreenCanvas } from '../ui/screenWall.js';
import { isEditorActive } from '../editor.js';
import { isWarRoomActive, endWarRoomMode } from './warRoomMode.js';
import { renderActivityKanban } from '../ui/activityKanban.js';
import { renderTokensDashboard } from '../ui/tokensDashboard.js';
import { renderTasksDashboard } from '../ui/tasksDashboard.js';
import { renderCronDashboard } from '../ui/cronDashboard.js';
import { renderSystemDashboard } from '../ui/systemDashboard.js';
import { renderChatDashboard } from '../ui/chatDashboard.js';

/**
 * Système de détection de clic sur les agents
 * Utilise un Raycaster pour détecter les interactions
 */

let raycaster = null;
let mouse = null;
let clickables = []; // Liste des objets cliquables (agents et écrans)
let isInitialized = false;
let isZoomedOnScreen = false;
let isZoomedOnAgent = false;
let currentZoomedScreenId = null;

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
                handleScreenClick(screenData, clicked, intersects[0].uv);
            }
        }
    } else {
        // 📍 CLIC AILLEURS : fermetures
        if (isAgentPanelOpen()) {
            console.log('[AgentClick] Clic ailleurs - fermeture panneau agent');
            closeAgentPanel();
        } else if (isZoomedOnScreen) {
            console.log('[AgentClick] Clic ailleurs - dézoom écran');
            resetCameraToGlobalView();
            isZoomedOnScreen = false;
            currentZoomedScreenId = null;
            setScreenZoomState(null, false); // Clear all zoomed screens
        } else if (isZoomedOnAgent) {
            console.log('[AgentClick] Clic ailleurs - dézoom agent');
            resetCameraToGlobalView();
            isZoomedOnAgent = false;
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
    if (agentData.name === 'CEO') {
        const ceoGroup = agentData.model.parent;
        if (isAgentPanelOpen()) closeAgentPanel();

        zoomOnCEOScreen(ceoGroup, () => {
            isZoomedOnAgent = true;
            if (isZoomedOnScreen) {
                setScreenZoomState(null, false);
                isZoomedOnScreen = false;
                currentZoomedScreenId = null;
            }
            // On ouvre le tableau de bord Système une fois l'animation de caméra terminée
            open2DFullscreen('system');
        });
        return;
    }

    zoomOnAgent(agentData.model, () => {
        isZoomedOnAgent = true;
        if (isZoomedOnScreen) {
            setScreenZoomState(null, false);
            isZoomedOnScreen = false;
            currentZoomedScreenId = null;
        }
    });

    // Ouvrir le panneau d'agent
    openAgentPanel(agentData);
}

/**
 * Gère le clic sur un écran.
 * Ouvre directement le dashboard HTML interactif après le zoom.
 */
function handleScreenClick(screenData, mesh, uv) {
    if (isAgentPanelOpen()) closeAgentPanel();

    // Prevent double clicking on the same screen
    if (isZoomedOnScreen && currentZoomedScreenId === screenData.id) {
        return;
    }

    // Clic sur l'écran → Zoom normal puis ouverture de l'UI HTML riche
    zoomOnScreen(screenData.model, () => {
        isZoomedOnScreen = true;
        isZoomedOnAgent = false;
        currentZoomedScreenId = screenData.id;
        setScreenZoomState(screenData.id, true);

        open2DFullscreen(screenData.id);
    });
}

/**
 * Ouvre le dashboard en plein écran 2D.
 * Plus de faux titlebar HTML : on affiche juste l'image nette 4K du canvas
 * et on détecte les UV (u,v) du clic dessus pour les boutons natifs macOS.
 */
function open2DFullscreen(screenId) {
    const canvas = getScreenCanvas(screenId);
    if (!canvas) return;

    // Supprimer un éventuel overlay déjà ouvert
    const old = document.getElementById('fullscreen-dashboard-overlay');
    if (old) old.remove();

    // Overlay container -> fond très sombre pour mettre le dashboard en valeur
    const overlay = document.createElement('div');
    overlay.id = 'fullscreen-dashboard-overlay';
    Object.assign(overlay.style, {
        position: 'fixed',
        top: '0', left: '0',
        width: '100vw', height: '100vh',
        backgroundColor: '#f1f5f9', // Light background matching Kanban board
        zIndex: '99999',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        userSelect: 'none'
    });

    const closeCb = () => {
        console.log('[macOS 2D] ● Red - Quitter fullscreen et retour pièce');
        overlay.remove();
        resetCameraToGlobalView();
        isZoomedOnScreen = false;
        isZoomedOnAgent = false;
        currentZoomedScreenId = null;
        setScreenZoomState(null, false);
    };

    const minCb = () => {
        console.log('[macOS 2D] ● Yellow - Fermer fullscreen (retour zoom 3D)');
        overlay.remove();
    };

    if (screenId === 'activity') {
        renderActivityKanban(overlay, closeCb, minCb);
    } else if (screenId === 'tokens') {
        renderTokensDashboard(overlay, closeCb, minCb);
    } else if (screenId === 'tasks') {
        renderTasksDashboard(overlay, closeCb, minCb);
    } else if (screenId === 'cron') {
        renderCronDashboard(overlay, closeCb, minCb);
    } else if (screenId === 'system') {
        renderSystemDashboard(overlay, closeCb, minCb);
    } else if (screenId === 'chat') {
        renderChatDashboard(overlay, closeCb, minCb);
    }

    document.body.appendChild(overlay);
}

/**
 * Vérifie si un point est cliqué (pour debug)
 */
export function debugRaycaster() {
    console.log('[AgentClick] Clickables:', clickables.length);
    console.log('[AgentClick] Liste:', clickables.map(c => c.userData.agentData?.name));
}
