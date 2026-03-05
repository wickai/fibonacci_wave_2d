#!/usr/bin/env python3
"""
Complete analysis of generating sequences for Fibonacci-like sequences modulo m.

For each modulus m where 5 is a quadratic residue, find:
1. The two generating sequences D_n = (1, d) and C_n = (1, c)
2. The linear combination coefficients for ALL sequences modulo m
3. Express each sequence as x*D_n + y*C_n

Usage:
    python3 generate_all_sequences.py -m 11          # Analyze mod 11
    python3 generate_all_sequences.py --max 100      # Analyze all up to 100
"""

import csv
import math
from typing import Tuple, List, Dict, Optional


def egcd(a: int, b: int) -> Tuple[int, int, int]:
    """Extended Euclidean algorithm."""
    if a == 0:
        return b, 0, 1
    g, x1, y1 = egcd(b % a, a)
    return g, y1 - (b // a) * x1, x1


def modinv(a: int, m: int) -> Optional[int]:
    """Modular inverse."""
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
    """Find sqrt(a) mod m if it exists."""
    for x in range(m):
        if (x * x) % m == a % m:
            return x
    return None


def find_generating_sequences(m: int) -> Optional[Tuple[int, int]]:
    """Find generating sequences (1,a), (1,b) for modulus m."""
    if m == 2:
        return None
    
    sqrt5 = is_square_in_mod(5, m)
    if sqrt5 is None:
        return None
    
    inv2 = modinv(2, m)
    if inv2 is None:
        return None
    
    a = ((1 + sqrt5) * inv2) % m
    b = ((1 - sqrt5) * inv2) % m
    
    if a > b:
        a, b = b, a
    
    return (a, b)  # (1,a), (1,b)


def generate_sequence(start_a: int, start_b: int, m: int) -> List[Tuple[int, int]]:
    """Generate sequence starting with (start_a, start_b) modulo m."""
    seen = {}
    seq = []
    a, b = start_a % m, start_b % m
    while (a, b) not in seen:
        seen[(a, b)] = len(seq)
        seq.append((a, b))
        a, b = b, (a + b) % m
    return seq


def find_coefficients(m: int, gen_a: int, gen_b: int, i: int, j: int) -> Tuple[int, int]:
    """
    Find coefficients (x, y) such that:
        x * (1, gen_b) + y * (1, gen_a) = (i, j) (mod m)
    
    Using Kai's notation: D_n = (1, gen_b), C_n = (1, gen_a)
    """
    # System: x + y = i, gen_b*x + gen_a*y = j (mod m)
    # Solving: x = (j - gen_a*i) / (gen_b - gen_a)
    denom = (gen_b - gen_a) % m
    if denom == 0:
        return (0, 0)
    
    denom_inv = modinv(denom, m)
    if denom_inv is None:
        return (0, 0)
    
    x = ((j - gen_a * i) * denom_inv) % m
    y = (i - x) % m
    
    return (x, y)


def simplify_coefficient(m: int, x: int, y: int, gen_a: int, gen_b: int) -> str:
    """Simplify the linear combination if possible."""
    # Check if x + y = 0 (mod m), i.e., can be expressed as k*(D-C)
    if (x + y) % m == 0:
        k = x % m
        return f"{k}*(D-C)"
    
    # Check if x = y (mod m), i.e., can be expressed as k*(D+C)
    if (x - y) % m == 0:
        k = x % m
        return f"{k}*(D+C)"
    
    return f"{x}*D + {y}*C"


def analyze_modulus(m: int, verbose: bool = True) -> Dict:
    """Comprehensive analysis of a single modulus."""
    gen = find_generating_sequences(m)
    if gen is None:
        return None
    
    gen_a, gen_b = gen  # C=(1,a), D=(1,b) in Kai's notation
    
    # Generate sequences
    D_seq = generate_sequence(1, gen_b, m)  # D_n = (1, b)
    C_seq = generate_sequence(1, gen_a, m)  # C_n = (1, a)
    fib_seq = generate_sequence(0, 1, m)
    
    # Find Fibonacci coefficients
    fib_coeff = find_coefficients(m, gen_a, gen_b, 0, 1)
    
    if verbose:
        print(f"\n{'='*60}")
        print(f"MODULUS m = {m}")
        print(f"{'='*60}")
        print(f"\nGenerating Sequences (Kai's notation):")
        print(f"  D_n = (1, {gen_b})  [period: {len(D_seq)}]")
        print(f"  C_n = (1, {gen_a})  [period: {len(C_seq)}]")
        print(f"\nFibonacci sequence (0,1):")
        print(f"  = {fib_coeff[0]}*D + {fib_coeff[1]}*C")
        print(f"  = {simplify_coefficient(m, fib_coeff[0], fib_coeff[1], gen_a, gen_b)}")
        print(f"  [period: {len(fib_seq)}]")
        
        print(f"\nFirst few terms:")
        print(f"  n:     ", end="")
        for n in range(min(10, len(D_seq))):
            print(f"{n:4d} ", end="")
        print()
        
        print(f"  D_n:  ", end="")
        for a, b in D_seq[:10]:
            print(f"({a:2d},{b:2d})", end="")
        print()
        
        print(f"  C_n:  ", end="")
        for a, b in C_seq[:10]:
            print(f"({a:2d},{b:2d})", end="")
        print()
        
        print(f"  Fib:  ", end="")
        for a, b in fib_seq[:10]:
            print(f"({a:2d},{b:2d})", end="")
        print()
        
        print(f"\nCoefficients for (0, j) sequences:")
        for j in range(min(m, 12)):
            x, y = find_coefficients(m, gen_a, gen_b, 0, j)
            simp = simplify_coefficient(m, x, y, gen_a, gen_b)
            print(f"  (0,{j:2d}): {x:3d}*D + {y:3d}*C  =  {simp}")
    
    # Find all coefficients
    all_coeffs = {}
    for i in range(m):
        for j in range(m):
            x, y = find_coefficients(m, gen_a, gen_b, i, j)
            period = len(generate_sequence(i, j, m))
            simp = simplify_coefficient(m, x, y, gen_a, gen_b)
            all_coeffs[(i, j)] = {
                'x': x, 'y': y, 'period': period, 'simplified': simp
            }
    
    return {
        'm': m,
        'gen_a': gen_a,
        'gen_b': gen_b,
        'D_period': len(D_seq),
        'C_period': len(C_seq),
        'fib_period': len(fib_seq),
        'fib_coeff': fib_coeff,
        'all_coeffs': all_coeffs
    }


def save_to_csv(analysis: Dict, filename: str = None):
    """Save analysis to CSV file."""
    if filename is None:
        filename = f"mod_{analysis['m']}_complete.csv"
    
    with open(filename, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['start_i', 'start_j', 'coeff_D', 'coeff_C', 'period', 'simplified'])
        
        for (i, j), data in sorted(analysis['all_coeffs'].items()):
            writer.writerow([i, j, data['x'], data['y'], data['period'], data['simplified']])
    
    return filename


def create_master_summary(max_m: int):
    """Create master summary for all moduli."""
    results = []
    
    print(f"Analyzing all prime moduli up to {max_m}...")
    print()
    
    for m in range(2, max_m + 1):
        if not is_prime(m):
            continue
        
        analysis = analyze_modulus(m, verbose=False)
        if analysis is None:
            continue
        
        results.append(analysis)
        print(f"m={m:3d}: D=(1,{analysis['gen_b']}), C=(1,{analysis['gen_a']}), "
              f"Fib={analysis['fib_coeff'][0]}*D+{analysis['fib_coeff'][1]}*C, "
              f"period={analysis['fib_period']}")
    
    print(f"\nTotal: {len(results)} moduli")
    
    # Save master CSV
    with open('master_sequence_analysis.csv', 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['modulus', 'D_seq_a', 'D_seq_b', 'C_seq_a', 'C_seq_b',
                        'fib_coeff_D', 'fib_coeff_C', 'D_period', 'C_period', 'fib_period'])
        
        for r in results:
            writer.writerow([r['m'], 1, r['gen_b'], 1, r['gen_a'],
                           r['fib_coeff'][0], r['fib_coeff'][1],
                           r['D_period'], r['C_period'], r['fib_period']])
    
    print("\nSaved master summary to master_sequence_analysis.csv")
    
    return results


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Generate complete sequence analysis')
    parser.add_argument('--mod', '-m', type=int, help='Single modulus to analyze')
    parser.add_argument('--max', type=int, default=100, help='Max modulus for batch')
    parser.add_argument('--output', '-o', type=str, help='Output CSV file')
    
    args = parser.parse_args()
    
    if args.mod:
        # Single modulus
        analysis = analyze_modulus(args.mod, verbose=True)
        if analysis:
            filename = save_to_csv(analysis, args.output)
            print(f"\nSaved to {filename}")
    else:
        # Batch analysis
        results = create_master_summary(args.max)
