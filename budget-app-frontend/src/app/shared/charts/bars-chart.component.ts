import { Component, computed, input } from '@angular/core';

export interface MonthBar {
  label: string;
  entrate: number;
  uscite: number;
}

interface BarRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Barre mensili entrate/uscite in SVG puro. Colori dai design token
 * (accent per le entrate, neutro per le uscite), tooltip nativi
 * tramite <title>, griglia leggera con tre livelli.
 */
@Component({
  selector: 'app-bars-chart',
  standalone: true,
  template: `
    <div class="legend">
      <span class="legend__item"><i class="legend__dot legend__dot--in"></i>Entrate</span>
      <span class="legend__item"><i class="legend__dot legend__dot--out"></i>Uscite</span>
    </div>

    <svg [attr.viewBox]="'0 0 ' + W + ' ' + H" role="img" aria-label="Entrate e uscite per mese">
      @for (line of grid(); track $index) {
        <line
          [attr.x1]="plot.x" [attr.x2]="plot.x + plot.w"
          [attr.y1]="line.y" [attr.y2]="line.y"
          class="gridline"
        />
        <text [attr.x]="plot.x - 6" [attr.y]="line.y + 3" class="gridlabel" text-anchor="end">
          {{ compact(line.v) }}
        </text>
      }

      @for (bar of bars(); track bar.label) {
        <rect
          [attr.x]="bar.e.x" [attr.y]="bar.e.y"
          [attr.width]="bar.e.w" [attr.height]="bar.e.h"
          rx="3" class="bar bar--in"
        >
          <title>{{ bar.label }} · Entrate: {{ fmt(bar.entrate) }}</title>
        </rect>
        <rect
          [attr.x]="bar.u.x" [attr.y]="bar.u.y"
          [attr.width]="bar.u.w" [attr.height]="bar.u.h"
          rx="3" class="bar bar--out"
        >
          <title>{{ bar.label }} · Uscite: {{ fmt(bar.uscite) }}</title>
        </rect>
        <text [attr.x]="bar.cx" [attr.y]="H - 8" class="monthlabel" text-anchor="middle">
          {{ bar.label }}
        </text>
      }
    </svg>
  `,
  styles: `
    :host { display: block; }
    svg { display: block; width: 100%; height: auto; }

    .gridline { stroke: var(--border); stroke-width: 1; }
    .gridlabel {
      fill: var(--text-muted);
      font-family: var(--font-body);
      font-size: 10px;
    }
    .monthlabel {
      fill: var(--text-muted);
      font-family: var(--font-body);
      font-size: 11px;
      text-transform: capitalize;
    }
    .bar--in { fill: var(--accent); }
    .bar--out { fill: var(--text-muted); opacity: 0.55; }

    .legend {
      display: flex;
      gap: 16px;
      margin-bottom: 10px;
      font-size: 13px;
      color: var(--text-muted);
    }
    .legend__item { display: inline-flex; align-items: center; gap: 6px; }
    .legend__dot {
      width: 9px;
      height: 9px;
      border-radius: 3px;
      display: inline-block;
    }
    .legend__dot--in { background: var(--accent); }
    .legend__dot--out { background: var(--text-muted); opacity: 0.55; }
  `,
})
export class BarsChartComponent {
  readonly months = input<MonthBar[]>([]);

  readonly W = 600;
  readonly H = 210;
  readonly plot = { x: 46, y: 14, w: 600 - 46 - 8, h: 210 - 14 - 28 };

  private readonly maxValue = computed(() => {
    const values = this.months().flatMap(m => [m.entrate, m.uscite]);
    return Math.max(1, ...values) * 1.05;
  });

  readonly grid = computed(() =>
    [0, 0.5, 1].map(fraction => ({
      y: this.plot.y + this.plot.h * (1 - fraction),
      v: this.maxValue() * fraction,
    }))
  );

  readonly bars = computed(() => {
    const months = this.months();
    const count = Math.max(1, months.length);
    const groupWidth = this.plot.w / count;
    const barWidth = Math.min(20, groupWidth * 0.26);
    const gap = 5;
    const max = this.maxValue();

    return months.map((month, i) => {
      const cx = this.plot.x + groupWidth * i + groupWidth / 2;
      const hIn = this.plot.h * (month.entrate / max);
      const hOut = this.plot.h * (month.uscite / max);
      const bottom = this.plot.y + this.plot.h;
      return {
        label: month.label,
        entrate: month.entrate,
        uscite: month.uscite,
        cx,
        e: { x: cx - gap / 2 - barWidth, y: bottom - hIn, w: barWidth, h: hIn } as BarRect,
        u: { x: cx + gap / 2, y: bottom - hOut, w: barWidth, h: hOut } as BarRect,
      };
    });
  });

  fmt(value: number): string {
    return value.toLocaleString('it-IT', { maximumFractionDigits: 2 }) + ' €';
  }

  compact(value: number): string {
    return value.toLocaleString('it-IT', {
      notation: 'compact',
      maximumFractionDigits: 1,
    });
  }
}
