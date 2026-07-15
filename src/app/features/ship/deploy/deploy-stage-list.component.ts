import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DeployStageCardComponent } from './deploy-stage-card.component';
import type { DeployStageView } from '../../../core/models/deploy-operations.model';

@Component({
  selector: 'app-deploy-stage-list',
  standalone: true,
  imports: [CommonModule, DeployStageCardComponent],
  template: `
    <div class="dsl">
      @for (stage of stages(); track stage.id; let i = $index) {
        <app-deploy-stage-card
          [stage]="stage"
          [stepNumber]="i + 1"
          [now]="now()"
          [defaultExpanded]="stage.status === 'running' || stage.status === 'error'" />
      }
    </div>
  `,
  styles: [`.dsl { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }`],
})
export class DeployStageListComponent {
  stages = input.required<DeployStageView[]>();
  now = input(Date.now());
}
