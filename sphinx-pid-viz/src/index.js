import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GUI } from 'lil-gui';
import PIDController from './pid.js';
import { compute, deltaTime } from 'three/tsl';
import PositionGraph from './PositionGraph.js';

const ENABLE_PID = true;
const ENABLE_FF = true;

// I OVERSATURATED - 5, 0.5, 3
// PERFECT (PID) - 5, 0.15, 3
// PERFECT (PDFF) - 5, 0, 3, 9.81

const width = window.innerWidth,
    height = window.innerHeight;

// init

const camera = new THREE.PerspectiveCamera(70, width / height, 0.01, 10);
camera.far = 10000; // Increase this based on your scene's scale
camera.updateProjectionMatrix();
camera.position.x = -55;
camera.position.y = 20;
camera.position.z = 2;

const scene = new THREE.Scene();

const loader = new STLLoader();
// const material = new THREE.MeshNormalMaterial({ color: 0x00ff00 });
const material = new THREE.MeshPhongMaterial({
    color: 0xaaaaaa, // gray (can also use a CSS color string here)
    side: THREE.DoubleSide,
});
const sphinxGeometry = await loader.loadAsync('./public/sphinx.stl');
const sphinx = new THREE.Mesh(sphinxGeometry, material);
sphinx.position.y = 20;
sphinx.rotation.y = Math.PI / 4;
sphinx.castShadow = true;
sphinx.scale.set(1, 1, 1);
scene.add(sphinx);

{
    const color = 0xffffff;
    const skyColor = 0xb1e1ff; // light blue
    const groundColor = 0xb97a20; // brownish orange
    const intensity = 1;
    // let light = new THREE.AmbientLight(new THREE.Color(0xffffff), 1);

    const light = new THREE.HemisphereLight(skyColor, groundColor, intensity);
    scene.add(light);
}

const color = 0xffffff;
const intensity = 8;
const light = new THREE.DirectionalLight(color, intensity);
light.position.set(100, 100, 0);
light.target.position.set(5, 5, 2.5);
light.castShadow = true;
light.shadow.mapSize.width = 2048;
light.shadow.mapSize.height = 2048;
light.shadow.camera.near = 0.5;
light.shadow.camera.far = 1000;
light.shadow.camera.left = -100;
light.shadow.camera.right = 100;
light.shadow.camera.top = 100;
light.shadow.camera.bottom = -100;
// const shadowHelper = new THREE.CameraHelper(light.shadow.camera);
// scene.add(shadowHelper);
scene.add(light);
scene.add(light.target);

// const light2 = new THREE.DirectionalLight(color, intensity);
// light2.position.set(-100, 100, 100);
// light2.target.position.set(5, 5, 2.5);
// light2.castShadow = true;
// light2.shadow.mapSize.width = 2048;
// light2.shadow.mapSize.height = 2048;
// light2.shadow.camera.near = 0.5;
// light2.shadow.camera.far = 1000;
// light2.shadow.camera.left = -100;
// light2.shadow.camera.right = 100;
// light2.shadow.camera.top = 100;
// light2.shadow.camera.bottom = -100;
// // const shadowHelper = new THREE.CameraHelper(light.shadow.camera);
// // scene.add(shadowHelper);
// scene.add(light2);
// scene.add(light2.target);

// target
const targetGeo = new THREE.SphereGeometry(1, 32, 16);
const targetMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
const target = new THREE.Mesh(targetGeo, targetMat);
target.castShadow = true;
scene.add(target);

scene.background = new THREE.Color(0x87ceeb);

{
    const planeSize = 1000;

    const loader = new THREE.TextureLoader();
    const texture = loader.load('https://threejs.org/manual/examples/resources/images/checker.png');
    // texture.wrapS = THREE.RepeatWrapping;
    // texture.wrapT = THREE.RepeatWrapping;
    // texture.magFilter = THREE.NearestFilter;
    // texture.colorSpace = THREE.SRGBColorSpace;
    // const repeats = planeSize / 2;
    // texture.repeat.set(repeats, repeats);

    const planeGeo = new THREE.PlaneGeometry(planeSize, planeSize);
    const planeMat = new THREE.MeshPhongMaterial({
        map: texture,
        side: THREE.DoubleSide,
        color: 0xbc815f,
    });
    const mesh = new THREE.Mesh(planeGeo, planeMat);
    mesh.rotation.x = Math.PI * -0.5;
    mesh.receiveShadow = true;
    scene.add(mesh);
}

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(width, height);
renderer.setAnimationLoop(animate);
renderer.shadowMap.enabled = true;
// Optional: Choose a shadow type for smoother edges
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);

// 2. Initialize the GUI panel
const gui = new GUI({ title: 'Controls Menu' });

const graph = new PositionGraph(
    {
        width: 300,
        height: 125,
        title: 'Position vs Time',
    },
    { left: '10px', bottom: '10px', enabled: true },
);

const errorGraph = new PositionGraph(
    {
        width: 300,
        height: 125,
        title: 'Error vs Time',
    },
    { enabled: ENABLE_PID, left: '10px', bottom: '10px' },
);

const pGraph = new PositionGraph(
    {
        width: 300,
        height: 125,
        title: 'P Output vs Time',
    },
    { left: '320px', bottom: '10px', enabled: ENABLE_PID },
);
const iGraph = new PositionGraph(
    {
        width: 300,
        height: 125,
        title: 'I Output vs Time',
    },
    { left: '630px', bottom: '10px', enabled: ENABLE_PID },
);

const dGraph = new PositionGraph(
    {
        width: 300,
        height: 125,
        title: 'D Output vs Time',
    },
    { left: '940px', bottom: '10px', enabled: ENABLE_PID },
);

const controller = new PIDController();

const sphinxState = {
    position: 10,
    velocity: 0,
    acceleration: 0,
};

const timer = new THREE.Timer();

timer.setTimescale(5);

const controllerSettings = {
    targetPos: 10,

    // controller settings (bang bang)
    bbgain: 0,

    // PID
    kP: 0,
    kI: 0,
    kD: 0,

    // Feedforward
    ffgain: 0,

    reset: () => {
        sphinxState.position = 10;
        sphinxState.velocity = 0;
        sphinxState.acceleration = 0;

        controller.reset();

        graph.reset();
        pGraph.reset();
        iGraph.reset();
        dGraph.reset();
        errorGraph.reset();
        console.log('reset!');
    },
    runController: false,
};

const computeOutput = (dt) => {
    if (ENABLE_PID) {
        controller.p = controllerSettings.kP;
        controller.i = controllerSettings.kI;
        controller.d = controllerSettings.kD;
        return controller.run(controllerSettings.targetPos, sphinxState.position, dt);
    } else {
        return {
            output: sphinxState.position < controllerSettings.targetPos ? controllerSettings.bbgain : 0,
            p: 0,
            i: 0,
            d: 0,
        };
    }
};
// 3. Add regular controllers (target object, property name)
gui.add(controllerSettings, 'targetPos', 10, 100, 1).name('Target Y Position');

if (ENABLE_PID) {
    gui.add(controllerSettings, 'kP', 0, 5, 0.001).name('kP');
    gui.add(controllerSettings, 'kI', 0, 1, 0.001).name('kI');
    gui.add(controllerSettings, 'kD', 0, 5, 0.001).name('kD');
} else {
    gui.add(controllerSettings, 'bbgain', 0, 20).name('Bang-Bang Gain');
}
if (ENABLE_FF) {
    gui.add(controllerSettings, 'ffgain', 0, 15).name('Feedforward Gain');
}
gui.add(controllerSettings, 'reset').name('Reset Controller');
gui.add(controllerSettings, 'runController').name('Running Controller?');

// animation

function animate(time) {
    // update sphinx
    timer.update();
    const deltaTime = timer.getDelta();

    if (controllerSettings.runController) {
        const output = computeOutput(deltaTime);
        console.log(sphinxState.position, output);

        const friction = 0.05 * Math.pow(sphinxState.velocity, 2) * Math.sign(sphinxState.velocity);

        sphinxState.acceleration =
            -9.81 + Math.min(Math.max(output.output + controllerSettings.ffgain, -100), 100) - friction;
        console.log(sphinxState.acceleration);
        sphinxState.velocity += sphinxState.acceleration * deltaTime;
        sphinxState.position += sphinxState.velocity * deltaTime;

        if (sphinxState.position <= 10) {
            sphinxState.position = 10;
            sphinxState.velocity = 0;
            sphinxState.acceleration = 0;
        }

        graph.addPoint(timer.getElapsed(), sphinxState.position);
        pGraph.addPoint(timer.getElapsed(), output.p);
        iGraph.addPoint(timer.getElapsed(), output.i);
        dGraph.addPoint(timer.getElapsed(), output.d);
        errorGraph.addPoint(timer.getElapsed(), controllerSettings.targetPos - sphinxState.position);
    }

    target.position.y = controllerSettings.targetPos;
    sphinx.position.y = sphinxState.position;

    controls.update();
    renderer.render(scene, camera);
}
