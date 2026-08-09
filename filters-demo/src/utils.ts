export interface SliderOptions {
    min: number;
    max: number;
    original: number;
    step: number;
    name: string;
    displayValue: boolean;
}

export function createSlider(options: SliderOptions): [HTMLDivElement, HTMLInputElement] {
    const sliderDiv = document.createElement('div') as HTMLDivElement;
    sliderDiv.className = 'd-flex align-items-center gap-2 mb-2';

    if (options.name != '') {
        const name = document.createElement('label');
        name.className = 'mb-0 fw-semibold flex-shrink-0';
        name.style.minWidth = '140px';
        name.innerText = options.name;
        sliderDiv.appendChild(name);
    }

    const slider = document.createElement('input') as HTMLInputElement;
    slider.className = 'form-range flex-grow-1 mb-0';
    slider.type = 'range';
    slider.min = options.min.toString();
    slider.max = options.max.toString();
    slider.step = options.step.toString();
    slider.value = options.original.toString();
    sliderDiv.appendChild(slider);

    if (options.displayValue) {
        const value = document.createElement('span');
        value.className = 'text-end text-secondary small flex-shrink-0';
        value.style.minWidth = '44px';
        value.textContent = slider.value;
        slider.addEventListener('input', (e) => (value.innerText = (e.target! as HTMLInputElement).value));
        sliderDiv.appendChild(value);
    }

    return [sliderDiv, slider];
}
