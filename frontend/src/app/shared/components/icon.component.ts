import { Component, Input } from '@angular/core';

const paths = {
  overview: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  orders: 'M8 4H5v17h14V4h-3 M8 3h8v4H8z M8 12h8 M8 16h5',
  inventory: 'm3 7 9-4 9 4v10l-9 4-9-4V7z m0 0 9 4 9-4 M12 11v10 M8 5l9 4',
  shipments: 'M3 6h11v11H3z M14 10h4l3 4v3h-7 M7 17a2 2 0 1 0 0 .1 M18 17a2 2 0 1 0 0 .1',
  customers:
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M17 4a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-4',
  fleet: 'M5 17H3v-5l3-7h12l3 7v5h-2 M5 17h14 M3 12h18 M7 17v3 M17 17v3 M6 15h2 M16 15h2',
  incidents: 'm12 3 10 18H2L12 3z M12 9v5 M12 17v.1',
  users: 'M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M4 21v-2a5 5 0 0 1 5-5h6a5 5 0 0 1 5 5v2',
} as const;
export type IconName = keyof typeof paths;

@Component({
  selector: 'app-icon',
  template:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path [attr.d]="path" /></svg>',
  styles: [
    ':host{display:inline-flex;width:20px;height:20px;flex-shrink:0}svg{width:100%;height:100%}',
  ],
})
export class IconComponent {
  @Input({ required: true }) name: IconName = 'overview';
  get path(): string {
    return paths[this.name];
  }
}
