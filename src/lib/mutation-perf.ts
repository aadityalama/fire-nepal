/**
 * Mutation / API performance profiling helpers.
 * Logs phase timings for database, recalculation, serialization, and client render.
 */

export type MutationPhase =
  | "database"
  | "recalculation"
  | "serialization"
  | "client_render"
  | "auth"
  | "total"
  | string;

export type MutationTimer = {
  /** Mark the end of a named phase (ms since start or since last mark). */
  mark: (phase: MutationPhase) => number;
  /** Elapsed ms since timer start. */
  elapsed: () => number;
  /** Flush a structured log line with all phase durations. */
  flush: (extra?: Record<string, unknown>) => Record<string, number>;
  /** Run an async fn and record its duration under `phase`. */
  track: <T>(phase: MutationPhase, fn: () => PromiseLike<T>) => Promise<T>;
  /** Run a sync fn and record its duration under `phase`. */
  trackSync: <T>(phase: MutationPhase, fn: () => T) => T;
};

function nowMs(): number {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}

/**
 * Create a scoped mutation/API timer. Always logs in production so ops can spot
 * slow Save/Update/Delete paths (target: expense mutations under ~2s).
 */
export function createMutationTimer(label: string, meta?: Record<string, unknown>): MutationTimer {
  const started = nowMs();
  let last = started;
  const phases: Record<string, number> = {};

  const mark = (phase: MutationPhase): number => {
    const t = nowMs();
    const delta = Math.round((t - last) * 100) / 100;
    phases[phase] = Math.round(((phases[phase] ?? 0) + delta) * 100) / 100;
    last = t;
    return delta;
  };

  const elapsed = (): number => Math.round((nowMs() - started) * 100) / 100;

  const flush = (extra?: Record<string, unknown>): Record<string, number> => {
    const total = elapsed();
    phases.total = total;
    const payload = {
      label,
      ...meta,
      ...extra,
      phasesMs: { ...phases },
      totalMs: total,
    };
    // Prefer warn when over the expense UX budget so slow paths stand out in prod logs.
    if (total >= 2000) {
      console.warn("[mutation-perf:slow]", payload);
    } else {
      console.info("[mutation-perf]", payload);
    }
    return { ...phases };
  };

  const track = async <T>(phase: MutationPhase, fn: () => PromiseLike<T>): Promise<T> => {
    const t0 = nowMs();
    try {
      return await fn();
    } finally {
      const delta = Math.round((nowMs() - t0) * 100) / 100;
      phases[phase] = Math.round(((phases[phase] ?? 0) + delta) * 100) / 100;
      last = nowMs();
    }
  };

  const trackSync = <T>(phase: MutationPhase, fn: () => T): T => {
    const t0 = nowMs();
    try {
      return fn();
    } finally {
      const delta = Math.round((nowMs() - t0) * 100) / 100;
      phases[phase] = Math.round(((phases[phase] ?? 0) + delta) * 100) / 100;
      last = nowMs();
    }
  };

  return { mark, elapsed, flush, track, trackSync };
}

/** Client-side render / optimistic UI timing. */
export function logClientRender(label: string, startedAt: number, extra?: Record<string, unknown>): void {
  const totalMs = Math.round((nowMs() - startedAt) * 100) / 100;
  console.info("[mutation-perf:client_render]", { label, totalMs, ...extra });
}

/**
 * Wrap a Next.js route handler to log total + serialization time.
 * Handlers should still use `createMutationTimer` for database/recalc phases.
 *
 * `Req` defaults loosely so NextRequest / Request handlers both typecheck.
 */
export function withApiRouteTiming<Ctx = unknown, Req extends Request = Request>(
  routeName: string,
  handler: (req: Req, ctx: Ctx) => Promise<Response>,
): (req: Req, ctx: Ctx) => Promise<Response> {
  return async (req: Req, ctx: Ctx) => {
    const timer = createMutationTimer(`api:${routeName}`, {
      method: req.method,
      path: typeof req.url === "string" ? new URL(req.url).pathname : routeName,
    });
    try {
      const response = await handler(req, ctx);
      timer.mark("serialization");
      timer.flush({ status: response.status });
      return response;
    } catch (error) {
      timer.flush({ error: error instanceof Error ? error.message : "unknown" });
      throw error;
    }
  };
}
