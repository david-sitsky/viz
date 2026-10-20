/**
 * GrowthLineChart
 * High-DPI interactive HTML5 Canvas line chart displaying cumulative Parkrun finishes over time.
 * Supports active progress line drawing, area fill gradient, ghost trajectory preview,
 * COVID hiatus milestone shading, and click/drag timeline scrubbing.
 */

export class GrowthLineChart {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onSeek = options.onSeek || null;
    this.showGhost = options.showGhost !== false;
    this.showCovidBand = options.showCovidBand !== false;

    this.totalWeeks = 0;
    this.currentWeek = 0;
    this.cumulativeSeries = [];
    this.metadata = null;
    this.maxVal = 1;
    this.yearTicks = [];
    this.isDragging = false;

    this._setupInteractions();
    this._setupResizeObserver();
  }

  _setupInteractions() {
    if (!this.onSeek) return;

    const handleSeek = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clientX = e.clientX ?? (e.touches && e.touches[0]?.clientX);
      if (clientX === undefined) return;

      const clickX = clientX - rect.left;
      const padLeft = 36;
      const padRight = 12;
      const plotW = Math.max(1, rect.width - padLeft - padRight);

      const ratio = Math.max(0, Math.min(1, (clickX - padLeft) / plotW));
      const targetWeek = Math.round(ratio * (this.totalWeeks - 1));
      this.onSeek(targetWeek);
    };

    this.canvas.addEventListener('pointerdown', (e) => {
      this.isDragging = true;
      try { this.canvas.setPointerCapture(e.pointerId); } catch {}
      handleSeek(e);
    });

    this.canvas.addEventListener('mousedown', (e) => {
      handleSeek(e);
    });

    this.canvas.addEventListener('click', (e) => {
      handleSeek(e);
    });

    this.canvas.addEventListener('pointermove', (e) => {
      if (this.isDragging) handleSeek(e);
    });

    this.canvas.addEventListener('pointerup', (e) => {
      this.isDragging = false;
      try { this.canvas.releasePointerCapture(e.pointerId); } catch {}
    });

    this.canvas.addEventListener('pointercancel', () => {
      this.isDragging = false;
    });
  }

  _setupResizeObserver() {
    if (typeof ResizeObserver !== 'undefined' && this.canvas) {
      const ro = new ResizeObserver(() => {
        this.render();
      });
      ro.observe(this.canvas);
    }
  }

  setData(metadata, cumulativeSeries, maxVal) {
    this.metadata = metadata;
    this.totalWeeks = metadata.totalWeeks;
    this.cumulativeSeries = cumulativeSeries;
    this.maxVal = Math.max(1, maxVal);

    // Compute year ticks at 2-year intervals: 2012, 2014, 2016, 2018, 2020, 2022, 2024, 2026
    this.yearTicks = [];
    if (metadata.weekStats) {
      for (let w = 0; w < this.totalWeeks; w++) {
        const d = metadata.weekStats[w]?.date;
        if (!d) continue;
        const prevD = (w > 0) ? metadata.weekStats[w - 1]?.date : null;
        const year = parseInt(d.slice(0, 4), 10);
        const prevYear = prevD ? parseInt(prevD.slice(0, 4), 10) : null;

        if (year !== prevYear) {
          if (year % 2 === 0 && year >= 2012 && year <= 2026) {
            this.yearTicks.push({ week: w, label: `'${String(year).slice(2)}` });
          }
        }
      }
    }

    this.render();
  }

  setWeek(week) {
    this.currentWeek = Math.max(0, Math.min(week, this.totalWeeks - 1));
    this.render();
  }

  _formatNumber(val) {
    if (val >= 1_000_000) {
      const m = val / 1_000_000;
      return `${m.toFixed(m >= 10 ? 0 : 1)}M`;
    }
    if (val >= 1_000) {
      const k = val / 1_000;
      return `${k.toFixed(k >= 10 ? 0 : 1)}k`;
    }
    return Math.round(val).toString();
  }

  render() {
    if (!this.canvas || !this.cumulativeSeries || this.cumulativeSeries.length === 0) return;

    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = rect.width || this.canvas.clientWidth || 300;
    const h = rect.height || this.canvas.clientHeight || 110;

    if (w <= 0 || h <= 0) return;

    // Adjust canvas buffer size for sharp high-DPI rendering
    if (this.canvas.width !== Math.round(w * dpr) || this.canvas.height !== Math.round(h * dpr)) {
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
    }

    const ctx = this.ctx;
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const padLeft = 36;
    const padRight = 14;
    const padTop = 10;
    const padBottom = 20;

    const plotW = Math.max(1, w - padLeft - padRight);
    const plotH = Math.max(1, h - padTop - padBottom);

    const totalW = Math.max(1, this.totalWeeks - 1);
    const maxVal = Math.max(1, this.maxVal);

    const getX = (weekIdx) => padLeft + (weekIdx / totalW) * plotW;
    const getY = (val) => padTop + plotH - (Math.max(0, val) / maxVal) * plotH;

    // ─── 1. Background Gridlines & Y-Axis Labels ───
    const yLevels = [
      { val: maxVal, label: this._formatNumber(maxVal) },
      { val: maxVal * 0.5, label: this._formatNumber(maxVal * 0.5) },
      { val: 0, label: '0' }
    ];

    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.font = '9px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

    yLevels.forEach(({ val, label }) => {
      const y = getY(val);

      // Horizontal dashed line
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 3]);
      ctx.moveTo(padLeft, y);
      ctx.lineTo(padLeft + plotW, y);
      ctx.stroke();

      // Y Label
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.fillText(label, padLeft - 6, y);
    });
    ctx.setLineDash([]);

    // ─── 2. COVID-19 Hiatus Band (Historical Milestone: March 2020 - Oct 2020) ───
    // Week ~467 (14 Mar 2020) to ~Week 498 (17 Oct 2020)
    if (this.showCovidBand && this.totalWeeks > 500) {
      const covidStart = 467;
      const covidEnd = 498;
      const x1 = getX(covidStart);
      const x2 = getX(covidEnd);

      ctx.fillStyle = 'rgba(239, 68, 68, 0.07)';
      ctx.fillRect(x1, padTop, Math.max(2, x2 - x1), plotH);

      // Subtle label if width permits
      if (x2 - x1 > 8) {
        ctx.fillStyle = 'rgba(244, 63, 94, 0.35)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.font = '8px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText('COVID', (x1 + x2) / 2, padTop + 2);
      }
    }

    // ─── 3. X-Axis Year Ticks & Labels ───
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = '9px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

    this.yearTicks.forEach(({ week, label }) => {
      const x = getX(week);

      // Vertical subtle tick line
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.lineWidth = 1;
      ctx.moveTo(x, padTop + plotH);
      ctx.lineTo(x, padTop + plotH + 3);
      ctx.stroke();

      // Tick label
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fillText(label, x, padTop + plotH + 5);
    });

    // ─── 4. Ghost Full-Trajectory Line (Faint Background Target) ───
    if (this.showGhost && this.cumulativeSeries.length > 1) {
      ctx.beginPath();
      ctx.moveTo(getX(0), getY(this.cumulativeSeries[0]));
      for (let i = 1; i < this.cumulativeSeries.length; i++) {
        ctx.lineTo(getX(i), getY(this.cumulativeSeries[i]));
      }
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([2, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // ─── 5. Active Animated Growth Line & Area Gradient (Up to currentWeek) ───
    if (this.currentWeek >= 0 && this.cumulativeSeries.length > 0) {
      const activeCount = Math.min(this.currentWeek + 1, this.cumulativeSeries.length);

      // Area Gradient Fill
      if (activeCount > 1) {
        ctx.beginPath();
        ctx.moveTo(getX(0), padTop + plotH);
        ctx.lineTo(getX(0), getY(this.cumulativeSeries[0]));

        for (let i = 1; i < activeCount; i++) {
          ctx.lineTo(getX(i), getY(this.cumulativeSeries[i]));
        }

        ctx.lineTo(getX(activeCount - 1), padTop + plotH);
        ctx.closePath();

        const areaGrad = ctx.createLinearGradient(0, padTop, 0, padTop + plotH);
        areaGrad.addColorStop(0, 'rgba(249, 115, 22, 0.32)');
        areaGrad.addColorStop(0.7, 'rgba(249, 115, 22, 0.08)');
        areaGrad.addColorStop(1, 'rgba(249, 115, 22, 0.0)');
        ctx.fillStyle = areaGrad;
        ctx.fill();
      }

      // Stroke Line
      ctx.beginPath();
      ctx.moveTo(getX(0), getY(this.cumulativeSeries[0]));
      for (let i = 1; i < activeCount; i++) {
        ctx.lineTo(getX(i), getY(this.cumulativeSeries[i]));
      }

      const lineGrad = ctx.createLinearGradient(padLeft, 0, padLeft + plotW, 0);
      lineGrad.addColorStop(0, '#f59e0b');
      lineGrad.addColorStop(0.4, '#f97316');
      lineGrad.addColorStop(1, '#fb7185');

      ctx.strokeStyle = lineGrad;
      ctx.lineWidth = 2.2;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.stroke();

      // Current Head Playhead Dot
      const headIdx = activeCount - 1;
      const headX = getX(headIdx);
      const headY = getY(this.cumulativeSeries[headIdx]);

      // Outer glow halo
      ctx.beginPath();
      ctx.arc(headX, headY, 6, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(249, 115, 22, 0.35)';
      ctx.fill();

      // Inner white core with apricot ring
      ctx.beginPath();
      ctx.arc(headX, headY, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    ctx.restore();
  }
}
