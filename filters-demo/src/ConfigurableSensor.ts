import Sensor from './Sensor';
import { createSlider } from './utils';

function getGaussianNoise(mean = 0, stdev = 1) {
    let u1 = 1 - Math.random();
    let u2 = Math.random();
    let randStdNormal = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return mean + stdev * randStdNormal;
}

export default class ConfigurableSensor extends Sensor {
    private sensorInputDiv: HTMLDivElement;
    private sensorInput: HTMLInputElement;
    private frequencyEnabledInput: HTMLInputElement;
    private frequencyInput: HTMLInputElement;
    private waveformCenterInput: HTMLInputElement;
    private waveformAmplitudeInput: HTMLInputElement;
    private waveformStartTime: number;
    public constructor(
        private sensorDiv: HTMLDivElement,
        private noiseMean: number = 0,
        private noiseStdDev: number = 1,
    ) {
        super();
        this.waveformStartTime = performance.now();

        [this.sensorInputDiv, this.sensorInput] = createSlider({
            min: 0,
            max: 100,
            step: 1,
            original: 50,
            name: 'Sensor Value',
            displayValue: true,
        });
        this.sensorDiv.appendChild(this.sensorInputDiv);

        const frequencyPanel = document.createElement('div');
        frequencyPanel.className = 'border-top pt-3 mt-2';

        const heading = document.createElement('h6');
        heading.className = 'mb-2';
        heading.innerText = 'Frequency Response';
        frequencyPanel.appendChild(heading);

        const enableWrap = document.createElement('div');
        enableWrap.className = 'form-check mb-2';
        this.frequencyEnabledInput = document.createElement('input');
        this.frequencyEnabledInput.type = 'checkbox';
        this.frequencyEnabledInput.className = 'form-check-input';
        this.frequencyEnabledInput.id = 'frequencyEnabled';

        const enableLabel = document.createElement('label');
        enableLabel.className = 'form-check-label';
        enableLabel.htmlFor = 'frequencyEnabled';
        enableLabel.innerText = 'Use sine wave output';

        enableWrap.appendChild(this.frequencyEnabledInput);
        enableWrap.appendChild(enableLabel);
        frequencyPanel.appendChild(enableWrap);

        const frequencyField = document.createElement('div');
        frequencyField.className = 'd-flex align-items-center gap-2 mb-2';
        const frequencyLabel = document.createElement('label');
        frequencyLabel.className = 'mb-0 fw-semibold flex-shrink-0';
        frequencyLabel.style.minWidth = '140px';
        frequencyLabel.innerText = 'Frequency (Hz)';
        this.frequencyInput = document.createElement('input');
        this.frequencyInput.type = 'number';
        this.frequencyInput.className = 'form-control';
        this.frequencyInput.min = '0';
        this.frequencyInput.step = '1';
        this.frequencyInput.value = '1';
        frequencyField.appendChild(frequencyLabel);
        frequencyField.appendChild(this.frequencyInput);
        frequencyPanel.appendChild(frequencyField);

        const [centerDiv, centerInput] = createSlider({
            min: 0,
            max: 100,
            step: 1,
            original: 50,
            name: 'Wave Center',
            displayValue: true,
        });
        this.waveformCenterInput = centerInput;
        frequencyPanel.appendChild(centerDiv);

        const [amplitudeDiv, amplitudeInput] = createSlider({
            min: 0,
            max: 50,
            step: 1,
            original: 25,
            name: 'Amplitude',
            displayValue: true,
        });
        this.waveformAmplitudeInput = amplitudeInput;
        frequencyPanel.appendChild(amplitudeDiv);

        this.sensorDiv.appendChild(frequencyPanel);
    }

    private readWaveformValue() {
        const elapsedSeconds = (performance.now() - this.waveformStartTime) / 1000;
        const frequency = Math.max(0, Number(this.frequencyInput.value) || 0);
        const center = Number(this.waveformCenterInput.value);
        const amplitude = Number(this.waveformAmplitudeInput.value);

        return center + amplitude * Math.sin(2 * Math.PI * frequency * elapsedSeconds);
    }

    private get trueValue() {
        if (this.frequencyEnabledInput.checked) {
            return this.readWaveformValue();
        }

        return Number(this.sensorInput.value);
    }

    read(): number {
        return this.trueValue + getGaussianNoise(this.noiseMean, this.noiseStdDev);
    }

    readTrueValue(): number {
        return this.trueValue;
    }
}
