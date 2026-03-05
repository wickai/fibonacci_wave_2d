#!/usr/bin/env python3
"""
Comprehensive analysis of generating sequences and their linear combinations
for all moduli where 5 is a quadratic residue.
"""

import math
from typing import Tuple, List, Dict, Optional
import csv


def egcd(a: int, b: int) -> Tuple[int, int, int]:
    """Extended Euclidean algorithm."""
    if a == 0:
        return b, 0, 1
    g, x1, y1 = egcd(b % a, a)
    x = y1 - (b // a) * x1
    y = x1
    return g, x, y


def modinv(a: int, m: int) -> Optional[int]:
    """Find modular inverse."""
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


def is_square_in_mod(a: int, m: int) -> Optional[int]:
    for x in range(m):
        if (x * x) % m == a % m:
            return x
    return None


def find_generating_sequences(p: int) -> Optional[Tuple[int, int]]:
    """Find generating sequences (1,a) and (1,b) for prime modulus p."""
    if p == 2:
        return None
    
    sqrt_5 = is_square_in_mod(5, p)
    if sqrt_5 is None:
        return None
    
    inv_2 = modinv(2, p)
    if inv_2 is None:
        return None
    
    a = ((1 + sqrt_5) * inv_2) % p
    b = ((1 - sqrt_5) * inv_2) % p
    
    if a > b:
        a, b = b, a
    
    return (a, b)


def generate_sequence(start_a: int, start_b: int, m: int, length: int = None) -> List[Tuple[int, int]]:
    """Generate sequence modulo m."""
    if length is None:
        seen = {}
        a, b = start_a % m, start_b % m
        n = 0
        while (a, b) not in seen:
            seen[(a, b)] = n
            a, b = b, (a + b) % m
            n += 1
        length = n
    
    seq = []
    a, b = start_a % m, start_b % m
    for _ in range(length):
        seq.append((a, b))
        a, b = b, (a + b) % m
    return seq


def find_coefficients(m: int, gen_a: int, gen_b: int, start_i: int, start_j: int) -> Optional[Tuple[int, int]]:
    """Find coefficients (x,y) such that x*D + y*C = Sequence(i,j)."""
    denom = (gen_a - gen_b) % m
    if denom == 0:
        return None
    
    denom_inv = modinv(denom, m)
    if denom_inv is None:
        return None
    
    numerator = (start_j - gen_b * start_i) % m
    x = (numerator * denom_inv) % m
    y = (start_i - x) % m
    
    return (x, y)


def verify_coefficients(m: int, gen_a: int, gen_b: int, start_i: int, start_j: int, 
                        coeff_x: int, coeff_y: int, seq_length: int = 20) -> bool:
    """Verify coefficients produce correct sequence."""
    D = generate_sequence(1, gen_a, m, seq_length)
    C = generate_sequence(1, gen_b, m, seq_length)
    S = generate_sequence(start_i, start_j, m, seq_length)
    
    for n in range(seq_length):
        expected = S[n]
        actual = ((coeff_x * D[n][0] + coeff_y * C[n][0]) % m,
                  (coeff_x * D[n][1] + coeff_y * C[n][1]) % m)
        if expected != actual:
            return False
    return True


def analyze_mod_comprehensive(m: int) -> Dict:
    """Comprehensive analysis of modulus m."""
    gen = find_generating_sequences(m)
    if gen is None:
        return None
    
    gen_a, gen_b = gen
    
    # Generate sequences
    D_seq = generate_sequence(1, gen_a, m)
    C_seq = generate_sequence(1, gen_b, m)
    fib_seq = generate_sequence(0, 1, m)
    
    # Find all coefficients
    all_coeffs = {}
    for i in range(m):
        for j in range(m):
            coeff = find_coefficients(m, gen_a, gen_b, i, j)
            if coeff and verify_coefficients(m, gen_a, gen_b, i, j, coeff[0], coeff[1], max(len(D_seq), len(C_seq), len(fib_seq))+5):
                all_coeffs[(i, j)] = coeff
    
    # Find Fibonacci coefficients
    fib_coeff = all_coeffs.get((0, 1), (0, 0))
    
    return {
        'm': m,
        'gen_a': gen_a,  # (1, gen_a) - corresponds to C in Kai's notation
        'gen_b': gen_b,  # (1, gen_b) - corresponds to D in Kai's notation  
        'D_period': len(D_seq),
        'C_period': len(C_seq),
        'fib_period': len(fib_seq),
        'all_coeffs': all_coeffs,
        'fib_coeff': fib_coeff,
        'D_seq': D_seq,
        'C_seq': C_seq,
        'fib_seq': fib_seq
    }


def create_master_report(max_m: int = 200):
    """Create a master report for all moduli."""
    print(f"Finding all moduli with generating sequences up to {max_m}...")
    print()
    
    results = []
    
    for m in range(2, max_m + 1):
        if not is_prime(m):
            continue
        
        analysis = analyze_mod_comprehensive(m)
        if analysis is None:
            continue
        
        results.append(analysis)
        
        # Print summary
        fib_c = analysis['fib_coeff']
        print(f"m={m:3d}: D=(1,{analysis['gen_b']}), C=(1,{analysis['gen_a']}), "
              f"Fib={fib_c[0]}*D+{fib_c[1]}*C, period={analysis['fib_period']}")
    
    print(f"\nTotal: {len(results)} moduli analyzed")
    
    # Save master CSV
    with open('master_generating_sequences.csv', 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['modulus', 'D_seq_(1,a)', 'C_seq_(1,b)', 
                       'fib_coeff_x', 'fib_coeff_y',
                       'D_period', 'C_period', 'Fib_period'])
        
        for r in results:
            writer.writerow([r['m'], r['gen_b'], r['gen_a'],
                           r['fib_coeff'][0], r['fib_coeff'][1],
                           r['D_period'], r['C_period'], r['fib_period']])
    
    print(f"\nSaved master report to master_generating_sequences.csv")
    
    return results


def verify_fibonacci_formula(m: int, analysis: Dict) -> str:
    """Verify and return Fibonacci formula."""
    gen_a = analysis['gen_a']  # C in Kai's notation
    gen_b = analysis['gen_b']  # D in Kai's notation
    
    # According to theory: F_n = (D^n - C^n) / (D - C) * some_factor
    # But we can express it as: x*D_n + y*C_n
    x, y = analysis['fib_coeff']
    
    # Find simplest form
    # Try to express as k*(D-C)
    diff = (x - y) % m
    if diff != 0:
        diff_inv = modinv(diff, m)
        if diff_inv:
            k = diff_inv % m
            return f"{k}*(D-C)"
    
    return f"{x}*D + {y}*C"


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Analyze generating sequences')
    parser.add_argument('--mod', '-m', type=int, help='Single modulus to analyze')
    parser.add_argument('--max', type=int, default=100, help='Max modulus for batch analysis')
    parser.add_argument('--formula', '-f', action='store_true', help='Show Fibonacci formula')
    
    args = parser.parse_args()
    
    if args.mod:
        # Analyze single modulus
        analysis = analyze_mod_comprehensive(args.mod)
        if analysis is None:
            print(f"No generating sequences for modulus {args.mod}")
        else:
            print(f"\n{'='*60}")
            print(f"Modulus m = {args.mod}")
            print(f"{'='*60}")
            
            print(f"\nGenerating sequences (Kai's notation):")
            print(f"  D_n = (1, {analysis['gen_b']})  [period: {analysis['D_period']}]")
            print(f"  C_n = (1, {analysis['gen_a']})  [period: {analysis['C_period']}]")
            
            print(f"\nFibonacci sequence (0,1) = {analysis['fib_coeff'][0]}*D + {analysis['fib_coeff'][1]}*C")
            
            if args.formula:
                formula = verify_fibonacci_formula(args.mod, analysis)
                print(f"  Simplified: {formula}")
            
            print(f"\nFirst 10 terms:")
            print(f"  n:    ", end="")
            for n in range(10):
                print(f"{n:4d} ", end="")
            print()
            
            print(f"  D_n:  ", end="")
            for a, b in analysis['D_seq'][:10]:
                print(f"({a:2d},{b:2d})", end="")
            print()
            
            print(f"  C_n:  ", end="")
            for a, b in analysis['C_seq'][:10]:
                print(f"({a:2d},{b:2d})", end="")
            print()
            
            print(f"  Fib:  ", end="")
            for a, b in analysis['fib_seq'][:10]:
                print(f"({a:2d},{b:2d})", end="")
            print()
            
            print(f"\nCoefficients for (0,j) sequences:")
            for j in range(args.mod):
                coeff = analysis['all_coeffs'].get((0, j), (0, 0))
                print(f"  (0,{j:2d}): {coeff[0]:3d}*D + {coeff[1]:3d}*C")
            
            # Save to files
            filename = f"mod_{args.mod}_all_sequences.csv"
            with open(filename, 'w', newline='') as f:
                writer = csv.writer(f)
                writer.writerow(['start_i', 'start_j', 'coeff_D', 'coeff_C'])
                for (i, j), (x, y) in sorted(analysis['all_coeffs'].items()):
                    writer.writerow([i, j, x, y])
            print(f"\nSaved to {filename}")
    else:
        # Batch analysis
        results = create_master_report(args.max)
