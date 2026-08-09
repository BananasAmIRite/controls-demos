import { Chart } from 'chart.js/auto';
import type Sensor from './Sensor';
import { createSlider } from './utils';

export default class SensorChart {
    private canvas!: HTMLCanvasElement;
    private chart!: Chart;

    private startTime: number;
    public constructor(
        parent: HTMLDivElement,
        private sensor: Sensor,
    ) {
        this.startTime = Date.now();
        this.initChart(parent);

        this.canvas.width = 600;
        this.canvas.height = 400;
        this.canvas.style.width = '600px';
        this.canvas.style.height = '400px';
    }

    private initChart(parent: HTMLDivElement) {
        const cnv = document.createElement('canvas');
        cnv.width = 600;
        cnv.height = 400;
        cnv.style.width = '600px';
        cnv.style.height = '400px';
        cnv.style.display = 'block';
        parent.appendChild(cnv);
        this.canvas = cnv;

        this.chart = new Chart(this.canvas.getContext('2d')!, {
            type: 'line',
            data: {
                labels: [], // Time or index labels
                datasets: [
                    {
                        label: 'Live Data',
                        data: [],
                        borderColor: 'rgb(75, 192, 192)',
                        tension: 0.1,
                    },
                    {
                        label: 'True Value',
                        data: [],
                        borderColor: 'rgb(231, 55, 55)',
                        tension: 0.1,
                    },
                ],
            },
            options: {
                animation: false, // Disable initial animation for performance
                scales: {
                    x: { title: { display: true, text: 'Time' }, display: false },
                    y: { beginAtZero: true, suggestedMax: 100 },
                },
                elements: {
                    point: {
                        radius: 0,
                    },
                },
                responsive: false,
            },
        });
    }

    public getValue(sensor: Sensor) {
        return sensor.read();
    }

    private addData(value: number, trueValue: number) {
        const now = Date.now();
        const elapsedSeconds = (now - this.startTime) / 1000;

        this.chart.data.labels?.push(elapsedSeconds);
        this.chart.data.datasets[0].data.push(value);
        this.chart.data.datasets[1].data.push(trueValue);

        const maxAgeSeconds = 10;
        while (
            this.chart.data.labels!.length > 1 &&
            elapsedSeconds - Number(this.chart.data.labels![0]) > maxAgeSeconds
        ) {
            this.chart.data.labels!.shift();
            this.chart.data.datasets[0].data.shift();
            this.chart.data.datasets[1].data.shift();
        }

        // Update chart without triggering full animations
        this.chart.update('none');
    }

    public loop() {
        this.addData(this.getValue(this.sensor), this.sensor.readTrueValue());
    }
}

export class MovingAverageChart extends SensorChart {
    private windowSizeInput!: HTMLInputElement;
    private windowSizeInputDiv!: HTMLDivElement;
    private readings: number[] = [];
    public constructor(parent: HTMLDivElement, sensor: Sensor) {
        super(parent, sensor);
        this.initWindowSizeInput(parent);
    }

    private initWindowSizeInput(parent: HTMLDivElement) {
        [this.windowSizeInputDiv, this.windowSizeInput] = createSlider({
            min: 1,
            max: 50,
            step: 1,
            original: 5,
            name: 'Window Size',
            displayValue: true,
        });
        parent.appendChild(this.windowSizeInputDiv);
    }

    private get windowSize() {
        return Number(this.windowSizeInput?.value ?? '5');
    }

    public override getValue(sensor: Sensor) {
        this.readings.push(sensor.read());
        while (this.readings.length > this.windowSize) {
            this.readings.shift();
        }
        let avg = 0;
        for (const reading of this.readings) avg += reading;
        return avg / this.readings.length;
    }
}

export class EMAChart extends SensorChart {
    private alphaInput!: HTMLInputElement;
    private alphaInputDiv!: HTMLDivElement;
    private lastAvgValue: number;
    public constructor(parent: HTMLDivElement, sensor: Sensor) {
        super(parent, sensor);
        this.initWindowSizeInput(parent);
        this.lastAvgValue = sensor.read();
    }

    private initWindowSizeInput(parent: HTMLDivElement) {
        [this.alphaInputDiv, this.alphaInput] = createSlider({
            min: 0.01,
            max: 1,
            step: 0.01,
            original: 0.25,
            name: 'Alpha',
            displayValue: true,
        });
        parent.appendChild(this.alphaInputDiv);
    }

    private get alpha() {
        return Number(this.alphaInput?.value ?? '0.95');
    }

    public override getValue(sensor: Sensor) {
        this.lastAvgValue = this.alpha * this.lastAvgValue + (1 - this.alpha) * sensor.read();
        return this.lastAvgValue;
    }
}
