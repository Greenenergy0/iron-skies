/** Generic reusable object pool to avoid per-frame GC churn for bullets/particles. */
export class ObjectPool<T> {
  private free: T[] = [];
  private active = new Set<T>();
  private factory: () => T;
  private onRelease: (item: T) => void;

  constructor(factory: () => T, onRelease: (item: T) => void, initialSize = 0) {
    this.factory = factory;
    this.onRelease = onRelease;
    for (let i = 0; i < initialSize; i++) this.free.push(factory());
  }

  acquire(): T {
    const item = this.free.pop() ?? this.factory();
    this.active.add(item);
    return item;
  }

  release(item: T): void {
    if (!this.active.delete(item)) return;
    this.onRelease(item);
    this.free.push(item);
  }

  releaseAll(): void {
    this.active.forEach((item) => this.onRelease(item));
    this.free.push(...this.active);
    this.active.clear();
  }

  get activeCount(): number {
    return this.active.size;
  }
}
