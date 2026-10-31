/**
 * Mulberry32 is a 32-bit generator with period 2^32, offering great statistical randomness
 * and bit-exact reproducibility across JavaScript runtimes.
 */
export class DeterministicPRNG {
  private state: number;

  constructor(seed: number) {
    // Force unsigned 32-bit integer seed
    this.state = seed >>> 0;
    if (this.state === 0) {
      this.state = 0x6d2b79f5;
    }
  }

  /**
   * Returns a float in [0, 1).
   */
  public next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Returns an integer in range [min, max] inclusive.
   */
  public nextInt(min: number, max: number): number {
    const r = this.next();
    return Math.floor(r * (max - min + 1)) + min;
  }

  /**
   * Returns boolean with specified true probability (default 0.5).
   */
  public nextBoolean(p = 0.5): boolean {
    return this.next() < p;
  }

  /**
   * Deterministically picks one element from an array.
   */
  public pickOne<T>(items: T[]): T {
    if (items.length === 0) throw new Error('Cannot pick from empty array');
    const idx = this.nextInt(0, items.length - 1);
    return items[idx]!;
  }

  /**
   * Deterministically shuffles array using Fisher-Yates algorithm.
   */
  public shuffle<T>(array: T[]): T[] {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      const temp = copy[i]!;
      copy[i] = copy[j]!;
      copy[j] = temp;
    }
    return copy;
  }

  public getState(): number {
    return this.state;
  }

  public fork(offset = 1): DeterministicPRNG {
    return new DeterministicPRNG((this.state + offset) >>> 0);
  }
}

/**
 * Backwards compatibility helper.
 */
export function seededRandom(seed: number): () => number {
  const prng = new DeterministicPRNG(seed);
  return () => prng.next();
}
