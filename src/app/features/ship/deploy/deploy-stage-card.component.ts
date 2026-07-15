import { Component, input, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DeployStatusIconComponent } from './deploy-status-icon.component';
import { DeployOperationRowComponent } from './deploy-operation-row.component';
import { DeployLogPanelComponent } from './deploy-log-panel.component';
import type { DeployStageView } from '../../../core/models/deploy-operations.model';

@Component({
  selector: 'app-deploy-stage-card',
  standalone: true,
  imports: [CommonModule, DeployStatusIconComponent, DeployOperationRowComponent, DeployLogPanelComponent],
  templateUrl: './deploy-stage-card.component.html',
  styleUrl: './deploy-stage-card.component.scss',
})
export class DeployStageCardComponent {
  stage = input.required<DeployStageView>();
  defaultExpanded = input(false);

  /** null = follow defaultExpanded reactively; once the user clicks, their choice sticks. */
  private manualExpanded = signal<boolean | null>(null);
  expanded = computed(() => this.manualExpanded() ?? this.defaultExpanded());
  showLogs = signal(false);

  toggleExpanded() { this.manualExpanded.set(!this.expanded()); }
  toggleLogs(ev: Event) { ev.stopPropagation(); this.showLogs.update(v => !v); }
}
