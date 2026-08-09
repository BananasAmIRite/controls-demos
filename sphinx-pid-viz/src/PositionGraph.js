export default class PositionGraph {
    constructor(
        { width = 500, height = 200, maxSamples = 2000, title = 'Position vs Time' } = {},
        { left, bottom, enabled } = { left: '10px', bottom: '10px', enabled: true },
    ) {
        this.maxSamples = maxSamples;

        console.log(this.enabled);
        this.enabled = enabled;

        this.canvas = document.createElement('canvas');
        this.canvas.width = width;
        this.canvas.height = height;

        this.canvas.style.position = 'absolute';
        this.canvas.style.bottom = bottom;
        this.canvas.style.left = left;
        this.canvas.style.background = 'rgba(255,255,255,0.9)';
        this.canvas.style.border = '1px solid black';
        this.canvas.style.display = this.enabled ? 'block' : 'none';

        document.body.appendChild(this.canvas);

        this.ctx = this.canvas.getContext('2d');

        this.title = title;

        this.reset();
    }

    reset() {
        this.points = [];
        this.startTime = null;
    }

    setMaxSamples(maxSamples) {
        this.maxSamples = maxSamples;
    }

    addPoint(time, position) {
        if (this.startTime === null) {
            this.startTime = time;
        }

        this.points.push({
            time: time - this.startTime,
            position,
        });

        if (this.points.length > this.maxSamples) {
            this.points.shift();
        }

        this.render();
    }

    render() {
        if (!this.enabled) return;
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        ctx.clearRect(0, 0, w, h);

        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, w, h);

        ctx.strokeStyle = 'black';
        ctx.strokeRect(0, 0, w, h);

        if (this.points.length < 2) {
            return;
        }

        const times = this.points.map((p) => p.time);
        const positions = this.points.map((p) => p.position);

        const minTime = times[0];
        const maxTime = times[times.length - 1];

        const minPos = Math.min(...positions);
        const maxPos = Math.max(...positions);

        const xRange = Math.max(maxTime - minTime, 0.001);
        const yRange = Math.max(maxPos - minPos, 0.001);

        // Title
        ctx.fillStyle = 'black';
        ctx.font = '16px sans-serif';
        ctx.fillText(this.title, 10, 20);

        // Axes
        ctx.beginPath();
        ctx.moveTo(40, h - 30);
        ctx.lineTo(w - 10, h - 30);
        ctx.lineTo(w - 10, 20);
        ctx.stroke();

        ctx.strokeStyle = 'blue';
        ctx.lineWidth = 2;

        ctx.beginPath();

        this.points.forEach((p, i) => {
            const x = 40 + ((p.time - minTime) / xRange) * (w - 50);

            const y = h - 30 - ((p.position - minPos) / yRange) * (h - 50);

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });

        ctx.stroke();

        // Labels
        ctx.fillStyle = 'black';
        ctx.font = '12px sans-serif';

        ctx.fillText(`t=${maxTime.toFixed(1)}s`, w - 70, h - 10);

        ctx.fillText(`ymax=${maxPos.toFixed(1)}`, 5, 30);

        ctx.fillText(`ymin=${minPos.toFixed(1)}`, 5, h - 35);

        ctx.fillText(`value=${this.points[this.points.length - 1].position}`, 5, h - 5);
    }
}
