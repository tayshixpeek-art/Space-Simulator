// --- SPACE.JS (Графический движок) ---

// Глобальные переменные движка, которые будут доступны в script.js
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
let controls; 

const planetsGroup = new THREE.Group();
const andromedaSystemGroup = new THREE.Group();
const deepSpaceGroup = new THREE.Group();

let interactableObjects = []; // Объекты, на которые можно кликнуть
let planetObjects = [];       // Объекты для анимации вращения

// Настройки графики
const graphicsSettings = { 
    low: { segments: 8, flat: true, bump: 0 }, 
    average: { segments: 16, flat: false, bump: 0.2 }, 
    high: { segments: 32, flat: false, bump: 0.6 }, 
    ultra: { segments: 64, flat: false, bump: 1.0 } 
};
let currentGraphics = 'ultra';

function initSpaceEngine(canvasContainer) {
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    canvasContainer.appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 100000; 

    scene.add(new THREE.AmbientLight(0x0a0a0a));
    const sunLight = new THREE.PointLight(0xffffff, 2.5, 5000);
    scene.add(sunLight);
    
    const andromedaCenter = new THREE.Vector3(18000, 4000, -15000);
    const andromedaLight = new THREE.PointLight(0xffddaa, 2.5, 5000);
    andromedaLight.position.copy(andromedaCenter);
    scene.add(andromedaLight);

    setupDeepSpace(andromedaCenter);

    scene.add(planetsGroup);
    andromedaSystemGroup.position.copy(andromedaCenter);
    andromedaSystemGroup.rotation.x = 0.5;
    andromedaSystemGroup.rotation.z = -0.3;
    planetsGroup.add(andromedaSystemGroup);
}

function createCircleTexture(color, size) {
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const context = canvas.getContext('2d');
    context.beginPath(); context.arc(size/2, size/2, size/2, 0, 2 * Math.PI, false);
    context.fillStyle = color; context.fill();
    return new THREE.CanvasTexture(canvas);
}

function setupDeepSpace(andromedaCenter) {
    scene.add(deepSpaceGroup);

    const starsGeo = new THREE.BufferGeometry();
    const starsMat = new THREE.PointsMaterial({ color: 0xffffff, size: 2.5, sizeAttenuation: false, map: createCircleTexture('white', 64), transparent: true, opacity: 0.8 });
    const starsVerts = [];
    for(let i=0; i<10000; i++) {
        const r = 3000 + Math.random() * 27000; 
        const theta = Math.random() * 2 * Math.PI;
        const phi = Math.acos(2 * Math.random() - 1); 
        starsVerts.push(r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi));
    }
    starsGeo.setAttribute('position', new THREE.Float32BufferAttribute(starsVerts, 3));
    deepSpaceGroup.add(new THREE.Points(starsGeo, starsMat));

    function createGalaxy(colorHex, radius, particleCount, branches, spin, holeRadius = 0) {
        const geo = new THREE.BufferGeometry();
        const mat = new THREE.PointsMaterial({ color: colorHex, size: 12, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, map: createCircleTexture('white', 64) });
        const vertices = [];
        for(let i = 0; i < particleCount; i++) {
            const r = holeRadius + Math.pow(Math.random(), 2) * (radius - holeRadius); 
            const branchAngle = ((i % branches) / branches) * Math.PI * 2;
            const spinAngle = r * spin; 
            const randomX = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * (radius/10);
            const randomY = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * (radius/30);
            const randomZ = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * (radius/10);
            vertices.push(Math.cos(branchAngle + spinAngle) * r + randomX, randomY, Math.sin(branchAngle + spinAngle) * r + randomZ);
        }
        geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        return new THREE.Points(geo, mat);
    }

    const milkyWay = createGalaxy('#a3c2ff', 9000, 30000, 4, 0.001, 800);
    milkyWay.position.set(0, -300, 0); 
    milkyWay.rotation.z = 0.2; 
    deepSpaceGroup.add(milkyWay);

    const andromeda = createGalaxy('#ffa38f', 6000, 20000, 3, 0.0015, 200);
    andromeda.position.copy(andromedaCenter); 
    andromeda.rotation.x = 0.5; 
    andromeda.rotation.z = -0.3;
    deepSpaceGroup.add(andromeda);
}

function createSurfaceTexture(baseColorHex, isSun) {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = baseColorHex; ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 3000; i++) {
        const x = Math.random() * 512, y = Math.random() * 512, r = Math.random() * (isSun ? 12 : 6), alpha = Math.random() * (isSun ? 0.5 : 0.3);
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = isSun ? (Math.random() > 0.5 ? `rgba(255, 255, 255, ${alpha})` : `rgba(200, 50, 0, ${alpha})`) : `rgba(0, 0, 0, ${alpha})`;
        ctx.fill();
    }
    return new THREE.CanvasTexture(canvas);
}

function createAsteroidGeometry(radius, detail) {
    const geometry = new THREE.DodecahedronGeometry(radius, detail);
    const positions = geometry.attributes.position;
    const vertex = new THREE.Vector3();
    for (let i = 0; i < positions.count; i++) {
        vertex.fromBufferAttribute(positions, i);
        vertex.multiplyScalar(1 + (Math.random() - 0.5) * 0.4);
        positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
    geometry.computeVertexNormals();
    return geometry;
}

function createOrbitLine(distance, opacity = 0.3) {
    const curve = new THREE.EllipseCurve(0, 0, distance, distance, 0, 2 * Math.PI, false, 0);
    const points = curve.getPoints(100);
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: 0x555555, transparent: true, opacity: opacity }));
    line.rotation.x = Math.PI / 2;
    return line;
}

// Эта функция принимает данные из JSON и строит систему
function buildPlanetarySystem(planetDataArray) {
    while(planetsGroup.children.length > 1) planetsGroup.remove(planetsGroup.children[1]); 
    while(andromedaSystemGroup.children.length > 0) andromedaSystemGroup.remove(andromedaSystemGroup.children[0]);
    
    interactableObjects.length = 0;
    planetObjects.length = 0;
    const config = graphicsSettings[currentGraphics];

    planetDataArray.forEach(data => {
        const pivot = new THREE.Group();
        if (data.system === "andromeda") andromedaSystemGroup.add(pivot);
        else planetsGroup.add(pivot);

        if (data.distance > 0) pivot.add(createOrbitLine(data.distance, data.system === "andromeda" ? 0.6 : 0.3));

        const geometry = new THREE.SphereGeometry(data.radius, config.segments, config.segments);
        const surfaceTex = createSurfaceTexture(data.color, data.isStar);
        let material = data.isStar ? 
            new THREE.MeshBasicMaterial({ map: surfaceTex, wireframe: currentGraphics === 'low' }) : 
            new THREE.MeshStandardMaterial({ map: surfaceTex, bumpMap: surfaceTex, bumpScale: config.bump, flatShading: config.flat, roughness: currentGraphics === 'average' ? 1.0 : 0.7 });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.userData = { name: data.name, description: data.desc, radius: data.radius, img: data.img, system: data.system };
        mesh.position.set(Math.cos(data.angle) * data.distance, 0, Math.sin(data.angle) * data.distance);
        pivot.add(mesh);
        
        planetObjects.push({ mesh: mesh, pivot: pivot, data: data, moons: [] });
        interactableObjects.push(mesh);

        if (data.hasRing) {
            const ringGeo = new THREE.RingGeometry(data.radius * 1.3, data.radius * 2.4, config.segments);
            const ringMat = new THREE.MeshBasicMaterial({ color: data.ringColor, side: THREE.DoubleSide, transparent: true, opacity: 0.6 });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.rotation.x = Math.PI / 2 + 0.3; 
            mesh.add(ring); 
        }

        if (data.hasMoon) {
            const moonMat = new THREE.MeshStandardMaterial({ map: createSurfaceTexture('#cccccc', false), bumpScale: config.bump, flatShading: config.flat });
            const moonGeo = createAsteroidGeometry(2.0, currentGraphics === 'low' ? 0 : 2);
            const moon = new THREE.Mesh(moonGeo, moonMat);
            moon.userData = { name: "Moon", description: "Луна — единственный естественный спутник Земли. Находится в приливном захвате.", radius: 2.0, img: 'https://upload.wikimedia.org/wikipedia/commons/e/e1/FullMoon2010.jpg' };
            moon.position.set(15, 0, 0); 
            mesh.add(moon);
            planetObjects[planetObjects.length - 1].moons.push({ mesh: moon, speed: 0.05, distance: 15, angle: 0 });
            interactableObjects.push(moon);
        }

        if (data.hasMoons) {
            data.hasMoons.forEach((mData, index) => {
                const moonMat = new THREE.MeshStandardMaterial({ map: createSurfaceTexture('#aaaaaa', false), bumpScale: config.bump, flatShading: config.flat });
                const mGeo = createAsteroidGeometry(mData.rad, currentGraphics === 'low' ? 0 : 2);
                const moon = new THREE.Mesh(mGeo, moonMat);
                moon.userData = { name: mData.name, description: mData.desc || `Спутник планеты ${data.name}.`, radius: mData.rad, img: 'https://upload.wikimedia.org/wikipedia/commons/1/18/Phobos_colour_2008.jpg' };
                moon.position.set(mData.dist, 0, 0);
                mesh.add(moon);
                planetObjects[planetObjects.length - 1].moons.push({ mesh: moon, speed: mData.speed, distance: mData.dist, angle: index * Math.PI });
                interactableObjects.push(moon);
            });
        }
    });
}
