import { matrix, Matrix } from 'mathjs';
import * as THREE from 'three';
import { OrbitControls, STLLoader } from 'three/examples/jsm/Addons.js';
import { getGaussianNoise } from './utils';
import SphinxPhysics, { SphinxState } from './physics/SphinxPhysics';
import KalmanFilter from './kalman/kalman';
import SphinxKalmanFilter from './kalman/SphinxKalmanFilter';

const ghostMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x88ccff, // Spectral blue/green tint
    transparent: true,
    opacity: 0.6,
    roughness: 0.1,
    metalness: 0.1,
    transmission: 0.9, // Gives a glass/ecto-plasm see-through look
    thickness: 1.2, // Volume refraction
    ior: 1.3, // Index of refraction
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending, // Or THREE.AdditiveBlending for extra glow
    depthWrite: false, // Prevents sorting artifacts with transparency
});

const ghostMaterialRed = new THREE.MeshPhysicalMaterial({
    color: 0xff0000, // Spectral blue/green tint
    transparent: true,
    opacity: 0.6,
    roughness: 0.1,
    metalness: 0.1,
    transmission: 0.9, // Gives a glass/ecto-plasm see-through look
    thickness: 1.2, // Volume refraction
    ior: 1.3, // Index of refraction
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending, // Or THREE.AdditiveBlending for extra glow
    depthWrite: false, // Prevents sorting artifacts with transparency
});

const ghostMaterialGreen = new THREE.MeshPhysicalMaterial({
    color: 0x00ff00, // Spectral blue/green tint
    transparent: true,
    opacity: 0.6,
    roughness: 0.1,
    metalness: 0.1,
    transmission: 0.9, // Gives a glass/ecto-plasm see-through look
    thickness: 1.2, // Volume refraction
    ior: 1.3, // Index of refraction
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending, // Or THREE.AdditiveBlending for extra glow
    depthWrite: false, // Prevents sorting artifacts with transparency
});

const ghostMaterialBlue = new THREE.MeshPhysicalMaterial({
    color: 0x0000ff, // Spectral blue/green tint
    transparent: true,
    opacity: 0.6,
    roughness: 0.1,
    metalness: 0.1,
    transmission: 0.9, // Gives a glass/ecto-plasm see-through look
    thickness: 1.2, // Volume refraction
    ior: 1.3, // Index of refraction
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending, // Or THREE.AdditiveBlending for extra glow
    depthWrite: false, // Prevents sorting artifacts with transparency
});

export interface SphinxFilterState {
    estimatedState: SphinxState;

    // variances for each state
    pV: number;
    vV: number;
    aV: number;
}

export interface SphinxDebugParams {
    // show arrows
    showPos: boolean;
    showVelo: boolean;
    showAccel: boolean;

    // show variances
    showPVar: boolean;
    showVVar: boolean;
    showAVar: boolean;

    autoMeasureAccel: boolean;
    autoMeasureAltimeter: boolean;
}

export function matToState(mat: Matrix) {
    return {
        p: mat.get([0]),
        v: mat.get([1]),
        a: mat.get([2]),
    };
}

export default class KalmanRenderer {
    private camera!: THREE.PerspectiveCamera;
    private scene!: THREE.Scene;
    private renderer!: THREE.WebGLRenderer;

    // objects
    private sphinx!: THREE.Mesh;

    // estimation objects
    private sphinxGhost!: THREE.Mesh;

    // real indicators
    private sphinxVeloInd!: THREE.ArrowHelper;
    private sphinxAccelInd!: THREE.ArrowHelper;

    // estimation indicators
    private sphinxPosCov!: THREE.Mesh;
    private sphinxVeloCov!: THREE.Mesh;
    private sphinxAccelCov!: THREE.Mesh;

    // estimation
    private filterState: SphinxFilterState = {
        estimatedState: { p: 0, v: 0, a: 0 },
        pV: 0,
        vV: 0,
        aV: 0,
    };

    // debug
    public debug: SphinxDebugParams = {
        showPos: true,
        showPVar: false,

        showVelo: false,
        showVVar: false,

        showAccel: false,
        showAVar: false,

        autoMeasureAccel: false,
        autoMeasureAltimeter: false,
    };

    private started: boolean = false;
    private stepping: boolean = false;

    public constructor(
        private physics: SphinxPhysics,
        private filter: SphinxKalmanFilter,
    ) {}

    public async init() {
        // setup camera
        const width = window.innerWidth,
            height = window.innerHeight;
        this.camera = new THREE.PerspectiveCamera(70, width / height, 0.01, 10);
        this.camera.far = 10000; // Increase this based on your scene's scale
        this.camera.updateProjectionMatrix();
        this.camera.position.x = -55;
        this.camera.position.y = 20;
        this.camera.position.z = 2;

        // setup scene

        this.scene = new THREE.Scene();

        const loader = new STLLoader();
        // const material = new THREE.MeshNormalMaterial({ color: 0x00ff00 });
        const material = new THREE.MeshPhongMaterial({
            color: 0xaaaaaa, // gray (can also use a CSS color string here)
            side: THREE.DoubleSide,
        });
        // @ts-ignore
        const sphinxGeometry = await loader.loadAsync(`${import.meta.env.BASE_URL}sphinx.stl`);
        this.sphinx = new THREE.Mesh(sphinxGeometry, material);
        this.sphinx.position.y = 10;
        this.sphinx.rotation.y = Math.PI / 4;
        this.sphinx.castShadow = true;
        this.sphinx.scale.set(1, 1, 1);
        this.scene.add(this.sphinx);

        this.sphinxGhost = new THREE.Mesh(sphinxGeometry, ghostMaterial);
        this.sphinxGhost.position.y = 10;
        this.sphinxGhost.rotation.y = Math.PI / 4;
        this.sphinxGhost.castShadow = true;
        this.sphinxGhost.scale.set(1, 1, 1);
        this.scene.add(this.sphinxGhost);

        // sphinx arrows
        this.sphinxVeloInd = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), 1, 0x00ff00);
        this.sphinxAccelInd = new THREE.ArrowHelper(
            new THREE.Vector3(0, 1, 0),
            new THREE.Vector3(0, 0, 0),
            1,
            0x0000ff,
        );

        this.scene.add(this.sphinxVeloInd);
        this.scene.add(this.sphinxAccelInd);

        // sphinx covariances
        const posCovGeo = new THREE.SphereGeometry(1, 32, 16);
        this.sphinxPosCov = new THREE.Mesh(posCovGeo, ghostMaterialRed);

        const veloCovGeo = new THREE.SphereGeometry(1, 32, 16);
        this.sphinxVeloCov = new THREE.Mesh(veloCovGeo, ghostMaterialGreen);

        const accelCovGeo = new THREE.SphereGeometry(1, 32, 16);
        this.sphinxAccelCov = new THREE.Mesh(accelCovGeo, ghostMaterialBlue);

        this.scene.add(this.sphinxPosCov);
        this.scene.add(this.sphinxVeloCov);
        this.scene.add(this.sphinxAccelCov);

        {
            const color = 0xffffff;
            const skyColor = 0xb1e1ff; // light blue
            const groundColor = 0xb97a20; // brownish orange
            const intensity = 1;
            // let light = new THREE.AmbientLight(new THREE.Color(0xffffff), 1);

            const light = new THREE.HemisphereLight(skyColor, groundColor, intensity);
            this.scene.add(light);
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
        this.scene.add(light);
        this.scene.add(light.target);

        this.scene.background = new THREE.Color(0x87ceeb);

        // render plane
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
            this.scene.add(mesh);
        }

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(width, height);
        this.renderer.setAnimationLoop(() => this.animate());
        this.renderer.shadowMap.enabled = true;
        // Optional: Choose a shadow type for smoother edges
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.body.appendChild(this.renderer.domElement);

        const controls = new OrbitControls(this.camera, this.renderer.domElement);
    }

    private animate() {
        this.renderer.render(this.scene, this.camera);

        // update physics
        if (this.started) {
            if (this.stepping) {
                this.started = false;
                this.stepping = false;
            }

            // update physics & sensors
            this.physics.step();

            // update estimation
            this.filter.step(matrix([0, 0, 0])); // TODO: add in control
            console.log(this.filter.state);

            if (this.debug.autoMeasureAccel) this.filter.measureAccel();
            if (this.debug.autoMeasureAltimeter) this.filter.measureAltimeter();
        }

        this.filterState = {
            estimatedState: matToState(this.filter.state),
            pV: this.filter.cov.get([0, 0]),
            vV: this.filter.cov.get([1, 1]),
            aV: this.filter.cov.get([2, 2]),
        };

        // update positions
        this.sphinx.position.y = this.physics.state.p;
        this.sphinxGhost.position.y = this.filterState.estimatedState.p;
        this.sphinxGhost.visible = this.debug.showPos;

        // update arrow indicators
        this.sphinxVeloInd.position.y = this.physics.state.p;
        this.sphinxVeloInd.setDirection(new THREE.Vector3(0, Math.sign(this.physics.state.v), 0));
        this.sphinxVeloInd.setLength(Math.abs(this.physics.state.v));
        this.sphinxVeloInd.visible = this.debug.showVelo;

        this.sphinxAccelInd.position.y = this.physics.state.p;
        this.sphinxAccelInd.setDirection(new THREE.Vector3(0, Math.sign(this.physics.state.a), 0));
        this.sphinxAccelInd.setLength(Math.abs(this.physics.state.a));
        this.sphinxAccelInd.visible = this.debug.showAccel;

        // position variance indicator
        this.sphinxPosCov.position.y = this.filterState.estimatedState.p;
        this.sphinxPosCov.scale.setScalar(Math.sqrt(this.filterState.pV)); // ~68% certainty sphinx is in here
        this.sphinxPosCov.visible = this.debug.showPVar;

        this.sphinxVeloCov.position.y = this.filterState.estimatedState.v + this.filterState.estimatedState.p;
        this.sphinxVeloCov.scale.setScalar(Math.sqrt(this.filterState.vV)); // ~68% certainty sphinx velo is in here
        this.sphinxVeloCov.visible = this.debug.showVVar;

        this.sphinxAccelCov.position.y = this.filterState.estimatedState.p + this.filterState.estimatedState.a;
        this.sphinxAccelCov.scale.setScalar(Math.sqrt(this.filterState.aV)); // ~68% certainty sphinx acceleration is in here
        this.sphinxAccelCov.visible = this.debug.showAVar;
    }

    public start() {
        this.started = true;
    }

    public stop() {
        this.started = false;
    }

    public step() {
        this.started = true;
        this.stepping = true;
    }
}
