import { describe, it, expect } from 'vitest';
import { MerkleTree, computeLeafHash, hashPair } from './merkle.js';

describe('Merkle Tree Cryptographic Proofs', () => {
  it('computes empty tree root consistently', () => {
    const tree = new MerkleTree([]);
    expect(tree.getRoot()).toBeDefined();
    expect(tree.getRoot()).toHaveLength(64);
  });

  it('computes single leaf root correctly', () => {
    const leaf = computeLeafHash('audit-record-01');
    const tree = new MerkleTree([leaf]);
    expect(tree.getRoot()).toBe(leaf);
  });

  it('builds Merkle tree with even number of leaves and produces valid proofs', () => {
    const rawEvents = [
      { id: '1', action: 'USER_LOGIN', user: 'alice' },
      { id: '2', action: 'HOST_ISOLATED', host: 'srv-01' },
      { id: '3', action: 'NETWORK_SEVERED', edge: 'edge-01' },
      { id: '4', action: 'POLICY_PROMOTED', version: '1.1.0' }
    ];

    const leaves = rawEvents.map(computeLeafHash);
    const tree = new MerkleTree(leaves);

    expect(tree.getLeaves()).toHaveLength(4);
    const root = tree.getRoot();
    expect(root).toBeDefined();
    expect(root).toHaveLength(64);

    // Verify manual pairwise hash
    const h01 = hashPair(leaves[0]!, leaves[1]!);
    const h23 = hashPair(leaves[2]!, leaves[3]!);
    const expectedRoot = hashPair(h01, h23);
    expect(root).toBe(expectedRoot);

    // Verify proof generation and verification for every leaf
    for (let i = 0; i < leaves.length; i++) {
      const proof = tree.getProof(i);
      expect(proof.leaf).toBe(leaves[i]);
      expect(proof.root).toBe(root);
      expect(proof.proof.length).toBe(2);

      const isValid = MerkleTree.verifyProof(proof);
      expect(isValid).toBe(true);
    }
  });

  it('builds Merkle tree with odd number of leaves (3 leaves with duplication)', () => {
    const leaves = ['leaf-A', 'leaf-B', 'leaf-C'].map(computeLeafHash);
    const tree = new MerkleTree(leaves);

    const root = tree.getRoot();
    expect(root).toHaveLength(64);

    for (let i = 0; i < leaves.length; i++) {
      const proof = tree.getProof(i);
      expect(MerkleTree.verifyProof(proof)).toBe(true);
    }
  });

  it('detects leaf payload tampering and fails proof verification', () => {
    const leaves = ['record-1', 'record-2', 'record-3', 'record-4'].map(computeLeafHash);
    const tree = new MerkleTree(leaves);
    const validProof = tree.getProof(1);

    expect(MerkleTree.verifyProof(validProof)).toBe(true);

    // Tamper with the leaf hash
    const tamperedLeafProof = {
      ...validProof,
      leaf: computeLeafHash('maliciously-altered-record-2')
    };
    expect(MerkleTree.verifyProof(tamperedLeafProof)).toBe(false);

    // Tamper with sibling proof hash
    const tamperedStepProof = {
      ...validProof,
      proof: [
        { ...validProof.proof[0]!, hash: '0000000000000000000000000000000000000000000000000000000000000000' },
        ...validProof.proof.slice(1)
      ]
    };
    expect(MerkleTree.verifyProof(tamperedStepProof)).toBe(false);

    // Tamper with root
    const tamperedRootProof = {
      ...validProof,
      root: 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
    };
    expect(MerkleTree.verifyProof(tamperedRootProof)).toBe(false);
  });

  it('static computeRoot matches instance getRoot()', () => {
    const leaves = ['doc-alpha', 'doc-beta', 'doc-gamma', 'doc-delta', 'doc-epsilon'].map(computeLeafHash);
    const tree = new MerkleTree(leaves);
    expect(MerkleTree.computeRoot(leaves)).toBe(tree.getRoot());
  });
});

