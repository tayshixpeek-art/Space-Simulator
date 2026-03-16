// --- SCRIPT.JS (Логика и UI) ---

const ui = {
    mainMenu: document.getElementById('main-menu'), settings: document.getElementById('settings-menu'),
    console: document.getElementById('console-menu'), canvas: document.getElementById('canvas-container'),
    game: document.getElementById('game-ui'), planetBtnCont: document.getElementById('planet-info-btn-container'),
    modal: document.getElementById('planet-modal'), log: document.getElementById('console-log'),
    btnReset: document.getElementById('btn-reset-view'), btnTime: document.getElementById('btn-toggle-time')
};

let isSimulationRunning = false;
let isTimeRunning = true; 
let selectedPlanet = null;
let previousTargetPosition = new THREE.Vector3(); 
let currentLoadedData = []; 

function logInfo(msg) {
    ui.log.innerHTML += `<div>[${new Date().toLocaleTimeString()}] > ${msg}</div>`;
    ui.log.scrollTop = ui.log.scrollHeight;
}

// ПУТЬ ИЗМЕНЕН: теперь ищем JSON в папке Description
fetch('Description/planets.json')
    .then(response => {
        if (!response.ok) throw new Error("JSON не найден. Вы запустили через локальный сервер?");
        return response.json();
    })
    .then(data => {
        currentLoadedData = data;
        logInfo('Data loaded from JSON.');
        initSpaceEngine(ui.canvas);
        buildPlanetarySystem(currentLoadedData);
        resetCameraLogic();
        animate(); 
    })
    .catch(error => {
        console.error(error);
        logInfo(`<span style="color:red">Ошибка загрузки: ${error.message}</span>`);
    });

// --- Управление UI ---
document.getElementById('btn-start').onclick = () => { ui.mainMenu.classList.add('hidden'); ui.canvas.style.display = 'block'; ui.game.classList.remove('hidden'); isSimulationRunning = true; logInfo('Simulation started.'); };
document.getElementById('btn-settings').onclick = () => { ui.mainMenu.classList.add('hidden'); ui.settings.classList.remove('hidden'); };
document.getElementById('btn-settings-back').onclick = () => { ui.settings.classList.add('hidden'); ui.mainMenu.classList.remove('hidden'); };
document.getElementById('btn-console').onclick = () => { ui.mainMenu.classList.add('hidden'); ui.console.classList.remove('hidden'); };
document.getElementById('btn-console-back').onclick = () => { ui.console.classList.add('hidden'); ui.mainMenu.classList.remove('hidden'); };
document.getElementById('btn-exit').onclick = () => { isSimulationRunning = false; ui.canvas.style.display = 'none'; ui.game.classList.add('hidden'); ui.planetBtnCont.classList.add('hidden'); ui.modal.classList.add('hidden'); ui.mainMenu.classList.remove('hidden'); resetCameraLogic(); logInfo('Exited to menu.'); };
document.getElementById('btn-close-modal').onclick = () => ui.modal.classList.add('hidden');

ui.btnTime.onclick = () => {
    isTimeRunning = !isTimeRunning;
    ui.btnTime.innerText = isTimeRunning ? "Pause Time" : "Resume Time";
    ui.btnTime.style.borderColor = isTimeRunning ? "#fff" : "#ff4444";
    ui.btnTime.style.color = isTimeRunning ? "#fff" : "#ff4444";
    logInfo(isTimeRunning ? 'Time resumed.' : 'Time paused.');
};

function resetCameraLogic() {
    if(camera && controls) {
        camera.position.set(0, 200, 400);
        controls.target.set(0, 0, 0);
    }
    selectedPlanet = null; 
    ui.btnReset.classList.add('hidden');
    ui.planetBtnCont.classList.add('hidden');
}
document.getElementById('btn-reset-view').onclick = resetCameraLogic;

document.getElementById('graphics-select').onchange = (e) => { 
    currentGraphics = e.target.value; 
    buildPlanetarySystem(currentLoadedData); 
    logInfo(`Graphics set to ${currentGraphics}`);
};
document.getElementById('toggle-stars').onchange = (e) => deepSpaceGroup.visible = e.target.checked;
document.getElementById('toggle-planets').onchange = (e) => planetsGroup.visible = e.target.checked;

// --- Система кликов ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let clickStartX = 0;
let clickStartY = 0;

window.addEventListener('pointerdown', (e) => {
    if (e.target.tagName === 'BUTTON') return;
    clickStartX = e.clientX;
    clickStartY = e.clientY;
});

window.addEventListener('pointerup', (e) => {
    if (!isSimulationRunning || e.target.tagName === 'BUTTON' || !ui.modal.classList.contains('hidden')) return;

    const distance = Math.hypot(e.clientX - clickStartX, e.clientY - clickStartY);
    if (distance > 5) return; 

    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(interactableObjects);

    if (intersects.length > 0) {
        const obj = intersects[0].object;
        const newPlanetData = obj.userData;
        
        ui.btnReset.classList.remove('hidden');
        
        if (!selectedPlanet || selectedPlanet.name !== newPlanetData.name) {
            selectedPlanet = newPlanetData;
            const targetPos = new THREE.Vector3();
            obj.getWorldPosition(targetPos);
            
            camera.position.set(targetPos.x + selectedPlanet.radius * 3, targetPos.y + selectedPlanet.radius * 1.5, targetPos.z + selectedPlanet.radius * 3);
            controls.target.copy(targetPos);
            previousTargetPosition.copy(targetPos); 
        }

        document.getElementById('selected-planet-name').innerText = selectedPlanet.name;
        ui.planetBtnCont.classList.remove('hidden');
        logInfo(`Focused on: ${selectedPlanet.name}`);
    } else {
        selectedPlanet = null;
        ui.planetBtnCont.classList.add('hidden');
    }
});

document.getElementById('btn-about-planet').onclick = () => {
    if (selectedPlanet) {
        document.getElementById('modal-title').innerText = selectedPlanet.name;
        document.getElementById('modal-desc').innerText = selectedPlanet.description;
        document.getElementById('modal-image').src = selectedPlanet.img;
        ui.modal.classList.remove('hidden');
        ui.planetBtnCont.classList.add('hidden');
    }
};

window.addEventListener('resize', () => {
    if(camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight; 
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
});

function animate() {
    requestAnimationFrame(animate);
    if (isSimulationRunning) {
        if (isTimeRunning) {
            planetObjects.forEach(planet => {
                planet.pivot.rotation.y += planet.data.speed;
                planet.mesh.rotation.y += 0.005; 
                planet.moons.forEach(moon => {
                    moon.mesh.rotation.y += moon.speed;
                    moon.angle += moon.speed;
                    moon.mesh.position.set(Math.cos(moon.angle) * moon.distance, 0, Math.sin(moon.angle) * moon.distance);
                });
            });
        }
        
        if (selectedPlanet && isTimeRunning) {
            const targetPlanet = planetObjects.find(p => p.data.name === selectedPlanet.name);
            let targetMesh = targetPlanet ? targetPlanet.mesh : null;
            if (!targetMesh) {
                planetObjects.forEach(p => {
                    const foundMoon = p.moons.find(m => m.mesh.userData.name === selectedPlanet.name);
                    if (foundMoon) targetMesh = foundMoon.mesh;
                });
            }

            if (targetMesh) {
                const currentTargetPos = new THREE.Vector3();
                targetMesh.getWorldPosition(currentTargetPos);
                const delta = new THREE.Vector3().subVectors(currentTargetPos, previousTargetPosition);
                
                controls.target.add(delta);
                camera.position.add(delta);
                previousTargetPosition.copy(currentTargetPos);
            }
        }
        controls.update();
    }
    renderer.render(scene, camera);
}
