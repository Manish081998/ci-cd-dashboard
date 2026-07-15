import { Component, computed, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DeployLogPanelComponent } from './deploy-log-panel.component';
import type { DeployStageView } from '../../../core/models/deploy-operations.model';

@Component({
  selector: 'app-deploy-failure-banner',
  standalone: true,
  imports: [CommonModule, DeployLogPanelComponent],
  template: `
    @if (failedStage(); as stage) {
      <div class="dfb">
        <div class="dfb-head">
          <span class="dfb-icon">✕</span>
          <span class="dfb-title">{{ stage.label }}</span>
        </div>
        @if (failedOp(); as op) {
          <div class="dfb-op">✕ {{ op.label }} failed</div>
        }
        <div class="dfb-reason">
          <span class="dfb-reason-label">Reason</span>
          <span class="dfb-reason-text">{{ message() || failedOp()?.detail || 'Unknown error' }}</span>
        </div>
        <button type="button" class="dfb-toggle" (click)="showLogs.set(!showLogs())">
          {{ showLogs() ? '▾ Hide logs' : '▸ View logs' }}
        </button>
        @if (showLogs()) {
          <app-deploy-log-panel [lines]="stage.logLines" />
        }
      </div>
    }
  `,
  styles: [`
    .dfb { margin-top: 4px; background: var(--red-bg); border: 1px solid rgba(225,68,92,.3); border-radius: 12px; padding: 12px 14px; }
    .dfb-head { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
    .dfb-icon { color: var(--red); font-weight: 800; }
    .dfb-title { font-size: 13px; font-weight: 800; color: var(--red); }
    .dfb-op { font-size: 12px; font-weight: 700; color: var(--text-primary); margin-bottom: 6px; }
    .dfb-reason { display: flex; flex-direction: column; gap: 2px; margin-bottom: 8px; }
    .dfb-reason-label { font-size: 9.5px; font-weight: 700; color: var(--text-dim); text-transform: uppercase; letter-spacing: .4px; }
    .dfb-reason-text { font-size: 12px; font-weight: 600; color: var(--text-primary); }
    .dfb-toggle { background: none; border: none; cursor: pointer; padding: 0; font-size: 11px; font-weight: 700; color: var(--red); }
    .dfb-toggle:hover { text-decoration: underline; }
  `],
})
export class DeployFailureBannerComponent {
  stages = input.required<DeployStageView[]>();
  message = input('');
  showLogs = signal(false);

  failedStage = computed(() => this.stages().find(s => s.status === 'error') ?? null);
  failedOp = computed(() => this.failedStage()?.operations.find(o => o.status === 'error') ?? null);
}
