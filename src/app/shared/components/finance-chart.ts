import {
  AfterViewInit,
  Component,
  ElementRef,
  input,
  OnDestroy,
  viewChild,
  effect,
} from '@angular/core';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);
@Component({
  selector: 'oc-finance-chart',
  template:
    '<div class="chart-wrap"><canvas #canvas role="img" [attr.aria-label]="label()"></canvas></div>',
  styles: '.chart-wrap{height:250px;position:relative} :host{display:block;min-width:0}',
})
export class FinanceChart implements AfterViewInit, OnDestroy {
  labels = input<string[]>([]);
  values = input<number[]>([]);
  label = input('Valores por categoria');
  type = input<'doughnut' | 'bar'>('doughnut');
  unit = input<'currency' | 'people'>('currency');
  private canvas = viewChild<ElementRef<HTMLCanvasElement>>('canvas');
  private chart?: Chart;
  constructor() {
    effect(() => {
      this.labels();
      this.values();
      this.draw();
    });
  }
  ngAfterViewInit() {
    this.draw();
  }
  private draw() {
    const canvas = this.canvas()?.nativeElement;
    if (!canvas) return;
    this.chart?.destroy();
    this.chart = new Chart(canvas, {
      type: this.type(),
      data: {
        labels: this.labels(),
        datasets: [
          {
            label: this.label(),
            data: this.values().map((c) => (this.unit() === 'currency' ? c / 100 : c)),
            backgroundColor: ['#64765b', '#a6b398', '#c4ab78', '#ded0b4', '#8a9d91', '#a98970'],
          },
        ],
      },
      options: {
        animation: false,
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: this.type() === 'doughnut', position: 'bottom' },
          tooltip: {
            callbacks: {
              label: (ctx) =>
                `${ctx.label}: ${new Intl.NumberFormat('pt-BR', this.unit() === 'currency' ? { style: 'currency', currency: 'BRL' } : { maximumFractionDigits: 0 }).format(Number(this.type() === 'doughnut' ? ctx.parsed : (ctx.parsed as { y: number }).y))}`,
            },
          },
        },
        scales: this.type() === 'bar' ? { y: { beginAtZero: true } } : undefined,
      },
    });
  }
  ngOnDestroy() {
    this.chart?.destroy();
  }
}
