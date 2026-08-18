import { getGaussianNoise } from '../utils';
import { SphinxSensor } from './SphinxSensor';

export interface SphinxState {
    p: number;
    v: number;
    a: number;
}

interface Accelerometer {}

export default class SphinxPhysics {
    public accelerometer: Accelerometer = { lastVelo: 0, measuredAccel: 0, stdDev: 0.1 };
    public additionalAccel: number = 0;
    public state: SphinxState;

    public sensors: SphinxSensor[] = [];

    public constructor(
        public dt: number,
        startingState: SphinxState,
    ) {
        this.state = startingState;
    }

    public step() {
        this.state.a = -9.81 + this.additionalAccel;
        this.state.v += this.state.a * this.dt;
        this.state.p += this.state.v * this.dt;

        if (this.state.p <= 10) {
            this.state.p = 10;
            this.state.v = 0;
            this.state.a = 0;
        }

        for (const sensor of this.sensors) {
            sensor.update();
        }
    }
}
