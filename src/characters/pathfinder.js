import { state } from '../state.js';

/**
 * Pathfinding A* (A-Star) - Version simple et précise
 * Cases de 5cm pour maximum de précision
 */

export class Pathfinder {
    constructor() {
        this.gridSize = 0.05; // 5cm par case
        this.grid = new Map();
        this.obstacles = [];
    }
    
    /**
     * Initialise la grille avec les obstacles
     */
    initGrid() {
        this.grid.clear();
        this.obstacles = [];
        
        // Scanner tous les bureaux comme obstacles
        state.scene.traverse((obj) => {
            if (obj.userData && obj.userData.isDesk) {
                // Zone interdite : 2.5m autour du bureau
                this.obstacles.push({
                    minX: obj.position.x - 2.5,
                    maxX: obj.position.x + 2.5,
                    minZ: obj.position.z - 2.5,
                    maxZ: obj.position.z + 2.5
                });
            }
        });
        
        console.log(`[Pathfinder] ${this.obstacles.length} obstacles détectés`);
    }
    
    /**
     * Vérifie si un point est dans un obstacle
     */
    isBlocked(x, z) {
        // Limites du bureau
        if (x < -11.8 || x > 11.8 || z < -5.8 || z > 5.8) return true;
        
        // Vérifier les obstacles
        for (const obs of this.obstacles) {
            if (x >= obs.minX && x <= obs.maxX && z >= obs.minZ && z <= obs.maxZ) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * Trouve le chemin avec A* pur
     */
    findPath(startX, startZ, endX, endZ) {
        this.initGrid();
        
        // Arrondir aux cases
        const start = this.snap(startX, startZ);
        const end = this.snap(endX, endZ);
        
        // Si arrivée bloquée, chercher proche
        if (this.isBlocked(end.x, end.z)) {
            const freeEnd = this.findFreeNear(end.x, end.z);
            if (freeEnd) {
                end.x = freeEnd.x;
                end.z = freeEnd.z;
            }
        }
        
        // A* standard
        const open = [];
        const closed = new Set();
        const parents = new Map();
        const gScore = new Map();
        const fScore = new Map();
        
        const startKey = `${start.x},${start.z}`;
        open.push(start);
        gScore.set(startKey, 0);
        fScore.set(startKey, this.dist(start, end));
        
        while (open.length > 0) {
            // Trouver le meilleur
            let bestIdx = 0;
            for (let i = 1; i < open.length; i++) {
                const keyI = `${open[i].x},${open[i].z}`;
                const keyBest = `${open[bestIdx].x},${open[bestIdx].z}`;
                if ((fScore.get(keyI) || Infinity) < (fScore.get(keyBest) || Infinity)) {
                    bestIdx = i;
                }
            }
            
            const current = open[bestIdx];
            const currentKey = `${current.x},${current.z}`;
            
            // Arrivée ?
            if (current.x === end.x && current.z === end.z) {
                return this.buildPath(parents, current, {x: startX, z: startZ}, {x: endX, z: endZ});
            }
            
            open.splice(bestIdx, 1);
            closed.add(currentKey);
            
            // Voisins (4 directions pour chemins plus droits)
            const neighbors = [
                {x: current.x + this.gridSize, z: current.z},
                {x: current.x - this.gridSize, z: current.z},
                {x: current.x, z: current.z + this.gridSize},
                {x: current.x, z: current.z - this.gridSize}
            ];
            
            for (const neighbor of neighbors) {
                const key = `${neighbor.x},${neighbor.z}`;
                
                if (closed.has(key)) continue;
                if (this.isBlocked(neighbor.x, neighbor.z)) continue;
                
                const tentativeG = (gScore.get(currentKey) || 0) + this.gridSize;
                
                const existingG = gScore.get(key);
                if (existingG === undefined || tentativeG < existingG) {
                    parents.set(key, current);
                    gScore.set(key, tentativeG);
                    fScore.set(key, tentativeG + this.dist(neighbor, end));
                    
                    if (!open.some(n => n.x === neighbor.x && n.z === neighbor.z)) {
                        open.push(neighbor);
                    }
                }
            }
        }
        
        // Pas de chemin trouvé
        return [{x: startX, z: startZ}, {x: endX, z: endZ}];
    }
    
    snap(x, z) {
        return {
            x: Math.round(x / this.gridSize) * this.gridSize,
            z: Math.round(z / this.gridSize) * this.gridSize
        };
    }
    
    dist(a, b) {
        return Math.abs(a.x - b.x) + Math.abs(a.z - b.z); // Manhattan
    }
    
    findFreeNear(x, z) {
        for (let r = 1; r <= 20; r++) {
            for (let dx = -r; dx <= r; dx++) {
                for (let dz = -r; dz <= r; dz++) {
                    if (Math.abs(dx) !== r && Math.abs(dz) !== r) continue;
                    const nx = x + dx * this.gridSize;
                    const nz = z + dz * this.gridSize;
                    if (!this.isBlocked(nx, nz)) {
                        return {x: nx, z: nz};
                    }
                }
            }
        }
        return null;
    }
    
    buildPath(parents, end, realStart, realEnd) {
        const path = [];
        let current = end;
        
        while (current) {
            path.unshift({x: current.x, z: current.z});
            const key = `${current.x},${current.z}`;
            current = parents.get(key);
        }
        
        // Remplacer par les vrais points de départ/arrivée
        path[0] = {x: realStart.x, z: realStart.z};
        path[path.length - 1] = {x: realEnd.x, z: realEnd.z};
        
        // Simplifier
        return this.simplify(path);
    }
    
    simplify(path) {
        if (path.length <= 2) return path;
        
        const result = [path[0]];
        
        for (let i = 1; i < path.length - 1; i++) {
            const prev = result[result.length - 1];
            const curr = path[i];
            const next = path[i + 1];
            
            // Vérifier alignement
            const dx1 = curr.x - prev.x;
            const dz1 = curr.z - prev.z;
            const dx2 = next.x - curr.x;
            const dz2 = next.z - curr.z;
            
            // Si pas aligné, garder le point
            if (Math.abs(dx1 * dz2 - dz1 * dx2) > 0.001) {
                result.push(curr);
            }
        }
        
        result.push(path[path.length - 1]);
        return result;
    }
}

export const pathfinder = new Pathfinder();
