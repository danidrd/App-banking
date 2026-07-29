import { Component, computed, input } from '@angular/core';

export interface DonutSlice {
  value: number;
  color: string;
}

/**
 * Ciambella SVG senza dipendenze: ogni segmento è un cerchio con
 * stroke-dasharray proporzionale al valore. I colori arrivano da fuori,
 * il centro è contenuto proiettato (ng-content) — il componente disegna
 * e basta, non sa niente di valute o categorie.
 */
@Component({
  selector: 'app-donut-chart',
  standalone: true,
  template: `
    <div class="wrap">
      <svg viewBox="0 0 200 200" role="img" aria-label="Ripartizione a ciambella">
        <circle
          cx="100" cy="100" [attr.r]="r"
          fill="none" stroke="var(--surface-2)" [attr.stroke-width]="w"
        />
        @for (segment of segments(); track $index) {
          <circle
            cx="100" cy="100" [attr.r]="r"
            fill="none"
            [attr.stroke]="segment.color"
            [attr.stroke-width]="w"
            [attr.stroke-dasharray]="segment.dash"
            [attr.stroke-dashoffset]="segment.offset"
            transform="rotate(-90 100 100)"
          />
        }
      </svg>
      <div class="center">
        <ng-content />
      </div>
    </div>
  `,
  styles: `
    .wrap {
      position: relative;
      width: 100%;
      max-width: 210px;
    }
    svg { display: block; width: 100%; height: auto; }
    .center {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      text-align: center;
      pointer-events: none;
    }
  `,
})
export class DonutChartComponent {
  readonly slices = input<DonutSlice[]>([]);

  readonly r = 80;
  readonly w = 26;
  private readonly circumference = 2 * Math.PI * this.r;

  readonly segments = computed(() => {
    const slices = this.slices().filter(s => s.value > 0);
    const total = slices.reduce((sum, s) => sum + s.value, 0);
    if (total <= 0) return [];

    let accumulated = 0;
    return slices.map(slice => {
      const length = (slice.value / total) * this.circumference;
      const segment = {
        color: slice.color,
        dash: `${length} ${this.circumference - length}`,
        offset: -accumulated,
      };
      accumulated += length;
      return segment;
    });
  });
}
