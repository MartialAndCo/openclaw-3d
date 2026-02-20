import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

/**
 * CEO Animator - Contrôle manuel + Suivi de routes
 */

export class CEOAnimator {
    constructor() {
        this.model = null;
        this.mixer = null;
        this.actions = {};
        this.currentState = 'IDLE';
        this.chairZ = 0.7;
        this.walkSpeed = 1.2;

        // Pour le suivi de route
        this.currentRoute = null;
        this.currentRouteIndex = 0;
        this.onRouteComplete = null;
        this.isFollowingRoute = false;
    }

    async init(parentGroup, chairZ) {
        this.chairZ = chairZ;
        const loader = new FBXLoader();

        try {
            const [seated, standUp, sitDown, walking] = await Promise.all([
                loader.loadAsync('Seated Idle.fbx'),
                loader.loadAsync('Stand Up.fbx'),
                loader.loadAsync('Stand To Sit.fbx'),
                loader.loadAsync('Mr_Man_Walking.fbx')
            ]);

            this.model = seated;
            this.model.scale.setScalar(0.01);
            this.model.position.set(0, 0.04, chairZ);
            this.model.rotation.y = Math.PI;

            // Ajouter userData pour identification
            this.model.userData.employeeName = 'CEO';
            this.model.userData.role = 'Orchestrator';

            this.model.traverse(o => {
                if (o.isMesh) {
                    o.castShadow = true;
                    o.receiveShadow = true;
                }
            });

            parentGroup.add(this.model);

            this.mixer = new THREE.AnimationMixer(this.model);
            this.model.userData.mixer = this.mixer;
            // Provide animations array so restoreIdleAnimation doesn't crash if called
            this.model.userData.animations = [seated.animations[0]];

            this.actions.idle = this.mixer.clipAction(seated.animations[0]);
            this.actions.standUp = this.mixer.clipAction(standUp.animations[0]);
            this.actions.sitDown = this.mixer.clipAction(sitDown.animations[0]);
            this.actions.walk = this.mixer.clipAction(walking.animations[0]);

            Object.values(this.actions).forEach(action => {
                action.clampWhenFinished = true;
            });

            this.playAnim('idle', true);
            this.currentState = 'IDLE';

            console.log('[CEO] Prêt (mode manuel)');

        } catch (err) {
            console.error('[CEO] Erreur:', err);
        }
    }

    playAnim(name, loop = false) {
        const action = this.actions[name];
        if (!action) return;

        this.mixer.stopAllAction();
        action.reset();
        action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce);
        action.clampWhenFinished = !loop;
        action.play();
    }

    update(delta) {
        if (!this.mixer) return;
        this.mixer.update(delta);
        // Mouvement automatique désactivé
    }

    // ==================== SUIVI DE ROUTE ====================

    startRoute(routePoints, onComplete) {
        if (!this.model || routePoints.length < 2) {
            console.warn('[CEO] Route invalide');
            return;
        }

        console.log('[CEO] Début route:', routePoints.length, 'points');
        this.currentRoute = routePoints;
        this.currentRouteIndex = 0;
        this.onRouteComplete = onComplete;
        this.isFollowingRoute = true;

        // Se lever si nécessaire
        if (this.currentState === 'IDLE') {
            this.playAnim('standUp', false);

            setTimeout(() => {
                this.model.position.y = 0;
                this.playAnim('walk', true);
                this.currentState = 'ROUTE';
                this.processNextRoutePoint();
            }, 2000);
        } else {
            this.model.position.y = 0;
            this.playAnim('walk', true);
            this.currentState = 'ROUTE';
            this.processNextRoutePoint();
        }
    }

    processNextRoutePoint() {
        if (!this.isFollowingRoute || this.currentRouteIndex >= this.currentRoute.length - 1) {
            this.finishRoute();
            return;
        }

        const current = this.currentRoute[this.currentRouteIndex];
        const next = this.currentRoute[this.currentRouteIndex + 1];

        const dx = next.x - current.x;
        const dz = next.z - current.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        // Rotation (parallèle au trait, direction de marche)
        this.model.rotation.y = Math.atan2(dx, dz);

        // Déplacement
        const duration = (dist / this.walkSpeed) * 1000;
        const startTime = Date.now();
        const startX = current.x;
        const startZ = current.z;

        const animate = () => {
            if (!this.isFollowingRoute) return;

            const elapsed = Date.now() - startTime;
            const t = Math.min(elapsed / duration, 1);

            this.model.position.x = startX + (next.x - startX) * t;
            this.model.position.z = startZ + (next.z - startZ) * t;

            if (t < 1) {
                requestAnimationFrame(animate);
            } else {
                this.currentRouteIndex++;
                this.processNextRoutePoint();
            }
        };

        animate();
    }

    finishRoute() {
        console.log('[CEO] Route terminée');
        this.isFollowingRoute = false;
        this.currentState = 'SITTING';

        // S'asseoir
        this.playAnim('sitDown', false);

        setTimeout(() => {
            this.currentState = 'IDLE';
            this.playAnim('idle', true);
            if (this.onRouteComplete) this.onRouteComplete();
        }, 1500);
    }

    stopRoute() {
        this.isFollowingRoute = false;
        this.currentRoute = null;
        this.currentState = 'IDLE';
        this.playAnim('idle', true);
    }

    // Pour l'éditeur: téléporter le CEO
    teleportTo(x, z) {
        if (!this.model) return;
        this.model.position.x = x;
        this.model.position.z = z;
    }
}

export const ceoAnimator = new CEOAnimator();
