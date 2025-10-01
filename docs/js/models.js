import * as THREE from "three";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { MTLLoader } from "three/addons/loaders/MTLLoader.js";

export function initConsultModel() {
    const container = document.querySelector(".consultoria-image");
    if (!container) return;

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 400;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);

    let finalCameraZ = 5;
    let initialCameraZ = 6;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.domElement.style.pointerEvents = "none";
    container.appendChild(renderer.domElement);

    // 💡 Luzes
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(3, 4, 5);
    scene.add(dirLight);
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.4);
    rimLight.position.set(-4, -2, -4);
    scene.add(rimLight);

    let objModel = null;

    const ENTRY_DURATION = 850;
    let entryStart = null;
    const finalScale = 0.16;

    const envTexture = new THREE.CubeTextureLoader().load([
        "https://threejs.org/examples/textures/cube/Bridge2/posx.jpg",
        "https://threejs.org/examples/textures/cube/Bridge2/negx.jpg",
        "https://threejs.org/examples/textures/cube/Bridge2/posy.jpg",
        "https://threejs.org/examples/textures/cube/Bridge2/negy.jpg",
        "https://threejs.org/examples/textures/cube/Bridge2/posz.jpg",
        "https://threejs.org/examples/textures/cube/Bridge2/negz.jpg",
    ]);
    scene.environment = envTexture;

    const mtlLoader = new MTLLoader();
    mtlLoader.load("./models/consult.mtl", (materials) => {
        materials.preload();

        const objLoader = new OBJLoader();
        objLoader.setMaterials(materials);
        objLoader.load("./models/consult.obj", (obj) => {
            obj.scale.set(finalScale * 0.85, finalScale * 0.85, finalScale * 0.85);
            // ❌ REMOVER a linha que fazia o giro forçado:
            // obj.rotation.x = -Math.PI * 2;

            const box = new THREE.Box3().setFromObject(obj);
            const center = new THREE.Vector3();
            box.getCenter(center);
            obj.position.sub(center);
            obj.traverse((child) => {
                if (child.isMesh && child.material) {
                    let baseMap = child.material.map || null;

                    child.material = new THREE.MeshPhysicalMaterial({
                        map: baseMap,
                        color: new THREE.Color(0xffffff),
                        metalness: 0.1,
                        roughness: 0.25,
                        transmission: 0.4,
                        opacity: 10,
                        transparent: true,
                        thickness: 0.5,
                        ior: 1.3,
                        reflectivity: 0.3,
                        clearcoat: 0.6,
                        clearcoatRoughness: 0.2,
                        envMap: envTexture,
                        envMapIntensity: 0.5,
                        side: THREE.FrontSide,
                    });
                }
            });

            obj.traverse((child) => {
                if (child.isMesh) {
                    const glassOutlineMat = new THREE.MeshPhysicalMaterial({
                        color: new THREE.Color("#7B6AAE"),
                        roughness: 0.15,
                        transmission: 1.0,
                        thickness: 0.2,
                        ior: 1.46,
                        clearcoat: 1.0,
                        clearcoatRoughness: 0.04,
                        envMap: envTexture,
                        envMapIntensity: 1.5,
                        side: THREE.BackSide,
                        transparent: true,
                        opacity: 0.9,
                    });

                    const outlineMesh = new THREE.Mesh(child.geometry, glassOutlineMat);
                    outlineMesh.position.copy(child.position);
                    outlineMesh.quaternion.copy(child.quaternion);
                    outlineMesh.scale.copy(child.scale).multiplyScalar(1.05);

                    if (child.parent) {
                        child.parent.add(outlineMesh);
                    } else {
                        obj.add(outlineMesh);
                    }
                }
            });

            scene.add(obj);
            objModel = obj;

            const size = box.getSize(new THREE.Vector3()).length();
            finalCameraZ = Math.max(size * 0.9, 1.8) + 0.6;
            initialCameraZ = finalCameraZ * 1.18;

            camera.position.set(0, 0, initialCameraZ);
            camera.lookAt(0, 0, 0);

            entryStart = performance.now();
            animate();
        });
    });

    const mouse = { x: 0, y: 0 };
    window.addEventListener("mousemove", (e) => {
        const rect = container.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
        mouse.y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    });

    function easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    function animate() {
        requestAnimationFrame(animate);

        if (objModel) {
            const now = performance.now();
            let ease = 1;
            if (entryStart !== null) {
                const elapsed = now - entryStart;
                if (elapsed < ENTRY_DURATION) {
                    ease = easeOutCubic(Math.min(1, elapsed / ENTRY_DURATION));
                } else {
                    entryStart = null;
                }
            }

            const scaleNow = finalScale * (0.85 + 0.15 * ease);
            objModel.scale.setScalar(scaleNow);

            camera.position.z = initialCameraZ - (initialCameraZ - finalCameraZ) * ease;
            camera.lookAt(0, 0, 0);

            const followAmp = 0.1 * ease;
            const targetY = mouse.x * followAmp;
            const targetX = -mouse.y * (followAmp * 0.7);

            const damping = 0.06;
            objModel.rotation.y += (targetY - objModel.rotation.y) * damping;
            objModel.rotation.x += (targetX - objModel.rotation.x) * damping;
        }

        renderer.render(scene, camera);
    }

    window.addEventListener("resize", () => {
        const w = container.clientWidth;
        const h = container.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);

        if (objModel) {
            const box = new THREE.Box3().setFromObject(objModel);
            const size = box.getSize(new THREE.Vector3()).length();
            finalCameraZ = Math.max(size * 0.9, 1.8) + 0.6;
            initialCameraZ = finalCameraZ * 1.18;
            camera.position.z = finalCameraZ;
            camera.lookAt(0, 0, 0);
        }
    });
}
