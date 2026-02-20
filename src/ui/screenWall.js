import * as THREE from 'three';
import { state } from '../state.js';
import { createScreenLabel as createScreenLabelHTML } from '../labels.js';
import { gateway } from '../api/gateway.js';
import { dataAdapter } from '../api/dataAdapter.js';

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

        // Surface de l'écran (zone affichable)
        const displayGeometry = new THREE.PlaneGeometry(screenWidth - 0.2, screenHeight - 0.3);
        const displayMaterial = new THREE.MeshStandardMaterial({
            color: 0x0a0a1a,
            emissive: config.color,
            emissiveIntensity: 0.1,
            roughness: 0.2,
            metalness: 0.1
        });
        const display = new THREE.Mesh(displayGeometry, displayMaterial);
        display.position.z = 0.03; // Légèrement devant le cadre
        display.position.y = -0.05; // Décalé vers le bas pour le titre
        screenGroup.add(display);

        // Bordure LED
        const borderGeometry = new THREE.BoxGeometry(screenWidth + 0.05, screenHeight + 0.05, 0.02);
        const borderMaterial = new THREE.MeshBasicMaterial({
            color: config.color,
            transparent: true,
            opacity: 0.6
        });
        const border = new THREE.Mesh(borderGeometry, borderMaterial);
        border.position.z = 0.02;
        screenGroup.add(border);

        // Stocker la référence
        screens.push({
            id: config.id,
            group: screenGroup,
            display: display,
            config: config,
            data: null, // Pour stocker les données dynamiques
            contentElement: null // Élément HTML pour le contenu
        });

        // Ajouter à la scène
        state.scene.add(screenGroup);

        // Créer le label HTML pour le titre
        createScreenLabelHTML(config.title, x, screenY + screenHeight / 2 + 0.2, wallZ, config.color);

        // Créer l'élément HTML pour le contenu de l'écran
        createScreenContentElement(config.id, config.color);
    });

    isInitialized = true;
    console.log('[ScreenWall] Mur d\'écrans créé avec', screens.length, 'écrans sur le mur avant (porte)');
}

/**
 * Crée un élément HTML pour afficher le contenu d'un écran
 */
function createScreenContentElement(screenId, color) {
    const contentDiv = document.createElement('div');
    contentDiv.className = 'screen-content';
    contentDiv.id = `screen-content-${screenId}`;
    contentDiv.innerHTML = '<div class="screen-placeholder">En attente de données...</div>';
    document.getElementById('labels-container').appendChild(contentDiv);

    // Stocker la référence dans l'objet screen
    const screen = screens.find(s => s.id === screenId);
    if (screen) {
        screen.contentElement = contentDiv;
    }

    // Positionner l'élément
    updateScreenContentPosition(screenId);
}

/**
 * Met à jour la position d'un élément de contenu d'écran
 */
function updateScreenContentPosition(screenId) {
    const screen = screens.find(s => s.id === screenId);
    if (!screen || !screen.contentElement) return;

    const screenPos = screen.group.position.clone();
    screenPos.y -= 0.5; // Décalage vers le bas pour le contenu
    screenPos.z += 0.1; // Légèrement devant

    const projected = screenPos.project(state.camera);
    const x = (projected.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-projected.y * 0.5 + 0.5) * window.innerHeight;

    // Cache si derrière la caméra
    if (projected.z > 1) {
        screen.contentElement.style.opacity = '0';
    } else {
        screen.contentElement.style.opacity = '1';
        screen.contentElement.style.left = `${x}px`;
        screen.contentElement.style.top = `${y}px`;
    }
}

/**
 * Met à jour les positions de tous les contenus d'écran
 * À appeler dans la boucle d'animation
 */
export function updateAllScreenContentsPosition() {
    screens.forEach(screen => {
        if (screen.contentElement) {
            updateScreenContentPosition(screen.id);
        }
    });
}

/**
 * Formate les données pour l'affichage sur l'écran
 */
function formatScreenData(screenId, data) {
    if (!data) return '<div class="screen-placeholder">--</div>';

    const value = data.value !== undefined ? data.value : data;
    const label = data.label || '';

    switch (screenId) {
        case 'tokens':
            return `<div class="screen-value">${typeof value === 'number' ? value.toLocaleString() : value}</div>
                    <div class="screen-label">${label || 'tokens utilisés'}</div>`;
        case 'tasks':
            return `<div class="screen-value">${value}</div>
                    <div class="screen-label">${label || 'tâches actives'}</div>`;
        case 'activity':
            return `<div class="screen-value">${value}</div>
                    <div class="screen-label">${label || 'agents actifs'}</div>`;
        case 'cron':
            return `<div class="screen-value">${value}</div>
                    <div class="screen-label">${label || 'jobs planifiés'}</div>`;
        case 'system':
            return `<div class="screen-value">${value}%</div>
                    <div class="screen-label">${label || 'charge système'}</div>`;
        case 'chat':
            if (Array.isArray(data.recent) && data.recent.length > 0) {
                const items = data.recent.map(item =>
                    `<div class="chat-item">${item.from} → ${item.to}</div>`
                ).join('');
                return `<div class="chat-list">${items}</div>`;
            }
            return '<div class="screen-placeholder">Aucune interaction</div>';
        default:
            return `<div class="screen-value">${value}</div>`;
    }
}



/**
 * Met à jour le contenu d'un écran
 * @param {string} screenId - 'tokens', 'tasks', ou 'activity'
 * @param {any} data - Les données à afficher
 */
export function updateScreenContent(screenId, data) {
    const screen = screens.find(s => s.id === screenId);
    if (!screen) {
        console.warn('[ScreenWall] Écran non trouvé:', screenId);
        return;
    }

    screen.data = data;

    // Mettre à jour l'effet visuel selon le type de données
    const display = screen.display;

    // Effet de pulse quand les données changent
    display.material.emissiveIntensity = 0.5;
    setTimeout(() => {
        display.material.emissiveIntensity = 0.1;
    }, 300);

    // Mettre à jour le contenu HTML
    if (screen.contentElement) {
        screen.contentElement.innerHTML = formatScreenData(screenId, data);
    }

    console.log('[ScreenWall] Écran', screenId, 'mis à jour:', data);
}

/**
 * Réinitialise tous les écrans
 */
export function resetAllScreens() {
    screens.forEach(screen => {
        screen.data = null;
        screen.display.material.emissiveIntensity = 0.1;
    });
    console.log('[ScreenWall] Tous les écrans réinitialisés');
}

/**
 * Anime les écrans (effet subtil)
 */
export function animateScreens(time) {
    screens.forEach((screen, index) => {
        // Légère variation d'intensité pour effet "vivant"
        const baseIntensity = 0.1;
        const variation = Math.sin(time * 2 + index) * 0.02;
        screen.display.material.emissiveIntensity = baseIntensity + variation;
    });
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
