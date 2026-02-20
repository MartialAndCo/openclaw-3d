/**
 * Gestionnaire d'animations d'assise multiples
 * Charge les animations depuis le dossier /animation/
 * et en sélectionne une aléatoirement pour chaque personnage
 */

import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

// Cache des animations chargées
const sitAnimations = [];
let defaultSitAnimation = null;
let isLoading = false;

/**
 * Liste des noms de fichiers d'animations attendus
 * L'utilisateur peut ajouter ses propres fichiers FBX ici
 */
const DEFAULT_SIT_FILES = [
    'Sit Down.fbx',
    'Sit Down 2.fbx', 
    'Sit Down 3.fbx',
    'Sit Relaxed.fbx',
    'Sit Formal.fbx',
    'Sit Thinking.fbx'
];

/**
 * Charge toutes les animations d'assise disponibles
 * @returns {Promise<Array>} Tableau des animations chargées
 */
export async function loadSitAnimations() {
    if (sitAnimations.length > 0) {
        return sitAnimations;
    }
    
    if (isLoading) {
        // Attendre que le chargement en cours soit terminé
        while (isLoading) {
            await new Promise(r => setTimeout(r, 50));
        }
        return sitAnimations;
    }
    
    isLoading = true;
    const loader = new FBXLoader();
    
    console.log('[SitAnimations] Chargement des animations d\'assise...');
    
    // Essayer de charger chaque fichier
    for (const filename of DEFAULT_SIT_FILES) {
        try {
            const fbx = await loader.loadAsync(`animation/${filename}`);
            if (fbx.animations && fbx.animations.length > 0) {
                sitAnimations.push({
                    name: filename.replace('.fbx', ''),
                    clip: fbx.animations[0],
                    filename: filename
                });
                console.log(`[SitAnimations] ✅ ${filename} chargé`);
            }
        } catch (err) {
            // Fichier non trouvé ou erreur, ignorer silencieusement
            console.log(`[SitAnimations] ⚠️ ${filename} non trouvé`);
        }
    }
    
    // Charger l'animation par défaut comme fallback
    if (sitAnimations.length === 0) {
        console.log('[SitAnimations] Aucune animation custom, utilisation du fallback');
        try {
            const fbx = await loader.loadAsync('Stand To Sit.fbx');
            if (fbx.animations && fbx.animations.length > 0) {
                defaultSitAnimation = {
                    name: 'Default Sit',
                    clip: fbx.animations[0],
                    filename: 'Stand To Sit.fbx'
                };
            }
        } catch (err) {
            console.error('[SitAnimations] ❌ Impossible de charger même le fallback');
        }
    }
    
    isLoading = false;
    console.log(`[SitAnimations] ${sitAnimations.length} animations disponibles`);
    
    return sitAnimations;
}

/**
 * Retourne une animation d'assise aléatoire
 * Chaque personnage aura une animation différente
 */
export function getRandomSitAnimation() {
    if (sitAnimations.length > 0) {
        const index = Math.floor(Math.random() * sitAnimations.length);
        return sitAnimations[index];
    }
    return defaultSitAnimation;
}

/**
 * Retourne une animation spécifique par index
 * Pour assigner des animations spécifiques à certains personnages
 */
export function getSitAnimationByIndex(index) {
    if (sitAnimations.length > 0) {
        return sitAnimations[index % sitAnimations.length];
    }
    return defaultSitAnimation;
}

/**
 * Retourne le nombre d'animations disponibles
 */
export function getSitAnimationCount() {
    return sitAnimations.length + (defaultSitAnimation ? 1 : 0);
}

/**
 * Liste les noms des animations disponibles
 */
export function getAvailableSitAnimations() {
    return sitAnimations.map(a => a.name);
}
