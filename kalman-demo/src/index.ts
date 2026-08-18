import { matrix } from 'mathjs';
import KalmanFilter from './kalman/kalman';
import KalmanRenderer, { matToState } from './KalmanRenderer';
// @ts-ignore
import { GUI } from 'lil-gui';
import SphinxPhysics from './physics/SphinxPhysics';
import { SphinxAccelerometer, SphinxAltimeter } from './physics/SphinxSensor';
import SphinxKalmanFilter from './kalman/SphinxKalmanFilter';

const dt = 0.01;

const physics = new SphinxPhysics(dt, matToState(matrix([10, 0, -9.81])));
const accelerometer = new SphinxAccelerometer(physics);
const altimeter = new SphinxAltimeter(physics);

const filt = new SphinxKalmanFilter(dt, accelerometer, altimeter);

const renderer = new KalmanRenderer(physics, filt);

renderer.init();

const conGui = new GUI({ title: 'Controls Menu', container: document.getElementById('overlay') });

conGui.add(physics, 'additionalAccel', 0, 20, 1).name('Acceleration');
conGui.add(renderer, 'start').name('Start');
conGui.add(renderer, 'stop').name('Stop');
conGui.add(renderer, 'step').name('Step');

const estProps = {
    procNoise: 0.1,
    accelMeasurementCov: 0.1,
    altimeterMeasurementCov: 0.1,
};

const estGui = new GUI({ title: 'Estimation Config', container: document.getElementById('overlay') });
estGui
    .add(estProps, 'procNoise', 0, 2, 0.1)
    .name('Process Noise')
    .onChange((value: number) => filt.setProcessNoise(value));
estGui
    .add(estProps, 'accelMeasurementCov', 0, 2, 0.01)
    .name('Accelerometer Covariance')
    .onChange((value: number) => filt.setMeasurementCovariance(0, value));
estGui
    .add(estProps, 'altimeterMeasurementCov', 0, 2, 0.01)
    .name('Altimeter Covariance')
    .onChange((value: number) => filt.setMeasurementCovariance(1, value));

const accelGui = new GUI({ title: 'Accelerometer Config', container: document.getElementById('overlay') });
accelGui.add(accelerometer, 'stdDev', 0, 2, 0.01).name('Accelerometer Noise Std Dev');
accelGui.add(renderer.debug, 'autoMeasureAccel').name('Auto-Measure Accelerometer');
accelGui.add(filt, 'measureAccel').name('Add Accelerometer measurement manually');

const altiGui = new GUI({ title: 'Altimeter Config', container: document.getElementById('overlay') });
altiGui.add(altimeter, 'stdDev', 0, 5, 0.01).name('Altimeter Noise Std Dev');
altiGui.add(renderer.debug, 'autoMeasureAltimeter').name('Auto-Measure Altimeter');
altiGui.add(filt, 'measureAltimeter').name('Add Altimeter measurement manually');

const visibilityGui = new GUI({ title: 'Visibility Config', container: document.getElementById('overlay') });
visibilityGui.add(renderer.debug, 'showPos').name('Show Position');
visibilityGui.add(renderer.debug, 'showPVar').name('Show Position Variance');
visibilityGui.add(renderer.debug, 'showVelo').name('Show Velocity');
visibilityGui.add(renderer.debug, 'showVVar').name('Show Velocity Variance');
visibilityGui.add(renderer.debug, 'showAccel').name('Show Acceleration');
visibilityGui.add(renderer.debug, 'showAVar').name('Show Acceleration Variance');
