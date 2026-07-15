import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { GIT_SERVER_BASE } from '../constants/api.constants';
import { BuildEvent, GitPushEvent } from '../models/pipeline.models';

@Injectable({ providedIn: 'root' })
export class GitPushService {

  /**
   * Streams a dotnet build via SSE from the local express server.
   * Server emits: stdout | stderr | done | fatal
   * Normalized to: stdout | stderr | build-done | build-fatal
   */
  streamBuild(folder: string): Observable<BuildEvent> {
    return new Observable<BuildEvent>(subscriber => {
      const ctrl = new AbortController();

      fetch(`${GIT_SERVER_BASE}/api/dotnet/build`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder }),
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
                let raw: { type: string; text?: string };
                try { raw = JSON.parse(line.slice(6)); } catch { continue; }

                let evt: BuildEvent;
                switch (raw.type) {
                  case 'stdout': evt = { type: 'stdout',      text: raw.text ?? '' }; break;
                  case 'stderr': evt = { type: 'stderr',      text: raw.text ?? '' }; break;
                  case 'done':   evt = { type: 'build-done' };                         break;
                  case 'fatal':  evt = { type: 'build-fatal', text: raw.text ?? '' }; break;
                  default: continue;
                }

                subscriber.next(evt);
                if (evt.type === 'build-done' || evt.type === 'build-fatal') {
                  subscriber.complete();
                  return;
                }
              }
              return pump();
            });

          pump().catch(err => {
            if (err?.name !== 'AbortError') {
              subscriber.next({ type: 'build-fatal', text: 'Build stream error' });
              subscriber.error(err);
            }
          });
        })
        .catch(err => {
          if (err?.name !== 'AbortError') {
            subscriber.next({ type: 'build-fatal', text: 'Cannot reach server' });
            subscriber.error(err);
          }
        });

      return () => ctrl.abort();
    });
  }

  /**
   * Streams a git push sequence via SSE from the local express server.
   * Server emits: step-start | stdout | stderr | step-end | fatal | done
   * Normalized to: step-start | stdout | stderr | step-end | fatal | git-done
   */
  streamGitPush(folder: string, branch: string, message: string, repoUrl: string): Observable<GitPushEvent> {
    return new Observable<GitPushEvent>(subscriber => {
      const ctrl = new AbortController();

      fetch(`${GIT_SERVER_BASE}/api/git/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder, branch, message, repoUrl }),
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
                let raw: { type: string; id?: string; cmd?: string; ok?: boolean; noop?: boolean; text?: string };
                try { raw = JSON.parse(line.slice(6)); } catch { continue; }

                let evt: GitPushEvent;
                switch (raw.type) {
                  case 'step-start': evt = { type: 'step-start', id: raw.id ?? '', cmd: raw.cmd ?? '' };          break;
                  case 'stdout':     evt = { type: 'stdout',     text: raw.text ?? '' };                           break;
                  case 'stderr':     evt = { type: 'stderr',     text: raw.text ?? '' };                           break;
                  case 'step-end':   evt = { type: 'step-end',   id: raw.id ?? '', ok: raw.ok ?? false, noop: raw.noop }; break;
                  case 'fatal':      evt = { type: 'fatal',      id: raw.id ?? '', text: raw.text ?? '' };        break;
                  case 'done':       evt = { type: 'git-done' };                                                   break;
                  default: continue;
                }

                subscriber.next(evt);
                if (evt.type === 'git-done') { subscriber.complete(); return; }
                if (evt.type === 'fatal')    { subscriber.error(evt); return; }
              }
              return pump();
            });

          pump().catch(err => {
            if (err?.name !== 'AbortError') {
              const fatal: GitPushEvent = { type: 'fatal', id: 'push', text: 'Git push stream error' };
              subscriber.next(fatal);
              subscriber.error(err);
            }
          });
        })
        .catch(err => {
          if (err?.name !== 'AbortError') {
            const fatal: GitPushEvent = { type: 'fatal', id: 'push', text: 'Cannot reach git server — make sure you started with: npm start' };
            subscriber.next(fatal);
            subscriber.error(err);
          }
        });

      return () => ctrl.abort();
    });
  }
}
