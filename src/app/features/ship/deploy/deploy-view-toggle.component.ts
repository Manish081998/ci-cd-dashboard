import { Component, input, output } from '@angular/core';

export type DeployViewMode = 'basic' | 'advanced';

@Component({
  selector: 'app-deploy-view-toggle',
  standalone: true,
  template: `
    <div class="dvt" role="tablist" aria-label="Deploy detail level">
      <button type="button" role="tab" [attr.aria-selected]="mode() === 'basic'"
        class="dvt-btn" [class.active]="mode() === 'basic'" (click)="modeChange.emit('basic')">
        Basic View
      </button>
      <button type="button" role="tab" [attr.aria-selected]="mode() === 'advanced'"
        class="dvt-btn" [class.active]="mode() === 'advanced'" (click)="modeChange.emit('advanced')">
        Advanced View
      </button>
    </div>
  `,
  styles: [`
    .dvt {
      display: inline-flex; gap: 2px; padding: 3px; background: var(--bg-elevated);
      border: 1px solid var(--border-dim); border-radius: 999px; margin-bottom: 12px;
    }
    .dvt-btn {
      appearance: none; border: none; background: transparent; cursor: pointer;
      font-size: 11.5px; font-weight: 700; color: var(--text-muted); letter-spacing: -.1px;
      padding: 6px 16px; border-radius: 999px;
      transition: background var(--dur-med, .25s) var(--ease-out, ease), color var(--dur-fast, .15s) ease, box-shadow var(--dur-med, .25s) var(--ease-out, ease);
    }
    .dvt-btn:hover:not(.active) { color: var(--text-primary); }
    .dvt-btn:focus-visible { outline: 2px solid var(--cyan); outline-offset: 2px; }
    .dvt-btn.active {
      background: var(--bg-surface); color: var(--text-primary);
      box-shadow: var(--shadow-sm, var(--shadow)), 0 0 0 1px var(--border-dim);
    }
  `],
})
export class DeployViewToggleComponent {
  mode = input<DeployViewMode>('basic');
  modeChange = output<DeployViewMode>();
}
