import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { DeployOverallProgress } from '../../../core/models/deploy-operations.model';

@Component({
  selector: 'app-deploy-progress-overview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './deploy-progress-overview.component.html',
  styleUrl: './deploy-progress-overview.component.scss',
})
export class DeployProgressOverviewComponent {
  overall = input.required<DeployOverallProgress>();
  elapsedLabel = input('—');
  remainingLabel = input('—');
  speed = input(0);
  hasError = input(false);
}
