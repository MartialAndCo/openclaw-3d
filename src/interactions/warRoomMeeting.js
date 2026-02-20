import * as THREE from 'three';
import { state } from '../state.js';
import { PREDEFINED_ROUTES, ALL_ROUTES } from '../routes.js';
import { EmployeeAnimator } from '../characters/employeeAnimator.js';
import { ceoAnimator } from '../characters/ceoAnimator.js';

/**
 * Gère la réunion War Room en utilisant les routes prédéfinies existantes
 * CEO + 5 Heads marchent vers leurs chaises avec les vraies animations
 */

// Mapping des participants vers les routes War Room existantes
const WAR_ROOM_ROUTES = {
    'CEO': ['ceoToWarRoomChair1', 'ceoToWarRoomChair2', 'ceoToWarRoomChair3', 'ceoToWarRoomChair4', 'ceoToWarRoomChair5', 'ceoToWarRoomChair6'],
    'COO': ['cooToWarRoomChair2'],
    'CTO': ['ctoToWarRoomChair3'],
    'CISO': ['cisoToWarRoomChair6'],
    'COS': ['cosToWarRoomChair4'],
    'MB': ['mbToWarRoomChair5']
};

let isMeetingActive = false;
let participants = [];

/**
 * Démarre la réunion War Room
 * Utilise les routes prédéfinies avec animations complètes (stand up, walk, sit down)
 */
export async function startWarRoomMeeting(onParticipantArrived, onComplete) {
    if (isMeetingActive) return;
    
    isMeetingActive = true;
    participants = [];
    
    console.log('[WarRoomMeeting] Démarrage de la réunion avec routes existantes');
    
    // Récupérer les participants (CEO + Heads)
    const characters = findWarRoomParticipants();
    
    if (characters.length === 0) {
        console.warn('[WarRoomMeeting] Aucun participant trouvé !');
        isMeetingActive = false;
        return;
    }
    
    console.log(`[WarRoomMeeting] ${characters.length} participants à animer`);
    
    // Assigner les routes et animer en parallèle
    const animationPromises = characters.map((char, index) => {
        const routeId = getRouteForParticipant(char.role, index);
        const route = PREDEFINED_ROUTES[routeId];
        
        if (!route) {
            console.warn(`[WarRoomMeeting] Route non trouvée pour ${char.name} (${char.role})`);
            return Promise.resolve();
        }
        
        return animateParticipantWithRoute(char, route, onParticipantArrived);
    });
    
    await Promise.all(animationPromises);
    
    console.log('[WarRoomMeeting] Tous les participants sont arrivés');
    if (onComplete) onComplete();
}

/**
 * Trouve le CEO et tous les Heads dans la scène
 */
function findWarRoomParticipants() {
    const participants = [];
    const headRoles = ['COO', 'CTO', 'CISO', 'COS', 'MB'];
    let deskCount = 0;
    
    console.log('[WarRoomMeeting] Recherche des participants...');
    
    // 1. CHERCHER LE CEO via ceoAnimator
    if (ceoAnimator.model) {
        console.log('[WarRoomMeeting] CEO trouvé via ceoAnimator');
        
        // Trouver le deskGroup du CEO
        let ceoDeskGroup = null;
        state.scene.traverse((obj) => {
            if (obj.userData && obj.userData.isDesk && obj.userData.deskData?.type === 'CEO') {
                ceoDeskGroup = obj;
            }
        });
        
        participants.push({
            model: ceoAnimator.model,
            name: 'CEO',
            role: 'CEO',
            isCEO: true,
            deskGroup: ceoDeskGroup
        });
        console.log('[WarRoomMeeting] ✅ CEO ajouté');
    }
    
    // 2. CHERCHER LES HEADS dans les desks
    state.scene.traverse((obj) => {
        if (obj.userData && obj.userData.isDesk && obj.userData.deskData) {
            deskCount++;
            const deskData = obj.userData.deskData;
            const occupant = deskData.occupant;
            
            if (!occupant || !occupant.role) return;
            
            const role = occupant.role;
            const name = occupant.name || deskData.id || 'Unknown';
            
            // Heads seulement (pas le CEO, déjà ajouté)
            if (headRoles.includes(role)) {
                console.log(`[WarRoomMeeting] Head trouvé: ${name} (${role})`);
                
                const model = findCharacterModelInDesk(obj);
                if (model) {
                    participants.push({
                        model: model,
                        name: name,
                        role: role,
                        isCEO: false,
                        deskGroup: obj
                    });
                    console.log(`[WarRoomMeeting] ✅ ${name} ajouté`);
                }
            }
        }
    });
    
    console.log(`[WarRoomMeeting] Total: ${participants.length} participants`);
    return participants;
}

/**
 * Trouve le modèle de personnage dans un deskGroup
 */
function findCharacterModelInDesk(deskGroup) {
    let foundModel = null;
    deskGroup.traverse((child) => {
        if (child.userData && child.userData.employeeName && !foundModel) {
            foundModel = child;
        }
    });
    return foundModel;
}

/**
 * Récupère l'ID de route pour un participant
 */
function getRouteForParticipant(role, index) {
    const routes = WAR_ROOM_ROUTES[role];
    if (!routes || routes.length === 0) return null;
    
    // Pour le CEO, on distribue sur les 6 chaises selon l'index
    // Pour les autres, ils ont une route spécifique
    if (role === 'CEO') {
        return routes[index % routes.length];
    }
    return routes[0];
}

/**
 * Anime un participant avec une route prédéfinie
 */
async function animateParticipantWithRoute(characterData, route, onArrived) {
    const { model, name, role, deskGroup, isCEO } = characterData;
    
    console.log(`[WarRoomMeeting] Animation de ${name} (${role}) vers ${route.endName}`);
    
    if (!deskGroup && !isCEO) {
        console.warn(`[WarRoomMeeting] Desk non trouvé pour ${name}`);
        return;
    }
    
    let animator;
    
    if (isCEO) {
        // Le CEO utilise ceoAnimator - créer un wrapper compatible
        console.log('[WarRoomMeeting] Utilisation de ceoAnimator pour le CEO');
        animator = new EmployeeAnimator(model, deskGroup || model.parent);
    } else {
        // Les autres utilisent EmployeeAnimator
        animator = new EmployeeAnimator(model, deskGroup);
    }
    
    // Stocker pour le retour
    participants.push({ name, role, animator, deskGroup, model, isCEO });
    
    // Animer avec la route
    await animator.executeRoute(
        route.points,
        route.finalOrientation,
        route.name,
        route.chairIndex || 0
    );
    
    if (onArrived) {
        onArrived(name, role);
    }
    
    console.log(`[WarRoomMeeting] ✅ ${name} est arrivé`);
}

/**
 * Termine la réunion et renvoie tout le monde à leur bureau
 * Tous partent EN MÊME TEMPS (pas un par un)
 */
export async function endWarRoomMeeting() {
    if (!isMeetingActive && participants.length === 0) {
        console.log('[WarRoomMeeting] Aucune réunion active à terminer');
        return;
    }
    
    console.log('[WarRoomMeeting] Fin de la réunion - retour aux bureaux');
    
    // TOUS partent en PARALLÈLE (pas un par un)
    const returnPromises = participants.map(p => returnParticipantToDesk(p));
    await Promise.all(returnPromises);
    
    isMeetingActive = false;
    participants = [];
    
    console.log('[WarRoomMeeting] Tous sont rentrés');
}

/**
 * Fait revenir un participant à son bureau
 * Inverse simple de l'aller: se lever → marcher (route inversée) → s'asseoir
 */
async function returnParticipantToDesk(participant) {
    const { animator, deskGroup, model, name, isCEO } = participant;
    
    if (!animator || !model || !deskGroup) {
        console.warn(`[WarRoomMeeting] Données manquantes pour ${name}`);
        return;
    }
    
    console.log(`[WarRoomMeeting] Retour au bureau pour ${name}`);
    
    try {
        // Utiliser executeRoute avec la route inversée - c'est l'inverse de l'aller
        const returnRouteId = findReturnRoute(name);
        
        if (returnRouteId && PREDEFINED_ROUTES[returnRouteId]) {
            const route = PREDEFINED_ROUTES[returnRouteId];
            const reversedRoute = {
                ...route,
                points: [...route.points].reverse(),
                name: route.name + ' (retour)'
            };
            
            // Appeler executeRoute comme pour l'aller, mais avec la route inversée
            // Ce n'est PAS une route War Room, donc il reviendra au bureau à la fin
            await animator.executeRoute(
                reversedRoute.points,
                null, // pas d'orientation spéciale pour le retour
                reversedRoute.name
            );
        } else {
            console.warn(`[WarRoomMeeting] Pas de route retour pour ${name}`);
        }
        
        console.log(`[WarRoomMeeting] ✅ ${name} est rentré`);
        
    } catch (err) {
        console.error(`[WarRoomMeeting] ❌ Erreur retour pour ${name}:`, err);
        
        // Fallback: téléportation propre
        try {
            deskGroup.attach(model);
            model.position.copy(animator.startLocalPos);
            model.rotation.copy(animator.startLocalRot);
            model.visible = true;
            animator.restoreIdleAnimation();
            console.log(`[WarRoomMeeting] ${name}: fallback appliqué`);
        } catch (fallbackErr) {
            console.error(`[WarRoomMeeting] ❌❌ Fallback échoué pour ${name}:`, fallbackErr);
        }
    }
}

/**
 * Trouve une route de retour prédéfinie
 */
function findReturnRoute(name) {
    const routeMap = {
        'CEO': 'ceoToWarRoomChair1',
        'Head of Biz (COO)': 'cooToWarRoomChair2',
        'Head of Tech (CTO)': 'ctoToWarRoomChair3',
        'Head of Security (CISO)': 'cisoToWarRoomChair6',
        'Head of Personal (COS)': 'cosToWarRoomChair4',
        'Head of Growth (MB)': 'mbToWarRoomChair5'
    };
    return routeMap[name];
}

/**
 * Vérifie si une réunion est en cours
 */
export function isMeetingRunning() {
    return isMeetingActive;
}

/**
 * Récupère la liste des participants
 */
export function getParticipants() {
    return participants.map(p => ({
        name: p.name,
        role: p.role,
        isPresent: true
    }));
}
