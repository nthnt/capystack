import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/Addons.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

//Canvas
const canvas = document.querySelector('canvas.webgl');

class CharControl {

}

class World {
    constructor() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;

        this.create();
    }

    create() {
        //scene
        this.scene = new THREE.Scene();

        //camera
        this.camera = new THREE.PerspectiveCamera(50, this.width/this.height, 1, 1000);
        this.camera.position.set(80, 10, 0);

        //renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas
        });
        this.renderer.setSize(this.width, this.height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.BasicShadowMap;

        const dirLight = new THREE.DirectionalLight(0xFFFFFF);
        dirLight.position.set(100, 100, 100);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.length = 2048;
        dirLight.shadow.camera.near = 1;
        dirLight.shadow.camera.far = 500;
        dirLight.shadow.camera.left = 200;
        dirLight.shadow.camera.right = -200;
        dirLight.shadow.camera.top = 200;
        dirLight.shadow.camera.bottom = -200;
        this.scene.add(dirLight);

        const ambLight = new THREE.AmbientLight(0x404040, 5);
        this.scene.add(ambLight);

        //create player ground
        const plane = new THREE.Mesh(
            new THREE.PlaneGeometry(100,100,1,1),
            new THREE.MeshStandardMaterial({
                color: 0xFFFFFF
            })
        );
        plane.castShadow = false;
        plane.receiveShadow = true;
        plane.rotation.x = -Math.PI / 2;
        this.scene.add(plane)

        const controls = new OrbitControls(this.camera, canvas)
        controls.enableDamping = true;
        
        this.createPlayer();
        this.tick();
    }

    createPlayer() {
        const mdlLoader = new GLTFLoader();
        mdlLoader.load(
            'models/capybara.glb',
            (gltf) => {
                gltf.scene.traverse((layer) => {
                    layer.castShadow = true;
                });
                this.scene.add(gltf.scene);
            }
        );
    }

    windowResize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;

        this.camera.aspect = this.width/this.height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(this.width, this.height);
    }

    tick() {
        let stamp = requestAnimationFrame(() => {
            this.renderer.render(this.scene, this.camera);
            this.tick();
        })
    }
}

window.addEventListener('DOMContentLoaded', () => {
    let gameWorld = new World();
  });
