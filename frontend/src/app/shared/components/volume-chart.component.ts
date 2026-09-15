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
  template: `<canvas #canvas role="img" [attr.aria-label]="description"></canvas>
    @if (!hasVolume) {
      <div class="no-volume">
        <strong>No orders in this period</strong
        ><span>New orders will appear in the daily volume.</span>
      </div>
    }
    <table class="sr-only">
      <caption>
        Daily order volume
      </caption>
      <thead>
        <tr>
          <th>Date</th>
          <th>Orders</th>
        </tr>
      </thead>
      <tbody>
        @for (day of data; track day.date) {
          <tr>
            <td>{{ day.date }}</td>
            <td>{{ day.orders }}</td>
          </tr>
        }
      </tbody>
    </table>`,
  styles: [
    ':host{display:block;height:275px;padding:20px;position:relative}canvas{max-height:235px}.no-volume{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;align-items:center;pointer-events:none;background:rgb(255 255 255 / 85%);gap:6px;font-size:12px;color:#5c6f7e}.no-volume strong{font-size:14px;color:#172b3a}',
  ],
})
export class VolumeChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('canvas') canvas?: ElementRef<HTMLCanvasElement>;
  @Input() data: DailyVolume[] = [];
  private chart?: Chart;
  get hasVolume(): boolean {
    return this.data.some((day) => day.orders > 0);
  }
  get description(): string {
    return `Order volume: ${this.data.reduce((total, day) => total + day.orders, 0)} orders over ${this.data.length} days.`;
  }
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
    if (this.chart) {
      this.chart.data.labels = this.data.map((item) =>
        new Date(item.date + 'T12:00:00').toLocaleDateString('en', { weekday: 'short' }),
      );
      this.chart.data.datasets[0].data = this.data.map((item) => item.orders);
      this.chart.update('none');
      return;
    }
    this.chart = new Chart(this.canvas.nativeElement, {
      type: 'bar',
      data: {
        labels: this.data.map((item) =>
          new Date(item.date + 'T12:00:00').toLocaleDateString('en', { weekday: 'short' }),
        ),
        datasets: [
          {
            data: this.data.map((item) => item.orders),
            backgroundColor: '#247b91',
            hoverBackgroundColor: '#155d74',
            borderRadius: 4,
            barPercentage: 0.55,
            maxBarThickness: 38,
          },
        ],
      },
      options: {
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: { display: false },
          tooltip: { backgroundColor: '#172b3a', padding: 12, displayColors: false },
        },
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
