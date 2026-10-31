import { computeSha256, canonicalJsonStringify } from './crypto-audit.js';

export interface MerkleProofStep {
  hash: string;
  position: 'left' | 'right';
}

export interface MerkleProof {
  leaf: string;
  index: number;
  proof: MerkleProofStep[];
  root: string;
}

export function computeLeafHash(data: unknown): string {
  if (typeof data === 'string') {
    return computeSha256(data);
  }
  return computeSha256(canonicalJsonStringify(data));
}

export function hashPair(left: string, right: string): string {
  return computeSha256(left + right);
}

export class MerkleTree {
  private leaves: string[] = [];
  private layers: string[][] = [];

  constructor(initialLeaves: string[] = []) {
    if (initialLeaves.length > 0) {
      this.leaves = [...initialLeaves];
      this.buildTree();
    } else {
      this.layers = [[]];
    }
  }

  public addLeaf(leaf: string): void {
    this.leaves.push(leaf);
    this.buildTree();
  }

  public getLeaves(): string[] {
    return [...this.leaves];
  }

  public getRoot(): string {
    if (this.leaves.length === 0) {
      return computeSha256('');
    }
    const topLayer = this.layers[this.layers.length - 1];
    return topLayer && topLayer[0] ? topLayer[0] : computeSha256('');
  }

  private buildTree(): void {
    if (this.leaves.length === 0) {
      this.layers = [[]];
      return;
    }

    let currentLayer = [...this.leaves];
    this.layers = [currentLayer];

    while (currentLayer.length > 1) {
      const nextLayer: string[] = [];
      for (let i = 0; i < currentLayer.length; i += 2) {
        const left = currentLayer[i]!;
        // If odd number of nodes, duplicate the last node (standard Merkle tree practice)
        const right = i + 1 < currentLayer.length ? currentLayer[i + 1]! : left;
        nextLayer.push(hashPair(left, right));
      }
      this.layers.push(nextLayer);
      currentLayer = nextLayer;
    }
  }

  public getProof(leafIndex: number): MerkleProof {
    if (leafIndex < 0 || leafIndex >= this.leaves.length) {
      throw new Error(`Leaf index ${leafIndex} out of bounds (0..${this.leaves.length - 1})`);
    }

    const leaf = this.leaves[leafIndex]!;
    const proof: MerkleProofStep[] = [];
    let currentIndex = leafIndex;

    for (let layerIndex = 0; layerIndex < this.layers.length - 1; layerIndex++) {
      const layer = this.layers[layerIndex]!;
      const isEven = currentIndex % 2 === 0;
      const siblingIndex = isEven ? currentIndex + 1 : currentIndex - 1;

      if (siblingIndex < layer.length) {
        proof.push({
          hash: layer[siblingIndex]!,
          position: isEven ? 'right' : 'left'
        });
      } else {
        // Sibling was the duplicated self
        proof.push({
          hash: layer[currentIndex]!,
          position: 'right'
        });
      }

      currentIndex = Math.floor(currentIndex / 2);
    }

    return {
      leaf,
      index: leafIndex,
      proof,
      root: this.getRoot()
    };
  }

  public static verifyProof(proof: MerkleProof): boolean {
    if (!proof || !proof.leaf || !proof.root) {
      return false;
    }

    let currentHash = proof.leaf;

    for (const step of proof.proof) {
      if (step.position === 'left') {
        currentHash = hashPair(step.hash, currentHash);
      } else {
        currentHash = hashPair(currentHash, step.hash);
      }
    }

    return currentHash === proof.root;
  }

  public static computeRoot(leaves: string[]): string {
    const tree = new MerkleTree(leaves);
    return tree.getRoot();
  }
}

