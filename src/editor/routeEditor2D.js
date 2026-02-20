import * as THREE from 'three';
import { state } from '../state.js';

/**
 * Éditeur de routes 2D - Version ULTIME
 * 
 * Fonctionnalités :
 * - Création de routes (drag & drop)
 * - Édition de routes existantes (modifier waypoints)
 * - Bascule 2D/3D en temps réel
 * - Routes persistantes
 * - Zoom to cursor + Pan
 */

export class RouteEditor2D {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.isOpen = false;
        this.scale = 25;
        this.offsetX = 0;
        this.offsetY = 0;
        
        // Zoom et Pan
        this.zoomLevel = 1;
        this.panX = 0;
        this.panY = 0;
        this.isPanning = false;
        this.panStart = { x: 0, y: 0 };
        
        // Drag & Drop
        this.isDragging = false;
        this.dragTarget = null; // 'start', 'end', 'waypoint', 'route-point'
        this.dragIndex = null;
        this.dragRouteIndex = null; // Pour l'édition de route existante
        this.justConfirmed = false;
        
        // Modes
        this.mode = 'CREATE'; // 'CREATE' ou 'EDIT'
        this.editingRouteIndex = null;
        
        // État de création
        this.step = 1;
        this.selectedStart = null;
        this.selectedEnd = null;
        this.startPoint = null;
        this.endPoint = null;
        this.waypoints = [];
        this.orientation = 0;
        this.selectedWaypoint = null;
        
        this.employees = [];
        this.savedRoutes = [];
        
        // Constantes
        this.DESK_WIDTH = 1.4;
        this.DESK_DEPTH = 0.7;
        this.CHAIR_DISTANCE = 0.7;
        this.CHAIR_OFFSET = 0.5;
        this.FRONT_DISTANCE = 1.2;
    }
    
    open() {
        if (this.isOpen) return;
        this.isOpen = true;
        this.resetCreation();
        this.scanEmployees();
        
        // Vider complètement les routes existantes avant de charger
        this.clearAllRoutes();
        
        // Notifier l'éditeur principal de vider aussi ses routes
        window.dispatchEvent(new CustomEvent('editor2d-clear-routes'));
        
        this.loadRoutesFromFile(); // Charger depuis le fichier JSON
        this.createUI();
        this.updateRoutesList();
        this.render();
    }
    
    clearAllRoutes() {
        // Supprimer toutes les routes de la scène 3D
        this.savedRoutes.forEach(route => {
            if (route.line) {
                state.scene.remove(route.line);
                route.line.geometry.dispose();
                route.line.material.dispose();
            }
            if (route.markers) {
                route.markers.forEach(m => state.scene.remove(m));
            }
        });
        this.savedRoutes = [];
    }
    
    close() {
        this.isOpen = false;
        const panel = document.getElementById('route-editor-2d');
        if (panel) panel.remove();
    }
    
    toggle2D3D() {
        // Ferme l'éditeur 2D pour voir la scène 3D
        this.close();
        // Le canvas 3D est déjà visible derrière
    }
    
    reset() {
        this.resetCreation();
    }
    
    resetCreation() {
        this.mode = 'CREATE';
        this.step = 1;
        this.selectedStart = null;
        this.selectedEnd = null;
        this.startPoint = null;
        this.endPoint = null;
        this.waypoints = [];
        this.orientation = 0;
        this.selectedWaypoint = null;
        this.isDragging = false;
        this.dragTarget = null;
        this.dragIndex = null;
        this.dragRouteIndex = null;
        this.justConfirmed = false;
        this.updateUI();
    }
    
    // Charger les routes depuis le fichier JSON
    async loadRoutesFromFile() {
        try {
            // Charger le fichier définitif
            let response = await fetch('openclaw-config-1771521683136.json');
            if (!response.ok) {
                response = await fetch('openclaw-config-1771520538620.json');
            }
            if (!response.ok) {
                response = await fetch('openclaw-config-1771519779048.json');
            }
            if (!response.ok) {
                console.log('[RouteEditor2D] Pas de fichier de config trouvé');
                return;
            }
            
            const config = await response.json();
            
            if (config.routes && config.routes.length > 0) {
                console.log(`[RouteEditor2D] Chargement de ${config.routes.length} routes depuis le fichier`);
                
                // Ajouter les routes du fichier et créer la visualisation 3D
                config.routes.forEach(routeData => {
                    const route = {
                        id: routeData.id,
                        name: routeData.name,
                        startName: routeData.startName,
                        endName: routeData.endName,
                        points: routeData.points.map(p => ({ x: p.x, z: p.z })),
                        finalOrientation: routeData.finalOrientation,
                        line: null,
                        markers: null
                    };
                    
                    this.savedRoutes.push(route);
                    
                    // Créer la visualisation 3D
                    this.addRouteTo3D(route);
                    
                    // Notifier l'éditeur principal pour qu'il ajoute aussi la route
                    window.dispatchEvent(new CustomEvent('route-created-2d', { 
                        detail: { route, line: route.line, markers: route.markers }
                    }));
                });
                
                console.log(`[RouteEditor2D] ${this.savedRoutes.length} routes chargées`);
            }
        } catch (err) {
            console.log('[RouteEditor2D] Erreur chargement fichier:', err);
        }
    }
    
    scanEmployees() {
        this.employees = [];
        
        // Ajouter le WAR ROOM comme destination
        // Position: x: -8, z: 3 (front left)
        this.employees.push({
            name: '🏛️ WAR ROOM',
            role: 'MEETING',
            pos: { x: -8, z: 3 },
            rot: 0,
            isHead: false,
            isWarRoom: true,
            chairs: [
                { x: -6.4, z: 3, rot: 0 },           // Chaise 1 (droite) - angle 0°
                { x: -7.2, z: 4.386, rot: -0.524 },  // Chaise 2 (haut-droite) - angle 60°
                { x: -8.8, z: 4.386, rot: -1.047 },  // Chaise 3 (haut-gauche) - angle 120°
                { x: -9.6, z: 3, rot: -2.094 },      // Chaise 4 (gauche) - angle 180°
                { x: -8.8, z: 1.614, rot: 2.618 },   // Chaise 5 (bas-gauche) - angle 240°
                { x: -7.2, z: 1.614, rot: 2.094 }    // Chaise 6 (bas-droite) - angle 300°
            ]
        });
        
        // Ajouter la PORTE comme destination spéciale
        this.employees.push({
            name: '🚪 PORTE SORTIE',
            role: 'EXIT',
            pos: { x: 0, z: 5.9 }, // Dans la porte (z: 6)
            rot: Math.PI, // Regard vers l'intérieur (vers -Z)
            isHead: false,
            isDoor: true
        });
        
        state.scene.traverse((obj) => {
            if (obj.userData?.isDesk) {
                const occ = obj.userData.deskData?.occupant;
                if (occ) {
                    this.employees.push({
                        name: occ.name || occ.role,
                        role: occ.role,
                        pos: { x: obj.position.x, z: obj.position.z },
                        rot: obj.rotation.y,
                        isHead: ['Orchestrator', 'COO', 'CTO', 'CISO', 'COS', 'MB'].includes(occ.role)
                    });
                }
            }
            // Chercher aussi la porte dans la scène
            if (obj.name?.toLowerCase().includes('door') || obj.userData?.isDoor) {
                // La porte est employees[1] (War Room est [0])
                this.employees[1].pos = { x: obj.position.x, z: obj.position.z };
            }
        });
    }
    
    createUI() {
        const panel = document.createElement('div');
        panel.id = 'route-editor-2d';
        panel.innerHTML = `
            <div style="position:fixed;top:0;left:0;right:0;bottom:0;background:#1a1a2e;z-index:1000;display:flex;flex-direction:column;font-family:sans-serif;user-select:none;">
                <!-- Header -->
                <div style="padding:12px;background:#2d2d44;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
                    <h2 style="margin:0;color:white;font-size:16px;">🗺️ Éditeur de Routes 2D</h2>
                    <div style="display:flex;gap:10px;">
                        <button id="btn-toggle-3d" style="background:#8b5cf6;border:none;padding:6px 12px;border-radius:4px;color:white;cursor:pointer;font-size:12px;">
                            👁️ Voir 3D
                        </button>
                        <button id="close-2d" style="background:#ef4444;border:none;padding:6px 12px;border-radius:4px;color:white;cursor:pointer;">✕</button>
                    </div>
                </div>
                
                <!-- Instructions -->
                <div id="instruction-2d" style="padding:12px;background:#10b981;color:white;text-align:center;font-weight:bold;">
                    Mode Création: Cliquez sur un bureau de DÉPART
                </div>
                
                <!-- Liste des routes à éditer -->
                <div id="routes-panel" style="padding:10px;background:#1e1e2e;max-height:120px;overflow-y:auto;flex-shrink:0;">
                    <div style="color:#888;font-size:11px;margin-bottom:5px;display:flex;justify-content:space-between;align-items:center;">
                        <span>Routes existantes (cliquez pour éditer):</span>
                        <button id="btn-new-route" style="background:#10b981;border:none;padding:4px 8px;border-radius:3px;color:white;cursor:pointer;font-size:10px;">➕ Nouvelle</button>
                    </div>
                    <div id="routes-list-2d"></div>
                </div>
                
                <!-- Canvas Container -->
                <div style="flex:1;display:flex;justify-content:center;align-items:center;overflow:hidden;position:relative;" id="canvas-container">
                    <canvas id="canvas-2d" style="background:#0f0f1a;cursor:crosshair;"></canvas>
                    
                    <!-- Overlay info -->
                    <div id="editor-overlay" style="position:absolute;bottom:10px;left:10px;background:rgba(0,0,0,0.7);padding:8px 12px;border-radius:6px;color:#aaa;font-size:11px;pointer-events:none;">
                        <div>Zoom: <span id="zoom-level">100%</span></div>
                        <div id="drag-hint"></div>
                    </div>
                </div>
                
                <!-- Contrôles -->
                <div id="editor-controls" style="padding:12px;background:#2d2d44;display:flex;gap:10px;justify-content:center;flex-wrap:wrap;flex-shrink:0;position:relative;z-index:10001;">
                    <button id="btn-reset-view" style="background:#6b7280;border:none;padding:8px 16px;border-radius:4px;color:white;cursor:pointer;font-size:12px;pointer-events:auto;">
                        🔍 Reset Vue
                    </button>
                    <button id="btn-confirm-pos" style="background:#10b981;border:none;padding:8px 16px;border-radius:4px;color:white;cursor:pointer;display:none;font-weight:bold;font-size:12px;pointer-events:auto;">
                        ✓ Confirmer Position
                    </button>
                    <button id="btn-delete-wp" style="background:#ef4444;border:none;padding:8px 16px;border-radius:4px;color:white;cursor:pointer;display:none;font-size:12px;pointer-events:auto;">
                        🗑️ Supprimer Point
                    </button>
                    <button id="btn-delete-route" style="background:#dc2626;border:none;padding:8px 16px;border-radius:4px;color:white;cursor:pointer;display:none;font-size:12px;pointer-events:auto;">
                        🗑️ Supprimer Route
                    </button>
                    <button id="btn-validate" style="background:#10b981;border:none;padding:8px 16px;border-radius:4px;color:white;cursor:pointer;display:none;font-weight:bold;font-size:12px;pointer-events:auto;">
                        ✓ VALIDER LA ROUTE
                    </button>
                    <button id="btn-cancel" style="background:#6b7280;border:none;padding:8px 16px;border-radius:4px;color:white;cursor:pointer;font-size:12px;pointer-events:auto;">
                        ↺ Recommencer
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(panel);
        
        // Init canvas
        this.canvas = document.getElementById('canvas-2d');
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        
        // Events
        const self = this;
        
        document.getElementById('close-2d').onclick = function(e) {
            e.stopPropagation();
            self.close();
        };
        
        document.getElementById('btn-toggle-3d').onclick = function(e) {
            e.stopPropagation();
            self.toggle2D3D();
        };
        
        document.getElementById('btn-new-route').onclick = function(e) {
            e.stopPropagation();
            self.resetCreation();
            self.render();
        };
        
        document.getElementById('btn-cancel').onclick = function(e) {
            e.stopPropagation();
            if (self.mode === 'EDIT') {
                self.resetCreation();
            } else {
                self.resetCreation();
            }
            self.render();
        };
        
        document.getElementById('btn-validate').onclick = function(e) {
            e.stopPropagation();
            if (self.mode === 'EDIT') {
                self.saveEditedRoute();
            } else {
                self.validateRoute();
            }
        };
        
        document.getElementById('btn-reset-view').onclick = function(e) {
            e.stopPropagation();
            self.resetView();
        };
        
        document.getElementById('btn-delete-wp').onclick = function(e) {
            e.stopPropagation();
            self.deleteSelectedWaypoint();
        };
        
        document.getElementById('btn-delete-route').onclick = function(e) {
            e.stopPropagation();
            self.deleteEditingRoute();
        };
        
        document.getElementById('btn-confirm-pos').onclick = function(e) {
            e.stopPropagation();
            self.confirmPosition();
        };
        
        // Canvas events
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
        this.canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        
        window.addEventListener('resize', () => this.resize());
    }
    
    resetView() {
        this.zoomLevel = 1;
        this.panX = 0;
        this.panY = 0;
        this.resize();
    }
    
    resize() {
        const container = document.getElementById('canvas-container');
        if (!container || !this.canvas) return;
        
        this.canvas.width = container.clientWidth - 20;
        this.canvas.height = container.clientHeight - 20;
        
        this.baseScale = Math.min(this.canvas.width / 28, this.canvas.height / 16);
        this.scale = this.baseScale * this.zoomLevel;
        this.offsetX = this.canvas.width / 2 + this.panX;
        this.offsetY = this.canvas.height / 2 + this.panY;
        
        this.updateZoomDisplay();
        this.render();
    }
    
    updateZoomDisplay() {
        const zoomDisplay = document.getElementById('zoom-level');
        if (zoomDisplay) {
            zoomDisplay.textContent = Math.round(this.zoomLevel * 100) + '%';
        }
    }
    
    // ============== COORDINATE CONVERSIONS ==============
    
    worldToScreen(x, z) {
        return {
            x: this.offsetX + x * this.scale,
            y: this.offsetY + z * this.scale
        };
    }
    
    screenToWorld(x, y) {
        return {
            x: (x - this.offsetX) / this.scale,
            z: (y - this.offsetY) / this.scale
        };
    }
    
    // ============== POSITION CALCULATIONS ==============
    
    getChairPos(emp) {
        // Si c'est la porte, retourner directement sa position
        if (emp.isDoor) {
            if (this.startPoint && (this.step > 1.5 || this.selectedStart === emp)) {
                return this.startPoint;
            }
            return { x: emp.pos.x, z: emp.pos.z };
        }
        
        if (this.startPoint && (this.step > 1.5 || this.selectedStart === emp)) {
            return this.startPoint;
        }
        const behindX = emp.pos.x - Math.sin(emp.rot) * this.CHAIR_DISTANCE;
        const behindZ = emp.pos.z - Math.cos(emp.rot) * this.CHAIR_DISTANCE;
        const rightX = behindX + Math.sin(emp.rot + Math.PI/2) * this.CHAIR_OFFSET;
        const rightZ = behindZ + Math.cos(emp.rot + Math.PI/2) * this.CHAIR_OFFSET;
        return { x: rightX, z: rightZ };
    }
    
    getFrontPos(emp) {
        // Si c'est la porte, retourner une position bien devant la porte
        if (emp.isDoor) {
            if (this.endPoint && (this.step > 2.5 || this.selectedEnd === emp)) {
                return this.endPoint;
            }
            // Position juste devant la porte (vers l'intérieur)
            return { x: emp.pos.x, z: emp.pos.z };
        }
        
        if (this.endPoint && (this.step > 2.5 || this.selectedEnd === emp)) {
            return this.endPoint;
        }
        const frontX = emp.pos.x - Math.sin(emp.rot) * this.FRONT_DISTANCE;
        const frontZ = emp.pos.z - Math.cos(emp.rot) * this.FRONT_DISTANCE;
        const rightX = frontX + Math.sin(emp.rot + Math.PI/2) * 0.3;
        const rightZ = frontZ + Math.cos(emp.rot + Math.PI/2) * 0.3;
        return { x: rightX, z: rightZ };
    }
    
    // ============== HIT TESTING ==============
    
    getEmployeeAt(screenX, screenY) {
        for (const emp of this.employees) {
            const s = this.worldToScreen(emp.pos.x, emp.pos.z);
            if (Math.abs(screenX - s.x) < 30 && Math.abs(screenY - s.y) < 25) {
                return emp;
            }
        }
        return null;
    }
    
    getPointAt(screenX, screenY, point) {
        if (!point) return false;
        const s = this.worldToScreen(point.x, point.z);
        const dist = Math.sqrt((screenX - s.x)**2 + (screenY - s.y)**2);
        return dist < 20;
    }
    
    getWaypointAt(screenX, screenY) {
        for (let i = 0; i < this.waypoints.length; i++) {
            if (this.getPointAt(screenX, screenY, this.waypoints[i])) {
                return i;
            }
        }
        return -1;
    }
    
    getRoutePointAt(screenX, screenY, route) {
        for (let i = 0; i < route.points.length; i++) {
            if (this.getPointAt(screenX, screenY, route.points[i])) {
                return i;
            }
        }
        return -1;
    }
    
    // ============== MOUSE EVENTS ==============
    
    onMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        if (e.button === 1) {
            this.isPanning = true;
            this.panStart = { x: e.clientX - this.panX, y: e.clientY - this.panY };
            this.canvas.style.cursor = 'grabbing';
            return;
        }
        
        if (e.button === 2) return;
        
        // Mode ÉDITION: vérifier si on clique sur un point de la route
        if (this.mode === 'EDIT' && this.editingRouteIndex !== null) {
            const route = this.savedRoutes[this.editingRouteIndex];
            const pointIndex = this.getRoutePointAt(x, y, route);
            if (pointIndex !== -1) {
                this.isDragging = true;
                this.dragTarget = 'route-point';
                this.dragIndex = pointIndex;
                this.dragRouteIndex = this.editingRouteIndex;
                this.canvas.style.cursor = 'grabbing';
                return;
            }
        }
        
        // Mode CRÉATION
        if (this.step === 1.5 && this.startPoint && this.getPointAt(x, y, this.startPoint)) {
            this.isDragging = true;
            this.dragTarget = 'start';
            this.canvas.style.cursor = 'grabbing';
            return;
        }
        
        if (this.step === 2.5 && this.endPoint && this.getPointAt(x, y, this.endPoint)) {
            this.isDragging = true;
            this.dragTarget = 'end';
            this.canvas.style.cursor = 'grabbing';
            return;
        }
        
        if (this.step === 3) {
            const wpIndex = this.getWaypointAt(x, y);
            if (wpIndex !== -1) {
                this.isDragging = true;
                this.dragTarget = 'waypoint';
                this.dragIndex = wpIndex;
                this.selectedWaypoint = wpIndex;
                this.canvas.style.cursor = 'grabbing';
                this.updateUI();
                return;
            }
        }
        
        this.onClick(x, y);
    }
    
    onMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        if (this.isPanning) {
            this.panX = e.clientX - this.panStart.x;
            this.panY = e.clientY - this.panStart.y;
            this.resize();
            return;
        }
        
        if (this.isDragging) {
            const world = this.screenToWorld(x, y);
            
            if (this.dragTarget === 'start' && this.startPoint) {
                this.startPoint.x = world.x;
                this.startPoint.z = world.z;
            } else if (this.dragTarget === 'end' && this.endPoint) {
                this.endPoint.x = world.x;
                this.endPoint.z = world.z;
            } else if (this.dragTarget === 'waypoint' && this.dragIndex !== null) {
                this.waypoints[this.dragIndex] = { x: world.x, z: world.z };
            } else if (this.dragTarget === 'route-point' && this.dragRouteIndex !== null) {
                // Modifier un point d'une route existante
                const route = this.savedRoutes[this.dragRouteIndex];
                route.points[this.dragIndex] = { x: world.x, z: world.z };
                // Mettre à jour la ligne 3D
                this.updateRouteLine3D(route);
            }
            
            this.render();
            return;
        }
        
        this.updateCursor(x, y);
        
        if ((this.step === 3 || this.mode === 'EDIT') && !this.isDragging) {
            this.render();
            this.drawPreviewLine(x, y);
        }
    }
    
    onMouseUp(e) {
        if (this.isPanning) {
            this.isPanning = false;
            this.canvas.style.cursor = 'crosshair';
            return;
        }
        
        if (this.isDragging) {
            this.isDragging = false;
            this.dragTarget = null;
            this.dragIndex = null;
            this.canvas.style.cursor = 'crosshair';
            
            if (this.selectedWaypoint !== null) {
                document.getElementById('btn-delete-wp').style.display = 'inline-block';
            }
        }
    }
    
    onWheel(e) {
        e.preventDefault();
        
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const worldBefore = this.screenToWorld(mouseX, mouseY);
        
        const zoomSpeed = 0.1;
        if (e.deltaY < 0) {
            this.zoomLevel = Math.min(this.zoomLevel + zoomSpeed, 5);
        } else {
            this.zoomLevel = Math.max(this.zoomLevel - zoomSpeed, 0.3);
        }
        
        this.scale = this.baseScale * this.zoomLevel;
        
        const screenAfter = this.worldToScreen(worldBefore.x, worldBefore.z);
        this.panX += mouseX - screenAfter.x;
        this.panY += mouseY - screenAfter.y;
        
        this.resize();
    }
    
    updateCursor(x, y) {
        if (this.mode === 'EDIT' && this.editingRouteIndex !== null) {
            const route = this.savedRoutes[this.editingRouteIndex];
            if (this.getRoutePointAt(x, y, route) !== -1) {
                this.canvas.style.cursor = 'grab';
                return;
            }
        }
        
        if (this.step === 1.5 && this.startPoint && this.getPointAt(x, y, this.startPoint)) {
            this.canvas.style.cursor = 'grab';
        } else if (this.step === 2.5 && this.endPoint && this.getPointAt(x, y, this.endPoint)) {
            this.canvas.style.cursor = 'grab';
        } else if (this.step === 3 && this.getWaypointAt(x, y) !== -1) {
            this.canvas.style.cursor = 'grab';
        } else {
            this.canvas.style.cursor = 'crosshair';
        }
    }
    
    // ============== CLICK HANDLING ==============
    
    onClick(x, y) {
        const world = this.screenToWorld(x, y);
        
        // Mode ÉDITION: pas de création, juste sélection de point
        if (this.mode === 'EDIT') {
            return;
        }
        
        // ÉTAPE 1: Choisir départ
        if (this.step === 1) {
            const emp = this.getEmployeeAt(x, y);
            if (emp) {
                this.selectedStart = emp;
                const chairPos = this.getChairPos(emp);
                this.startPoint = { x: chairPos.x, z: chairPos.z };
                this.step = 1.5;
                this.updateUI();
                this.render();
            }
            return;
        }
        
        if (this.step === 1.5) {
            this.step = 2;
            this.updateUI();
            this.render();
            return;
        }
        
        if (this.step === 2) {
            const emp = this.getEmployeeAt(x, y);
            if (emp && emp !== this.selectedStart) {
                // Si c'est le War Room, montrer le sélecteur de chaise
                if (emp.isWarRoom) {
                    this.showWarRoomChairSelector(emp);
                    return;
                }
                
                this.selectedEnd = emp;
                const frontPos = this.getFrontPos(emp);
                this.endPoint = { x: frontPos.x, z: frontPos.z };
                this.step = 2.5;
                this.updateUI();
                this.render();
            }
            return;
        }
        
        if (this.step === 2.5) {
            this.step = 3;
            this.updateUI();
            this.render();
            return;
        }
        
        if (this.step === 3) {
            if (this.justConfirmed) return;
            
            const wpIndex = this.getWaypointAt(x, y);
            if (wpIndex !== -1) {
                this.selectedWaypoint = wpIndex;
                document.getElementById('btn-delete-wp').style.display = 'inline-block';
                this.render();
            } else {
                this.waypoints.push({ x: world.x, z: world.z });
                this.selectedWaypoint = null;
                document.getElementById('btn-delete-wp').style.display = 'none';
                this.render();
            }
        }
    }
    
    // ============== ROUTE EDITING ==============
    
    editRoute(routeIndex) {
        if (routeIndex < 0 || routeIndex >= this.savedRoutes.length) return;
        
        this.mode = 'EDIT';
        this.editingRouteIndex = routeIndex;
        const route = this.savedRoutes[routeIndex];
        
        // Trouver les employés correspondants
        this.selectedStart = this.employees.find(e => e.name === route.startName);
        this.selectedEnd = this.employees.find(e => e.name === route.endName);
        
        this.updateUI();
        this.render();
        
        this.showNotification(`✏️ Édition de: ${route.name}`);
    }
    
    saveEditedRoute() {
        if (this.editingRouteIndex === null) return;
        
        const route = this.savedRoutes[this.editingRouteIndex];
        
        // Recalculer l'orientation finale
        const endPoint = route.points[route.points.length - 1];
        if (this.selectedEnd) {
            route.finalOrientation = Math.atan2(
                this.selectedEnd.pos.x - endPoint.x,
                this.selectedEnd.pos.z - endPoint.z
            );
        }
        
        // Mettre à jour la ligne 3D
        this.updateRouteLine3D(route);
        
        this.showNotification(`✓ Route "${route.name}" mise à jour !`);
        
        // Reste en mode édition ou retourne en création
        // this.resetCreation();
    }
    
    updateRouteLine3D(route) {
        // Supprimer complètement l'ancienne visualisation
        if (route.line) {
            state.scene.remove(route.line);
            route.line.geometry.dispose();
            route.line.material.dispose();
            route.line = null;
        }
        if (route.markers && route.markers.length > 0) {
            route.markers.forEach(m => {
                state.scene.remove(m);
                if (m.geometry) m.geometry.dispose();
                if (m.material) {
                    if (Array.isArray(m.material)) {
                        m.material.forEach(mat => mat.dispose());
                    } else {
                        m.material.dispose();
                    }
                }
            });
            route.markers = [];
        }
        
        // Recréer la ligne
        const points3D = route.points.map(p => new THREE.Vector3(p.x, 0.05, p.z));
        const geometry = new THREE.BufferGeometry().setFromPoints(points3D);
        const material = new THREE.LineBasicMaterial({ 
            color: 0xff0000, 
            linewidth: 3,
            transparent: true,
            opacity: 0.9
        });
        route.line = new THREE.Line(geometry, material);
        state.scene.add(route.line);
        
        // Recréer les marqueurs
        route.markers = [];
        route.points.forEach((p, i) => {
            const color = i === 0 ? 0x00ff00 : (i === route.points.length - 1 ? 0xff0000 : 0xffff00);
            const mesh = new THREE.Mesh(
                new THREE.SphereGeometry(0.08, 8, 8),
                new THREE.MeshBasicMaterial({ color })
            );
            mesh.position.set(p.x, 0.1, p.z);
            state.scene.add(mesh);
            route.markers.push(mesh);
        });
    }
    
    deleteEditingRoute() {
        if (this.editingRouteIndex === null) return;
        
        const route = this.savedRoutes[this.editingRouteIndex];
        
        // Supprimer de la scène 3D
        if (route.line) state.scene.remove(route.line);
        if (route.markers) route.markers.forEach(m => state.scene.remove(m));
        
        // Supprimer du tableau
        this.savedRoutes.splice(this.editingRouteIndex, 1);
        
        this.showNotification(`🗑️ Route supprimée`);
        this.resetCreation();
        this.updateRoutesList();
        this.render();
    }
    
    showWarRoomChairSelector(warRoom) {
        // Créer un overlay pour choisir la chaise
        const overlay = document.createElement('div');
        overlay.id = 'warroom-chair-selector';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.8);
            z-index: 10000;
            display: flex;
            justify-content: center;
            align-items: center;
            font-family: sans-serif;
        `;
        
        overlay.innerHTML = `
            <div style="background: #1a1a2e; padding: 30px; border-radius: 16px; max-width: 500px; width: 90%;">
                <h2 style="color: white; margin: 0 0 20px 0; text-align: center;">🏛️ WAR ROOM</h2>
                <p style="color: #888; text-align: center; margin-bottom: 20px;">Choisissez une chaise pour ${this.selectedStart.name}</p>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">
                    ${warRoom.chairs.map((chair, i) => `
                        <button onclick="window.routeEditor2D.selectWarRoomChair(${i})" 
                                style="background: #2d2d44; border: 2px solid #6366f1; color: white; 
                                       padding: 20px; border-radius: 12px; cursor: pointer; font-size: 16px;
                                       transition: all 0.2s;"
                                onmouseover="this.style.background='#3d3d54'"
                                onmouseout="this.style.background='#2d2d44'">
                            🪑 Chaise ${i + 1}
                        </button>
                    `).join('')}
                </div>
                <button onclick="document.getElementById('warroom-chair-selector').remove()" 
                        style="width: 100%; margin-top: 20px; background: #ef4444; border: none; 
                               color: white; padding: 12px; border-radius: 8px; cursor: pointer;">
                    Annuler
                </button>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        // Sauver la référence au War Room
        this.selectedWarRoom = warRoom;
    }
    
    selectWarRoomChair(chairIndex) {
        if (!this.selectedWarRoom) return;
        
        const chair = this.selectedWarRoom.chairs[chairIndex];
        
        // Créer la destination War Room avec la chaise spécifique
        this.selectedEnd = {
            name: `🪑 War Room Chaise ${chairIndex + 1}`,
            role: 'WARROOM',
            pos: { x: chair.x, z: chair.z },
            rot: chair.rot,
            isWarRoom: true,
            chairIndex: chairIndex
        };
        
        this.endPoint = { x: chair.x, z: chair.z };
        
        // Fermer le sélecteur
        const overlay = document.getElementById('warroom-chair-selector');
        if (overlay) overlay.remove();
        
        // Passer directement à l'étape 3 (pas de positionnement pour War Room)
        this.step = 3;
        this.updateUI();
        this.render();
        
        this.showNotification(`Chaise ${chairIndex + 1} sélectionnée`);
    }
    
    deleteSelectedWaypoint() {
        if (this.selectedWaypoint !== null && this.selectedWaypoint < this.waypoints.length) {
            this.waypoints.splice(this.selectedWaypoint, 1);
            this.selectedWaypoint = null;
            document.getElementById('btn-delete-wp').style.display = 'none';
            this.render();
        }
    }
    
    confirmPosition() {
        if (this.step === 1.5) {
            this.step = 2;
            this.updateUI();
            this.render();
        } else if (this.step === 2.5) {
            this.step = 3;
            this.updateUI();
            this.render();
            this.justConfirmed = true;
            setTimeout(() => { this.justConfirmed = false; }, 300);
        }
    }
    
    // ============== ROUTE VALIDATION ==============
    
    validateRoute() {
        if (!this.selectedStart || !this.endPoint) return;
        
        const startPos = this.startPoint;
        const points = [startPos, ...this.waypoints, this.endPoint];
        
        const finalOrientation = Math.atan2(
            this.selectedEnd.pos.x - this.endPoint.x,
            this.selectedEnd.pos.z - this.endPoint.z
        );
        
        const route = {
            id: `route_${Date.now()}`,
            name: `${this.selectedStart.name} → ${this.selectedEnd.name}`,
            startName: this.selectedStart.name,
            endName: this.selectedEnd.name,
            points: points,
            finalOrientation: finalOrientation
        };
        
        this.savedRoutes.push(route);
        this.addRouteTo3D(route);
        
        // Notifier l'éditeur principal
        window.dispatchEvent(new CustomEvent('route-created-2d', { 
            detail: { route, line: route.line, markers: route.markers }
        }));
        
        // Si la route implique la porte, créer automatiquement la route inverse
        const isDoorInvolved = this.selectedStart.isDoor || this.selectedEnd.isDoor;
        if (isDoorInvolved) {
            this.createReverseRoute(route);
        }
        
        this.updateRoutesList();
        this.resetCreation();
        
        const msg = isDoorInvolved 
            ? `✓ Routes "${route.name}" + retour créées ! (${this.savedRoutes.length} routes)`
            : `✓ Route "${route.name}" créée ! (${this.savedRoutes.length} routes)`;
        this.showNotification(msg);
    }
    
    createReverseRoute(originalRoute) {
        // Vérifier si la route inverse existe déjà
        const reverseName = `${originalRoute.endName} → ${originalRoute.startName}`;
        const exists = this.savedRoutes.some(r => r.name === reverseName);
        
        if (exists) {
            console.log('[RouteEditor2D] Route inverse déjà existante:', reverseName);
            return;
        }
        
        // Créer la route dans l'autre sens
        const reversedPoints = [...originalRoute.points].reverse();
        
        // Calculer l'orientation finale (vers le point de départ original)
        const lastPoint = reversedPoints[reversedPoints.length - 1];
        
        // Trouver l'employé de départ pour la route inverse
        const startEmployee = this.employees.find(e => e.name === originalRoute.endName);
        
        const reverseRoute = {
            id: `route_${Date.now()}_reverse`,
            name: reverseName,
            startName: originalRoute.endName,
            endName: originalRoute.startName,
            points: reversedPoints,
            finalOrientation: startEmployee ? Math.atan2(
                startEmployee.pos.x - lastPoint.x,
                startEmployee.pos.z - lastPoint.z
            ) : 0
        };
        
        this.savedRoutes.push(reverseRoute);
        this.addRouteTo3D(reverseRoute);
        
        // Notifier l'éditeur principal
        window.dispatchEvent(new CustomEvent('route-created-2d', { 
            detail: { route: reverseRoute, line: reverseRoute.line, markers: reverseRoute.markers }
        }));
        
        console.log('[RouteEditor2D] Route inverse créée:', reverseRoute.name);
    }
    
    createReverseRouteFromData(originalRouteData) {
        // Vérifier si la route inverse existe déjà (évite les doublons)
        const reverseName = `${originalRouteData.endName} → ${originalRouteData.startName}`;
        const exists = this.savedRoutes.some(r => r.name === reverseName);
        
        if (exists) {
            console.log('[RouteEditor2D] Route inverse déjà existante:', reverseName);
            return;
        }
        
        // Créer la route inverse à partir des données JSON
        const reversedPoints = [...originalRouteData.points].reverse();
        
        // Trouver l'employé de départ pour la route inverse (celui qui était à l'arrivée)
        const startEmployee = this.employees.find(e => e.name === originalRouteData.startName);
        
        const reverseRoute = {
            id: `${originalRouteData.id}_reverse`,
            name: reverseName,
            startName: originalRouteData.endName,
            endName: originalRouteData.startName,
            points: reversedPoints,
            finalOrientation: startEmployee ? Math.atan2(
                startEmployee.pos.x - reversedPoints[reversedPoints.length - 1].x,
                startEmployee.pos.z - reversedPoints[reversedPoints.length - 1].z
            ) : originalRouteData.finalOrientation
        };
        
        this.savedRoutes.push(reverseRoute);
        this.addRouteTo3D(reverseRoute);
        
        // Notifier l'éditeur principal
        window.dispatchEvent(new CustomEvent('route-created-2d', { 
            detail: { route: reverseRoute, line: reverseRoute.line, markers: reverseRoute.markers }
        }));
        
        console.log('[RouteEditor2D] Route inverse créée depuis fichier:', reverseRoute.name);
    }
    
    simulateRoute(routeIndex) {
        const route = this.savedRoutes[routeIndex];
        if (!route) return;
        
        console.log('[RouteEditor2D] Simulation:', route.name);
        
        // Fermer l'éditeur 2D pour voir la simulation en 3D
        this.close();
        
        // Appeler la simulation de l'éditeur principal avec le nom de la route
        if (window.simulateRouteByIndex) {
            // Trouver l'index dans savedRoutes de l'éditeur principal
            window.simulateRouteByIndex(routeIndex);
        } else {
            // Simuler directement
            this.runSimulation(route);
        }
    }
    
    async runSimulation(route) {
        // Trouver le deskGroup de départ
        let foundDeskGroup = null;
        let employeeModel = null;
        
        state.scene.traverse((obj) => {
            if (obj.userData && obj.userData.isDesk) {
                const occupant = obj.userData.deskData?.occupant;
                const occupantName = occupant?.name || occupant?.role;
                
                if (occupantName === route.startName && !foundDeskGroup) {
                    foundDeskGroup = obj;
                    const children = obj.children.filter(c => c.type === 'Group');
                    if (children.length > 0) {
                        employeeModel = children[children.length - 1];
                    }
                }
            }
        });
        
        if (!employeeModel || !foundDeskGroup) {
            console.error('[RouteEditor2D] Employé non trouvé pour simulation');
            return;
        }
        
        // Créer l'animator
        const { EmployeeAnimator } = await import('./characters/employeeAnimator.js');
        const animator = new EmployeeAnimator(employeeModel, foundDeskGroup);
        
        // Exécuter avec le nom de la route pour la détection porte
        animator.executeRoute(route.points, route.finalOrientation, route.name);
    }
    
    showNotification(text) {
        const notif = document.createElement('div');
        notif.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #10b981;
            color: white;
            padding: 20px 40px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: bold;
            z-index: 10001;
            animation: fadeInOut 2s ease;
        `;
        notif.textContent = text;
        document.body.appendChild(notif);
        
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeInOut {
                0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
                20% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
            }
        `;
        document.head.appendChild(style);
        
        setTimeout(() => notif.remove(), 2000);
    }
    
    addRouteTo3D(route) {
        const points3D = route.points.map(p => new THREE.Vector3(p.x, 0.05, p.z));
        const geometry = new THREE.BufferGeometry().setFromPoints(points3D);
        const material = new THREE.LineBasicMaterial({ 
            color: 0xff0000, 
            linewidth: 3,
            transparent: true,
            opacity: 0.9
        });
        const line = new THREE.Line(geometry, material);
        state.scene.add(line);
        
        const markers = [];
        route.points.forEach((p, i) => {
            const color = i === 0 ? 0x00ff00 : (i === route.points.length - 1 ? 0xff0000 : 0xffff00);
            const mesh = new THREE.Mesh(
                new THREE.SphereGeometry(0.08, 8, 8),
                new THREE.MeshBasicMaterial({ color })
            );
            mesh.position.set(p.x, 0.1, p.z);
            state.scene.add(mesh);
            markers.push(mesh);
        });
        
        // Flèche d'orientation finale
        if (route.finalOrientation !== undefined) {
            const endPoint = route.points[route.points.length - 1];
            const arrowGroup = new THREE.Group();
            arrowGroup.position.set(endPoint.x, 0.2, endPoint.z);
            arrowGroup.rotation.y = route.finalOrientation;
            
            const arrowBody = new THREE.Mesh(
                new THREE.CylinderGeometry(0.03, 0.03, 0.4),
                new THREE.MeshBasicMaterial({ color: 0x00ff00 })
            );
            arrowBody.rotation.x = Math.PI / 2;
            arrowBody.position.z = 0.2;
            arrowGroup.add(arrowBody);
            
            const arrowHead = new THREE.Mesh(
                new THREE.ConeGeometry(0.08, 0.2, 8),
                new THREE.MeshBasicMaterial({ color: 0x00ff00 })
            );
            arrowHead.rotation.x = Math.PI / 2;
            arrowHead.position.z = 0.5;
            arrowGroup.add(arrowHead);
            
            state.scene.add(arrowGroup);
            markers.push(arrowGroup);
        }
        
        route.line = line;
        route.markers = markers;
        
        window.dispatchEvent(new CustomEvent('route-created-2d', { 
            detail: { route, line, markers }
        }));
    }
    
    // ============== UI UPDATES ==============
    
    updateUI() {
        const instr = document.getElementById('instruction-2d');
        const btnConfirm = document.getElementById('btn-confirm-pos');
        const btnDelete = document.getElementById('btn-delete-wp');
        const btnDeleteRoute = document.getElementById('btn-delete-route');
        const btnVal = document.getElementById('btn-validate');
        
        if (!instr) return;
        
        if (this.mode === 'EDIT') {
            const route = this.savedRoutes[this.editingRouteIndex];
            instr.textContent = `✏️ MODE ÉDITION: ${route?.name || 'Route'} - Déplacez les points`;
            instr.style.background = '#8b5cf6';
            
            if (btnConfirm) btnConfirm.style.display = 'none';
            if (btnDelete) btnDelete.style.display = 'none';
            if (btnDeleteRoute) btnDeleteRoute.style.display = 'inline-block';
            if (btnVal) {
                btnVal.style.display = 'inline-block';
                btnVal.textContent = '💾 Sauvegarder';
            }
            return;
        }
        
        const steps = {
            1: { text: 'Mode Création: Cliquez sur un bureau de DÉPART', color: '#10b981' },
            1.5: { text: `Départ: ${this.selectedStart?.name} | 🖱️ DRAGUEZ le point VERT`, color: '#10b981' },
            2: { text: `Départ fixé ✓ | Cliquez sur un bureau d'ARRIVÉE`, color: '#3b82f6' },
            2.5: { text: `Arrivée: ${this.selectedEnd?.name} | 🖱️ DRAGUEZ le point ROUGE`, color: '#3b82f6' },
            3: { text: `✓ PRÊT À VALIDER | Waypoints: Cliquez pour ajouter, 🖱️ DRAG pour déplacer`, color: '#f59e0b' }
        };
        
        const stepInfo = steps[this.step] || steps[1];
        instr.textContent = stepInfo.text;
        instr.style.background = stepInfo.color;
        
        if (btnConfirm) btnConfirm.style.display = (this.step === 1.5 || this.step === 2.5) ? 'inline-block' : 'none';
        if (btnDelete) btnDelete.style.display = 'none';
        if (btnDeleteRoute) btnDeleteRoute.style.display = 'none';
        if (btnVal) {
            const canValidate = this.step === 3 || (this.selectedStart && this.endPoint);
            btnVal.style.display = canValidate ? 'inline-block' : 'none';
            btnVal.style.opacity = (this.step === 3) ? '1' : '0.5';
            btnVal.textContent = (this.step === 3) ? '✓ VALIDER LA ROUTE' : '✓ Continuer...';
        }
    }
    
    updateRoutesList() {
        const container = document.getElementById('routes-list-2d');
        if (!container) return;
        
        if (this.savedRoutes.length === 0) {
            container.innerHTML = '<span style="color:#666;font-size:11px;">Aucune route - Créez-en une !</span>';
            return;
        }
        
        container.innerHTML = this.savedRoutes.map((r, i) => {
            const isEditing = (this.mode === 'EDIT' && this.editingRouteIndex === i);
            return `
                <div style="background:${isEditing ? '#8b5cf6' : '#2d2d44'};padding:5px;margin-bottom:3px;border-radius:3px;font-size:11px;color:white;display:flex;justify-content:space-between;align-items:center;${isEditing ? 'border:2px solid #fff;' : ''}">
                    <span onclick="window.routeEditor2D.editRoute(${i})" style="cursor:pointer;flex:1;">${isEditing ? '✏️ ' : ''}${r.name}</span>
                    <button onclick="event.stopPropagation(); window.routeEditor2D.simulateRoute(${i})" style="background:#10b981;border:none;padding:3px 8px;border-radius:3px;color:white;cursor:pointer;margin-left:5px;font-size:10px;">▶</button>
                </div>
            `;
        }).join('');
    }
    
    // ============== RENDERING ==============
    
    render() {
        if (!this.ctx) return;
        
        this.ctx.fillStyle = '#0f0f1a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.drawGrid();
        this.drawWalls();
        this.employees.forEach(emp => this.drawEmployee(emp));
        this.drawSavedRoutes();
        
        if (this.mode === 'EDIT') {
            this.drawEditingRoute();
        } else {
            this.drawCurrentRoute();
        }
        
        this.drawLegend();
    }
    
    drawGrid() {
        this.ctx.strokeStyle = '#1e1e2e';
        this.ctx.lineWidth = 1;
        
        for (let i = -15; i <= 15; i++) {
            const x = this.worldToScreen(i, 0).x;
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        for (let i = -10; i <= 10; i++) {
            const y = this.worldToScreen(0, i).y;
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
        
        const origin = this.worldToScreen(0, 0);
        this.ctx.strokeStyle = '#444';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(origin.x, 0);
        this.ctx.lineTo(origin.x, this.canvas.height);
        this.ctx.moveTo(0, origin.y);
        this.ctx.lineTo(this.canvas.width, origin.y);
        this.ctx.stroke();
    }
    
    drawWalls() {
        this.ctx.strokeStyle = '#666';
        this.ctx.lineWidth = 4;
        this.ctx.setLineDash([10, 5]);
        
        const tl = this.worldToScreen(-12, -6);
        const br = this.worldToScreen(12, 6);
        this.ctx.strokeRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);
        
        this.ctx.setLineDash([]);
        
        this.ctx.fillStyle = '#666';
        this.ctx.font = '10px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('24m', (tl.x + br.x) / 2, tl.y - 5);
        this.ctx.fillText('12m', br.x + 20, (tl.y + br.y) / 2);
    }
    
    drawEmployee(emp) {
        const s = this.worldToScreen(emp.pos.x, emp.pos.z);
        const isSelected = (emp === this.selectedStart) || (emp === this.selectedEnd);
        
        // Debug: afficher la position
        if (emp.isDoor || emp.isWarRoom) {
            console.log(`[Draw] ${emp.name}: screen(${s.x.toFixed(0)}, ${s.y.toFixed(0)}) world(${emp.pos.x}, ${emp.pos.z})`);
        }
        
        // Si c'est la War Room, dessiner différemment
        if (emp.isWarRoom) {
            this.drawWarRoom(emp, s, isSelected);
            return;
        }
        
        // Si c'est la porte, dessiner différemment
        if (emp.isDoor) {
            this.drawDoor(emp, s, isSelected);
            return;
        }
        
        const chairPos = this.getChairPos(emp);
        const chairS = this.worldToScreen(chairPos.x, chairPos.z);
        
        this.ctx.fillStyle = isSelected ? '#10b981' : '#555';
        this.ctx.beginPath();
        this.ctx.arc(chairS.x, chairS.y, 6, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.save();
        this.ctx.translate(s.x, s.y);
        this.ctx.rotate(-emp.rot);
        
        let deskColor = '#4a4a6a';
        if (emp.role === 'Orchestrator') deskColor = '#f97316';
        else if (emp.isHead) deskColor = '#8b5cf6';
        
        this.ctx.fillStyle = deskColor;
        const w = this.DESK_WIDTH * this.scale;
        const d = this.DESK_DEPTH * this.scale;
        this.ctx.fillRect(-w/2, -d/2, w, d);
        
        this.ctx.strokeStyle = isSelected ? '#00ff00' : '#fff';
        this.ctx.lineWidth = isSelected ? 3 : 2;
        this.ctx.strokeRect(-w/2, -d/2, w, d);
        
        // Indicateur vers la personne (intérieur)
        this.ctx.strokeStyle = '#10b981';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.moveTo(0, d/2);
        this.ctx.lineTo(0, d/2 + 10);
        this.ctx.stroke();
        
        this.ctx.restore();
        
        this.ctx.fillStyle = '#10b981';
        this.ctx.beginPath();
        this.ctx.arc(chairS.x, chairS.y, 4, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
        
        this.ctx.fillStyle = isSelected ? '#00ff00' : '#fff';
        this.ctx.font = isSelected ? 'bold 11px sans-serif' : '10px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(emp.name, s.x, s.y - (this.DESK_DEPTH * this.scale)/2 - 12);
        
        this.ctx.fillStyle = '#888';
        this.ctx.font = '9px sans-serif';
        this.ctx.fillText(emp.role, s.x, s.y + (this.DESK_DEPTH * this.scale)/2 + 12);
    }
    
    drawWarRoom(emp, s, isSelected) {
        // Debug
        console.log(`[DrawWarRoom] Drawing at screen(${s.x.toFixed(0)}, ${s.y.toFixed(0)})`);
        
        // Dessiner la War Room comme une grande table ronde
        const radius = 1.2 * this.scale;  // Table de 2.4m de diamètre
        
        // Table (cercle gris)
        this.ctx.fillStyle = '#4a5568';
        this.ctx.beginPath();
        this.ctx.arc(s.x, s.y, radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Bordure
        this.ctx.strokeStyle = isSelected ? '#00ff00' : '#fff';
        this.ctx.lineWidth = isSelected ? 4 : 2;
        this.ctx.beginPath();
        this.ctx.arc(s.x, s.y, radius, 0, Math.PI * 2);
        this.ctx.stroke();
        
        // Icône au centre
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 24px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('🏛️', s.x, s.y);
        
        // Label au-dessus
        this.ctx.fillStyle = isSelected ? '#00ff00' : '#fff';
        this.ctx.font = isSelected ? 'bold 14px sans-serif' : 'bold 12px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'bottom';
        this.ctx.fillText('WAR ROOM', s.x, s.y - radius - 5);
        
        // Dessiner les 6 chaises en petits cercles blancs
        if (emp.chairs) {
            emp.chairs.forEach((chair, i) => {
                const chairScreen = this.worldToScreen(chair.x, chair.z);
                this.ctx.fillStyle = isSelected ? '#00ff00' : '#fff';
                this.ctx.beginPath();
                this.ctx.arc(chairScreen.x, chairScreen.y, 5, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.strokeStyle = '#333';
                this.ctx.lineWidth = 1;
                this.ctx.stroke();
            });
        }
    }
    
    drawDoor(emp, s, isSelected) {
        // Dessiner la porte comme un rectangle marron avec un trou (passage)
        const w = 1.5 * this.scale;
        const d = 0.3 * this.scale;
        
        this.ctx.fillStyle = '#8B4513'; // Marron bois
        this.ctx.fillRect(s.x - w/2, s.y - d/2, w, d);
        
        this.ctx.strokeStyle = isSelected ? '#00ff00' : '#FFD700'; // Or si sélectionné
        this.ctx.lineWidth = isSelected ? 4 : 2;
        this.ctx.strokeRect(s.x - w/2, s.y - d/2, w, d);
        
        // Icône porte
        this.ctx.fillStyle = '#FFD700';
        this.ctx.font = 'bold 16px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('🚪', s.x, s.y + 5);
        
        // Label
        this.ctx.fillStyle = isSelected ? '#00ff00' : '#FFD700';
        this.ctx.font = isSelected ? 'bold 12px sans-serif' : 'bold 11px sans-serif';
        this.ctx.fillText('SORTIE', s.x, s.y - d/2 - 10);
    }
    
    drawSavedRoutes() {
        this.savedRoutes.forEach((route, routeIndex) => {
            if (routeIndex === this.editingRouteIndex) return; // Dessiné séparément en mode édit
            
            if (route.points.length < 2) return;
            
            const colors = ['#666', '#555', '#444', '#333'];
            const color = colors[routeIndex % colors.length];
            
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([5, 5]);
            
            this.ctx.beginPath();
            const first = this.worldToScreen(route.points[0].x, route.points[0].z);
            this.ctx.moveTo(first.x, first.y);
            
            for (let i = 1; i < route.points.length; i++) {
                const p = this.worldToScreen(route.points[i].x, route.points[i].z);
                this.ctx.lineTo(p.x, p.y);
            }
            this.ctx.stroke();
            this.ctx.setLineDash([]);
            
            const start = this.worldToScreen(route.points[0].x, route.points[0].z);
            const end = this.worldToScreen(route.points[route.points.length - 1].x, route.points[route.points.length - 1].z);
            
            this.ctx.fillStyle = '#0a5';
            this.ctx.beginPath();
            this.ctx.arc(start.x, start.y, 4, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.fillStyle = '#a00';
            this.ctx.beginPath();
            this.ctx.arc(end.x, end.y, 4, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }
    
    drawEditingRoute() {
        if (this.editingRouteIndex === null) return;
        const route = this.savedRoutes[this.editingRouteIndex];
        if (!route || route.points.length < 2) return;
        
        // Ligne violette pour la route en édition
        this.ctx.strokeStyle = '#8b5cf6';
        this.ctx.lineWidth = 4;
        this.ctx.setLineDash([]);
        
        this.ctx.beginPath();
        const first = this.worldToScreen(route.points[0].x, route.points[0].z);
        this.ctx.moveTo(first.x, first.y);
        
        for (let i = 1; i < route.points.length; i++) {
            const p = this.worldToScreen(route.points[i].x, route.points[i].z);
            this.ctx.lineTo(p.x, p.y);
        }
        this.ctx.stroke();
        
        // Points éditables (plus gros)
        route.points.forEach((p, i) => {
            const s = this.worldToScreen(p.x, p.z);
            const isStart = (i === 0);
            const isEnd = (i === route.points.length - 1);
            
            this.ctx.fillStyle = isStart ? '#00ff00' : (isEnd ? '#ff0000' : '#ffff00');
            this.ctx.beginPath();
            this.ctx.arc(s.x, s.y, 10, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            
            // Numéro
            this.ctx.fillStyle = isStart || isEnd ? '#000' : '#000';
            this.ctx.font = 'bold 10px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(i.toString(), s.x, s.y);
        });
    }
    
    drawCurrentRoute() {
        if (!this.selectedStart) return;
        
        const start = this.startPoint || this.getChairPos(this.selectedStart);
        const startS = this.worldToScreen(start.x, start.z);
        
        this.ctx.fillStyle = '#00ff00';
        this.ctx.beginPath();
        const startRadius = (this.step === 1.5) ? 12 : 8;
        this.ctx.arc(startS.x, startS.y, startRadius, 0, Math.PI * 2);
        this.ctx.fill();
        
        if (this.step === 1.5) {
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            
            this.ctx.fillStyle = '#ffff00';
            this.ctx.font = 'bold 11px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('🖱️ DRAG', startS.x, startS.y - 20);
        }
        
        if (this.waypoints.length > 0 || this.endPoint) {
            this.ctx.strokeStyle = this.selectedWaypoint !== null ? '#60a5fa' : '#ef4444';
            this.ctx.lineWidth = 3;
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';
            
            this.ctx.beginPath();
            this.ctx.moveTo(startS.x, startS.y);
            
            this.waypoints.forEach((wp, i) => {
                const wpS = this.worldToScreen(wp.x, wp.z);
                this.ctx.lineTo(wpS.x, wpS.y);
            });
            
            if (this.endPoint) {
                const endS = this.worldToScreen(this.endPoint.x, this.endPoint.z);
                this.ctx.lineTo(endS.x, endS.y);
            }
            
            this.ctx.stroke();
            
            this.waypoints.forEach((wp, i) => {
                const wpS = this.worldToScreen(wp.x, wp.z);
                const isSelected = (i === this.selectedWaypoint);
                
                this.ctx.fillStyle = isSelected ? '#3b82f6' : '#ffff00';
                this.ctx.beginPath();
                this.ctx.arc(wpS.x, wpS.y, isSelected ? 8 : 5, 0, Math.PI * 2);
                this.ctx.fill();
                
                if (isSelected) {
                    this.ctx.strokeStyle = '#fff';
                    this.ctx.lineWidth = 2;
                    this.ctx.stroke();
                }
                
                this.ctx.fillStyle = '#000';
                this.ctx.font = '9px sans-serif';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText((i + 1).toString(), wpS.x, wpS.y);
            });
        }
        
        if (this.endPoint) {
            const endS = this.worldToScreen(this.endPoint.x, this.endPoint.z);
            
            this.ctx.fillStyle = '#ff0000';
            this.ctx.beginPath();
            const endRadius = (this.step === 2.5) ? 14 : 10;
            this.ctx.arc(endS.x, endS.y, endRadius, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            
            if (this.step === 2.5) {
                this.ctx.fillStyle = '#ffff00';
                this.ctx.font = 'bold 11px sans-serif';
                this.ctx.textAlign = 'center';
                this.ctx.fillText('🖱️ DRAG', endS.x, endS.y - 25);
            }
        }
        
        this.drawDistances();
    }
    
    drawDistances() {
        const points = [];
        if (this.startPoint) points.push(this.startPoint);
        points.push(...this.waypoints);
        if (this.endPoint) points.push(this.endPoint);
        
        if (points.length < 2) return;
        
        this.ctx.fillStyle = '#aaa';
        this.ctx.font = '10px sans-serif';
        this.ctx.textAlign = 'center';
        
        let totalDist = 0;
        
        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];
            const s1 = this.worldToScreen(p1.x, p1.z);
            const s2 = this.worldToScreen(p2.x, p2.z);
            
            const dist = Math.sqrt((p2.x - p1.x)**2 + (p2.z - p1.z)**2);
            totalDist += dist;
            
            const midX = (s1.x + s2.x) / 2;
            const midY = (s1.y + s2.y) / 2;
            
            this.ctx.fillText(`${dist.toFixed(1)}m`, midX, midY - 5);
        }
        
        const last = points[points.length - 1];
        const lastS = this.worldToScreen(last.x, last.z);
        this.ctx.fillStyle = '#00ff00';
        this.ctx.font = 'bold 11px sans-serif';
        this.ctx.fillText(`Total: ${totalDist.toFixed(1)}m`, lastS.x, lastS.y + 25);
    }
    
    drawPreviewLine(mouseX, mouseY) {
        // Preview entre le dernier point et la souris
        // ... (si nécessaire)
    }
    
    drawLegend() {
        const x = 10;
        let y = this.canvas.height - 120;
        
        this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
        this.ctx.fillRect(x - 5, y - 20, 160, 130);
        
        this.ctx.font = '11px sans-serif';
        this.ctx.textAlign = 'left';
        
        const items = [
            { color: '#00ff00', text: 'Nouveau départ' },
            { color: '#ff0000', text: 'Nouvelle arrivée' },
            { color: '#ffff00', text: 'Nouveau waypoint' },
            { color: '#10b981', text: 'Position agent' },
            { color: '#666', text: `Routes existantes (${this.savedRoutes.length})`, dashed: true },
            { color: '#8b5cf6', text: this.mode === 'EDIT' ? '🔧 En édition' : 'Cliquez route pour éditer' }
        ];
        
        items.forEach(item => {
            this.ctx.fillStyle = item.color;
            if (item.dashed) {
                this.ctx.setLineDash([3, 3]);
                this.ctx.strokeStyle = item.color;
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.moveTo(x, y);
                this.ctx.lineTo(x + 16, y);
                this.ctx.stroke();
                this.ctx.setLineDash([]);
            } else {
                this.ctx.beginPath();
                this.ctx.arc(x + 8, y, 6, 0, Math.PI * 2);
                this.ctx.fill();
            }
            
            this.ctx.fillStyle = '#fff';
            this.ctx.fillText(item.text, x + 22, y + 4);
            y += 22;
        });
    }
}

// Exposer l'instance pour les callbacks HTML
export const routeEditor2D = new RouteEditor2D();
window.routeEditor2D = routeEditor2D;
