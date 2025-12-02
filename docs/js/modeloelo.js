import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.127.0/build/three.module.js';
import { MTLLoader } from 'https://cdn.jsdelivr.net/npm/three@0.127.0/examples/jsm/loaders/MTLLoader.js';
import { OBJLoader } from 'https://cdn.jsdelivr.net/npm/three@0.127.0/examples/jsm/loaders/OBJLoader.js';

const container = document.getElementById('container');


function getCssVarColor(name) {
    return getComputedStyle(document.body).getPropertyValue(name).trim() || '#F9F7FF';
}

const scene = new THREE.Scene();
const bgColor = getCssVarColor('--bg-hero');
scene.background = new THREE.Color(bgColor);

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
camera.position.set(0, 1, 10);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(window.devicePixelRatio);
container.appendChild(renderer.domElement);

const clock = new THREE.Clock();

scene.add(new THREE.AmbientLight(0xffffff, 0.8));
const dir = new THREE.DirectionalLight(0xffffff, 0.6);
dir.position.set(5, 10, 7.5);
scene.add(dir);

const bgGroup = new THREE.Group();
scene.add(bgGroup);

const bgPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(bgColor) })
);

bgPlane.position.z = -60;
bgGroup.add(bgPlane);

const particleCount = 60;
const particleGeo = new THREE.BufferGeometry();
const posArr = new Float32Array(particleCount * 3);
for (let i = 0; i < particleCount; i++) {
    posArr[i * 3 + 0] = (Math.random() - 0.5) * 40;
    posArr[i * 3 + 1] = (Math.random() - 0.5) * 40;
    posArr[i * 3 + 2] = (Math.random() - 0.5) * 10;
}
particleGeo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
const particles = new THREE.Points(
    particleGeo,
    new THREE.PointsMaterial({ size: 0.22, transparent: true, opacity: 0.7, color: 0x7c69a9 })
);
bgGroup.add(particles);

const lines = [];
for (let i = 0; i < 12; i++) {
    const pts = [];
    const seg = 2 + Math.floor(Math.random() * 2);
    for (let s = 0; s < seg; s++) {
        pts.push(new THREE.Vector3((Math.random() - 0.5) * 40, (Math.random() - 0.5) * 40, (Math.random() - 0.5) * 10));
    }
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    const colors = [0x7c69a9, 0x6C4BBF, 0xECE4FF];
    const mat = new THREE.LineBasicMaterial({ color: colors[Math.floor(Math.random() * colors.length)], transparent: true, opacity: 0.45 });
    const line = new THREE.Line(g, mat);
    pts.forEach(p => {
        const dot = new THREE.Mesh(new THREE.SphereGeometry(0.10, 8, 8), new THREE.MeshBasicMaterial({ color: mat.color, transparent: true, opacity: 0.65 }));
        dot.position.copy(p);
        line.add(dot);
    });
    bgGroup.add(line);
    lines.push({ line, alpha: Math.random() * 0.5 + 0.2, speed: 0.0003 + Math.random() * 0.0007 });
}

const blobs = [];
for (let i = 0; i < 3; i++) {
    const mat = new THREE.MeshBasicMaterial({ color: 0x7c69a9, transparent: true, opacity: 0.06 });
    const blob = new THREE.Mesh(new THREE.SphereGeometry(0.7 + Math.random() * 0.9, 12, 12), mat);
    blob.position.set((Math.random() - 0.5) * 40, (Math.random() - 0.5) * 40, (Math.random() - 0.5) * 10);
    bgGroup.add(blob);
    blobs.push(blob);
}

let model = null;
const mtlLoader = new MTLLoader();
mtlLoader.load('./models/elomaterno.mtl',
    materials => {
        materials.preload();
        const objLoader = new OBJLoader();
        objLoader.setMaterials(materials);
        objLoader.load('./models/elomaterno.obj',
            obj => {
                obj.scale.set(0.04, 0.04, 0.04);
                obj.rotation.set(
                    THREE.MathUtils.degToRad(90),
                    THREE.MathUtils.degToRad(180),
                    THREE.MathUtils.degToRad(90)
                );
                obj.position.set(0, 0, 0);
                scene.add(obj);
                model = obj;
            },
            undefined,
            err => console.error('Erro carregando OBJ:', err)
        );
    },
    undefined,
    err => console.error('Erro carregando MTL:', err)
);

let mouseX = 0, mouseY = 0;
const parallaxIntensity = 0.04;
container.addEventListener('mousemove', e => {
    const r = container.getBoundingClientRect();
    mouseX = ((e.clientX - r.left) / r.width - 0.5) * 2;
    mouseY = ((e.clientY - r.top) / r.height - 0.5) * 2;
});

function animateBackground(dt) {
    const parr = particleGeo.attributes.position.array;
    for (let i = 0; i < particleCount; i++) {
        parr[i * 3 + 1] += Math.sin(Date.now() * 0.0006 + i) * 0.0008;
    }
    particleGeo.attributes.position.needsUpdate = true;

    lines.forEach(l => {
        l.alpha += (Math.random() > 0.5 ? 1 : -1) * l.speed * dt * 60;
        l.alpha = Math.min(Math.max(l.alpha, 0.12), 0.55);
        l.line.material.opacity = l.alpha;
        l.line.children.forEach(c => c.material.opacity = l.alpha);
    });

    blobs.forEach(b => {
        b.position.x += Math.sin(Date.now() * 0.00025) * 0.0015;
        b.position.y += Math.cos(Date.now() * 0.0003) * 0.0015;
    });

    bgGroup.position.x += (mouseX * parallaxIntensity - bgGroup.position.x) * 0.05;
    bgGroup.position.y += (-mouseY * parallaxIntensity - bgGroup.position.y) * 0.05;
    bgGroup.rotation.z = Math.sin(Date.now() * 0.0001) * 0.002;
}

function animateModelFloat(t) {
    if (!model) return;
    const floatAmp = 0.08;
    const floatSpeed = 0.6;
    model.position.y = Math.sin(t * floatSpeed) * floatAmp;

    const wobbleAmp = 0.01;
    const wobbleSpeed = 0.4;
    model.rotation.x += Math.sin(t * wobbleSpeed) * wobbleAmp * 0.005;
    model.rotation.y += Math.cos(t * wobbleSpeed * 0.9) * wobbleAmp * 0.005;
    const baseZ = THREE.MathUtils.degToRad(90);
    model.rotation.z += (baseZ - model.rotation.z) * 0.005;
}


const themeObserver = new MutationObserver(() => {
    const newBg = getCssVarColor('--bg-hero');
    const color = new THREE.Color(newBg);
    scene.background = color;
    bgPlane.material.color.set(color);
});

themeObserver.observe(document.body, { attributes: true, attributeFilter: ['data-theme'] });

function render() {
    requestAnimationFrame(render);
    const dt = clock.getDelta();
    const t = clock.getElapsedTime();

    animateBackground(dt);
    animateModelFloat(t);

    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
}
render();


const heroSection = document.getElementById('hero');


function revealHero() {
    if (heroSection && !heroSection.classList.contains('loaded')) {
        heroSection.classList.add('loaded');
    }
}


if (model) {
    revealHero();
} else {
    
    setTimeout(revealHero, 1500);
}


function resize() {
    const r = container.getBoundingClientRect();
    const w = Math.max(1, Math.floor(r.width));
    const h = Math.max(1, Math.floor(r.height));
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
}
window.addEventListener('resize', resize);
setTimeout(resize, 50);