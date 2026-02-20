import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { state, updateLoadingProgress } from '../state.js';
import { ceoAnimator } from './ceoAnimator.js';
import { registerClickableAgent } from '../interactions/agentClick.js';

export function loadCharacter(url, position, label) {
    const loader = new GLTFLoader();

    loader.load(url, (gltf) => {
        const model = gltf.scene;
        model.scale.setScalar(1.0);
        model.position.set(position.x, 0, position.z);

        // Keep ALL original materials intact
        model.traverse((o) => {
            if (!o.isMesh) return;
            const n = o.name.toLowerCase();
            if (n.includes('shadow') || n.includes('blob') || n.includes('decal')) {
                o.visible = false;
                return;
            }

            const mats = Array.isArray(o.material) ? o.material : [o.material];
            mats.forEach(mat => {
                if (!mat) return;
                mat.transparent = false;
                mat.alphaTest = 0;
                mat.depthWrite = true;
                mat.side = THREE.FrontSide;
                mat.needsUpdate = true;
            });

            o.castShadow = true;
            o.receiveShadow = true;
        });

        state.scene.add(model);
        state.characters.push(model);

        if (gltf.animations.length > 0) {
            const mixer = new THREE.AnimationMixer(model);
            const clip = gltf.animations.find(c => /walk/i.test(c.name))
                || gltf.animations.find(c => /run/i.test(c.name))
                || gltf.animations[0];
            mixer.clipAction(clip).play();
            state.mixers.push(mixer);
        }

    }, undefined, (err) => {
        console.error('[Character] Load error:', err);
    });
}


const SKIN_MAP = {
    // Mixamo (forward=+Z) → rotate Math.PI to face desk monitor
    'base': { path: '', idle: 'Seated Idle.fbx', rotation: Math.PI },
    // AvatarSDK skins — same Math.PI as base skin; render loop enforces it every frame
    '2': { path: 'extra-skins/2/', idle: 'Seated Idle (1).fbx', rotation: Math.PI },
    '3': { path: 'extra-skins/3/', idle: 'Seated Idle (1).fbx', rotation: Math.PI },
    '4': { path: 'extra-skins/4/', idle: 'Seated Idle (1).fbx', rotation: Math.PI },
    'n1': { path: 'extra-skins/n1/', idle: 'Seated Idle (1).fbx', rotation: Math.PI }
};

const HEAD_SKINS = {
    'Head of Biz (COO)': '2',
    'Head of Tech (CTO)': '3',
    'Head of Security (CISO)': '4',
    'Head of Personal (COS)': 'base', // n1 persistently invisible — using base until fixed
    'Head of Growth (MB)': 'base'
};

// Generic agents use 'base' skin (confirmed working). Only the 5 Head roles get unique skins.
const AVAILABLE_SKINS = ['base'];

// Cache the computed auto-scale and raw height per skinId so we only compute once
const skinScaleCache = {};

function applyFbxSetup(fbx, skinId) {
    const skinConfig = SKIN_MAP[skinId];
    fbx.rotation.y = skinConfig.rotation !== undefined ? skinConfig.rotation : Math.PI;

    // Auto-scale: target 1.7m regardless of whether FBX is in cm or m
    if (!skinScaleCache[skinId]) {
        const bbox = new THREE.Box3().setFromObject(fbx);
        const rawHeight = bbox.max.y - bbox.min.y;
        const autoScale = rawHeight > 0 ? 1.7 / rawHeight : 0.01;
        skinScaleCache[skinId] = autoScale;
        console.log(`[Employee] Skin '${skinId}' raw height: ${rawHeight.toFixed(2)} → scale: ${autoScale.toFixed(4)}`);
    }
    fbx.scale.setScalar(skinScaleCache[skinId]);

    // Performance: hide ultra-fine detail submeshes invisible at normal scene distance.
    // Eyelashes, corneas, teeth add ~20-30% vertex count with no visible benefit from 2m+ away.
    const HIDE_MESHES = ['avatareyelashes', 'avatarleftcornea', 'avatarrightcornea',
        'avatarteethlowr', 'avatarteethupper', 'avatarteethlow',
        'avatarteethup', 'avatarteeth'];

    // Fix materials
    fbx.traverse((o) => {
        if (!o.isMesh && !o.isSkinnedMesh) return;

        // Hide invisible micro-detail meshes
        const lname = o.name.toLowerCase();
        if (HIDE_MESHES.some(h => lname.includes(h))) {
            o.visible = false;
            return;
        }

        o.frustumCulled = false; // Disable frustum culling (bounding sphere is often wrong for skinned meshes)
        o.castShadow = true;
        o.receiveShadow = true;

        const mats = Array.isArray(o.material) ? o.material : [o.material];
        const newMats = mats.map(mat => {
            if (!mat) return mat;
            const newMat = mat.clone();
            newMat.transparent = false;
            newMat.opacity = 1;      // Force fully opaque — RPM/Unity exports may have opacity=0
            newMat.alphaTest = 0;
            newMat.depthWrite = true;
            newMat.side = THREE.FrontSide;
            newMat.visible = true;   // Ensure material itself is not hidden
            newMat.needsUpdate = true;
            return newMat;
        });
        o.material = newMats.length === 1 ? newMats[0] : newMats;
        o.visible = true; // Re-force mesh visibility after material assignment
    });

    return fbx;
}

export async function loadSeatedEmployeeAtDesk(parentGroup, chairZ, name) {
    const skinId = HEAD_SKINS[name] || AVAILABLE_SKINS[Math.floor(Math.random() * AVAILABLE_SKINS.length)];
    const skinConfig = SKIN_MAP[skinId];
    const fullUrl = skinConfig.path + skinConfig.idle; // No cache-busting: let browser cache serve repeated requests

    return new Promise((resolve) => {
        const loader = new FBXLoader();
        loader.setResourcePath(skinConfig.path || '');

        loader.load(fullUrl, (fbx) => {
            // Setup scale, rotation, materials on this fresh instance
            applyFbxSetup(fbx, skinId);

            fbx.userData.skinId = skinId;
            fbx.userData.employeeName = name;

            // Apply position within desk group
            fbx.position.set(0, 0.04, chairZ);

            parentGroup.add(fbx);

            // DEBUG: for n1, log ALL nodes to find any invisible parent
            if (skinId === 'n1') {
                let nodeLog = [];
                fbx.traverse((node) => {
                    nodeLog.push(`[${node.type}] "${node.name}" visible=${node.visible} pos=(${node.position.x.toFixed(2)},${node.position.y.toFixed(2)},${node.position.z.toFixed(2)})`);
                });
                console.log(`[n1 DEBUG] ${nodeLog.length} nodes:\n${nodeLog.join('\n')}`);
            }

            // Play sitting animation
            if (fbx.animations && fbx.animations.length > 0) {
                const mixer = new THREE.AnimationMixer(fbx);
                const clip = fbx.animations[0];

                // DIAGNOSTIC: log ALL animation track names to find root-targeting ones.
                // In Three.js AnimationMixer, tracks targeting the ROOT object have names
                // starting with a dot: ".quaternion", ".position", ".scale"
                // Tracks targeting bones look like "Hips.quaternion" (no leading dot).
                const trackNames = clip.tracks.map(t => t.name);
                const rootTracks = trackNames.filter(n => n.startsWith('.'));
                const boneTracks = trackNames.filter(n => !n.startsWith('.'));
                console.log(`[DIAG TRACKS skin:'${skinId}'] Total: ${clip.tracks.length}, root(.xxx): ${rootTracks.length}, bone: ${boneTracks.length}`);
                if (rootTracks.length > 0) console.log(`  Root tracks: [${rootTracks.join(', ')}]`);
                console.log(`  Bone tracks (first 5): [${boneTracks.slice(0, 5).join(', ')}]`);

                // Strip root-level rotation/quaternion tracks — these target the FBX Group
                // itself and will override fbx.rotation.y every frame.
                const toStrip = new Set(['.quaternion', '.position', '.scale']);
                const before = clip.tracks.length;
                clip.tracks = clip.tracks.filter(t => !toStrip.has(t.name));
                const stripped = before - clip.tracks.length;
                if (stripped > 0) console.log(`[Employee] Stripped ${stripped} root-level track(s) for skin '${skinId}'`);

                const action = mixer.clipAction(clip);
                action.play();

                // Store desired rotation in userData.targetRotationY so the render loop
                // can re-enforce it every frame AFTER mixer.update(delta) — the same
                // mechanism that makes the console fix work.
                const desiredRotation = skinConfig.rotation !== undefined ? skinConfig.rotation : Math.PI;
                fbx.userData.targetRotationY = desiredRotation;
                fbx.userData.isSeatedIdle = true;  // gates per-frame enforcement
                fbx.rotation.y = desiredRotation;

                state.mixers.push(mixer);
                fbx.userData.mixer = mixer;
                fbx.userData.animations = fbx.animations;
            }

            // DIAGNOSTIC: log final rotation state
            console.log(`[DIAG skin:'${skinId}'] fbx.rotation.y=${fbx.rotation.y.toFixed(3)}, targetRotationY=${fbx.userData.targetRotationY}`);

            // Register clickable
            registerClickableAgent(fbx, name, 'Agent', 'Unknown');

            console.log(`[Employee] ${name} seated (skin: ${skinId})`);
            updateLoadingProgress();
            resolve(fbx);

        }, undefined, (error) => {
            console.error(`[FBXLoader] Failed to load ${fullUrl}`, error);
            updateLoadingProgress(); // Still count it so we don't block the loading screen
            resolve(null);
        });
    });
}

/**
 * Charge le CEO avec son système d'animation séquentiel
 * Séquence: Idle → Stand Up → Walk → Turn → Walk Back → Sit Down → Loop
 */
export function loadCEOWithAnimation(parentGroup, chairZ) {
    // Initialiser l'animator CEO
    ceoAnimator.init(parentGroup, chairZ).then(() => {
        console.log('[CEO] Animation séquentielle prête');
        updateLoadingProgress();
    }).catch(err => {
        console.error('[CEO] Erreur init:', err);
        updateLoadingProgress();
    });
}
