/**
 * Cryptographic SHA-256 utility for browser & test environments.
 * Follows FIPS 180-4 standard specification.
 */
export function sha256(ascii: string): string {
  function rightRotate(value: number, amount: number): number {
    return (value >>> amount) | (value << (32 - amount));
  }

  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let i = 0;
  let j = 0;
  let result = '';

  const words: number[] = [];
  const asciiBitLength = ascii.length * 8;

  let hash: number[] = [];
  const k: number[] = [];
  let primeCounter = 0;

  const isComposite: Record<number, boolean> = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 313; i += candidate) {
        isComposite[i] = true;
      }
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }

  hash = hash.slice(0, 8);

  for (i = 0; i < ascii.length; i++) {
    const code = ascii.charCodeAt(i);
    words[i >> 2] = (words[i >> 2] || 0) | ((code & 0xff) << (24 - (i % 4) * 8));
  }

  words[asciiBitLength >> 5] = (words[asciiBitLength >> 5] || 0) | (0x80 << (24 - (asciiBitLength % 32)));
  words[(((asciiBitLength + 64) >> 9) << 4) + 15] = asciiBitLength;

  for (j = 0; j < words.length; j += 16) {
    const w = words.slice(j, j + 16);
    const oldHash = hash;
    hash = hash.slice(0);

    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15] || 0;
      const w2 = w[i - 2] || 0;

      const a = hash[0]!;
      const e = hash[4]!;
      const temp1 =
        hash[7]! +
        (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
        ((e & hash[5]!) ^ (~e & hash[6]!)) +
        k[i]! +
        (w[i] =
          i < 16
            ? w[i] || 0
            : ((w[i - 16] || 0) +
                (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                (w[i - 7] || 0) +
                (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
              0);

      const temp2 =
        (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
        ((a & hash[1]!) ^ (a & hash[2]!) ^ (hash[1]! & hash[2]!));

      hash = [(temp1 + temp2) | 0, a, hash[1]!, hash[2]!, (hash[3]! + temp1) | 0, hash[4]!, hash[5]!, hash[6]!];
    }

    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i]! + oldHash[i]!) | 0;
    }
  }

  for (i = 0; i < 8; i++) {
    for (let b = 3; b >= 0; b--) {
      const byte = (hash[i]! >> (b * 8)) & 255;
      result += (byte < 16 ? '0' : '') + byte.toString(16);
    }
  }
  return result;
}

/**
 * Deterministically serialize any JavaScript object into canonical JSON format.
 * Sorts object keys recursively to ensure bit-level reproducibility of hashes.
 */
export function canonicalJson(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalJson).join(',') + ']';
  }
  const sortedKeys = Object.keys(obj as Record<string, unknown>).sort();
  const entries: string[] = [];
  for (const key of sortedKeys) {
    const val = (obj as Record<string, unknown>)[key];
    if (val !== undefined) {
      entries.push(JSON.stringify(key) + ':' + canonicalJson(val));
    }
  }
  return '{' + entries.join(',') + '}';
}
