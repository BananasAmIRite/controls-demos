export default class PIDController {
    lastError = Infinity;
    accum = 0;

    p = 0;
    i = 0;
    d = 0;

    lastSetpoint = Infinity;

    reset() {
        this.lastError = Infinity;
        this.accum = 0;
    }

    run(setpoint, measurement, dt) {
        const error = setpoint - measurement;

        if (this.lastError === Infinity || this.lastSetpoint == Infinity || this.lastSetpoint != setpoint) {
            // dry run
            this.lastError = error;
            this.lastSetpoint = setpoint;
            return { p: this.p * error, i: 0, d: 0, output: this.p * error };
        }

        this.accum += error * dt;
        const derivative = (error - this.lastError) / dt;

        const pTerm = this.p * error;
        const iTerm = this.i * this.accum;
        const dTerm = this.d * derivative;

        console.log('loop', dt, pTerm, iTerm, dTerm);

        this.lastError = error;
        return { p: pTerm, i: iTerm, d: dTerm, output: pTerm + iTerm + dTerm };
    }
}
