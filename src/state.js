import * as THREE from 'three';

export const state = {
    scene: null,
    camera: null,
    renderer: null,
    controls: null,
    clock: new THREE.Clock(),
    mixers: [],
    characters: [],
    labels: [],
    desks: [],
    ceoChairPosition: null,
    loadedCount: 0,
    totalToLoad: 1, // Sera ajusté dynamiquement selon l'activité réelle
    employeesLoaded: 0
};

export function updateLoadingProgress() {
    state.loadedCount++;
    state.employeesLoaded++;
    console.log(`Loading progress: ${state.loadedCount} / ${state.totalToLoad}`);

    const progressText = document.querySelector('.loading-progress');
    if (progressText) {
        progressText.textContent = `${state.employeesLoaded} employees loaded`;
    }

    if (state.loadedCount >= state.totalToLoad && state.totalToLoad > 1) {
        finishLoading();
    }
}

export function setTotalEmployees(count) {
    state.totalToLoad = count;
    console.log(`[State] Total employees to load: ${count}`);
    
    const progressText = document.querySelector('.loading-progress');
    if (progressText) {
        progressText.textContent = `Loading ${count} employees...`;
    }
}

export function finishLoading() {
    console.log('Loading complete!');
    // Show canvas
    const canvas = document.getElementById('canvas');
    if (canvas) {
        canvas.classList.add('visible');
    }

    // Hide loading screen
    setTimeout(() => {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
        }
    }, 500);
}

// Safety timeout - force finish after 60 seconds (large FBX models take time)
setTimeout(() => {
    if (state.loadedCount < state.totalToLoad) {
        console.warn(`Loading timeout! Only ${state.loadedCount}/${state.totalToLoad} loaded. Forcing finish.`);
        finishLoading();
    }
}, 60000);
