#!/usr/bin/env python3
"""
Complete analysis of generating sequences for Fibonacci-like sequences.

Key insight:
- When 5 is a quadratic residue mod p (prime): 2 generators exist (related to sqrt(5))
- When 5 is NOT a quadratic residue mod p: Need 4 generators (from GF(p^2) extension)

This script finds generators for both cases.
"""

import math
from typing import List, Tuple, Optional, Set
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


def is_prime(n: int) -> bool:
    if n < 2:
        return False
    if n == 2:
        return True
    if n % 2 == 0:
        return False
    for i in range(3, int(math.sqrt(n)) + 1, 2):
        if n % i == 0:
            return False
    return True


def legendre_symbol(a: int, p: int) -> int:
    """Legendre symbol (a/p). Returns 1 if a is QR, -1 if non-QR, 0 if divisible by p."""
    if a % p == 0:
        return 0
    return pow(a, (p - 1) // 2, p)


def generate_sequence(start_a: int, start_b: int, m: int) -> List[Tuple[int, int]]:
    """Generate sequence modulo m."""
    seen = {}
    seq = []
    a, b = start_a % m, start_b % m
    while (a, b) not in seen:
        seen[(a, b)] = len(seq)
        seq.append((a, b))
        a, b = b, (a + b) % m
    return seq


def find_sqrt_mod(a: int, p: int) -> Optional[int]:
    """Find sqrt(a) mod p if it exists."""
    for x in range(p):
        if (x * x) % p == a % p:
            return x
    return None


def find_two_generators(p: int) -> Optional[Tuple[int, int]]:
    """Find 2 generating sequences when 5 is quadratic residue."""
    sqrt5 = find_sqrt_mod(5, p)
    if sqrt5 is None:
        return None
    
    inv2 = modinv(2, p)
    if inv2 is None:
        return None
    
    a = ((1 + sqrt5) * inv2) % p
    b = ((1 - sqrt5) * inv2) % p
    
    if a > b:
        a, b = b, a
    
    return (a, b)  # C=(1,a), D=(1,b)


def can_generate_all_with_2(a: int, b: int, p: int) -> bool:
    """Check if (1,a) and (1,b) can generate all sequences mod p."""
    # For each sequence (i,j), check if coefficients exist
    # System: x + y = i, a*x + b*y = j (mod p)
    # Solution: x = (j - a*i)/(b-a), y = i - x
    
    denom = (b - a) % p
    if denom == 0:
        return False
    
    denom_inv = modinv(denom, p)
    if denom_inv is None:
        return False
    
    for i in range(p):
        for j in range(p):
            x = ((j - a * i) * denom_inv) % p
            y = (i - x) % p
            
            # Verify this works for the full sequence
            seq_a = generate_sequence(1, a, p)
            seq_b = generate_sequence(1, b, p)
            target = generate_sequence(i, j, p)
            
            for n in range(min(len(seq_a), len(seq_b), len(target))):
                calc = ((x * seq_a[n][0] + y * seq_b[n][0]) % p,
                        (x * seq_a[n][1] + y * seq_b[n][1]) % p)
                if calc != target[n]:
                    return False
    
    return True


def analyze_modulus(p: int, verbose: bool = True) -> dict:
    """Comprehensive analysis of a prime modulus."""
    if verbose:
        print(f"\n{'='*60}")
        print(f"MODULUS p = {p}")
        print(f"{'='*60}")
    
    # Check if 5 is quadratic residue
    legendre = legendre_symbol(5, p)
    
    if legendre == 1:
        # 5 is QR - should have 2 generators
        if verbose:
            print("\n5 is a quadratic residue mod p")
        
        result = find_two_generators(p)
        if result:
            a, b = result
            if verbose:
                print(f"\nGenerating sequences: (1,{a}) and (1,{b})")
            
            # Check if these actually work
            if can_generate_all_with_2(a, b, p):
                if verbose:
                    print("✓ These 2 sequences CAN generate all sequences!")
                return {
                    'p': p,
                    'type': '2_generators',
                    'gen_a': a,
                    'gen_b': b,
                    'works': True
                }
            else:
                if verbose:
                    print("✗ These sequences cannot generate all - need different approach")
        
        return {'p': p, 'type': '2_generators', 'works': False}
    
    elif legendre == p - 1:
        # 5 is NOT a QR - need 4 generators
        if verbose:
            print("\n5 is NOT a quadratic residue mod p")
            print("Need 4 generators (from GF(p²) extension)")
        
        # Let's find the period structure
        periods = {}
        for i in range(p):
            for j in range(p):
                seq = generate_sequence(i, j, p)
                period = len(seq)
                if period not in periods:
                    periods[period] = []
                periods[period].append((i, j))
        
        max_period = max(periods.keys())
        
        if verbose:
            print(f"\nPeriod distribution:")
            for period in sorted(periods.keys()):
                print(f"  Period {period}: {len(periods[period])} sequences")
            print(f"\nMax period: {max_period}")
            print(f"Sequences with max period: {len(periods[max_period])}")
        
        return {
            'p': p,
            'type': '4_generators_needed',
            'max_period': max_period,
            'num_max_period_seq': len(periods[max_period]),
            'periods': periods
        }
    
    else:
        return {'p': p, 'type': 'special'}


def analyze_all_primes(max_p: int = 100):
    """Analyze all primes up to max_p."""
    print(f"Analyzing all primes up to {max_p}...")
    print()
    
    results = {'qr': [], 'non_qr': []}
    
    for p in range(2, max_p + 1):
        if not is_prime(p):
            continue
        
        legendre = legendre_symbol(5, p)
        
        if legendre == 1:
            result = analyze_modulus(p, verbose=False)
            result['p'] = p
            results['qr'].append(result)
            print(f"p={p}: 5 IS QR, generators: ({result.get('gen_a')}, {result.get('gen_b')}), works={result.get('works')}")
        elif legendre == p - 1:
            result = analyze_modulus(p, verbose=False)
            result['p'] = p
            results['non_qr'].append(result)
            print(f"p={p}: 5 NOT QR, max_period={result.get('max_period')}")
    
    print(f"\n\nSummary:")
    print(f"  Primes where 5 is QR: {len(results['qr'])}")
    print(f"  Primes where 5 is NOT QR: {len(results['non_qr'])}")
    
    return results


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Analyze generating sequences')
    parser.add_argument('--mod', '-m', type=int, help='Single modulus to analyze')
    parser.add_argument('--max', type=int, default=50, help='Max prime to analyze')
    
    args = parser.parse_args()
    
    if args.mod:
        analyze_modulus(args.mod)
    else:
        analyze_all_primes(args.max)
