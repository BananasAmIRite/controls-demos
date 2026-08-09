import ConfigurableSensor from './ConfigurableSensor';
import SensorChart, { EMAChart, MovingAverageChart } from './SensorChart';
import './style.css';

const sensorControls = document.getElementById('sensorControls') as HTMLDivElement | null;
const sensorChartHost = document.getElementById('sensorChart') as HTMLDivElement | null;
const emaChartHost = document.getElementById('emaChart') as HTMLDivElement | null;
const movingAverageHost = document.getElementById('movingAverageChart') as HTMLDivElement | null;
const filterSelect = document.getElementById('filterSelect') as HTMLSelectElement | null;

if (!sensorControls || !sensorChartHost || !emaChartHost || !movingAverageHost || !filterSelect) {
    throw new Error('Missing required UI elements');
}

const emaPanel = emaChartHost;
const movingAveragePanel = movingAverageHost;
const filterControl = filterSelect;

const sensor = new ConfigurableSensor(sensorControls);
const rawChart = new SensorChart(sensorChartHost, sensor);
const emaChart = new EMAChart(emaChartHost, sensor);
const movingAverageChart = new MovingAverageChart(movingAverageHost, sensor);

let activeFilter: 'ema' | 'movingAverage' = 'movingAverage';

function syncFilterPanels() {
    const showEma = activeFilter === 'ema';
    emaPanel.classList.toggle('d-none', !showEma);
    movingAveragePanel.classList.toggle('d-none', showEma);
}

filterControl.addEventListener('change', () => {
    const value = filterControl.value;
    if (value === 'ema' || value === 'movingAverage') {
        activeFilter = value;
        syncFilterPanels();
    }
});

syncFilterPanels();

let lastRun = 0;

setInterval(async () => {
    let dt = Date.now() - lastRun;
    lastRun = Date.now();
    console.log(dt);
    rawChart.loop();
    if (activeFilter === 'ema') {
        emaChart.loop();
    } else {
        movingAverageChart.loop();
    }
}, 25);
