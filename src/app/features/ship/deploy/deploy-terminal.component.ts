import { Component, ElementRef, computed, effect, input, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { DeployStageView, DeployTerminalLine } from '../../../core/models/deploy-operations.model';
import { formatDuration } from './deploy-progress.util';

@Component({
  selector: 'app-deploy-terminal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './deploy-terminal.component.html',
  styleUrl: './deploy-terminal.component.scss',
})
export class DeployTerminalComponent {
  lines = input.required<DeployTerminalLine[]>();
  stages = input.required<DeployStageView[]>();
  running = input(false);
  now = input(Date.now());
  totalElapsedLabel = input('—');

  expanded = signal(true);
  private pinnedToBottom = signal(true);
  private body = viewChild<ElementRef<HTMLDivElement>>('body');

  stageChips = computed(() => this.stages()
    .filter(s => s.startedAt != null)
    .map(s => ({
      id: s.id,
      label: s.label,
      status: s.status,
      elapsed: formatDuration((s.endedAt ?? this.now()) - s.startedAt!),
    })));

  constructor() {
    effect(() => {
      const _ = this.lines();
      if (!this.pinnedToBottom() || !this.expanded()) return;
      queueMicrotask(() => {
        const el = this.body()?.nativeElement;
        if (el) el.scrollTop = el.scrollHeight;
      });
    });
  }

  toggleExpanded() { this.expanded.update(v => !v); }

  onScroll(ev: Event) {
    const el = ev.target as HTMLDivElement;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    this.pinnedToBottom.set(distanceFromBottom < 24);
  }

  jumpToLatest() {
    this.pinnedToBottom.set(true);
    const el = this.body()?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }

  isPinned() { return this.pinnedToBottom(); }
}
