import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { state } from '../state.js';
import { loadSitAnimations, getRandomSitAnimation } from './sitAnimations.js';
import { delegationTracker } from '../api/delegationTracker.js';

/**
 * Animator simplifié qui fonctionne avec les mêmes FBX que le CEO
 * S'enregistre automatiquement dans le delegationTracker pour les animations de délégation
 */

let globalAnimationCaches = {};
let globalAnimationPromises = {};

export class EmployeeAnimator {
    constructor(model, deskGroup) {
        this.model = model;
        this.deskGroup = deskGroup;
        this.isAnimating = false;

        // Mixer sera créé quand on charge les anims
        this.mixer = null;
        this.actions = {};

        // Sauver position initiale
        this.startLocalPos = model.position.clone();
        this.startLocalRot = model.rotation.clone();

        // Récupérer le nom de l'employé depuis le modèle
        const employeeName = model.userData?.employeeName || model.userData?.skinId || 'unknown';
        
        // S'enregistrer dans le delegation tracker
        delegationTracker.registerEmployeeAnimator(employeeName, this);
        
        console.log('[EmployeeAnimator] Créé pour:', employeeName);
    }

    update(delta) {
        if (this.mixer) {
            this.mixer.update(delta);
        }
    }

    // ... (other methods remain unchanged)

    async executeRoute(routePoints, finalRotationY = null, routeName = '', chairIndex = 0) {
        if (this.isAnimating || routePoints.length < 2) return;
        this.isAnimating = true;

        // Suspend per-frame rotation lock during movement — walkAlong will set its own rotation
        this.model.userData.isSeatedIdle = false;

        // Détecter le type de route
        const routeNameUpper = routeName ? routeName.toUpperCase() : '';
        const isDoorRoute = routeNameUpper.includes('PORTE');
        const isWarRoomRoute = routeNameUpper.includes('WAR ROOM');
        const isEntering = routeNameUpper.indexOf('PORTE') < routeNameUpper.indexOf('→') && routeNameUpper.includes('PORTE');
        const isExiting = routeNameUpper.indexOf('PORTE') > routeNameUpper.indexOf('→') && routeNameUpper.includes('PORTE');

        console.log('[Employee] Route:', routeName);

        // Détacher pour animation libre (si pas déjà détaché)
        const worldPos = new THREE.Vector3();
        this.model.getWorldPosition(worldPos);

        if (this.model.parent === this.deskGroup) {
            // Attaché au bureau, besoin de détacher
            const worldRot = this.model.getWorldQuaternion(new THREE.Quaternion());
            state.scene.attach(this.model);
            this.model.position.copy(worldPos);
            this.model.quaternion.copy(worldRot);
        }
        // Sinon déjà détaché (War Room), on garde la position actuelle

        // Sauver la position de départ exacte (mondiale)
        const exactStartPos = worldPos.clone();

        try {
            await this.loadAnimations();

            // Fix T-Pose Glitch: stop the idle animation ONLY AFTER animations are loaded
            if (this.model.userData.mixer) {
                console.log('[Employee] Arrêt de l\'animation idle existante (depuis cache prêt)');
                this.model.userData.mixer.stopAllAction();
                // We keep the mixer object in case we need to restore it, 
                // but we let loadAnimations assign the new behavior.
            }

            if (isExiting) {
                await this.animateExit(routePoints, exactStartPos);
            } else if (isEntering) {
                await this.animateEnter(routePoints);
            } else if (isWarRoomRoute) {
                await this.animateWarRoom(routePoints, exactStartPos, finalRotationY, chairIndex);
            } else {
                await this.animateConversation(routePoints, finalRotationY, exactStartPos);
            }

        } catch (err) {
            console.error('[Employee] Erreur:', err);
        }

        if (isExiting) {
            console.log('[Employee] Employé reste dehors (sortie)');
            this.isAnimating = false;
            return;
        }

        if (isWarRoomRoute) {
            console.log('[Employee] Employé reste au War Room');
            this.isAnimating = false;
            return;
        }

        // Remettre dans le deskGroup
        this.deskGroup.attach(this.model);
        // La conversion monde->local par attach devrait nous donner la bonne position
        // On ne force pas pour éviter la téléportation
        this.model.visible = true;

        // Restaurer l'animation idle assise
        this.restoreIdleAnimation();

        this.isAnimating = false;

        console.log('[Employee] Fin route - visible:', this.model.visible);
    }

    async animateExit(routePoints, exactStartPos) {
        console.log('[Employee] Animation SORTIE');

        // Pas de téléportation, se lever sur place
        await this.playAnimOnceThenCrossFade('standUp', 'walk', 0.3);
        this.model.position.y = 0;

        await this.walkAlong(routePoints);
        await this.animateDoor('open');
        await this.playAnimLoopFor('walk', 500);
        this.model.visible = false;
        await this.animateDoor('close');

        console.log('[Employee] Employé sorti');
    }

    async animateEnter(routePoints) {
        console.log('[Employee] Animation ENTRÉE');

        this.model.position.set(routePoints[0].x, 0, routePoints[0].z);
        this.model.visible = true;

        await this.animateDoor('open');
        this.playAnimLoop('walk');
        await this.walkAlong(routePoints);

        this.deskGroup.attach(this.model);
        this.model.position.copy(this.startLocalPos);
        this.model.rotation.copy(this.startLocalRot);
        await this.playAnimOnce('sitDown');
        this.restoreIdleAnimation();
    }

    async animateWarRoom(routePoints, exactStartPos, finalRotationY, chairIndex = 0) {
        console.log('[Employee] === WAR ROOM START ===');

        // Position de départ
        // 1. SE LEVER
        // Ne pas tourner ou se téléporter avant d'être debout pour éviter de "glisser" assis
        await this.playAnimOnceThenCrossFade('standUp', 'standIdle', 0.2);
        this.model.position.y = 0;

        // 2. MARCHER
        this.actions.walk.reset();
        this.actions.walk.setLoop(THREE.LoopRepeat, Infinity);
        this.actions.standIdle.crossFadeTo(this.actions.walk, 0.3, true);
        this.actions.walk.play();

        await this.walkAlong(routePoints);
        // 3. S'ASSEOIR
        // UTILISER LA ROTATION EXACTE DE LA CHAISE (car c'est là qu'ils s'assoient physiquement)
        // Calculer la rotation de la chaise (fallback)
        const angle = (chairIndex / 6) * Math.PI * 2;
        const chairRotation = Math.PI / 2 - angle;
        // La chaise fait face à la table, l'avatar doit s'asseoir avec la même orientation 
        this.model.rotation.y = chairRotation;

        await this.playAnimOnce('sitDown');

        // 4. MAINTENIR LA POSE ASSISE
        this.maintainSittingPose();
    }

    async playRandomSitIdle() {
        const availableAnims = await loadSitAnimations();

        if (availableAnims.length > 0) {
            const randomAnim = getRandomSitAnimation();
            console.log(`[Employee] Pose assise: ${randomAnim.name}`);

            const action = this.mixer.clipAction(randomAnim.clip);
            action.setLoop(THREE.LoopRepeat, Infinity);
            action.reset();
            action.play();
        } else {
            console.log('[Employee] Pose: maintien position assise');
            this.maintainSittingPose();
        }
    }

    async animateConversation(routePoints, finalRotationY, exactStartPos) {
        console.log('[Employee] Animation CONVERSATION');

        await this.playAnimOnceThenCrossFade('standUp', 'walk', 0.3);
        this.model.position.y = 0;

        await this.walkAlong(routePoints);

        if (finalRotationY !== null) {
            this.model.rotation.y = finalRotationY + Math.PI;
        }

        await this.playAnimLoopFor('talk', 3000);
        await this.rotate180();

        this.playAnimLoop('walk');
        const reversed = [...routePoints].reverse();
        reversed.push({ x: exactStartPos.x, z: exactStartPos.z });
        await this.walkAlong(reversed);

        this.deskGroup.attach(this.model);
        this.model.rotation.copy(this.startLocalRot);
        await this.playAnimOnce('sitDown');
    }

    orientTowards(targetPoint) {
        if (!targetPoint) return;
        const currentPos = this.model.position;
        const dx = targetPoint.x - currentPos.x;
        const dz = targetPoint.z - currentPos.z;
        const angle = Math.atan2(dx, dz);
        this.model.rotation.y = angle - Math.PI;
    }

    async animateDoor(action) {
        let doorPanel = null;
        state.scene.traverse((obj) => {
            if (obj.name?.toLowerCase().includes('door') || obj.userData?.isDoor) {
                doorPanel = obj;
            }
        });

        if (!doorPanel) {
            await this.wait(500);
            return;
        }

        const doorWidth = 1.2;
        const hingeX = -doorWidth / 2;

        const startRot = action === 'open' ? 0 : Math.PI / 2;
        const endRot = action === 'open' ? Math.PI / 2 : 0;
        const duration = 500;
        const startTime = Date.now();
        const baseZ = doorPanel.position.z;

        return new Promise((resolve) => {
            const animate = () => {
                const t = Math.min((Date.now() - startTime) / duration, 1);
                const easeT = t * (2 - t);
                const currentRot = startRot + (endRot - startRot) * easeT;

                doorPanel.rotation.y = currentRot;
                doorPanel.position.x = hingeX + (doorWidth / 2) * Math.cos(currentRot);
                doorPanel.position.z = baseZ + (doorWidth / 2) * Math.sin(currentRot);

                if (t < 1) {
                    requestAnimationFrame(animate);
                } else {
                    resolve();
                }
            };
            animate();
        });
    }

    async loadAnimations() {
        if (this.actions.standUp) return;

        const skinId = this.model.userData.skinId || 'base';

        if (!globalAnimationCaches[skinId]) {
            if (!globalAnimationPromises[skinId]) {
                globalAnimationPromises[skinId] = new Promise(async (resolve, reject) => {
                    const loader = new FBXLoader();
                    console.log(`[Employee] Chargement des animations pour la skin ${skinId}...`);
                    try {
                        let standUpFile = 'Stand Up.fbx';
                        let walkFile = 'Mr_Man_Walking.fbx';
                        let sitDownFile = 'Stand To Sit.fbx';
                        let talkFile = 'Talking.fbx';

                        if (skinId !== 'base') {
                            const path = `extra-skins/${skinId}/`;
                            standUpFile = path + 'Sit To Stand.fbx';
                            walkFile = path + 'Walking.fbx';
                            sitDownFile = path + 'Stand To Sit (1).fbx';
                            talkFile = path + 'Talking (1).fbx';
                        }

                        const [standUp, walking, sitDown, talking] = await Promise.all([
                            loader.loadAsync(standUpFile),
                            loader.loadAsync(walkFile),
                            loader.loadAsync(sitDownFile),
                            loader.loadAsync(talkFile)
                        ]);
                        globalAnimationCaches[skinId] = {
                            standUp: standUp.animations[0],
                            walk: walking.animations[0],
                            sitDown: sitDown.animations[0],
                            talk: talking.animations[0]
                        };
                        resolve(globalAnimationCaches[skinId]);
                    } catch (err) {
                        reject(err);
                    }
                });
            }
            await globalAnimationPromises[skinId];
        }

        try {
            const anims = globalAnimationCaches[skinId];

            if (this.model.userData.mixer) {
                console.log('[Employee] Réutilisation du mixer existant');
                this.mixer = this.model.userData.mixer;
            } else {
                this.mixer = new THREE.AnimationMixer(this.model);
                this.model.userData.mixer = this.mixer;
            }

            // N'ajouter le mixer qu'une seule fois à state.mixers
            if (!state.mixers.includes(this.mixer)) {
                state.mixers.push(this.mixer);
            }

            this.actions.standUp = this.retargetAnimation(anims.standUp);
            this.actions.walk = this.retargetAnimation(anims.walk);
            this.actions.sitDown = this.retargetAnimation(anims.sitDown);
            this.actions.talk = this.retargetAnimation(anims.talk);

            this.actions.standIdle = this.createStandIdleAction(anims.standUp);

            console.log(`[Employee] Animations prêtes (depuis cache pour ${skinId})`);

        } catch (err) {
            console.error(`[Employee] Erreur chargement cache pour ${skinId}:`, err);
        }
    }

    retargetAnimation(sourceClip) {
        const newClip = sourceClip.clone();
        return this.mixer.clipAction(newClip);
    }

    createStandIdleAction(standUpClip) {
        const duration = 1;
        const tracks = [];

        standUpClip.tracks.forEach(track => {
            const trackName = track.name;
            const valueSize = track.getValueSize();
            const lastValues = [];

            for (let i = 0; i < valueSize; i++) {
                lastValues.push(track.values[track.values.length - valueSize + i]);
            }

            const values = [];
            const times = [0, duration];

            for (let t of times) {
                for (let v of lastValues) {
                    values.push(v);
                }
            }

            const newTrack = new track.constructor(trackName, times, values);
            tracks.push(newTrack);
        });

        const idleClip = new THREE.AnimationClip('standIdle', duration, tracks);
        const action = this.mixer.clipAction(idleClip);
        action.setLoop(THREE.LoopRepeat, Infinity);
        return action;
    }

    maintainSittingPose() {
        // Réutiliser l'action sitIdle si déjà créée
        if (this.actions.sitIdle) {
            this.mixer.stopAllAction();
            this.actions.sitIdle.reset();
            this.actions.sitIdle.play();
            return;
        }

        if (!this.actions.sitDown) return;

        const sitClip = this.actions.sitDown.getClip();
        const duration = 1;
        const tracks = [];

        sitClip.tracks.forEach(track => {
            const trackName = track.name;
            const valueSize = track.getValueSize();
            const lastValues = [];

            for (let i = 0; i < valueSize; i++) {
                lastValues.push(track.values[track.values.length - valueSize + i]);
            }

            const values = [];
            const times = [0, duration];

            for (let t of times) {
                for (let v of lastValues) {
                    values.push(v);
                }
            }

            const newTrack = new track.constructor(trackName, times, values);
            tracks.push(newTrack);
        });

        const sitIdleClip = new THREE.AnimationClip('sitIdle', duration, tracks);
        const action = this.mixer.clipAction(sitIdleClip);
        action.setLoop(THREE.LoopRepeat, Infinity);

        this.mixer.stopAllAction();
        action.reset();
        action.play();

        this.actions.sitIdle = action;
    }

    playAnimOnce(name) {
        return new Promise((resolve) => {
            const action = this.actions[name];
            if (!action) {
                console.warn('[Employee] Action non trouvée:', name);
                resolve();
                return;
            }

            console.log('[Employee] Play once:', name);

            this.mixer.stopAllAction();
            action.reset();
            action.setLoop(THREE.LoopOnce, 1);
            action.clampWhenFinished = true;
            action.play();

            const duration = action.getClip().duration * 1000;
            setTimeout(resolve, duration);
        });
    }

    playAnimOnceThenCrossFade(fromName, toName, fadeDuration = 0.3) {
        return new Promise((resolve) => {
            const fromAction = this.actions[fromName];
            const toAction = this.actions[toName];

            if (!fromAction || !toAction) {
                console.warn('[Employee] Action non trouvée:', fromName, toName);
                resolve();
                return;
            }

            console.log('[Employee] Play then crossfade:', fromName, '->', toName);

            this.mixer.stopAllAction();
            fromAction.reset();
            fromAction.setLoop(THREE.LoopOnce, 1);
            fromAction.clampWhenFinished = true;
            fromAction.play();

            toAction.reset();
            toAction.setLoop(THREE.LoopRepeat, Infinity);

            const clipDuration = fromAction.getClip().duration * 1000;
            const crossFadeStart = clipDuration - (fadeDuration * 1000);

            setTimeout(() => {
                fromAction.crossFadeTo(toAction, fadeDuration, true);
                toAction.play();
                resolve();
            }, Math.max(0, crossFadeStart));
        });
    }

    playAnimLoop(name) {
        const action = this.actions[name];
        if (!action) return;

        console.log('[Employee] Play loop:', name);

        this.mixer.stopAllAction();
        action.reset();
        action.setLoop(THREE.LoopRepeat, Infinity);
        action.play();
    }

    playAnimLoopFor(name, durationMs) {
        return new Promise((resolve) => {
            const action = this.actions[name];
            if (!action) {
                resolve();
                return;
            }

            this.mixer.stopAllAction();
            action.reset();
            action.setLoop(THREE.LoopRepeat, Infinity);
            action.play();

            setTimeout(() => {
                if (this.actions.standIdle) {
                    action.crossFadeTo(this.actions.standIdle, 0.3, true);
                    this.actions.standIdle.play();
                }
                resolve();
            }, durationMs);
        });
    }

    stopAnim() {
        if (this.mixer) this.mixer.stopAllAction();
    }

    walkAlong(points) {
        return new Promise((resolve) => {
            const speed = 1.5;
            let index = 0;

            const modelStartPos = { x: this.model.position.x, z: this.model.position.z };

            const next = () => {
                if (index >= points.length - 1) {
                    resolve();
                    return;
                }

                const start = index === 0 ? modelStartPos : points[index];
                const end = points[index + 1];
                const dx = end.x - start.x;
                const dz = end.z - start.z;
                const dist = Math.sqrt(dx * dx + dz * dz);
                const duration = (dist / speed) * 1000;

                const startTime = Date.now();

                const angle = Math.atan2(dx, dz);
                this.model.rotation.y = angle - Math.PI;

                const animate = () => {
                    if (!this.isAnimating) {
                        resolve();
                        return;
                    }

                    const elapsed = Date.now() - startTime;
                    const t = Math.min(elapsed / duration, 1);

                    this.model.position.x = start.x + (end.x - start.x) * t;
                    this.model.position.z = start.z + (end.z - start.z) * t;

                    if (t < 1) {
                        requestAnimationFrame(animate);
                    } else {
                        index++;
                        next();
                    }
                };

                animate();
            };

            next();
        });
    }

    rotate180() {
        return this.rotateTo(this.model.rotation.y + Math.PI);
    }

    rotateTo(targetRotationY) {
        return new Promise((resolve) => {
            const start = this.model.rotation.y;
            let diff = targetRotationY - start;
            while (diff > Math.PI) diff -= 2 * Math.PI;
            while (diff < -Math.PI) diff += 2 * Math.PI;
            const end = start + diff;

            const duration = 500;
            const startTime = Date.now();

            const animate = () => {
                const t = Math.min((Date.now() - startTime) / duration, 1);
                const easeT = t * (2 - t);
                this.model.rotation.y = start + (end - start) * easeT;
                if (t < 1) requestAnimationFrame(animate);
                else resolve();
            };
            animate();
        });
    }

    wait(ms) {
        return new Promise(r => setTimeout(r, ms));
    }

    stop() {
        this.isAnimating = false;
        if (this.mixer) this.mixer.stopAllAction();

        this.deskGroup.attach(this.model);
        this.model.position.copy(this.startLocalPos);
        this.model.rotation.copy(this.startLocalRot);
    }

    // ============================================================
    // MÉTHODES POUR LE RETOUR DE WAR ROOM
    // ============================================================

    async standUpFromChair() {
        console.log('[Employee] standUpFromChair');

        await this.loadAnimations();

        // Détacher si encore attaché au deskGroup
        if (this.model.parent === this.deskGroup) {
            const worldPos = new THREE.Vector3();
            this.model.getWorldPosition(worldPos);
            state.scene.attach(this.model);
            this.model.position.copy(worldPos);
        }

        // Se lever avec transition vers idle debout
        await this.playAnimOnceThenCrossFade('standUp', 'standIdle', 0.2);
        this.model.position.y = 0;

        console.log('[Employee] standUpFromChair terminé');
    }

    async walkAndSit(returnRoute) {
        console.log('[Employee] walkAndSit');

        await this.loadAnimations();

        // Détacher si pas déjà fait
        if (this.model.parent !== state.scene) {
            const worldPos = new THREE.Vector3();
            this.model.getWorldPosition(worldPos);
            state.scene.attach(this.model);
            this.model.position.copy(worldPos);
        }

        // Orienter vers le premier point
        if (returnRoute.length > 1) {
            this.orientTowards(returnRoute[1]);
        }

        // Crossfade vers walk
        this.actions.walk.reset();
        this.actions.walk.setLoop(THREE.LoopRepeat, Infinity);
        this.actions.standIdle.crossFadeTo(this.actions.walk, 0.3, true);
        this.actions.walk.play();

        // Marcher jusqu'à la position finale (dernier point = position exacte du siège)
        await this.walkAlong(returnRoute);

        // Arrêter walk - on est arrivé à la position exacte du siège en coordonnées monde
        this.stopAnim();

        // Attacher au deskGroup - Three.js convertit automatiquement les coordonnées monde -> local
        // Attacher au deskGroup - Three.js convertit automatiquement les coordonnées monde -> local
        this.deskGroup.attach(this.model);

        // FORCER la position de départ (la chaise) pour être sûr qu'ils "tombent" parfaitement
        this.model.position.copy(this.startLocalPos);
        this.model.rotation.copy(this.startLocalRot);

        // S'ASSEOIR
        await this.playAnimOnce('sitDown');

        // Restaurer l'animation idle assise
        this.restoreIdleAnimation();

        console.log('[Employee] walkAndSit terminé');
    }

    restoreIdleAnimation() {
        if (this.model.userData.animations && this.model.userData.animations.length > 0) {
            console.log('[Employee] Restauration animation idle assise');

            // Arrêter le mixer actuel de l'animator
            if (this.mixer) {
                this.mixer.stopAllAction();
            }

            // Réutiliser l'ancien mixer du modèle s'il existe encore
            if (this.model.userData.mixer) {
                this.model.userData.mixer.stopAllAction();
                const action = this.model.userData.mixer.clipAction(this.model.userData.animations[0]);
                action.setLoop(THREE.LoopRepeat, Infinity);
                action.play();
            } else {
                // Créer un nouveau mixer seulement si nécessaire
                const mixer = new THREE.AnimationMixer(this.model);
                const action = mixer.clipAction(this.model.userData.animations[0]);
                action.setLoop(THREE.LoopRepeat, Infinity);
                action.play();

                this.model.userData.mixer = mixer;
                // Éviter les doublons dans state.mixers
                if (!state.mixers.includes(mixer)) {
                    state.mixers.push(mixer);
                }
            }

            // Re-enable per-frame rotation enforcement now that we're seated again
            this.model.userData.isSeatedIdle = true;

            console.log('[Employee] Animation idle assise restaurée');
        } else {
            console.warn('[Employee] Pas d\'animation idle à restaurer');
        }
    }
}
