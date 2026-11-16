import { Inventory, OrderDetail } from '../../shared/models/models';

export const WAREHOUSE_ZONES = [
  {
    id: 'receiving',
    name: 'Receiving',
    description: 'Illustrative inbound staging area. No dock booking data is recorded.',
  },
  {
    id: 'racks',
    name: 'Storage racks',
    description:
      'Illustrative shelving. Products are recorded at warehouse level, not assigned to these shelves.',
  },
  {
    id: 'picking',
    name: 'Picking',
    description:
      'Illustrative preparation area. The selected order is real; this is not its registered picking location.',
  },
  {
    id: 'dispatch',
    name: 'Dispatch docks',
    description:
      'Illustrative loading area and van. No fleet assignment or physical loading is implied.',
  },
] as const;
export type WarehouseZone = (typeof WAREHOUSE_ZONES)[number]['id'];
export const PREPARATION_STATUSES = ['CONFIRMED', 'PREPARING'] as const;

export function compatibleOrder(order: OrderDetail, warehouseId: string): boolean {
  return (
    order.warehouseId === warehouseId &&
    (order.status === 'CONFIRMED' || order.status === 'PREPARING') &&
    order.items.length > 0
  );
}
export function inventoryMetrics(rows: Inventory[], warehouseId: string) {
  const positions = rows.filter((row) => row.warehouseId === warehouseId);
  return {
    products: new Set(positions.map((row) => row.productId)).size,
    available: positions.reduce((sum, row) => sum + row.available, 0),
    reserved: positions.reduce((sum, row) => sum + row.reserved, 0),
    critical: positions.filter((row) => row.available <= row.reorderLevel).length,
  };
}

export const SEQUENCE_PHASES = [
  'Preparing',
  'Collecting pallet',
  'Moving to dock',
  'Approaching dock',
  'Loading van',
  'Complete',
] as const;
export interface SequenceSnapshot {
  elapsed: number;
  progress: number;
  phase: (typeof SEQUENCE_PHASES)[number];
  running: boolean;
}

/** Visual time only. This controller has no API, inventory or order mutation capability. */
export class WarehouseSequence {
  private elapsed = 0;
  private running = false;
  private readonly transferSeconds: number;
  readonly duration: number;
  constructor(length = 0) {
    // Smoothstep peaks at 1.5 times its average speed. Long detours take
    // longer; they never make the loaded vehicle sprint to meet a deadline.
    this.transferSeconds = Math.max(12, (1.5 * length) / 2.4);
    this.duration = 12 + this.transferSeconds;
  }
  choreographyTime() {
    if (this.elapsed === this.duration) return 24;
    if (this.elapsed < 7) return this.elapsed;
    if (this.elapsed < 7 + this.transferSeconds)
      return 7 + ((this.elapsed - 7) * 12) / this.transferSeconds;
    return this.elapsed - this.transferSeconds + 12;
  }
  play() {
    if (this.elapsed >= this.duration) this.elapsed = 0;
    this.running = true;
  }
  pause() {
    this.running = false;
  }
  reset() {
    this.elapsed = 0;
    this.running = false;
  }
  advance(seconds: number) {
    if (this.running && Number.isFinite(seconds) && seconds > 0)
      this.elapsed = Math.min(this.duration, this.elapsed + seconds);
    if (this.elapsed === this.duration) this.running = false;
    return this.snapshot();
  }
  snapshot(): SequenceSnapshot {
    const t = this.choreographyTime();
    const phase = t < 3 ? 0 : t < 7 ? 1 : t < 15 ? 2 : t < 19 ? 3 : t < 24 ? 4 : 5;
    return {
      elapsed: t,
      progress: (this.elapsed / this.duration) * 100,
      phase: SEQUENCE_PHASES[phase],
      running: this.running,
    };
  }
}
