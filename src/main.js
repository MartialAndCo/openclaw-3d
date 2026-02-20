import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { state, setTotalEmployees } from './state.js';
import { createLights } from './scene/lights.js';
import { createRoom } from './scene/room.js';
import { createOfficeLayout } from './scene/furniture.js';
import { createMeetingArea } from './scene/meeting.js';
import { updateLabels } from './labels.js';
import { initEditor, updateEditor } from './editor.js';
import { ceoAnimator } from './characters/ceoAnimator.js';
import { ALL_ROUTES } from './routes.js';

// Infrastructure UI & Interactions
import { initAgentPanel } from './ui/agentPanel.js';
import { initWarRoomPanel } from './ui/warRoomPanel.js';
import { createScreenWall, animateScreens, bindToRealtimeData, updateAllScreenContentsPosition } from './ui/screenWall.js';
import { initAgentClickSystem, refreshClickableAgents } from './interactions/agentClick.js';
import { initWarRoomInteraction } from './interactions/warRoomMode.js';
import { updateCameraAnimation } from './interactions/cameraAnimator.js';

// API Gateway - Données temps réel OpenClaw
import { gateway } from './api/gateway.js';
import { delegationTracker } from './api/delegationTracker.js';
import { dataAdapter } from './api/dataAdapter.js';
import { presenceManager } from './api/presenceManager.js';

// Module de test (à retirer en production)
import './testAPI.js';

async function init() {
    state.scene = new THREE.Scene();
    state.scene.background = new THREE.Color(0x111827);

    state.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
    // Camera in FRONT (positive Z), looking at CEO at Z=0
    state.camera.position.set(0, 13, 8);
    state.camera.lookAt(0, 1, 0);

    const canvas = document.getElementById('canvas');
    state.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    state.renderer.setSize(window.innerWidth, window.innerHeight);
    state.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    state.renderer.shadowMap.enabled = true;
    state.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    state.renderer.outputColorSpace = THREE.SRGBColorSpace;

    state.controls = new OrbitControls(state.camera, state.renderer.domElement);
    state.controls.enableDamping = true;
    state.controls.dampingFactor = 0.05;
    state.controls.maxPolarAngle = Math.PI / 2.1;
    state.controls.minDistance = 0.5;
    state.controls.maxDistance = 80;
    state.controls.target.set(0, 1, 0);

    createLights();
    createRoom();
    await createOfficeLayout(); // Charger le layout par défaut
    createMeetingArea();

    // Infrastructure - Mur d'écrans
    createScreenWall();

    // Infrastructure - UI Panels
    initAgentPanel();
    initWarRoomPanel();

    // Infrastructure - Interactions
    initAgentClickSystem();
    initWarRoomInteraction();

    // Init editor
    initEditor();

    // Charger les routes prédéfinies
    loadPredefinedRoutes();

    // Initialiser le système de données temps réel
    initRealtimeSystem();

    // All 19 employees (CEO + 5 Heads + 13 Agents) are loaded by createCEOPlatform and createDeskInGroup
    // No need to load separately - they are all seated at their desks

    window.addEventListener('resize', onResize);
    animate();

    // Rafraîchir la liste des agents cliquables après le chargement complet
    setTimeout(() => {
        refreshClickableAgents();
        console.log('[Main] Système d\'interaction initialisé');
    }, 2000);

    document.getElementById('info-status').textContent = 'OpenClaw HQ Active | Loading employees based on activity...';
    document.getElementById('info-status').style.color = '#4ade80';

    // Debug helpers — accessible from browser console
    window._state = state;
    window._debugRotateHeads = function (extraRad) {
        let count = 0;
        state.scene.traverse(o => {
            const skinId = o.userData && o.userData.skinId;
            if (skinId && skinId !== 'base') {
                o.rotation.y += extraRad;
                console.log(`Rotated "${o.userData.employeeName}" (${skinId}) → rotation.y = ${o.rotation.y.toFixed(3)} rad (${(o.rotation.y * 180 / Math.PI).toFixed(1)}°)`);
                count++;
            }
        });
        console.log(`Rotated ${count} non-base characters by ${(extraRad * 180 / Math.PI).toFixed(0)}°`);
    };
    console.log('[Debug] Use _debugRotateHeads(Math.PI/2) to rotate Heads by 90°');
}

function loadPredefinedRoutes() {
    // Dispatcher les routes prédéfinies pour qu'elles soient ajoutées à l'éditeur
    ALL_ROUTES.forEach(route => {
        window.dispatchEvent(new CustomEvent('route-created-2d', {
            detail: {
                route: {
                    id: route.id,
                    name: route.name,
                    startName: route.startName,
                    endName: route.endName,
                    points: route.points,
                    finalOrientation: route.finalOrientation,
                    line: null,
                    markers: null
                },
                line: null,
                markers: null
            }
        }));
    });

    console.log(`[Main] ${ALL_ROUTES.length} routes prédéfinies chargées`);
}

/**
 * Initialise le système de données temps réel
 * Connecte le dashboard aux vraies données OpenClaw
 * Charge dynamiquement les agents actifs au démarrage
 */
function initRealtimeSystem() {
    console.log('[Main] Initialisation du système temps réel...');
    
    // 1. Connecter les écrans aux données temps réel
    bindToRealtimeData();
    
    // 2. Initialiser le tracker de délégations
    delegationTracker.initialize();
    
    // 3. Initialiser le gestionnaire de présence
    presenceManager.initialize();
    
    // 4. Charger les agents actifs au démarrage
    loadActiveAgentsOnStartup();
    
    // 5. Écouter les mises à jour de données
    gateway.on('data-updated', (data) => {
        console.log('[Main] Données mises à jour:', data);
    });
    
    gateway.on('interaction-detected', (interaction) => {
        console.log('[Main] Interaction détectée:', interaction);
    });
    
    // 6. Exposer des commandes debug
    window._gateway = gateway;
    window._delegationTracker = delegationTracker;
    window._dataAdapter = dataAdapter;
    window._presenceManager = presenceManager;
    
    console.log('[Main] Système temps réel prêt');
    console.log('[Debug] Commandes disponibles:');
    console.log('  - _delegationTracker.forceDelegation(from, to)');
    console.log('  - _presenceManager.forceLeave(agentName)');
    console.log('  - _presenceManager.forceReturn(agentName)');
}

/**
 * Charge les agents actifs au démarrage du dashboard
 * Vérifie quels agents ont des sessions actives et les charge
 */
async function loadActiveAgentsOnStartup() {
    console.log('[Main] Vérification des agents actifs...');
    
    try {
        // Récupérer les sessions actives (dernières 30 min)
        const activeSessions = await gateway.fetchActiveSessions();
        console.log('[Main] Sessions actives:', activeSessions);
        
        // Agents à charger au démarrage
        const agentsToLoad = new Set();
        
        // Toujours charger CEO et les 5 Heads
        agentsToLoad.add('CEO');
        const heads = ['Head of Biz (COO)', 'Head of Tech (CTO)', 'Head of Security (CISO)', 
                       'Head of Personal (COS)', 'Head of Growth (MB)'];
        heads.forEach(h => agentsToLoad.add(h));
        
        // Ajouter les agents actifs des sessions
        activeSessions.forEach(session => {
            if (session.agentName) {
                agentsToLoad.add(session.agentName);
            }
        });
        
        console.log(`[Main] ${agentsToLoad.size} agents à charger:`, [...agentsToLoad]);
        
        // Charger chaque agent actif
        let loadedCount = 0;
        agentsToLoad.forEach(agentName => {
            if (agentName === 'CEO') {
                // CEO déjà chargé
                loadedCount++;
                updateLoadingProgress();
            } else {
                const success = presenceManager.spawnAgent(agentName);
                if (success) loadedCount++;
            }
        });
        
        // Mettre à jour le total pour le loading screen
        setTotalEmployees(agentsToLoad.size);
        
        // Mettre à jour le statut
        document.getElementById('info-status').textContent = 
            `OpenClaw HQ Active | ${loadedCount} Employees (${loadedCount - 6} active agents)`;
        
        console.log(`[Main] ${loadedCount} agents chargés au démarrage`);
        
    } catch (error) {
        console.error('[Main] Erreur lors du chargement des agents actifs:', error);
        // Fallback: charger juste CEO + Heads
        loadMinimalStaff();
    }
}

/**
 * Charge uniquement le staff minimal (CEO + Heads) en cas d'erreur
 */
function loadMinimalStaff() {
    console.log('[Main] Chargement du staff minimal...');
    
    const heads = ['Head of Biz (COO)', 'Head of Tech (CTO)', 'Head of Security (CISO)', 
                   'Head of Personal (COS)', 'Head of Growth (MB)'];
    
    setTotalEmployees(6); // CEO + 5 Heads
    
    heads.forEach(headName => {
        presenceManager.spawnAgent(headName);
    });
}

function onResize() {
    state.camera.aspect = window.innerWidth / window.innerHeight;
    state.camera.updateProjectionMatrix();
    state.renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);

    const delta = state.clock.getDelta();
    const time = state.clock.getElapsedTime();

    // Mise à jour des contrôles et animations caméra
    state.controls.update();
    updateCameraAnimation();

    // Animations des personnages
    state.mixers.forEach(m => m.update(delta));
    ceoAnimator.update(delta);

    // Re-enforce rotation for AvatarSDK skins: the AnimationMixer may override
    // fbx.rotation.y every frame via baked root tracks. We correct it immediately after.
    // Only enforced while the character is in seated-idle mode (not walking/animating).
    state.scene.traverse(o => {
        if (o.userData && o.userData.targetRotationY !== undefined && o.userData.isSeatedIdle) {
            o.rotation.y = o.userData.targetRotationY;
        }
    });

    // Update Employee animator (si simulation en cours)
    if (window.currentEmployeeAnimator) {
        window.currentEmployeeAnimator.update(delta);
    }

    // Animations UI 3D
    animateScreens(time);

    // Mise à jour des positions des contenus d'écran
    updateAllScreenContentsPosition();

    updateLabels();
    updateEditor();
    state.renderer.render(state.scene, state.camera);
}

init();
