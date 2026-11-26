import { Component, Input } from '@angular/core';
import { ControlRoomSnapshot, metricLabel } from '../../features/control-room/control-room.model';

/**
 * Visual grouping of three existing operational views.
 * Lines are illustrative; counters come from the dashboard snapshot.
 */
@Component({
  selector: 'app-operational-circuit',
  template: `
    <section class="circuit" aria-label="Illustrative operational connections">
      <header>
        <span class="eyebrow">SYSTEM TOPOLOGY</span>
        <strong>Operational network</strong>
      </header>
      <div class="diagram">
        <svg viewBox="0 0 280 164" preserveAspectRatio="none" aria-hidden="true">
          <path class="traces" d="M25 35 H52 V81 H91 M25 129 H52 V81 M91 81 H116"></path>
          <path class="traces" d="M165 81 H196 V35 H253 M196 81 V129 H253"></path>
          <path class="signal" d="M25 35 H52 V81 H116 M165 81 H196 V129 H253"></path>
          <circle cx="52" cy="81" r="3"></circle>
          <circle cx="196" cy="81" r="3"></circle>
        </svg>
        <div class="node node-operations">
          <span class="node-title">Operations</span>
          <strong>{{ metricLabel(snapshot.openIncidents) }}</strong>
          <small>open incidents</small>
        </div>
        <div class="node node-fleet">
          <span class="node-title">Fleet</span>
          <strong>{{ metricLabel(snapshot.activeShipments) }}</strong>
          <small>active shipments</small>
        </div>
        <div class="node node-warehouse">
          <span class="node-title">Warehouse</span>
          <strong>{{ metricLabel(snapshot.criticalPositions) }}</strong>
          <small>critical positions</small>
        </div>
      </div>
      <p>Illustrative grouping · Verified ERP counts, not physical connections.</p>
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
      }
      .circuit {
        overflow: hidden;
        border: 1px solid var(--line);
        border-radius: 14px;
        padding: 13px 13px 10px;
        background: var(--raised);
      }
      header {
        display: grid;
        gap: 3px;
      }
      .eyebrow {
        font-size: 11px;
        font-weight: 750;
        letter-spacing: 0.14em;
        color: var(--muted);
      }
      header strong {
        font-size: 13px;
        font-weight: 700;
        color: var(--ink);
      }
      .diagram {
        position: relative;
        height: 176px;
        margin-top: 8px;
        isolation: isolate;
      }
      svg {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        overflow: visible;
      }
      .traces {
        fill: none;
        stroke: var(--line);
        stroke-width: 1.8;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      .signal {
        fill: none;
        stroke: var(--accent);
        stroke-width: 2.2;
        stroke-linecap: round;
        stroke-linejoin: round;
        stroke-dasharray: 6 18;
      }
      circle {
        fill: var(--accent);
      }
      .node {
        position: absolute;
        display: grid;
        gap: 2px;
        min-width: 0;
        padding: 9px 10px;
        border: 1px solid var(--line);
        border-radius: 9px;
        background: var(--surface);
        box-shadow: 0 3px 12px rgb(12 12 12 / 24%);
      }
      .node-operations {
        top: 0;
        left: 0;
        width: 41%;
      }
      .node-fleet {
        top: 50px;
        right: 0;
        width: 42%;
      }
      .node-warehouse {
        bottom: 0;
        left: 0;
        width: 44%;
      }
      .node-title {
        color: var(--muted);
        font-size: 10px;
        font-weight: 650;
      }
      .node strong {
        color: var(--ink);
        font-size: 18px;
        font-variant-numeric: tabular-nums;
        line-height: 1.1;
      }
      .node small {
        font-size: 9px;
        color: var(--muted);
        line-height: 1.3;
      }
      p {
        margin: 9px 0 0;
        font-size: 10px;
        line-height: 1.5;
        color: var(--muted);
      }
      @keyframes circuit-flow {
        to {
          stroke-dashoffset: -144;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .signal {
          animation: none;
          stroke-dasharray: none;
          opacity: 0.5;
        }
      }
    `,
  ],
})
export class OperationalCircuitComponent {
  @Input({ required: true }) snapshot: ControlRoomSnapshot = {
    activeShipments: null,
    delayedShipments: null,
    openIncidents: null,
    criticalPositions: null,
  };

  readonly metricLabel = metricLabel;
}
