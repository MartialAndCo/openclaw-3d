import * as THREE from 'three';
import { state } from './state.js';
import { ceoAnimator } from './characters/ceoAnimator.js';
import { EmployeeAnimator } from './characters/employeeAnimator.js';
import { routeGenerator } from './characters/routeGenerator.js';
import { routeEditor2D } from './editor/routeEditor2D.js';
import { PREDEFINED_ROUTES, ALL_ROUTES } from './routes.js';

// ============== VARIABLES ==============

let selectedObject = null;
let isDragging = false;
let dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let dragOffset = new THREE.Vector3();
let moveGizmo = null;
let rotationGizmo = null;

// Throttling pour le raycaster (performance)
let lastRaycastTime = 0;
const RAYCAST_THROTTLE_MS = 32; // ~30fps max pour le raycast hover

// Mode Routes
let isRouteMode = false;
let routeStep = 'NONE'; // 'NONE' | 'SELECT_START' | 'SELECT_END' | 'DRAWING' | 'ORIENTING'
let routeStartDesk = null;
let routeEndDesk = null;
let routePoints = [];
let tempRouteLine = null;
let routeMarkers = [];
let savedRoutes = [];
let orientationGizmo = null; // Flèche d'orientation finale
let finalOrientationY = null; // Rotation Y finale

// Mode Simulation
let isSimMode = false;
let currentSimAnimator = null; // L'animator en cours de simulation

// ============== INIT ==============

export function initEditor() {
    createGizmos();
    createOrientationGizmo();
    createRouteVisualization();

    const canvas = document.getElementById('canvas');
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // Vider savedRoutes au démarrage pour éviter les doublons avec les routes prédéfinies
    savedRoutes.length = 0;
    console.log('[Editor] Routes sauvegardées réinitialisées (utilisation des routes prédéfinies uniquement)');

    createEditorUI();
}

function createGizmos() {
    moveGizmo = new THREE.Group();
    moveGizmo.add(createArrow(0xff0000, new THREE.Vector3(1, 0, 0)));
    moveGizmo.add(createArrow(0x0000ff, new THREE.Vector3(0, 0, 1)));
    moveGizmo.visible = false;
    state.scene.add(moveGizmo);

    rotationGizmo = new THREE.Mesh(
        new THREE.TorusGeometry(1, 0.05, 8, 32),
        new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.6 })
    );
    rotationGizmo.rotation.x = -Math.PI / 2;
    rotationGizmo.visible = false;
    state.scene.add(rotationGizmo);
}

function createOrientationGizmo() {
    // Gizmo pour définir l'orientation finale du personnage
    orientationGizmo = new THREE.Group();

    // Flèche principale (direction regard)
    const arrow = createArrow(0x00ff00, new THREE.Vector3(0, 0, 1));
    arrow.scale.setScalar(1.5);
    orientationGizmo.add(arrow);

    // Cercle au sol
    const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.3, 0.35, 32),
        new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    orientationGizmo.add(ring);

    // "Tête" du personnage (sphère)
    const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.7 })
    );
    head.position.set(0, 0.15, 0);
    orientationGizmo.add(head);

    orientationGizmo.visible = false;
    state.scene.add(orientationGizmo);
}

function createArrow(color, direction) {
    const group = new THREE.Group();
    const line = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, 1),
        new THREE.MeshBasicMaterial({ color })
    );
    line.rotation.z = direction.x !== 0 ? -Math.PI / 2 : 0;
    line.rotation.x = direction.z !== 0 ? Math.PI / 2 : 0;
    line.position.copy(direction).multiplyScalar(0.5);
    group.add(line);

    const cone = new THREE.Mesh(
        new THREE.ConeGeometry(0.08, 0.2, 8),
        new THREE.MeshBasicMaterial({ color })
    );
    cone.rotation.z = direction.x !== 0 ? -Math.PI / 2 : 0;
    cone.rotation.x = direction.z !== 0 ? Math.PI / 2 : 0;
    cone.position.copy(direction).multiplyScalar(1);
    group.add(cone);

    return group;
}

function createRouteVisualization() {
    // Ligne temporaire pour la route en cours
    const geometry = new THREE.BufferGeometry();
    const material = new THREE.LineDashedMaterial({
        color: 0xff6b6b,
        linewidth: 3,
        scale: 1,
        dashSize: 0.2,
        gapSize: 0.1
    });
    tempRouteLine = new THREE.Line(geometry, material);
    tempRouteLine.visible = false;
    state.scene.add(tempRouteLine);
}

// ============== EVENTS ==============

function onPointerDown(event) {
    // Ignorer si on clique sur l'UI
    if (event.target.closest('#editor-panel') || event.target.closest('#editor-toggle-btn')) return;

    // ⚠️ IMPORTANT: Si l'éditeur est fermé, on ne traite pas les clics ici (laisser agentClick.js gérer)
    const panel = document.getElementById('editor-panel');
    if (panel && panel.classList.contains('closed')) return;

    updateMouse(event);
    raycaster.setFromCamera(mouse, state.camera);

    // Mode Route
    if (isRouteMode) {
        handleRoutePointerDown(event);
        return;
    }

    // Mode Simulation
    if (isSimMode) {
        return; // Pas d'interaction en mode sim
    }

    // Mode normal - sélection bureau OU clic sur employé pour routes
    const intersects = raycaster.intersectObjects(state.scene.children, true);
    let foundDesk = null;
    let hitPoint = null;
    let foundEmployee = null;

    for (let hit of intersects) {
        let obj = hit.object;

        // Chercher un bureau
        while (obj) {
            if (obj.userData && obj.userData.isDesk) {
                foundDesk = obj;
                hitPoint = hit.point;

                // Vérifier si on a cliqué sur l'employé (mesh enfant)
                const occupant = obj.userData.deskData?.occupant;
                if (occupant && hit.object !== obj) {
                    // On a cliqué sur un mesh enfant du bureau (probablement l'employé)
                    foundEmployee = occupant;
                }
                break;
            }
            obj = obj.parent;
        }
        if (foundDesk) break;
    }


    if (!foundDesk || foundDesk !== selectedObject) {
        deselect();
        if (foundDesk) selectDesk(foundDesk);
        return;
    }

    if (foundDesk === selectedObject && hitPoint && moveGizmo.visible) {
        isDragging = true;
        dragOffset.copy(hitPoint).sub(selectedObject.position);
        document.body.style.cursor = 'grabbing';
    }
}

function handleRoutePointerDown(event) {
    // Mode ORIENTING: clic gauche/droit pour tourner
    if (routeStep === 'ORIENTING') {
        const isLeftClick = event.button === 0;
        const isRightClick = event.button === 2;

        if (isLeftClick) {
            // Clic gauche = tourner à gauche (22.5°)
            rotateOrientationGizmo(1);
        } else if (isRightClick) {
            // Clic droit = tourner à droite (22.5°)
            rotateOrientationGizmo(-1);
        }

        updateRouteStatus(`🎯 ORIENTATION: ${(finalOrientationY * 180 / Math.PI).toFixed(0)}° | Gauche: +22.5° | Droite: -22.5° | ✓ pour valider`);
        return;
    }

    const intersects = raycaster.intersectObjects(state.scene.children, true);

    // Si on est en train de dessiner, cliquer au sol ajoute un point
    if (routeStep === 'DRAWING') {
        // Vérifier si on clique sur le sol
        const target = getPointOnGround();
        if (target) {
            addRoutePoint(target);
        }
        return;
    }

    // Sinon, chercher un bureau
    let foundDesk = null;
    for (let hit of intersects) {
        let obj = hit.object;
        while (obj) {
            if (obj.userData && obj.userData.isDesk) {
                foundDesk = obj;
                break;
            }
            obj = obj.parent;
        }
        if (foundDesk) break;
    }

    if (!foundDesk) return;

    const occupant = foundDesk.userData.deskData?.occupant;
    const name = occupant?.name || occupant?.role || 'Inconnu';

    if (routeStep === 'SELECT_START') {
        routeStartDesk = {
            desk: foundDesk,
            position: foundDesk.position.clone(),
            name: name
        };
        routeStep = 'SELECT_END';
        highlightDesk(foundDesk, 0x00ff00); // Vert = départ
        updateRouteStatus(`✓ Départ: ${name}. Cliquez sur l'arrivée.`);

    } else if (routeStep === 'SELECT_END') {
        // Vérifier que c'est pas le même
        if (foundDesk === routeStartDesk.desk) {
            updateRouteStatus('❌ Choisissez un bureau différent !');
            return;
        }

        routeEndDesk = {
            desk: foundDesk,
            position: foundDesk.position.clone(),
            name: name
        };
        routeStep = 'DRAWING';
        highlightDesk(foundDesk, 0xff0000); // Rouge = arrivée

        // Trouver le personnage sur le bureau de départ pour obtenir sa position exacte
        let employeeWorldPos = null;
        routeStartDesk.desk.traverse((child) => {
            if (child.type === 'Group' && child.children.length > 0 && !employeeWorldPos) {
                // C'est probablement le modèle du personnage
                const worldPos = new THREE.Vector3();
                child.getWorldPosition(worldPos);
                employeeWorldPos = { x: worldPos.x, z: worldPos.z };
            }
        });

        // Utiliser la position exacte du personnage, ou calculer derrière le bureau si pas trouvé
        let startPos;
        if (employeeWorldPos) {
            startPos = employeeWorldPos;
        } else {
            // Fallback: calculer derrière le bureau
            const chairZ = 0.7;
            const deskRot = routeStartDesk.desk.rotation.y;
            startPos = {
                x: routeStartDesk.position.x - Math.sin(deskRot) * chairZ,
                z: routeStartDesk.position.z - Math.cos(deskRot) * chairZ
            };
        }

        addRoutePoint(startPos);

        updateRouteStatus(`✓ ${routeStartDesk.name} → ${name}. Cliquez au sol pour tracer la route. ✓ pour valider.`);
    }
}

function onPointerMove(event) {
    updateMouse(event);

    if (isDragging && selectedObject) {
        raycaster.setFromCamera(mouse, state.camera);
        const target = new THREE.Vector3();
        raycaster.ray.intersectPlane(dragPlane, target);

        if (target) {
            selectedObject.position.x = target.x - dragOffset.x;
            selectedObject.position.z = target.z - dragOffset.z;
            moveGizmo.position.copy(selectedObject.position);
            rotationGizmo.position.copy(selectedObject.position);
            updateEditorUI();
        }
        return;
    }

    // Curseur - avec throttle pour performance
    if (isRouteMode && routeStep === 'DRAWING') {
        document.body.style.cursor = 'crosshair';
    } else if (!isRouteMode && !isSimMode) {
        const now = performance.now();
        if (now - lastRaycastTime < RAYCAST_THROTTLE_MS) return;
        lastRaycastTime = now;

        raycaster.setFromCamera(mouse, state.camera);
        const intersects = raycaster.intersectObjects(state.scene.children, true);
        let foundDesk = null;
        for (let hit of intersects) {
            let obj = hit.object;
            while (obj) {
                if (obj.userData && obj.userData.isDesk) {
                    foundDesk = obj;
                    break;
                }
                obj = obj.parent;
            }
            if (foundDesk) break;
        }
        document.body.style.cursor = foundDesk ? 'pointer' : 'default';
    }
}

function onPointerUp() {
    isDragging = false;
    if (!isRouteMode) document.body.style.cursor = 'default';
}

function getPointOnGround() {
    raycaster.setFromCamera(mouse, state.camera);
    const target = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(dragPlane, target)) {
        return target;
    }
    return null;
}

// ============== ROUTES ==============

function addRoutePoint(position) {
    // Si on est en mode orientation, on ignore
    if (routeStep === 'ORIENTING') return;

    // Créer un marqueur
    const geometry = new THREE.SphereGeometry(0.1, 12, 12);
    const color = routePoints.length === 0 ? 0x00ff00 : 0xffff00;
    const material = new THREE.MeshBasicMaterial({ color });
    const marker = new THREE.Mesh(geometry, material);
    marker.position.set(position.x, 0.1, position.z);
    state.scene.add(marker);
    routeMarkers.push(marker);

    // Ajouter le point
    routePoints.push({ x: position.x, z: position.z });

    // Mettre à jour la ligne
    updateRouteLine();

    updateRouteStatus(`Point ${routePoints.length} ajouté. Continuez ou cliquez ✓ pour terminer et orienter.`);
}

function startOrientationMode() {
    routeStep = 'ORIENTING';

    // Positionner le gizmo d'orientation sur le dernier point
    const lastPoint = routePoints[routePoints.length - 1];
    orientationGizmo.position.set(lastPoint.x, 0, lastPoint.z);
    orientationGizmo.visible = true;

    // Orienter vers le bureau de destination par défaut
    if (routeEndDesk) {
        const endPos = routeEndDesk.position;
        const dx = endPos.x - lastPoint.x;
        const dz = endPos.z - lastPoint.z;
        finalOrientationY = Math.atan2(dx, dz);
    } else {
        finalOrientationY = 0;
    }
    orientationGizmo.rotation.y = finalOrientationY;

    updateRouteStatus(`🎯 ORIENTATION: ${(finalOrientationY * 180 / Math.PI).toFixed(0)}° | Gauche: +22.5° | Droite: -22.5° | ✓ pour valider`);
}

function rotateOrientationGizmo(direction) {
    // direction: 1 = gauche, -1 = droite (ou inverse selon préférence)
    const step = Math.PI / 8; // 22.5 degrés
    orientationGizmo.rotation.y += direction * step;
    finalOrientationY = orientationGizmo.rotation.y;
}

function updateRouteLine() {
    if (routePoints.length < 2) return;

    const points3D = routePoints.map(p => new THREE.Vector3(p.x, 0.05, p.z));
    tempRouteLine.geometry.setFromPoints(points3D);
    tempRouteLine.computeLineDistances();
    tempRouteLine.visible = true;
}

function validateRoute() {
    if (routePoints.length < 2 || !routeStartDesk || !routeEndDesk) {
        updateRouteStatus('❌ Route invalide (min 2 points)');
        return;
    }

    // Si on n'est pas encore en mode orientation, on y passe maintenant
    if (routeStep !== 'ORIENTING') {
        startOrientationMode();
        return;
    }

    // On est en mode orientation, on sauvegarde la route
    // Créer la route permanente
    const points3D = routePoints.map(p => new THREE.Vector3(p.x, 0.05, p.z));
    const geometry = new THREE.BufferGeometry().setFromPoints(points3D);
    const material = new THREE.LineBasicMaterial({
        color: 0xff0000,
        linewidth: 4,
        transparent: true,
        opacity: 0.9
    });
    const permanentLine = new THREE.Line(geometry, material);
    state.scene.add(permanentLine);

    // Marqueur d'arrivée en rouge
    if (routeMarkers.length > 0) {
        routeMarkers[routeMarkers.length - 1].material.color.setHex(0xff0000);
    }

    // Sauvegarder avec l'orientation finale
    const route = {
        id: `route_${Date.now()}`,
        name: `${routeStartDesk.name} → ${routeEndDesk.name}`,
        startName: routeStartDesk.name,
        endName: routeEndDesk.name,
        points: [...routePoints],
        finalOrientation: finalOrientationY, // Rotation Y finale
        line: permanentLine,
        markers: [...routeMarkers]
    };

    savedRoutes.push(route);
    updateSavedRoutesList();

    console.log('[Route] Sauvegardée:', route.name, 'Orientation:', finalOrientationY);
    updateRouteStatus(`✓ Route "${route.name}" sauvegardée (orientation: ${(finalOrientationY * 180 / Math.PI).toFixed(0)}°) !`);

    // Reset
    resetRouteCreation();
}

function resetRouteCreation() {
    routeStep = 'SELECT_START';
    routeStartDesk = null;
    routeEndDesk = null;
    routePoints = [];
    routeMarkers = [];
    finalOrientationY = null;
    tempRouteLine.visible = false;

    // Cacher le gizmo d'orientation
    if (orientationGizmo) {
        orientationGizmo.visible = false;
    }

    // Reset highlights
    state.scene.traverse((obj) => {
        if (obj.userData.originalEmissive) {
            if (obj.material) obj.material.emissive.setHex(obj.userData.originalEmissive);
        }
    });

    updateRouteStatus('Cliquez sur le bureau de départ.');
}

function clearAllRoutes() {
    savedRoutes.forEach(route => {
        if (route.line) state.scene.remove(route.line);
        if (route.markers) route.markers.forEach(m => state.scene.remove(m));
    });
    savedRoutes = [];
    updateSavedRoutesList();

    // Nettoyer aussi la création en cours
    routeMarkers.forEach(m => state.scene.remove(m));
    resetRouteCreation();

    updateRouteStatus('Toutes les routes effacées.');
}

// ============== SIMULATION ==============

function simulateRoute(routeIndex) {
    const route = savedRoutes[routeIndex];
    if (!route) return;

    // Arrêter la simulation précédente
    if (currentSimAnimator) {
        currentSimAnimator.stop();
    }

    console.log('[Sim] Début:', route.name);
    updateSimStatus(`Simulation: ${route.name}...`);

    // Trouver le deskGroup de départ
    const startEmployeeName = route.startName;
    let foundDeskGroup = null;
    let employeeModel = null;

    state.scene.traverse((obj) => {
        if (obj.userData && obj.userData.isDesk) {
            const occupant = obj.userData.deskData?.occupant;
            const occupantName = occupant?.name || occupant?.role;

            if (occupantName === startEmployeeName && !foundDeskGroup) {
                foundDeskGroup = obj;
                // L'employé est le dernier enfant ajouté (après les meubles)
                const children = obj.children.filter(c => c.type === 'Group');
                if (children.length > 0) {
                    employeeModel = children[children.length - 1];
                }
            }
        }
    });

    // Fallback sur CEO
    if (!employeeModel || !foundDeskGroup) {
        console.warn('[Sim] Employé non trouvé, utilisation du CEO');
        if (ceoAnimator.model) {
            foundDeskGroup = ceoAnimator.model.parent;
            employeeModel = ceoAnimator.model;
        }
    }

    if (!employeeModel) {
        updateSimStatus('❌ Erreur: aucun modèle trouvé');
        return;
    }

    console.log('[Sim] Employé:', startEmployeeName, 'Desk:', foundDeskGroup?.uuid);

    // Créer l'animator avec le deskGroup pour pouvoir ré-attacher après
    const animator = new EmployeeAnimator(employeeModel, foundDeskGroup);
    currentSimAnimator = animator;

    // Rendre disponible globalement pour l'update
    window.currentEmployeeAnimator = animator;

    // Convertir les points de la route en coordonnées mondiales si nécessaire
    const worldPoints = route.points.map(p => ({ x: p.x, z: p.z }));

    // Récupérer l'orientation finale (si définie)
    const finalOrientation = route.finalOrientation !== undefined ? route.finalOrientation : null;

    // Exécuter avec l'orientation finale et le nom de route
    animator.executeRoute(worldPoints, finalOrientation, route.name).then(() => {
        updateSimStatus(`✓ ${route.name} terminée !`);
        currentSimAnimator = null;
        window.currentEmployeeAnimator = null;
    }).catch(err => {
        console.error('[Sim] Erreur:', err);
        updateSimStatus('❌ Erreur simulation');
        currentSimAnimator = null;
        window.currentEmployeeAnimator = null;
    });
}

// ============== UI ==============

function createEditorUI() {
    // Créer le bouton toggle (toujours visible)
    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'editor-toggle-btn';
    toggleBtn.innerHTML = '⚙️';
    toggleBtn.title = 'Ouvrir l\'éditeur';
    document.body.appendChild(toggleBtn);

    // Créer le panel éditeur (caché par défaut)
    const panel = document.createElement('div');
    panel.id = 'editor-panel';
    panel.className = 'closed'; // Classe pour cacher
    panel.innerHTML = `
        <div class="editor-header">
            <div class="editor-title">🎮 Éditeur</div>
            <button class="editor-close-btn" title="Fermer">✕</button>
        </div>
        
        <!-- MODE LAYOUT -->
        <div id="layout-section">
            <div id="selected-info" style="display:none;margin-bottom:15px;">
                <div class="editor-section">
                    <div class="editor-label">Position Bureau</div>
                    <div class="editor-row">
                        <label>X:</label>
                        <input type="number" id="pos-x" step="0.1">
                    </div>
                    <div class="editor-row">
                        <label>Z:</label>
                        <input type="number" id="pos-z" step="0.1">
                    </div>
                </div>
                <div class="editor-actions">
                    <button id="btn-move-mode" class="active">Déplacer</button>
                    <button id="btn-rot-mode">Rotation</button>
                </div>
            </div>
        </div>
        
        <!-- MODE ROUTES -->
        <div class="editor-section" style="margin-top:15px;border-top:1px solid #444;padding-top:15px;">
            <button id="btn-2d-editor" style="width:100%;background:#3b82f6;border:none;padding:8px;border-radius:4px;color:white;font-size:12px;cursor:pointer;margin-bottom:8px;">🗺️ Éditeur 2D (Précis)</button>
            <button id="btn-auto-routes" style="width:100%;background:#8b5cf6;border:none;padding:8px;border-radius:4px;color:white;font-size:12px;cursor:pointer;margin-bottom:8px;">✨ Générer Routes Auto</button>
            <button id="btn-route-mode" class="btn-route">🛤️ Routes 3D (Simple)</button>
            <div id="route-panel" style="display:none;margin-top:10px;">
                <div id="route-status" style="color:#4ade80;font-size:12px;margin-bottom:10px;">Cliquez sur le départ</div>
                <div style="display:flex;gap:5px;">
                    <button id="btn-validate-route" style="flex:1;background:#10b981;border:none;padding:6px;border-radius:4px;color:white;font-size:11px;cursor:pointer;">✓ Valider</button>
                    <button id="btn-cancel-route" style="flex:1;background:#ef4444;border:none;padding:6px;border-radius:4px;color:white;font-size:11px;cursor:pointer;">✗ Annuler</button>
                </div>
                <button id="btn-clear-routes" style="margin-top:8px;width:100%;background:#7c3aed;border:none;padding:6px;border-radius:4px;color:white;font-size:11px;cursor:pointer;">❌ Effacer tout</button>
            </div>
        </div>
        
        <!-- MODE SIMULATION -->
        <div class="editor-section" style="margin-top:15px;border-top:1px solid #444;padding-top:15px;">
            <button id="btn-sim-mode" class="btn-sim">▶️ Simuler Routes</button>
            <div id="sim-panel" style="display:none;margin-top:10px;">
                <div id="sim-status" style="color:#60a5fa;font-size:12px;margin-bottom:10px;">Sélectionnez une route</div>
                <div id="saved-routes-list" style="max-height:150px;overflow-y:auto;"></div>
                <button id="btn-stop-sim" style="margin-top:8px;width:100%;background:#ef4444;border:none;padding:6px;border-radius:4px;color:white;font-size:11px;cursor:pointer;">⏹ Arrêter</button>
            </div>
        </div>
        
        <!-- EXPORT/IMPORT -->
        <div class="editor-section" style="margin-top:15px;border-top:1px solid #444;padding-top:15px;">
            <button id="btn-export" class="btn-primary">💾 Exporter</button>
            <button id="btn-import" class="btn-secondary">📁 Importer</button>
            <input type="file" id="import-file" accept=".json" style="display:none;">
        </div>
    `;
    document.body.appendChild(panel);

    // Styles
    const style = document.createElement('style');
    style.textContent = `
        /* Bouton Toggle */
        #editor-toggle-btn {
            position: fixed;
            top: 20px;
            right: 20px;
            width: 40px;
            height: 40px;
            background: rgba(20, 20, 30, 0.9);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 10px;
            color: white;
            font-size: 18px;
            cursor: pointer;
            z-index: 10001;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        #editor-toggle-btn:hover {
            background: rgba(99, 102, 241, 0.9);
            transform: scale(1.05);
        }
        
        /* Panel Éditeur */
        #editor-panel {
            position: fixed;
            top: 70px;
            right: 20px;
            width: 280px;
            background: rgba(20, 20, 30, 0.95);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 12px;
            padding: 15px;
            color: white;
            font-family: system-ui, sans-serif;
            font-size: 13px;
            z-index: 10000;
            pointer-events: auto;
            opacity: 1;
            transform: translateX(0);
            transition: opacity 0.3s ease, transform 0.3s ease;
        }
        #editor-panel.closed {
            opacity: 0;
            transform: translateX(320px);
            pointer-events: none;
        }
        .editor-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        .editor-title { font-size: 16px; font-weight: bold; color: #6366f1; }
        .editor-close-btn {
            background: rgba(255,255,255,0.1);
            border: none;
            color: white;
            width: 28px;
            height: 28px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.2s;
        }
        .editor-close-btn:hover {
            background: rgba(239, 68, 68, 0.8);
        }
        .editor-section { margin-bottom: 12px; }
        .editor-label { color: #aaa; margin-bottom: 5px; font-size: 11px; text-transform: uppercase; }
        .editor-row { display: flex; align-items: center; gap: 10px; margin-bottom: 5px; }
        .editor-row label { width: 20px; color: #888; }
        .editor-row input { flex: 1; background: #222; border: 1px solid #444; color: white; padding: 5px; border-radius: 4px; font-size: 12px; }
        .editor-actions { display: flex; gap: 8px; margin-top: 10px; }
        .editor-actions button { flex: 1; background: #333; border: 1px solid #555; color: white; padding: 8px; border-radius: 6px; cursor: pointer; font-size: 11px; }
        .editor-actions button.active { background: #6366f1; border-color: #6366f1; }
        button.btn-primary { background: #10b981 !important; border-color: #10b981 !important; width: 100%; margin-bottom: 8px; }
        button.btn-secondary { background: #3b82f6 !important; border-color: #3b82f6 !important; width: 100%; }
        button.btn-route { background: #f59e0b !important; border-color: #f59e0b !important; width: 100%; }
        button.btn-route.active { background: #10b981 !important; border-color: #10b981 !important; }
        button.btn-sim { background: #06b6d4 !important; border-color: #06b6d4 !important; width: 100%; }
        button.btn-sim.active { background: #8b5cf6 !important; border-color: #8b5cf6 !important; }
        #saved-routes-list { background: rgba(0,0,0,0.3); border-radius: 6px; padding: 5px; }
        .route-item { 
            background: #333; 
            padding: 8px; 
            margin-bottom: 5px; 
            border-radius: 4px; 
            cursor: pointer;
            font-size: 11px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .route-item:hover { background: #444; }
        .route-item button { 
            background: #10b981; 
            border: none; 
            padding: 4px 8px; 
            border-radius: 4px; 
            color: white; 
            cursor: pointer;
            font-size: 10px;
        }
    `;
    document.head.appendChild(style);

    // Toggle bouton - ouvrir/fermer l'éditeur
    toggleBtn.addEventListener('click', () => {
        const isClosed = panel.classList.contains('closed');
        if (isClosed) {
            panel.classList.remove('closed');
            toggleBtn.innerHTML = '✕';
            toggleBtn.title = 'Fermer l\'éditeur';
        } else {
            panel.classList.add('closed');
            toggleBtn.innerHTML = '⚙️';
            toggleBtn.title = 'Ouvrir l\'éditeur';
        }
    });

    // Bouton fermer dans le panel
    panel.querySelector('.editor-close-btn').addEventListener('click', () => {
        panel.classList.add('closed');
        toggleBtn.innerHTML = '⚙️';
        toggleBtn.title = 'Ouvrir l\'éditeur';
    });

    // Events
    document.getElementById('pos-x').addEventListener('input', (e) => {
        if (selectedObject) {
            selectedObject.position.x = parseFloat(e.target.value);
            moveGizmo.position.x = selectedObject.position.x;
        }
    });

    document.getElementById('pos-z').addEventListener('input', (e) => {
        if (selectedObject) {
            selectedObject.position.z = parseFloat(e.target.value);
            moveGizmo.position.z = selectedObject.position.z;
        }
    });

    document.getElementById('btn-move-mode').addEventListener('click', () => {
        moveGizmo.visible = !!selectedObject;
        rotationGizmo.visible = false;
        document.getElementById('btn-move-mode').classList.add('active');
        document.getElementById('btn-rot-mode').classList.remove('active');
        if (selectedObject) state.controls.enabled = false;
    });

    document.getElementById('btn-rot-mode').addEventListener('click', () => {
        moveGizmo.visible = false;
        rotationGizmo.visible = !!selectedObject;
        document.getElementById('btn-move-mode').classList.remove('active');
        document.getElementById('btn-rot-mode').classList.add('active');
        state.controls.enabled = true;
    });

    // Route mode
    document.getElementById('btn-route-mode').addEventListener('click', () => {
        isRouteMode = !isRouteMode;
        const btn = document.getElementById('btn-route-mode');
        const panel = document.getElementById('route-panel');

        if (isRouteMode) {
            isSimMode = false;
            document.getElementById('btn-sim-mode').classList.remove('active');
            document.getElementById('sim-panel').style.display = 'none';

            btn.classList.add('active');
            btn.textContent = '🛤️ Mode Routes (ON)';
            panel.style.display = 'block';
            deselect();
            state.controls.enabled = true;
            routeStep = 'SELECT_START';
            updateRouteStatus('1. Cliquez sur le bureau de DÉPART');
        } else {
            btn.classList.remove('active');
            btn.textContent = '🛤️ Créer Routes';
            panel.style.display = 'none';
            resetRouteCreation();
        }
    });

    document.getElementById('btn-validate-route').addEventListener('click', validateRoute);
    document.getElementById('btn-cancel-route').addEventListener('click', resetRouteCreation);
    document.getElementById('btn-clear-routes').addEventListener('click', clearAllRoutes);

    // Éditeur 2D
    document.getElementById('btn-2d-editor').addEventListener('click', () => {
        routeEditor2D.open();
    });

    // Écouter les événements de l'éditeur 2D
    window.addEventListener('editor2d-clear-routes', () => {
        clearAllRoutes();
        console.log('[Editor] Routes vidées par éditeur 2D');
    });

    window.addEventListener('route-created-2d', (e) => {
        const { route, line, markers } = e.detail;

        // Ajouter à savedRoutes
        savedRoutes.push({
            id: route.id,
            name: route.name,
            startName: route.startName,
            endName: route.endName,
            points: route.points,
            finalOrientation: route.finalOrientation,
            line: line,
            markers: markers
        });

        updateSavedRoutesList();
        updateRouteStatus(`✓ Route "${route.name}" ajoutée depuis l'éditeur 2D`);
    });

    // Génération automatique des routes
    document.getElementById('btn-auto-routes').addEventListener('click', () => {
        console.log('[Editor] Génération des routes automatiques...');

        // Effacer les anciennes routes
        clearAllRoutes();

        // Générer les nouvelles routes
        const routes = routeGenerator.generateAllRoutes();

        // Ajouter les routes générées
        routes.forEach(route => {
            // Créer la ligne visuelle
            const points3D = route.points.map(p => new THREE.Vector3(p.x, 0.05, p.z));
            const geometry = new THREE.BufferGeometry().setFromPoints(points3D);
            const material = new THREE.LineBasicMaterial({
                color: 0xff0000,
                linewidth: 4,
                transparent: true,
                opacity: 0.9
            });
            const line = new THREE.Line(geometry, material);
            state.scene.add(line);

            // Créer les marqueurs
            const markers = [];
            route.points.forEach((p, i) => {
                const color = i === 0 ? 0x00ff00 : (i === route.points.length - 1 ? 0xff0000 : 0xffff00);
                const sphere = new THREE.Mesh(
                    new THREE.SphereGeometry(0.1, 12, 12),
                    new THREE.MeshBasicMaterial({ color })
                );
                sphere.position.set(p.x, 0.1, p.z);
                state.scene.add(sphere);
                markers.push(sphere);
            });

            // Ajouter à la liste des routes sauvegardées
            savedRoutes.push({
                id: route.id,
                name: route.name,
                startName: route.startName,
                endName: route.endName,
                points: route.points,
                finalOrientation: route.finalOrientation,
                line: line,
                markers: markers
            });
        });

        updateSavedRoutesList();
        updateRouteStatus(`✓ ${routes.length} routes générées automatiquement !`);
        console.log('[Editor] Routes générées:', routes.length);
    });

    // Sim mode
    document.getElementById('btn-sim-mode').addEventListener('click', () => {
        isSimMode = !isSimMode;
        const btn = document.getElementById('btn-sim-mode');
        const panel = document.getElementById('sim-panel');

        if (isSimMode) {
            isRouteMode = false;
            document.getElementById('btn-route-mode').classList.remove('active');
            document.getElementById('route-panel').style.display = 'none';
            resetRouteCreation();

            btn.classList.add('active');
            btn.textContent = '▶️ Simulation (ON)';
            panel.style.display = 'block';
            deselect();
            updateSavedRoutesList();
        } else {
            btn.classList.remove('active');
            btn.textContent = '▶️ Simuler Routes';
            panel.style.display = 'none';
        }
    });

    document.getElementById('btn-stop-sim').addEventListener('click', () => {
        if (currentSimAnimator) {
            currentSimAnimator.stop();
            currentSimAnimator = null;
        }
        window.currentEmployeeAnimator = null;
        ceoAnimator.stopRoute();
        updateSimStatus('Simulation arrêtée');
    });

    // Export/Import
    document.getElementById('btn-export').addEventListener('click', exportConfig);
    document.getElementById('btn-import').addEventListener('click', () => {
        document.getElementById('import-file').click();
    });
    document.getElementById('import-file').addEventListener('change', (e) => {
        if (e.target.files[0]) importConfig(e.target.files[0]);
    });
}

function updateEditorUI() {
    const info = document.getElementById('selected-info');
    if (!info) return;

    if (!selectedObject) {
        info.style.display = 'none';
        return;
    }

    info.style.display = 'block';
    document.getElementById('pos-x').value = selectedObject.position.x.toFixed(2);
    document.getElementById('pos-z').value = selectedObject.position.z.toFixed(2);
}

function updateRouteStatus(text) {
    const status = document.getElementById('route-status');
    if (status) status.textContent = text;
}

function updateSimStatus(text) {
    const status = document.getElementById('sim-status');
    if (status) status.textContent = text;
}

function updateSavedRoutesList() {
    const list = document.getElementById('saved-routes-list');
    if (!list) return;

    if (savedRoutes.length === 0) {
        list.innerHTML = '<div style="color:#888;font-size:11px;padding:10px;">Aucune route enregistrée</div>';
        return;
    }

    list.innerHTML = savedRoutes.map((route, index) => `
        <div class="route-item">
            <span>${route.name}</span>
            <button onclick="window.simulateRouteByIndex(${index})">▶</button>
        </div>
    `).join('');
}

// Exposer pour les boutons
window.simulateRouteByIndex = (index) => {
    simulateRoute(index);
};

window.simulatePredefinedRoute = (routeId) => {
    // Chercher la route par son id (pas par la clé de l'objet)
    const route = ALL_ROUTES.find(r => r.id === routeId);
    if (!route) {
        console.error('[Sim] Route prédéfinie non trouvée:', routeId);
        console.error('[Sim] IDs disponibles:', ALL_ROUTES.map(r => r.id).join(', '));
        return;
    }

    // Arrêter la simulation précédente
    if (currentSimAnimator) {
        currentSimAnimator.stop();
    }

    console.log('[Sim] Début route prédéfinie:', route.name);
    updateSimStatus(`Simulation: ${route.name}...`);

    // Trouver le deskGroup de départ
    const startEmployeeName = route.startName;
    let foundDeskGroup = null;
    let employeeModel = null;

    state.scene.traverse((obj) => {
        if (obj.userData && obj.userData.isDesk) {
            const occupant = obj.userData.deskData?.occupant;
            const occupantName = occupant?.name || occupant?.role;

            if (occupantName === startEmployeeName && !foundDeskGroup) {
                foundDeskGroup = obj;
                // L'employé est le dernier enfant ajouté (après les meubles)
                const children = obj.children.filter(c => c.type === 'Group');
                if (children.length > 0) {
                    employeeModel = children[children.length - 1];
                }
            }
        }
    });

    // Fallback sur CEO
    if (!employeeModel || !foundDeskGroup) {
        console.warn('[Sim] Employé non trouvé, utilisation du CEO');
        if (ceoAnimator.model) {
            foundDeskGroup = ceoAnimator.model.parent;
            employeeModel = ceoAnimator.model;
        }
    }

    if (!employeeModel) {
        updateSimStatus('❌ Erreur: aucun modèle trouvé');
        return;
    }

    console.log('[Sim] Employé:', startEmployeeName, 'Desk:', foundDeskGroup?.uuid);

    // Créer l'animator avec le deskGroup pour pouvoir ré-attacher après
    const animator = new EmployeeAnimator(employeeModel, foundDeskGroup);
    currentSimAnimator = animator;

    // Rendre disponible globalement pour l'update
    window.currentEmployeeAnimator = animator;

    // Convertir les points de la route en coordonnées mondiales
    const worldPoints = route.points.map(p => ({ x: p.x, z: p.z }));

    // Récupérer l'orientation finale
    const finalOrientation = route.finalOrientation !== undefined ? route.finalOrientation : null;

    // Exécuter avec l'orientation finale et le nom de route
    // Passer isWarRoom pour les routes War Room
    const isWarRoom = route.isWarRoom || false;
    const chairIndex = route.chairIndex !== undefined ? route.chairIndex : null;

    animator.executeRoute(worldPoints, finalOrientation, route.name, isWarRoom, chairIndex).then(() => {
        updateSimStatus(`✓ ${route.name} terminée !`);
        currentSimAnimator = null;
        window.currentEmployeeAnimator = null;
    }).catch(err => {
        console.error('[Sim] Erreur:', err);
        updateSimStatus('❌ Erreur simulation');
        currentSimAnimator = null;
        window.currentEmployeeAnimator = null;
    });
};

// ============== MENU ROUTES PAR EMPLOYÉ ==============


function showNotification(text) {
    const notif = document.createElement('div');
    notif.style.cssText = `
        position: fixed;
        bottom: 100px;
        left: 50%;
        transform: translateX(-50%);
        background: #6366f1;
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 14px;
        z-index: 10001;
        animation: slideUp 0.3s ease;
    `;
    notif.textContent = text;
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 2000);
}

// ============== EXPORT/IMPORT ==============

function exportConfig() {
    // Éliminer les doublons basés sur le nom de route
    const uniqueRoutes = [];
    const seenNames = new Set();

    savedRoutes.forEach(r => {
        if (!seenNames.has(r.name)) {
            seenNames.add(r.name);
            uniqueRoutes.push(r);
        }
    });

    console.log(`[Export] ${savedRoutes.length} routes total, ${uniqueRoutes.length} uniques`);

    const config = {
        version: '1.4',
        timestamp: new Date().toISOString(),
        desks: [],
        routes: uniqueRoutes.map(r => ({
            id: r.id,
            name: r.name,
            startName: r.startName,
            endName: r.endName,
            points: r.points,
            finalOrientation: r.finalOrientation
        }))
    };

    state.scene.traverse((obj) => {
        if (obj.userData && obj.userData.isDesk) {
            const data = obj.userData.deskData;
            config.desks.push({
                id: data.occupant?.name || 'unknown',
                role: data.occupant?.role || 'unknown',
                position: {
                    x: parseFloat(obj.position.x.toFixed(3)),
                    y: parseFloat(obj.position.y.toFixed(3)),
                    z: parseFloat(obj.position.z.toFixed(3))
                },
                rotation: { y: parseFloat(obj.rotation.y.toFixed(3)) }
            });
        }
    });

    const json = JSON.stringify(config, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `openclaw-config-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    const btn = document.getElementById('btn-export');
    if (btn) {
        btn.textContent = '✅ Exporté !';
        setTimeout(() => btn.textContent = '💾 Exporter', 2000);
    }
}

function importConfig(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const config = JSON.parse(e.target.result);

            if (config.routes) {
                clearAllRoutes();
                config.routes.forEach(routeData => {
                    const points3D = routeData.points.map(p => new THREE.Vector3(p.x, 0.05, p.z));
                    const geometry = new THREE.BufferGeometry().setFromPoints(points3D);
                    const material = new THREE.LineBasicMaterial({
                        color: 0xff0000, linewidth: 4, transparent: true, opacity: 0.9
                    });
                    const line = new THREE.Line(geometry, material);
                    state.scene.add(line);

                    const markers = [];
                    routeData.points.forEach((p, i) => {
                        const color = i === 0 ? 0x00ff00 : (i === routeData.points.length - 1 ? 0xff0000 : 0xffff00);
                        const geometry = new THREE.SphereGeometry(0.1, 12, 12);
                        const material = new THREE.MeshBasicMaterial({ color });
                        const marker = new THREE.Mesh(geometry, material);
                        marker.position.set(p.x, 0.1, p.z);
                        state.scene.add(marker);
                        markers.push(marker);
                    });

                    savedRoutes.push({
                        id: routeData.id,
                        name: routeData.name,
                        startName: routeData.startName,
                        endName: routeData.endName,
                        points: routeData.points,
                        finalOrientation: routeData.finalOrientation,
                        line: line,
                        markers: markers
                    });
                });
                updateSavedRoutesList();
            }

            if (config.desks) {
                config.desks.forEach((deskConfig) => {
                    state.scene.traverse((obj) => {
                        if (obj.userData && obj.userData.isDesk) {
                            const data = obj.userData.deskData;
                            if (data.occupant?.name === deskConfig.id) {
                                obj.position.set(
                                    deskConfig.position.x,
                                    deskConfig.position.y,
                                    deskConfig.position.z
                                );
                                obj.rotation.y = deskConfig.rotation?.y || 0;
                            }
                        }
                    });
                });
            }

            alert('Configuration importée !');
        } catch (err) {
            alert('Erreur: ' + err.message);
        }
    };
    reader.readAsText(file);
}

// ============== UTILS ==============

function selectDesk(deskGroup) {
    selectedObject = deskGroup;
    moveGizmo.position.copy(deskGroup.position);
    moveGizmo.visible = true;
    rotationGizmo.position.copy(deskGroup.position);
    rotationGizmo.visible = false;
    state.controls.enabled = false;
    updateEditorUI();
    highlightDesk(deskGroup, 0x666666);
}

function deselect() {
    if (!selectedObject) return;
    selectedObject = null;
    moveGizmo.visible = false;
    rotationGizmo.visible = false;
    state.controls.enabled = true;

    state.scene.traverse((obj) => {
        if (obj.userData.originalEmissive) {
            if (obj.material) obj.material.emissive.setHex(obj.userData.originalEmissive);
        }
    });
    updateEditorUI();
}

function highlightDesk(deskGroup, colorHex) {
    deskGroup.traverse((obj) => {
        if (obj.isMesh && obj.material) {
            if (!obj.userData.originalEmissive) {
                obj.userData.originalEmissive = obj.material.emissive.getHex();
            }
            obj.material.emissive.setHex(colorHex);
        }
    });
}

function updateMouse(event) {
    const canvas = document.getElementById('canvas');
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

export function updateEditor() {
    if (selectedObject && moveGizmo.visible) {
        moveGizmo.position.copy(selectedObject.position);
        rotationGizmo.position.copy(selectedObject.position);
    }
}

export function registerDesk(deskGroup, deskData) {
    deskGroup.userData.isDesk = true;
    deskGroup.userData.deskData = deskData;
    deskGroup.userData.originalPosition = deskGroup.position.clone();
}

export function getSavedRoutes() {
    return savedRoutes;
}

/**
 * Vérifie si l'éditeur est actif (mode sélection, route ou simulation)
 * Utilisé par d'autres modules pour éviter les conflits d'interaction
 */
export function isEditorActive() {
    // Éditeur actif si : bureau sélectionné, mode route, ou mode simulation
    return selectedObject !== null || isRouteMode || isSimMode;
}

/**
 * Vérifie si on est spécifiquement en mode simulation
 */
export function isSimulationMode() {
    return isSimMode;
}
