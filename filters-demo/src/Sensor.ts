export default abstract class Sensor {
    abstract read(): number;

    abstract readTrueValue(): number;
}

export class TestSensor extends Sensor {
    public read() {
        return 1;
    }

    public readTrueValue() {
        return 1;
    }
}
