import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { GIT_SERVER_BASE } from '../constants/api.constants';
import { BuildOption, CiBuild, DeployAuditEntry, DeployEvent, DeployProject, DeployRequest } from '../models/pipeline.models';

@Injectable({ providedIn: 'root' })
export class DeployService {

  /** Registry of deployable projects (GET /api/projects). */
  async listProjects(): Promise<DeployProject[]> {
    const r = await fetch(`${GIT_SERVER_BASE}/api/projects`);
    const data = await r.json();
    return data.projects ?? [];
  }

  /** Build commands detected for a project, with a recommended pick for the given environment.
   *  `folder` is the user-entered Solution Folder — the runtime source of truth for where
   *  the project lives on disk, since server-config.json no longer stores a per-project path. */
  async getBuildOptions(projectId: string, environment: string, folder: string): Promise<{ options: BuildOption[]; recommendedId: string | null }> {
    const r = await fetch(`${GIT_SERVER_BASE}/api/projects/${encodeURIComponent(projectId)}/build-options?environment=${encodeURIComponent(environment)}&folder=${encodeURIComponent(folder)}`);
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      throw new Error(err.error ?? 'Failed to load build options');
    }
    return r.json();
  }

  /** Recent successful GitHub Actions builds available to deploy for a project/environment
   *  (GET /api/projects/:id/ci-builds) — "build once, deploy same artifact". */
  async getCiBuilds(projectId: string, environment: string): Promise<CiBuild[]> {
    const r = await fetch(`${GIT_SERVER_BASE}/api/projects/${encodeURIComponent(projectId)}/ci-builds?environment=${encodeURIComponent(environment)}`);
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      throw new Error(err.error ?? 'Failed to load CI builds');
    }
    const data = await r.json();
    return data.builds ?? [];
  }

  /** Recent deploy history (GET /api/deploy/audit), optionally scoped to one project. */
  async getAudit(projectId?: string, limit = 20): Promise<DeployAuditEntry[]> {
    const qs = new URLSearchParams({ limit: String(limit), ...(projectId ? { projectId } : {}) });
    const r = await fetch(`${GIT_SERVER_BASE}/api/deploy/audit?${qs}`);
    const data = await r.json();
    return data.entries ?? [];
  }

  /** Force-kills whatever step is currently running for this project/environment's in-flight deploy. */
  async cancelDeploy(projectId: string, environment: string): Promise<void> {
    await fetch(`${GIT_SERVER_BASE}/api/deploy/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, environment }),
    });
  }

  /**
   * Streams an IIS deploy (publish → copy → recycle → verify) via SSE from
   * the local express server. Server emits: step-start | stdout | stderr |
   * step-end | fatal | done. Normalized to add 'deploy-done'.
   */
  streamDeploy(request: DeployRequest): Observable<DeployEvent> {
    return new Observable<DeployEvent>(subscriber => {
      const ctrl = new AbortController();

      fetch(`${GIT_SERVER_BASE}/api/deploy/iis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal: ctrl.signal,
      })
        .then(res => {
          const reader  = res.body!.getReader();
          const decoder = new TextDecoder();
          let   buffer  = '';

          const pump = (): Promise<void> =>
            reader.read().then(({ done, value }) => {
              if (done) { subscriber.complete(); return; }

              buffer += decoder.decode(value, { stream: true });
              const parts = buffer.split('\n\n');
              buffer = parts.pop() ?? '';

              for (const part of parts) {
                const line = part.trim();
                if (!line.startsWith('data: ')) continue;
                let raw: { type: string; id?: string; cmd?: string; ok?: boolean; noop?: boolean; detail?: string; text?: string };
                try { raw = JSON.parse(line.slice(6)); } catch { continue; }

                let evt: DeployEvent;
                switch (raw.type) {
                  case 'step-start': evt = { type: 'step-start', id: raw.id ?? '', cmd: raw.cmd ?? '' };                                     break;
                  case 'stdout':     evt = { type: 'stdout',     id: raw.id ?? '', text: raw.text ?? '' };                                   break;
                  case 'stderr':     evt = { type: 'stderr',     id: raw.id ?? '', text: raw.text ?? '' };                                   break;
                  case 'step-end':   evt = { type: 'step-end',   id: raw.id ?? '', ok: raw.ok ?? false, noop: raw.noop, detail: raw.detail }; break;
                  case 'fatal':      evt = { type: 'fatal',      id: raw.id ?? '', text: raw.text ?? '' };                                   break;
                  case 'done':       evt = { type: 'deploy-done' };                                                                          break;
                  default: continue;
                }

                subscriber.next(evt);
                if (evt.type === 'deploy-done') { subscriber.complete(); return; }
                if (evt.type === 'fatal')       { subscriber.error(evt); return; }
              }
              return pump();
            });

          pump().catch(err => {
            if (err?.name !== 'AbortError') {
              const fatal: DeployEvent = { type: 'fatal', id: 'publish', text: 'Deploy stream error' };
              subscriber.next(fatal);
              subscriber.error(err);
            }
          });
        })
        .catch(err => {
          if (err?.name !== 'AbortError') {
            const fatal: DeployEvent = { type: 'fatal', id: 'publish', text: 'Cannot reach git server — make sure you started with: npm start' };
            subscriber.next(fatal);
            subscriber.error(err);
          }
        });

      return () => ctrl.abort();
    });
  }
}
