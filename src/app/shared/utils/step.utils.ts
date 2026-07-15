import type { Step, StepStatus } from '../../core/models/pipeline.models';

/**
 * Converts a step definition array into a fresh Step[] with idle status.
 */
export function freshSteps(defs: Omit<Step, 'status' | 'detail'>[]): Step[] {
  return defs.map(d => ({ ...d, status: 'idle' as StepStatus, detail: '' }));
}
