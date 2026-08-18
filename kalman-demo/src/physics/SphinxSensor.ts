import { getGaussianNoise } from '../utils';
import SphinxPhysics from './SphinxPhysics';

export abstract class SphinxSensor {
    abstract update(): void;
    abstract measure(): void;
}

export class SphinxAccelerometer extends SphinxSensor {
    private lastVelo: number = 0;
    private measuredAccel: number = 0;
    public stdDev: number = 0.25;

    public constructor(private physics: SphinxPhysics) {
        super();
        physics.sensors.push(this);
    }

    public update() {
        this.measuredAccel = (this.physics.state.v - this.lastVelo) / this.physics.dt;
        this.lastVelo = this.physics.state.v;
    }
    public measure() {
        return this.measuredAccel + getGaussianNoise(0, this.stdDev);
    }
}

export class SphinxAltimeter extends SphinxSensor {
    private altitude: number = 0;
    public stdDev: number = 2;

    public constructor(private physics: SphinxPhysics) {
        super();
        physics.sensors.push(this);
    }

    public update() {
        this.altitude = this.physics.state.p;
    }
    public measure() {
        return this.altitude + getGaussianNoise(0, this.stdDev);
    }
}
