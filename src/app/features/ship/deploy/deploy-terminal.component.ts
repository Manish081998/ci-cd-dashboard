import { Component, ElementRef, computed, effect, input, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type { DeployStageView, DeployTerminalLine } from '../../../core/models/deploy-operations.model';
import { formatDuration } from './deploy-progress.util';

@Component({
  selector: 'app-deploy-terminal',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
  fullscreen = signal(false);
  searchOpen = signal(false);
  searchQuery = signal('');
  cleared = signal(false);
  copyState = signal<'idle' | 'copied'>('idle');
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

  filteredLines = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return this.lines();
    return this.lines().filter(l => l.text.toLowerCase().includes(q));
  });

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
  toggleFullscreen() { this.fullscreen.update(v => !v); }
  toggleSearch() {
    this.searchOpen.update(v => !v);
    if (!this.searchOpen()) this.searchQuery.set('');
  }
  toggleCleared() { this.cleared.update(v => !v); }

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

  /** Purely cosmetic — flags lines whose own text reads as a warning/success,
   *  even when their transport `kind` is plain stdout. Doesn't affect data. */
  lineTone(line: DeployTerminalLine): string {
    if (line.kind === 'cmd' || line.kind === 'stderr') return line.kind;
    const t = line.text.toLowerCase();
    if (/\b(warn|warning)\b/.test(t)) return 'warn';
    if (/\b(complete|success|restarted|✓|✔)\b/.test(t)) return 'ok';
    return line.kind;
  }

  async copyLogs() {
    const text = this.filteredLines().map(l => l.text).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      this.copyState.set('copied');
      setTimeout(() => this.copyState.set('idle'), 1500);
    } catch {
      /* clipboard permission denied — no-op, button simply won't confirm */
    }
  }

  downloadLogs() {
    const text = this.filteredLines().map(l => l.text).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deploy-log-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
