import { Component, input } from '@angular/core';
import type { StepStatus } from '../../../core/models/pipeline.models';

@Component({
  selector: 'app-deploy-status-icon',
  standalone: true,
  template: `
    @switch (status()) {
      @case ('running') { <span class="dsi dsi-running" aria-label="Running">⟳</span> }
      @case ('done')    { <span class="dsi dsi-done" aria-label="Success">✔</span> }
      @case ('error')   { <span class="dsi dsi-error" aria-label="Failed">✕</span> }
      @case ('skipped') { <span class="dsi dsi-skipped" aria-label="Skipped">⊘</span> }
      @default          { <span class="dsi dsi-idle" aria-label="Pending">○</span> }
    }
  `,
  styles: [`
    .dsi { display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; line-height: 1; }
    .dsi-running { color: var(--cyan); animation: dsi-spin 0.9s linear infinite; }
    .dsi-done    { color: var(--green); }
    .dsi-error   { color: var(--red); }
    .dsi-skipped { color: var(--text-dim); }
    .dsi-idle    { color: var(--text-dim); opacity: .6; }
    @keyframes dsi-spin { to { transform: rotate(360deg); } }
  `],
})
export class DeployStatusIconComponent {
  status = input<StepStatus>('idle');
}
