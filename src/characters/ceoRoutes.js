import * as THREE from 'three';

/**
 * Système de routes pour le CEO
 * Permet de définir des chemins vers les différents Heads
 */

export const CEORoutes = {
    // Routes prédéfinies vers les Heads
    // Chaque route est un array de waypoints {x, z}
    
    toCTO: [
        { x: 0, z: 1 },      // Départ (devant le CEO)
        { x: -4, z: 1 },     // Vers Tech
        { x: -4, z: 0.5 }    // Bureau CTO
    ],
    
    toGrowth: [
        { x: 0, z: 1 },
        { x: 8, z: 1 },
        { x: 8, z: 0.5 }
    ],
    
    toBusiness: [
        { x: 0, z: 1 },
        { x: -8, z: 1 },
        { x: -8, z: 0.5 }
    ],
    
    toSecurity: [
        { x: 0, z: 1 },
        { x: 0, z: 0.5 }
    ],
    
    toPersonal: [
        { x: 0, z: 1 },
        { x: 4, z: 1 },
        { x: 4, z: 0.5 }
    ],
    
    // Route retour au bureau
    returnToDesk: [
        { x: 0, z: 2 }
    ]
};

// Fonction pour créer une route custom
export function createRoute(waypoints) {
    return waypoints.map(wp => ({ x: wp.x, z: wp.z }));
}

// Fonction pour dessiner la route (visualisation debug)
export function visualizeRoute(scene, route, color = 0xff0000) {
    if (!route || route.length < 2) return;
    
    const points = route.map(wp => new THREE.Vector3(wp.x, 0.1, wp.z));
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color, linewidth: 2 });
    const line = new THREE.Line(geometry, material);
    
    scene.add(line);
    
    // Ajouter des sphères aux waypoints
    route.forEach((wp, i) => {
        const sphere = new THREE.Mesh(
            new THREE.SphereGeometry(0.1, 8, 8),
            new THREE.MeshBasicMaterial({ color: i === 0 ? 0x00ff00 : (i === route.length - 1 ? 0xff0000 : 0xffff00) })
        );
        sphere.position.set(wp.x, 0.2, wp.z);
        scene.add(sphere);
    });
    
    return line;
}

// Classe pour suivre une route
export class RouteFollower {
    constructor(model, route, onComplete) {
        this.model = model;
        this.route = route;
        this.onComplete = onComplete;
        this.currentWaypoint = 0;
        this.speed = 1.0;
        this.isActive = false;
        this.pauseAtEnd = 2; // secondes à attendre à la fin
        this.pauseTimer = 0;
    }
    
    start() {
        this.currentWaypoint = 0;
        this.isActive = true;
        this.pauseTimer = 0;
        console.log('[Route] Démarrage, waypoints:', this.route.length);
    }
    
    update(delta) {
        if (!this.isActive) return;
        
        // Pause à la fin
        if (this.currentWaypoint >= this.route.length) {
            this.pauseTimer += delta;
            if (this.pauseTimer >= this.pauseAtEnd) {
                this.isActive = false;
                if (this.onComplete) this.onComplete();
            }
            return;
        }
        
        const target = this.route[this.currentWaypoint];
        const currentPos = this.model.position;
        
        // Calculer direction
        const dx = target.x - currentPos.x;
        const dz = target.z - currentPos.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        
        if (dist < 0.1) {
            // Arrivé au waypoint
            this.currentWaypoint++;
            console.log('[Route] Waypoint atteint:', this.currentWaypoint);
        } else {
            // Se déplacer
            const moveX = (dx / dist) * this.speed * delta;
            const moveZ = (dz / dist) * this.speed * delta;
            
            currentPos.x += moveX;
            currentPos.z += moveZ;
            
            // Rotation vers la cible
            this.model.rotation.y = Math.atan2(dx, dz);
        }
    }
}
