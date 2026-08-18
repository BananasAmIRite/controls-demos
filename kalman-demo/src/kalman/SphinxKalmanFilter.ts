import { matrix } from 'mathjs';
import KalmanFilter from './kalman';
import { SphinxAccelerometer, SphinxAltimeter } from '../physics/SphinxSensor';

export default class SphinxKalmanFilter extends KalmanFilter {
    public constructor(
        dt: number,
        private accelerometer: SphinxAccelerometer,
        private altimeter: SphinxAltimeter,
    ) {
        super(
            matrix([10, 0, 0]), // initial state
            matrix([
                [0, 0, 0],
                [0, 0, 0],
                [0, 0, 1],
            ]), // initial covariance
            {
                stateTransition: () =>
                    matrix([
                        [1, dt, Math.pow(dt, 2) / 2],
                        [0, 1, dt],
                        [0, 0, 1],
                    ]),
                controlMat: () =>
                    // no control for now
                    matrix([
                        [0, 0, 0],
                        [0, 0, 0],
                        [0, 0, 0],
                    ]),
                processNoise: matrix([
                    [0.01, 0, 0],
                    [0, 0.01, 0],
                    [0, 0, 0.01],
                ]),
                measurementOpts: [
                    {
                        // accelerometer
                        measurementMat: matrix([[0, 0, 1]]),
                        measurementCov: matrix([[0.0001]]),
                    },
                    {
                        // altimeter
                        measurementMat: matrix([[1, 0, 0]]),
                        measurementCov: matrix([[1]]),
                    },
                ],
            },
        );
    }

    public measureAccel() {
        const measuredAccel = this.accelerometer.measure();
        console.log(`Measured acceleration: ${measuredAccel}`);
        this.measure(0, matrix([measuredAccel]));
    }

    public measureAltimeter() {
        const measuredAltimeter = this.altimeter.measure();
        console.log(`Measured Altimeter: ${measuredAltimeter}`);
        this.measure(1, matrix([measuredAltimeter]));
    }

    public setProcessNoise(processNoise: number) {
        this.opts.processNoise = matrix([
            [processNoise, 0, 0],
            [0, processNoise, 0],
            [0, 0, processNoise],
        ]);
    }

    public setMeasurementCovariance(idx: number, measurementCovValue: number) {
        this.opts.measurementOpts[idx]!.measurementCov = matrix([[measurementCovValue]]);
    }

    public performMeasurements() {
        this.measureAccel();
        this.measureAltimeter();
    }
}
