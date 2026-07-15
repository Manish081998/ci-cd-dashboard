import { Component, ElementRef, computed, effect, input, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DeployStatusIconComponent } from './deploy-status-icon.component';
import type { DeployStageView } from '../../../core/models/deploy-operations.model';

interface TimelineRow {
  key: string;
  label: string;
  status: DeployStageView['operations'][number]['status'];
  stageLabel: string;
}

@Component({
  selector: 'app-deploy-timeline',
  standalone: true,
  imports: [CommonModule, DeployStatusIconComponent],
  template: `
    <div class="dtl">
      <span class="dtl-title">Deployment Timeline</span>
      <div class="dtl-list" #list>
        @for (row of rows(); track row.key) {
          <div class="dtl-row" [id]="'dtl-' + row.key" [class.active]="row.status === 'running'">
            <app-deploy-status-icon [status]="row.status" />
            <span class="dtl-label">{{ row.label }}</span>
            <span class="dtl-stage">{{ row.stageLabel }}</span>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .dtl { background: var(--bg-elevated); border: 1px dashed var(--border-mid); border-radius: 12px; padding: 12px 14px; margin-bottom: 12px; }
    .dtl-title { font-size: 11px; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: .5px; display: block; margin-bottom: 8px; }
    .dtl-list { display: flex; flex-direction: column; gap: 2px; max-height: 260px; overflow-y: auto; }
    .dtl-row { display: flex; align-items: center; gap: 8px; padding: 5px 6px; border-radius: 7px; font-size: 12px; }
    .dtl-row.active { background: var(--cyan-bg); }
    .dtl-label { color: var(--text-primary); font-weight: 600; flex: 1; }
    .dtl-stage { font-size: 9.5px; color: var(--text-dim); font-weight: 700; text-transform: uppercase; letter-spacing: .3px; }
  `],
})
export class DeployTimelineComponent {
  stages = input.required<DeployStageView[]>();

  rows = computed<TimelineRow[]>(() =>
    this.stages().flatMap(stage =>
      stage.operations.map(op => ({ key: `${stage.id}:${op.id}`, label: op.label, status: op.status, stageLabel: stage.label }))));

  private list = viewChild<ElementRef<HTMLDivElement>>('list');
  private lastActiveKey: string | null = null;

  constructor() {
    effect(() => {
      const active = this.rows().find(r => r.status === 'running');
      if (!active) return;
      // rows() is recomputed on every clock tick while a deploy runs (elapsed-time
      // display), not just when the active row changes — only re-snap on a real change,
      // otherwise this re-locks the list every ~200ms and blocks manual scrolling.
      if (active.key === this.lastActiveKey) return;
      this.lastActiveKey = active.key;
      queueMicrotask(() => {
        const listEl = this.list()?.nativeElement;
        const rowEl = document.getElementById(`dtl-${active.key}`);
        if (!listEl || !rowEl) return;
        // Clamp scrolling to this list only — scrollIntoView would also drag
        // the whole page's scroll position toward the active row.
        const rowTop = rowEl.offsetTop;
        const rowBottom = rowTop + rowEl.offsetHeight;
        if (rowTop < listEl.scrollTop) {
          listEl.scrollTo({ top: rowTop, behavior: 'smooth' });
        } else if (rowBottom > listEl.scrollTop + listEl.clientHeight) {
          listEl.scrollTo({ top: rowBottom - listEl.clientHeight, behavior: 'smooth' });
        }
      });
    });
  }
}
