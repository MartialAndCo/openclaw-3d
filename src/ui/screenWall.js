import * as THREE from 'three';
import { state } from '../state.js';
import { gateway } from '../api/gateway.js';
import { dataAdapter } from '../api/dataAdapter.js';
import { drawDashboardCanvas } from './dashboardCanvasRenderers.js';

/**
 * Mur d'écrans - 6 grands écrans sur le mur de la salle
 * Connecté aux données temps réel d'OpenClaw
 */

const SCREENS_CONFIG = [
    { id: 'tokens', title: 'Tokens', color: 0x3b82f6 },      // Bleu
    { id: 'tasks', title: 'Tâches', color: 0x10b981 },       // Vert
    { id: 'activity', title: 'Activité', color: 0xf59e0b },  // Orange
    { id: 'cron', title: 'CRON', color: 0x8b5cf6 },          // Violet
    { id: 'system', title: 'Système', color: 0xef4444 },     // Rouge
    { id: 'chat', title: 'Chat', color: 0x06b6d4 }           // Cyan
];

let screens = []; // Références aux meshes des écrans
let isInitialized = false;

/**
 * Crée le mur d'écrans dans la scène 3D
 * Position: sur le mur AVANT (Z = 6, le mur avec la porte)
 * Disposition: 2 écrans à gauche de la porte, 3 à droite
 */
export function createScreenWall() {
    if (isInitialized) return;

    const screenWidth = 2.5;
    const screenHeight = 1.5;
    const spacing = 0.5;
    const wallZ = 5.9;   // Légèrement devant le mur avant (qui est à z = 6)
    const screenY = 2.5; // Hauteur des écrans

    // La porte est centrée en X=0, largeur ~1.2m
    const positions = [
        -8.5,   // Écran 1 (Tokens): Gauche extrême
        -5.5,   // Écran 2 (Tâches): Gauche extérieur
        -2.5,   // Écran 3 (Activité): Gauche intérieur (près de la porte)
        2.5,    // Écran 4 (CRON): Droite de la porte
        5.5,    // Écran 5 (Système): Droite milieu
        8.5     // Écran 6 (Chat): Droite extérieur
    ];

    SCREENS_CONFIG.forEach((config, index) => {
        const x = positions[index];

        // Groupe pour l'écran complet (cadre + écran)
        const screenGroup = new THREE.Group();
        screenGroup.position.set(x, screenY, wallZ);

        // Rotation: faire face vers l'intérieur de la pièce (vers Z négatif)
        screenGroup.rotation.y = Math.PI;

        // Réduction globale de 5% ("zoom de 5%")
        screenGroup.scale.setScalar(0.95);

        // Tag pour interactivité click
        screenGroup.userData.isScreenPanel = true;
        screenGroup.userData.screenId = config.id;
        screenGroup.userData.screenTitle = config.title;

        // Cadre de l'écran
        const frameGeometry = new THREE.BoxGeometry(screenWidth + 0.1, screenHeight + 0.1, 0.05);
        const frameMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a1a2e,
            roughness: 0.3,
            metalness: 0.7
        });
        const frame = new THREE.Mesh(frameGeometry, frameMaterial);
        frame.castShadow = true;
        screenGroup.add(frame);

        // --- CANVAS NATIVE POUR TEXTURE 3D ---
        const canvas = document.createElement('canvas');
        canvas.width = 3840;   // 4K resolution bounds for exact sharpness
        canvas.height = 2160;
        const ctx = canvas.getContext('2d');
        const texture = new THREE.CanvasTexture(canvas);

        // Configuration de la texture
        texture.anisotropy = 16;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;

        // Initialiser avec fond noir
        ctx.fillStyle = '#050510';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        texture.needsUpdate = true;

        // Surface de l'écran (prend tout le cadre ou presque)
        const displayGeometry = new THREE.PlaneGeometry(screenWidth + 0.05, screenHeight + 0.05);
        // MeshBasicMaterial ignore the lights, looking like a real self-illuminated LCD screen
        const displayMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            map: texture
        });
        const display = new THREE.Mesh(displayGeometry, displayMaterial);
        display.position.z = 0.026; // Évite absolument le z-fighting avec le bord
        screenGroup.add(display);

        // La "Bordure LED" recouvrait tout l'écran avec une opacité de 0.6 (filtre coloré sale),
        // elle a été supprimée pour permettre l'affichage propre du Dashboard Apple-Style.

        // Stocker la référence
        const screenObj = {
            id: config.id,
            group: screenGroup,
            display: display,
            config: config,
            canvas: canvas,
            ctx: ctx,
            texture: texture,
            data: null, // Pour stocker les données dynamiques
            isZoomed: false
        };
        screens.push(screenObj);

        // Dessiner l'état initial (En attente)
        drawScreenCanvas(screenObj);

        // Ajouter à la scène
        state.scene.add(screenGroup);
    });

    isInitialized = true;
    console.log('[ScreenWall] Mur d\'écrans créé (Mode Textures Nativés Canvas 3D)');
}

/**
 * Retourne le canvas HTML 2D de l'écran donné pour un affichage DOM plein écran
 */
export function getScreenCanvas(screenId) {
    const screen = screens.find(s => s.id === screenId);
    return screen ? screen.canvas : null;
}

/**
 * Met à jour les positions de tous les contenus d'écran
 * Ne fait plus rien avec le DOM, gardé pour compatibilité main.js
 */
export function updateAllScreenContentsPosition() {
    // Plus besoin, les écrans sont texturés directement en 3D
}

/**
 * Définit l'état de zoom d'un écran spécifique
 */
export function setScreenZoomState(screenId, isZoomed) {
    screens.forEach(screen => {
        if (screen.id === screenId) {
            screen.isZoomed = isZoomed;
            // Force re-render with new zoom state
            if (screen.data) {
                updateScreenContent(screen.id, screen.data);
            }
        } else {
            // Un-zoom others implicitly if they were zoomed
            if (isZoomed && screen.isZoomed) {
                screen.isZoomed = false;
                if (screen.data) updateScreenContent(screen.id, screen.data);
            }
        }
    });
}
/**
 * Dessine les données dynamiquement sur le Canvas de l'écran 3D
 */
function drawScreenCanvas(screen) {
    drawDashboardCanvas(screen);
}

/**
 * Met à jour le contenu d'un écran
 * @param {string} screenId - 'tokens', 'tasks', ou 'activity'
 * @param {any} data - Les données à afficher
 */
export function updateScreenContent(screenId, data) {
    const screen = screens.find(s => s.id === screenId);
    if (!screen) return;

    screen.data = data;

    // Dessiner sur le canvas 3D
    drawScreenCanvas(screen);
}

/**
 * Réinitialise tous les écrans
 */
export function resetAllScreens() {
    screens.forEach(screen => {
        screen.data = null;
        if (screen.display) screen.display.material.emissiveIntensity = 1.0;
        drawScreenCanvas(screen);
    });
    console.log('[ScreenWall] Tous les écrans réinitialisés');
}

/**
 * Anime les écrans
 */
export function animateScreens(time) {
    // Les écrans sont maintenant traités comme statiques pour éviter le scintillement (z-fighting) 
    // et l'effet pulse qui gênait la lecture. Aucune variation d'emissive ou de positon.
}

/**
 * Récupère les données d'un écran
 */
export function getScreenData(screenId) {
    const screen = screens.find(s => s.id === screenId);
    return screen ? screen.data : null;
}

/**
 * Vérifie si le mur d'écrans est initialisé
 */
export function isScreenWallInitialized() {
    return isInitialized;
}

/**
 * Connecte les écrans aux données temps réel
 * Écoute les mises à jour du gateway et met à jour les écrans
 */
export function bindToRealtimeData() {
    console.log('[ScreenWall] Connexion aux données temps réel...');

    // Écoute les mises à jour globales
    gateway.on('data-updated', (data) => {
        const screenData = dataAdapter.toScreenData(data);

        // Met à jour chaque écran avec les données correspondantes
        Object.entries(screenData).forEach(([screenId, content]) => {
            updateScreenContent(screenId, content);
        });
    });

    // Écoute spécifiquement les interactions pour l'écran Chat
    gateway.on('interaction-detected', (interaction) => {
        const chatData = {
            type: 'interaction',
            from: interaction.from,
            to: interaction.to,
            message: interaction.content,
            timestamp: interaction.timestamp
        };

        // Met à jour l'écran Chat avec la nouvelle interaction
        const currentChatData = getScreenData('chat') || { recent: [] };
        currentChatData.recent.unshift({
            from: interaction.from,
            to: interaction.to,
            type: interaction.type,
            time: new Date(interaction.timestamp).toLocaleTimeString()
        });

        // Garde seulement les 5 dernières
        currentChatData.recent = currentChatData.recent.slice(0, 5);
        currentChatData.value = currentChatData.recent.length;

        updateScreenContent('chat', currentChatData);
    });

    console.log('[ScreenWall] Connecté aux données temps réel');
}
