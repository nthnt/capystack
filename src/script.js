import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/Addons.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

//Canvas
const canvas = document.querySelector('canvas.webgl');
let mixer = null;
const clock = new THREE.Clock()
let previousTime = 0
const mdlLoader = new GLTFLoader();

const keysPressed = {};

class CharControl {
    constructor(model, mixer, animationsMap, orbitControl, camera, currentAction) {
        this.toggleRun = true;
        this.model = model;
        this.mixer = mixer;
        this.animationsMap = animationsMap;
        this.currentAction = currentAction;
        this.orbitControl = orbitControl;
        this.camera = camera;
        this.directions = ['w', 'a', 's', 'd']

        this.walkDirection = new THREE.Vector3();
        this.rotateAngle = new THREE.Vector3(0, 1, 0);
        this.rotateQuaternion = new THREE.Quaternion();
        this.cameraTarget = new THREE.Vector3();

        this.fadeDuration = 0.2;

        this.animationsMap.forEach((value, key) => {
            if (key == currentAction) {
                value.play();
            }
        })
    }

    update(deltaTime) {
        const pressed = this.directions.some(key => keysPressed[key] == true);

        let action = "";
        if(pressed) {
            action = "walk";
        } else {
            action = "stand";
        }

        if(this.currentAction != action) {
            const toPlay = this.animationsMap.get(action);
            const current = this.animationsMap.get(this.currentAction);

            current.fadeOut(this.fadeDuration);
            toPlay.reset().fadeIn(this.fadeDuration).play();

            this.currentAction = action;
        }

        this.mixer.update(deltaTime)

        if (this.currentAction == 'walk') {
            let angleYCamera = Math.atan2(
                (this.camera.position.x - this.model.position.x),
                (this.camera.position.z - this.model.position.z));
            
            let offset = this.directionOffset();

            this.rotateQuaternion.setFromAxisAngle(this.rotateAngle, angleYCamera + offset);
            this.model.quaternion.rotateTowards(this.rotateQuaternion, 0.2);

            this.camera.getWorldDirection(this.walkDirection);
            this.walkDirection.y = 0;
            this.walkDirection.normalize();
            this.walkDirection.applyAxisAngle(this.rotateAngle, offset);

            const moveX = this.walkDirection.x * deltaTime * 50;
            const moveZ = this.walkDirection.z * deltaTime * 50;
            this.model.position.z += moveX;
            this.model.position.x -= moveZ;
            this.updateCamera(moveX, moveZ);
        }
    }

    updateCamera(moveX, moveZ) {
        this.camera.position.x -= moveZ;
        this.camera.position.z += moveX;

        this.cameraTarget.x = this.model.position.x;
        this.cameraTarget.y = this.model.position.y + 1;
        this.cameraTarget.z = this.model.position.z;
        this.orbitControl.target = this.cameraTarget;
    }

    directionOffset() {
        let offset = 0;

        if(keysPressed['w']) {
            offset = Math.PI / 2;
            if (keysPressed['a']) {
                offset = 3 * Math.PI / 4;
            } else if (keysPressed['d']) {
                offset = Math.PI / 4;
            }
        } else if(keysPressed['s']) {
            offset = - Math.PI / 2;
            if (keysPressed['a']) {
                offset = - Math.PI / 4 - Math.PI / 2;
            } else if (keysPressed['d']) {
                offset = - Math.PI / 4;
            }
        } else if (keysPressed['a']) {
            offset = Math.PI;
        } else if (keysPressed['d']) {
            offset = 0;
        }

        return offset;
    }
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
        this.scene.background = new THREE.Color( '#7eb9ed' );

        //camera
        this.camera = new THREE.PerspectiveCamera(50, this.width/this.height, 1, 1000);
        this.camera.position.set(80, 10, 0);

        //renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas
        });
        this.renderer.setSize(this.width, this.height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        // this.renderer.shadowMap.enabled = true;
        // this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        const dirLight = new THREE.DirectionalLight(0xFFFFFF);
        dirLight.position.set(100, 100, 100);
        // dirLight.castShadow = true;
        // dirLight.shadow.mapSize.width = 1024;
        // dirLight.shadow.mapSize.length = 1024;
        // dirLight.shadow.camera.near = 1;
        // dirLight.shadow.camera.far = 200;
        // dirLight.shadow.camera.left = 200;
        // dirLight.shadow.camera.right = -200;
        // dirLight.shadow.camera.top = 200;
        // dirLight.shadow.camera.bottom = -200;
        this.scene.add(dirLight);

        const ambLight = new THREE.AmbientLight(0xffffff, Math.PI);
        this.scene.add(ambLight);

        //create player ground
        const plane = new THREE.Mesh(
            new THREE.PlaneGeometry(800,800,1,1),
            new THREE.MeshStandardMaterial({
                color: '#90ed77'
            })
        );
        // plane.castShadow = false;
        // plane.receiveShadow = true;
        plane.rotation.x = -Math.PI / 2;
        this.scene.add(plane)

        this.controls = new OrbitControls(this.camera, canvas)
        this.controls.enableDamping = true;
        this.controls.minDistance = 30;
        this.controls.maxDistance = 50;
        this.controls.maxPolarAngle = Math.PI / 2 - 0.1;
        OrbitControls.enablePan = false;
        
        this.createPlayer();
        this.createTrees();
        this.tick();
    }

    createPlayer() {
        mdlLoader.load(
            'models/capybara.glb',
            (gltf) => {
                // gltf.scene.traverse((layer) => {
                //     layer.castShadow = true;
                // });
                this.scene.add(gltf.scene);
                
                mixer = new THREE.AnimationMixer(gltf.scene)

                const animationsMap = new Map();
                animationsMap.set('walk', mixer.clipAction(gltf.animations[0]))
                animationsMap.set('stand', mixer.clipAction(gltf.animations[1]))

                this.charControls = new CharControl(gltf.scene, mixer, animationsMap, this.controls, this.camera, 'stand')
            }
        );
    }

    createTrees() {
        const treePos = [];
        
        mdlLoader.load(
            'models/tree.glb',
            (gltf) => {
                for (let tree = 0; tree < 20; tree++) {
                    const xTree = (Math.random() - 0.5) * 200;
                    const yTree = 0;
                    const zTree = (Math.random() - 0.5) * 200;
                    
                    const clonedTree = gltf.scene.clone();
                    clonedTree.position.set(xTree, yTree, zTree)
                    clonedTree.rotation.y = Math.random() * Math.PI;
                    this.scene.add(clonedTree);
                }        
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
        const elapsedTime = clock.getElapsedTime()
        const deltaTime = elapsedTime - previousTime
        previousTime = elapsedTime

        if (this.charControls) {
            this.charControls.update(deltaTime)
        }

        let stamp = requestAnimationFrame(() => {
            this.renderer.render(this.scene, this.camera);
            this.tick();
        })

        if(mixer)
        {
            mixer.update(deltaTime)
        }
    }
}


window.addEventListener('DOMContentLoaded', () => {
    let gameWorld = new World();

    window.addEventListener('keydown', (e) => {
        keysPressed[e.key.toLowerCase()] = true;
    });

    window.addEventListener('keyup', (e) => {
        keysPressed[e.key.toLowerCase()] = false;
    });

});
