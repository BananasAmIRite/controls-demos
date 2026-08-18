import { add, identity, inv, Matrix, multiply, subtract, transpose } from 'mathjs';

export interface KalmanOptions {
    stateTransition: (state: Matrix) => Matrix;
    controlMat: (state: Matrix) => Matrix;
    processNoise: Matrix;
    measurementOpts: KalmanMeasurementOptions[];
}

export interface KalmanMeasurementOptions {
    measurementMat: Matrix;
    measurementCov: Matrix;
}

export default class KalmanFilter {
    // public cov: Matrix;
    public constructor(
        public state: Matrix,
        public cov: Matrix,
        public opts: KalmanOptions,
    ) {
        // console.log(this.state.size()[0]);
        // this.cov = zeros([this.state.size()[0]!, this.state.size()[0]!]) as Matrix;
    }

    // dynamics / propagation
    private predict(F: Matrix, G: Matrix, control: Matrix) {
        this.state = add(multiply(F, this.state), multiply(G, control));
    }

    private updatePredictionUncertainty(F: Matrix) {
        this.cov = add(multiply(multiply(F, this.cov), transpose(F)), this.opts.processNoise);
    }

    public step(control: Matrix) {
        const F = this.opts.stateTransition(this.state);

        const G = this.opts.controlMat(this.state);
        this.predict(F, G, control);
        this.updatePredictionUncertainty(F);
    }

    // measurement
    public measure(idx: number, measurement: Matrix) {
        const H = this.opts.measurementOpts[idx]!.measurementMat;
        const R = this.opts.measurementOpts[idx]!.measurementCov;
        // compute innovation
        const innovation = subtract(measurement, multiply(H, this.state));

        // compute kalman gain
        const HPHT = multiply(multiply(H, this.cov), transpose(H));
        const K = multiply(multiply(this.cov, transpose(H)), inv(add(HPHT, R)));

        // console.log(multiply(K, innovation));

        // update state
        this.state = add(this.state, multiply(K, innovation));

        // update covariance
        const KH = multiply(K, H);
        const id = identity(KH.size()[0]!);
        const id_minus_KH = subtract(id, KH) as Matrix;

        const covTerm1 = multiply(multiply(id_minus_KH, this.cov), transpose(id_minus_KH));
        const covTerm2 = multiply(multiply(K, R), transpose(K));
        this.cov = add(covTerm1, covTerm2);
    }
}
