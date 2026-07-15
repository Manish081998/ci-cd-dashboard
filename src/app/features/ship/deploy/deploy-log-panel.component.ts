import { Component, ElementRef, input, effect, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-deploy-log-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dlp" #scrollHost>
      @if (lines().length) {
        @for (line of lines(); track $index) {
          <div class="dlp-line">{{ line }}</div>
        }
      } @else {
        <div class="dlp-empty">No output captured yet.</div>
      }
    </div>
  `,
  styles: [`
    .dlp {
      max-height: 220px; overflow-y: auto; background: var(--bg-void); border: 1px solid var(--border-dim);
      border-radius: 9px; padding: 8px 10px; font-family: 'SF Mono', Consolas, monospace; font-size: 11px;
      line-height: 1.5; color: var(--text-muted);
    }
    .dlp-line { white-space: pre-wrap; word-break: break-word; }
    .dlp-empty { color: var(--text-dim); font-style: italic; }
  `],
})
export class DeployLogPanelComponent {
  lines = input<string[]>([]);
  autoScroll = input(false);
  private scrollHost = viewChild<ElementRef<HTMLDivElement>>('scrollHost');

  constructor() {
    effect(() => {
      const _ = this.lines();
      if (!this.autoScroll()) return;
      const el = this.scrollHost()?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }
}
