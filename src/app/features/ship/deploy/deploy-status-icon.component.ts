import { Component, input } from '@angular/core';
import type { StepStatus } from '../../../core/models/pipeline.models';

@Component({
  selector: 'app-deploy-status-icon',
  standalone: true,
  template: `
    @switch (status()) {
      @case ('running') {
        <span class="dsi dsi-running" aria-label="Running">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <path d="M13.7 8A5.7 5.7 0 112.3 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          </svg>
        </span>
      }
      @case ('done') {
        <span class="dsi dsi-done" aria-label="Success">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7" fill="currentColor" opacity=".14"/>
            <path d="M4.8 8.2l2.2 2.2 4.2-4.6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
      }
      @case ('error') {
        <span class="dsi dsi-error" aria-label="Failed">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7" fill="currentColor" opacity=".14"/>
            <path d="M5.6 5.6l4.8 4.8M10.4 5.6l-4.8 4.8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          </svg>
        </span>
      }
      @case ('skipped') {
        <span class="dsi dsi-skipped" aria-label="Skipped">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6.3" stroke="currentColor" stroke-width="1.5"/>
            <path d="M5 11L11 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </span>
      }
      @default {
        <span class="dsi dsi-idle" aria-label="Pending">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6.3" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2.2 2.4"/>
          </svg>
        </span>
      }
    }
  `,
  styles: [`
    .dsi { display: inline-flex; align-items: center; justify-content: center; line-height: 1; }
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
