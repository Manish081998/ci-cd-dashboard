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
          <span class="dfb-icon">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.4"/><path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
          </span>
          <span class="dfb-title">{{ stage.label }} failed</span>
        </div>
        @if (failedOp(); as op) {
          <div class="dfb-op">{{ op.label }} did not complete</div>
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
    .dfb {
      margin-top: 4px; background: var(--red-bg); border: 1px solid rgba(225,68,92,.25);
      border-radius: var(--radius-lg); padding: 14px 16px; box-shadow: var(--shadow-sm);
      animation: popIn .3s var(--ease-out);
    }
    .dfb-head { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    .dfb-icon { color: var(--red); display: flex; flex-shrink: 0; }
    .dfb-title { font-size: 13.5px; font-weight: 800; color: var(--red); letter-spacing: -.1px; }
    .dfb-op { font-size: 12px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px; }
    .dfb-reason {
      display: flex; flex-direction: column; gap: 3px; margin-bottom: 8px;
      background: rgba(255,255,255,.5); border-radius: var(--radius-sm); padding: 8px 10px;
    }
    .dfb-reason-label { font-size: 9.5px; font-weight: 700; color: var(--red); text-transform: uppercase; letter-spacing: .4px; opacity: .8; }
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
