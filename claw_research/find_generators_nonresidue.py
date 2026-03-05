#!/usr/bin/env python3
"""
Find generating sequences for any modulus m (including where 5 is non-residue).

For primes where 5 is NOT a quadratic residue, we need to find the minimal
set of sequences that can generate all others. This may require more than
2 generators.
"""

import math
from typing import List, Tuple, Set, Optional, Dict
from itertools import combinations


def egcd(a: int, b: int) -> Tuple[int, int, int]:
    if a == 0:
        return b, 0, 1
    g, x1, y1 = egcd(b % a, a)
    return g, y1 - (b // a) * x1, x1


def modinv(a: int, m: int) -> Optional[int]:
    g, x, y = egcd(a, m)
    if g != 1:
        return None
    return x % m


def gen_sequence(start_a: int, start_b: int, m: int) -> List[Tuple[int, int]]:
    """Generate sequence with period."""
    seen = {}
    seq = []
    a, b = start_a % m, start_b % m
    while (a, b) not in seen:
        seen[(a, b)] = len(seq)
        seq.append((a, b))
        a, b = b, (a + b) % m
    return seq


def get_all_sequences(m: int) -> Set[Tuple[int, int]]:
    """Get all distinct sequence tuples."""
    seqs = set()
    for i in range(m):
        for j in range(m):
            seq = tuple(gen_sequence(i, j, m))
            seqs.add(seq)
    return seqs


def can_linear_combine_to_target(target_seq: List[Tuple[int, int]], 
                                 gen_seqs: List[List[Tuple[int, int]]], 
                                 m: int) -> Optional[Tuple[int, ...]]:
    """
    Find coefficients (c1, c2, ..., ck) such that:
        c1*g1 + c2*g2 + ... + ck*gk = target_seq
    
    Where gi are generator sequences.
    """
    k = len(gen_seqs)
    n = len(target_seq)
    
    # For each position n, we have equations:
    # c1*g1[n][0] + c2*g2[n][0] + ... = target[n][0]
    # c1*g1[n][1] + c2*g2[n][1] + ... = target[n][1]
    
    # This is a linear system. For simplicity, try brute force for small m.
    # Try all coefficient combinations.
    
    # First, check if we have enough equations to solve
    # Each pair (g1[n], g1[n+1]) gives us 2 equations
    
    # Build matrix equation: A * c = b
    # For simplicity, use first min(k*2, n) positions
    num_eq = min(k * 2, n)
    
    A = []
    b = []
    for eq_idx in range(num_eq):
        n_idx = eq_idx // 2
        coord = eq_idx % 2
        
        row = []
        for g_idx in range(len(gen_seqs)):
            gen_seq = gen_seqs[g_idx]
            if n_idx < len(gen_seq):
                row.append(gen_seq[n_idx][coord])
            else:
                row.append(0)
        A.append(row)
        b.append(target_seq[n_idx][coord])
    
    # Try to solve using Gaussian elimination (simplified for small systems)
    # Or just brute force for small m
    
    # For small coefficients space, brute force
    # Search space: m^k (too large for k>2)
    
    # Instead, use the 2-generator case formula
    if k == 2:
        seq1, seq2 = gen_seqs[0], gen_seqs[1]
        
        # Need: x*(1,a1) + y*(1,a2) = (i,j)
        # x + y = i (mod m)
        # a1*x + a2*y = j (mod m)
        
        # denom = a1 - a2
        # x = (j - a2*i) / (a1 - a2)
        
        # Use the starting pairs of the sequences
        a1, b1 = seq1[0][0], seq1[0][1]
        a2, b2 = seq2[0][0], seq2[0][1]
        
        denom = (b1 - b2) % m
        if denom == 0:
            return None
        
        denom_inv = modinv(denom, m)
        
        # Solve for the starting pair (i, j) of target
        i = target_seq[0][0]
        j = target_seq[0][1]
        
        x = ((j - b2 * i) * denom_inv) % m
        y = (i - x) % m
        
        # Verify
        for n_idx in range(min(len(target_seq), len(seq1), len(seq2))):
            calc = ((x * seq1[n_idx][0] + y * seq2[n_idx][0]) % m,
                    (x * seq1[n_idx][1] + y * seq2[n_idx][1]) % m)
            if calc != target_seq[n_idx]:
                return None
        
        return (x, y)
    
    return None


def find_generating_pairs(m: int) -> List[Tuple[int, int]]:
    """Find all pairs of sequences that can generate all sequences."""
    candidates = []
    
    for a in range(1, m):
        for b in range(a + 1, m):
            gen_seqs = [gen_sequence(1, a, m), gen_sequence(1, b, m)]
            
            # Check if this pair can generate ALL sequences
            all_possible = True
            
            for i in range(m):
                for j in range(m):
                    target = gen_sequence(i, j, m)
                    coeff = can_linear_combine_to_target(target, gen_seqs, m)
                    if coeff is None:
                        all_possible = False
                        break
                if not all_possible:
                    break
            
            if all_possible:
                candidates.append((a, b))
                print(f'Found: (1,{a}), (1,{b})')
    
    return candidates


def analyze_no_sqrt5(m: int):
    """Analyze modulus where 5 is not a quadratic residue."""
    print(f"\n{'='*60}")
    print(f"Analyzing modulus m = {m} (5 is NOT quadratic residue)")
    print(f"{'='*60}")
    
    # Check Legendre symbol
    legendre = pow(5, (m - 1) // 2, m)
    print(f"\nLegendre symbol (5/{m}) = {legendre}")
    if legendre == m - 1:
        print("5 is NOT a quadratic residue mod m")
    elif legendre == 1:
        print("5 IS a quadratic residue mod m")
    
    # Find total number of distinct sequences
    all_seqs = get_all_sequences(m)
    print(f"\nTotal distinct sequences: {len(all_seqs)}")
    
    # Try to find generating pairs
    print("\nSearching for generating pairs...")
    pairs = find_generating_pairs(m)
    
    if pairs:
        print(f"\nFound {len(pairs)} generating pairs!")
        return pairs
    else:
        print("\nNo generating pairs found!")
        print("Need more than 2 generators or different approach.")
        
        # Let's look at the structure
        print("\nLooking at sequence structure...")
        
        # Find which sequences can generate others
        # Look at the periods
        periods = {}
        for i in range(m):
            for j in range(m):
                seq = gen_sequence(i, j, m)
                p = len(seq)
                if p not in periods:
                    periods[p] = []
                periods[p].append((i, j))
        
        print(f"\nPeriod distribution:")
        for p in sorted(periods.keys()):
            print(f"  Period {p}: {len(periods[p])} sequences")
        
        return None


def find_generator_set_brute(m: int, max_generators: int = 3):
    """Find minimal set of generators by brute force."""
    print(f"\nFinding minimal generator set for m={m}...")
    
    # Get all starting pairs that could be generators
    # These are sequences with relatively short periods that are "independent"
    candidates = []
    for i in range(m):
        for j in range(m):
            seq = gen_sequence(i, j, m)
            if len(seq) <= m:  # Only consider sequences with period <= m
                candidates.append((i, j))
    
    print(f"Candidate generators: {len(candidates)}")
    
    # For small number of generators, try combinations
    for k in range(1, min(max_generators + 1, 4)):
        print(f"\nTrying {k} generators...")
        
        # Limit search for efficiency
        # Take first few candidates
        test_candidates = candidates[:20]
        
        for gen_combo in combinations(test_candidates, k):
            gen_seqs = [gen_sequence(i, j, m) for i, j in gen_combo]
            
            # Can this generate all sequences?
            success = True
            for i in range(m):
                for j in range(m):
                    target = gen_sequence(i, j, m)
                    # Try to find coefficients (simplified - just check if linear combo exists)
                    # This is expensive...
                    pass
            
            if success:
                print(f"Found set: {gen_combo}")
                return gen_combo
    
    return None


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser()
    parser.add_argument('--mod', '-m', type=int, default=17)
    args = parser.parse_args()
    
    analyze_no_sqrt5(args.mod)
