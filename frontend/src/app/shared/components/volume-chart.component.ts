import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { Chart, registerables } from 'chart.js';
import { DailyVolume } from '../models/models';

Chart.register(...registerables);

@Component({
  selector: 'app-volume-chart',
  template: '<canvas #canvas aria-label="Order volume for the last seven days"></canvas>',
  styles: [':host{display:block;height:245px}canvas{max-height:245px}'],
})
export class VolumeChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('canvas') canvas?: ElementRef<HTMLCanvasElement>;
  @Input() data: DailyVolume[] = [];
  private chart?: Chart;
  ngAfterViewInit(): void {
    this.render();
  }
  ngOnChanges(): void {
    this.render();
  }
  ngOnDestroy(): void {
    this.chart?.destroy();
  }
  private render(): void {
    if (!this.canvas) return;
    this.chart?.destroy();
    this.chart = new Chart(this.canvas.nativeElement, {
      type: 'bar',
      data: {
        labels: this.data.map((item) =>
          new Date(item.date).toLocaleDateString(undefined, { weekday: 'short' }),
        ),
        datasets: [
          {
            data: this.data.map((item) => item.orders),
            backgroundColor: '#1d4ed8',
            borderRadius: 1,
            barPercentage: 0.62,
          },
        ],
      },
      options: {
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#64748b' } },
          y: {
            beginAtZero: true,
            ticks: { precision: 0, color: '#64748b' },
            grid: { color: '#eef2f7' },
          },
        },
      },
    });
  }
}
