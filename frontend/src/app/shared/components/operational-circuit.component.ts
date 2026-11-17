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
        border: 1px solid #d4e3dc;
        border-radius: 14px;
        padding: 13px 13px 10px;
        background: linear-gradient(140deg, #edf5f0, #f8fbf8 55%, #eff5f2);
      }
      header {
        display: grid;
        gap: 3px;
      }
      .eyebrow {
        font-size: 9px;
        font-weight: 750;
        letter-spacing: 0.14em;
        color: #5a796e;
      }
      header strong {
        font-size: 13px;
        font-weight: 700;
        color: #294b40;
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
        stroke: #9abbaa;
        stroke-width: 1.8;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      .signal {
        fill: none;
        stroke: #438c77;
        stroke-width: 2.2;
        stroke-linecap: round;
        stroke-linejoin: round;
        stroke-dasharray: 6 18;
        animation: circuit-flow 12s linear infinite;
      }
      circle {
        fill: #5c9c88;
      }
      .node {
        position: absolute;
        display: grid;
        gap: 2px;
        min-width: 0;
        padding: 9px 10px;
        border: 1px solid #d3e2d9;
        border-radius: 9px;
        background: #fff;
        box-shadow: 0 3px 12px rgb(34 70 56 / 7%);
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
        color: #506b5d;
        font-size: 10px;
        font-weight: 650;
      }
      .node strong {
        color: #214e41;
        font-size: 18px;
        font-variant-numeric: tabular-nums;
        line-height: 1.1;
      }
      .node small {
        font-size: 9px;
        color: #63786c;
        line-height: 1.3;
      }
      p {
        margin: 9px 0 0;
        font-size: 10px;
        line-height: 1.5;
        color: #61746a;
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
