import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DeployStatusIconComponent } from './deploy-status-icon.component';
import { operationStatusLabel, type DeployOperation } from '../../../core/models/deploy-operations.model';

@Component({
  selector: 'app-deploy-operation-row',
  standalone: true,
  imports: [CommonModule, DeployStatusIconComponent],
  template: `
    <div class="dor" [class]="'dor-' + operation().status">
      <app-deploy-status-icon [status]="operation().status" />
      <span class="dor-label">{{ operation().label }}</span>
      @if (!operation().real && operation().status !== 'idle') {
        <span class="dor-est" title="Timing estimated — this phase's own completion is confirmed by the server">estimated</span>
      }
      <span class="dor-state">{{ statusLabel() }}</span>
      @if (operation().status === 'error' && operation().detail) {
        <span class="dor-detail">{{ operation().detail }}</span>
      }
    </div>
  `,
  styles: [`
    .dor { display: flex; align-items: center; gap: 8px; padding: 6px 4px; font-size: 12px; }
    .dor-label { color: var(--text-primary); font-weight: 600; flex: 1; }
    .dor-est {
      font-size: 8.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .4px;
      color: var(--text-dim); border: 1px solid var(--border-mid); border-radius: 5px; padding: 1px 5px;
    }
    .dor-state { font-size: 10px; font-weight: 700; color: var(--text-dim); text-transform: uppercase; letter-spacing: .3px; min-width: 52px; text-align: right; }
    .dor-error .dor-label, .dor-error .dor-state { color: var(--red); }
    .dor-done  .dor-state { color: var(--green); }
    .dor-running .dor-state { color: var(--cyan); }
    .dor-detail { font-size: 11px; color: var(--red); margin-left: 8px; font-weight: 600; }
  `],
})
export class DeployOperationRowComponent {
  operation = input.required<DeployOperation>();
  statusLabel = () => operationStatusLabel(this.operation().status);
}
