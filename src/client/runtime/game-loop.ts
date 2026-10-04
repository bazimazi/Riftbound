export interface FrameScheduler {
  request(callback: FrameRequestCallback): number;
  cancel(id: number): void;
  now(): number;
}

export const browserFrames: FrameScheduler = {
  request: (callback) => requestAnimationFrame(callback),
  cancel: (id: number) => cancelAnimationFrame(id),
  now: () => performance.now(),
};

/** Owns the host clock; the simulation receives elapsed seconds only. */
export class GameLoop {
  private frameId: number | null = null;
  private last = 0;

  constructor(
    private readonly frame: (dt: number, now: number) => void,
    private readonly scheduler: FrameScheduler = browserFrames,
    private readonly maxDelta = 0.05,
  ) {}

  reset(): void {
    this.last = this.scheduler.now();
  }

  start(): void {
    if (this.frameId !== null) return;
    this.reset();
    this.frameId = this.scheduler.request(this.tick);
  }

  stop(): void {
    if (this.frameId === null) return;
    this.scheduler.cancel(this.frameId);
    this.frameId = null;
  }

  private readonly tick: FrameRequestCallback = (now) => {
    const dt = Math.max(0, Math.min((now - this.last) / 1000, this.maxDelta));
    this.last = now;
    this.frame(dt, now);
    if (this.frameId !== null) this.frameId = this.scheduler.request(this.tick);
  };
}
