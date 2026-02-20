import * as THREE from 'three';
import { DEPARTMENTS, CEO } from '../config.js';
import { state } from '../state.js';
import { pathfinder } from './pathfinder.js';

/**
 * Générateur automatique de routes pour OpenClaw
 * Génère toutes les routes possibles selon les règles métier
 */

export class RouteGenerator {
    constructor() {
        this.routes = [];
        this.obstacles = []; // Liste des positions à éviter (bureaux, meubles)
    }
    
    /**
     * Génère toutes les routes possibles
     */
    generateAllRoutes() {
        this.routes = [];
        this.scanObstacles();
        
        // Réinitialiser la grille du pathfinder avec les nouveaux obstacles
        pathfinder.initGrid();
        
        // 1. CEO → chaque Head (5 routes)
        this.generateCEORoutes();
        
        // 2. Head → CEO (5 routes)
        this.generateHeadToCEORoutes();
        
        // 3. Head → ses employés
        this.generateHeadToEmployeeRoutes();
        
        // 4. Employé → son Head
        this.generateEmployeeToHeadRoutes();
        
        console.log(`[RouteGenerator] ${this.routes.length} routes générées`);
        return this.routes;
    }
    
    /**
     * Scan la scène pour trouver les obstacles (bureaux et murs)
     */
    scanObstacles() {
        this.obstacles = [];
        state.scene.traverse((obj) => {
            if (obj.userData && obj.userData.isDesk) {
                // Zone plus large autour du bureau (2.5m pour être sûr de ne pas traverser)
                this.obstacles.push({
                    x: obj.position.x,
                    z: obj.position.z,
                    radius: 2.5
                });
            }
        });
        
        // Ajouter les murs comme obstacles (bureau 24m x 12m)
        // Mur gauche (x = -12)
        for (let z = -6; z <= 6; z += 1) {
            this.obstacles.push({ x: -12, z: z, radius: 1 });
        }
        // Mur droit (x = 12)
        for (let z = -6; z <= 6; z += 1) {
            this.obstacles.push({ x: 12, z: z, radius: 1 });
        }
        // Mur fond (z = -6)
        for (let x = -12; x <= 12; x += 1) {
            this.obstacles.push({ x: x, z: -6, radius: 1 });
        }
        // Mur avant (z = 6)
        for (let x = -12; x <= 12; x += 1) {
            this.obstacles.push({ x: x, z: 6, radius: 1 });
        }
        
        console.log(`[RouteGenerator] ${this.obstacles.length} obstacles trouvés`);
    }
    
    /**
     * Trouve la position d'un employé par son nom/rôle
     * Retourne aussi la rotation du bureau
     */
    findEmployeeDesk(name, role) {
        let desk = null;
        state.scene.traverse((obj) => {
            if (obj.userData && obj.userData.isDesk) {
                const occupant = obj.userData.deskData?.occupant;
                const occupantName = occupant?.name || occupant?.role;
                if (occupantName === name || occupantName === role) {
                    desk = {
                        position: obj.position.clone(),
                        rotation: obj.rotation.y
                    };
                }
            }
        });
        return desk;
    }
    
    findEmployeePosition(name, role) {
        const desk = this.findEmployeeDesk(name, role);
        return desk ? desk.position : null;
    }
    
    /**
     * Calcule un chemin optimal avec A* (évite tous les obstacles)
     */
    calculatePath(startDesk, endDesk) {
        // Point de départ (derrière le bureau, côté chaise)
        const startOffset = this.getChairPosition(startDesk);
        
        // Point d'arrivée (devant le bureau de destination)
        const endOffset = this.getFrontPosition(endDesk);
        
        // Utiliser A* pour trouver le chemin optimal
        const path = pathfinder.findPath(startOffset.x, startOffset.z, endOffset.x, endOffset.z);
        
        // Ajouter le point de départ exact (pas le nœud de grille)
        if (path.length > 0) {
            path[0] = { x: startOffset.x, z: startOffset.z };
            path[path.length - 1] = { x: endOffset.x, z: endOffset.z };
        }
        
        return path;
    }
    
    /**
     * Vérifie si le chemin est dégagé
     */
    isPathClear(start, end) {
        for (const obstacle of this.obstacles) {
            if (this.lineIntersectsCircle(start, end, obstacle)) {
                return false;
            }
        }
        return true;
    }
    
    /**
     * Détecte si une ligne coupe un cercle (obstacle)
     */
    lineIntersectsCircle(start, end, circle) {
        const dx = end.x - start.x;
        const dz = end.z - start.z;
        const fx = start.x - circle.x;
        const fz = start.z - circle.z;
        
        const a = dx * dx + dz * dz;
        const b = 2 * (fx * dx + fz * dz);
        const c = (fx * fx + fz * fz) - (circle.radius * circle.radius);
        
        const discriminant = b * b - 4 * a * c;
        if (discriminant < 0) return false;
        
        const discriminantSqrt = Math.sqrt(discriminant);
        const t1 = (-b - discriminantSqrt) / (2 * a);
        const t2 = (-b + discriminantSqrt) / (2 * a);
        
        return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1);
    }
    
    /**
     * Trouve un waypoint de détour pour éviter les obstacles
     */
    findDetourWaypoint(start, end) {
        // Essayer plusieurs directions de détour avec plus d'amplitude
        const midX = (start.x + end.x) / 2;
        const midZ = (start.z + end.z) / 2;
        
        // Essayer différentes distances (3m, 4m, 5m)
        const distances = [3, 4, 5];
        const directions = [
            { x: 1, z: 0 }, { x: -1, z: 0 },  // gauche/droite
            { x: 0, z: 1 }, { x: 0, z: -1 },  // avant/arrière
            { x: 1, z: 1 }, { x: -1, z: -1 }, // diagonales
            { x: 1, z: -1 }, { x: -1, z: 1 }
        ];
        
        for (const dist of distances) {
            for (const dir of directions) {
                const waypoint = {
                    x: midX + dir.x * dist,
                    z: midZ + dir.z * dist
                };
                
                // Vérifier que le waypoint n'est pas dans un obstacle
                let inObstacle = false;
                for (const obs of this.obstacles) {
                    const dx = waypoint.x - obs.x;
                    const dz = waypoint.z - obs.z;
                    if (Math.sqrt(dx*dx + dz*dz) < obs.radius) {
                        inObstacle = true;
                        break;
                    }
                }
                
                if (!inObstacle && this.isPathClear(start, waypoint) && this.isPathClear(waypoint, end)) {
                    return waypoint;
                }
            }
        }
        
        // Fallback: retourner un point au milieu
        return { x: midX, z: midZ };
    }
    
    /**
     * Calcule la position à droite de la chaise (côté employé)
     */
    getChairPosition(desk) {
        // Position derrière le bureau (côté chaise)
        const chairDistance = 0.7;
        const behindX = desk.position.x + Math.sin(desk.rotation) * chairDistance;
        const behindZ = desk.position.z + Math.cos(desk.rotation) * chairDistance;
        
        // Décalage à droite de la chaise (perpendiculaire à la rotation)
        // rotation + 90° (PI/2) = direction droite
        const rightDistance = 0.5;
        const rightX = behindX + Math.sin(desk.rotation + Math.PI/2) * rightDistance;
        const rightZ = behindZ + Math.cos(desk.rotation + Math.PI/2) * rightDistance;
        
        return { x: rightX, z: rightZ };
    }
    
    /**
     * Calcule la position devant le bureau (côté visiteur)
     */
    getFrontPosition(desk) {
        // Devant le bureau = direction opposée à la chaise
        const frontDistance = 1.2;
        const frontX = desk.position.x - Math.sin(desk.rotation) * frontDistance;
        const frontZ = desk.position.z - Math.cos(desk.rotation) * frontDistance;
        
        // Décalage à droite (pour éviter d'être pile devant)
        const rightDistance = 0.3;
        const rightX = frontX + Math.sin(desk.rotation + Math.PI/2) * rightDistance;
        const rightZ = frontZ + Math.cos(desk.rotation + Math.PI/2) * rightDistance;
        
        return { x: rightX, z: rightZ };
    }
    
    /**
     * Génère les routes CEO → Heads
     */
    generateCEORoutes() {
        const ceoDesk = this.findEmployeeDesk(CEO.name, CEO.role);
        if (!ceoDesk) {
            console.warn('[RouteGenerator] CEO non trouvé');
            return;
        }
        
        for (const dept of DEPARTMENTS) {
            const headDesk = this.findEmployeeDesk(dept.head.name, dept.head.role);
            if (headDesk) {
                const path = this.calculatePath(ceoDesk, headDesk);
                const endPoint = path[path.length - 1];
                this.routes.push({
                    id: `ceo_to_${dept.head.role}`,
                    name: `${CEO.name} → ${dept.head.name}`,
                    startName: CEO.name,
                    endName: dept.head.name,
                    points: path,
                    finalOrientation: this.calculateFinalOrientation(endPoint, headDesk.position)
                });
            }
        }
    }
    
    /**
     * Génère les routes Head → CEO
     */
    generateHeadToCEORoutes() {
        const ceoDesk = this.findEmployeeDesk(CEO.name, CEO.role);
        if (!ceoDesk) return;
        
        for (const dept of DEPARTMENTS) {
            const headDesk = this.findEmployeeDesk(dept.head.name, dept.head.role);
            if (headDesk) {
                const path = this.calculatePath(headDesk, ceoDesk);
                const endPoint = path[path.length - 1];
                this.routes.push({
                    id: `${dept.head.role}_to_ceo`,
                    name: `${dept.head.name} → ${CEO.name}`,
                    startName: dept.head.name,
                    endName: CEO.name,
                    points: path,
                    finalOrientation: this.calculateFinalOrientation(endPoint, ceoDesk.position)
                });
            }
        }
    }
    
    /**
     * Génère les routes Head → Employés
     */
    generateHeadToEmployeeRoutes() {
        for (const dept of DEPARTMENTS) {
            const headDesk = this.findEmployeeDesk(dept.head.name, dept.head.role);
            if (!headDesk) continue;
            
            for (const agent of dept.agents) {
                const agentDesk = this.findEmployeeDesk(agent.name, agent.role);
                if (agentDesk) {
                    const path = this.calculatePath(headDesk, agentDesk);
                    const endPoint = path[path.length - 1];
                    this.routes.push({
                        id: `${dept.head.role}_to_${agent.role}`,
                        name: `${dept.head.name} → ${agent.name}`,
                        startName: dept.head.name,
                        endName: agent.name,
                        points: path,
                        finalOrientation: this.calculateFinalOrientation(endPoint, agentDesk.position)
                    });
                }
            }
        }
    }
    
    /**
     * Génère les routes Employé → Head
     */
    generateEmployeeToHeadRoutes() {
        for (const dept of DEPARTMENTS) {
            const headDesk = this.findEmployeeDesk(dept.head.name, dept.head.role);
            if (!headDesk) continue;
            
            for (const agent of dept.agents) {
                const agentDesk = this.findEmployeeDesk(agent.name, agent.role);
                if (agentDesk) {
                    const path = this.calculatePath(agentDesk, headDesk);
                    const endPoint = path[path.length - 1];
                    this.routes.push({
                        id: `${agent.role}_to_${dept.head.role}`,
                        name: `${agent.name} → ${dept.head.name}`,
                        startName: agent.name,
                        endName: dept.head.name,
                        points: path,
                        finalOrientation: this.calculateFinalOrientation(endPoint, headDesk.position)
                    });
                }
            }
        }
    }
    
    /**
     * Calcule l'orientation finale (vers le bureau de destination)
     */
    calculateFinalOrientation(lastPoint, targetPos) {
        const dx = targetPos.x - lastPoint.x;
        const dz = targetPos.z - lastPoint.z;
        return Math.atan2(dx, dz);
    }
    
    /**
     * Affiche les routes dans la scène
     */
    visualizeRoutes(scene) {
        this.routes.forEach((route, index) => {
            const color = this.getRouteColor(index);
            const points3D = route.points.map(p => new THREE.Vector3(p.x, 0.05, p.z));
            
            const geometry = new THREE.BufferGeometry().setFromPoints(points3D);
            const material = new THREE.LineBasicMaterial({
                color: color,
                transparent: true,
                opacity: 0.7
            });
            
            const line = new THREE.Line(geometry, material);
            scene.add(line);
            
            // Stocker la référence
            route.line = line;
        });
    }
    
    getRouteColor(index) {
        const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xff00ff, 0xffff00, 0x00ffff];
        return colors[index % colors.length];
    }
    
    /**
     * Efface les routes visualisées
     */
    clearVisualization(scene) {
        this.routes.forEach(route => {
            if (route.line) {
                scene.remove(route.line);
                route.line = null;
            }
        });
    }
}

export const routeGenerator = new RouteGenerator();
