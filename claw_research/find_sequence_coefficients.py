#!/usr/bin/env python3
"""
Find linear combination coefficients for all sequences modulo m.

Given generating sequences D_n = (1, a) and C_n = (1, b) for modulus m,
find coefficients (x, y) such that:
    Sequence(i, j) = x*D_n + y*C_n  (mod m)
    
Where Sequence(i, j) starts with (i, j).
"""

import math
from typing import Tuple, List, Optional, Dict
import csv


def egcd(a: int, b: int) -> Tuple[int, int, int]:
    """Extended Euclidean algorithm. Returns (g, x, y) such that ax + by = g = gcd(a,b)."""
    if a == 0:
        return b, 0, 1
    g, x1, y1 = egcd(b % a, a)
    x = y1 - (b // a) * x1
    y = x1
    return g, x, y


def modinv(a: int, m: int) -> Optional[int]:
    """Find modular inverse of a mod m, if it exists."""
    g, x, y = egcd(a, m)
    if g != 1:
        return None
    return x % m


def is_prime(n: int) -> bool:
    """Check if n is prime."""
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
    """Check if a is a quadratic residue mod m and return one square root."""
    for x in range(m):
        if (x * x) % m == a % m:
            return x
    return None


def find_generating_sequences_prime(p: int) -> Optional[Tuple[int, int]]:
    """Find generating sequences for prime modulus p."""
    if p == 2:
        return None
    
    # Check if 5 is a quadratic residue
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
    """Generate a sequence starting with (start_a, start_b) modulo m."""
    if length is None:
        # Find the period
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
    """
    Find coefficients (x, y) such that:
        x * D_n + y * C_n = Sequence(start_i, start_j)  (mod m)
    
    Where D_n = (1, gen_a) and C_n = (1, gen_b)
    
    This means:
        x * 1 + y * 1 = x + y ≡ start_i (mod m)  (for n=0)
        x * gen_a + y * gen_b ≡ start_j (mod m)  (for n=1)
    
    Solving the system:
        x + y ≡ start_i
        gen_a*x + gen_b*y ≡ start_j
    """
    # System of equations:
    # x + y = start_i
    # gen_a*x + gen_b*y = start_j
    
    # Substitute y = start_i - x:
    # gen_a*x + gen_b*(start_i - x) = start_j
    # gen_a*x + gen_b*start_i - gen_b*x = start_j
    # (gen_a - gen_b)*x = start_j - gen_b*start_i
    # x = (start_j - gen_b*start_i) / (gen_a - gen_b)
    
    denom = gen_a - gen_b
    if denom < 0:
        denom = denom % m
    
    if denom == 0:
        # Special case: gen_a == gen_b (shouldn't happen for valid generating sequences)
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
    """Verify that the coefficients produce the correct sequence."""
    D = generate_sequence(1, gen_a, m, seq_length)
    C = generate_sequence(1, gen_b, m, seq_length)
    S = generate_sequence(start_i, start_j, m, seq_length)
    
    for n in range(seq_length):
        expected = S[n]
        # coeff_x * D_n + coeff_y * C_n
        actual = ((coeff_x * D[n][0] + coeff_y * C[n][0]) % m,
                  (coeff_x * D[n][1] + coeff_y * C[n][1]) % m)
        if expected != actual:
            return False
    return True


def find_all_sequence_coefficients(m: int, gen_a: int, gen_b: int) -> Dict[Tuple[int, int], Tuple[int, int]]:
    """
    Find coefficients for all possible starting pairs (i, j).
    Returns dict: {(i, j): (coeff_x, coeff_y)}
    """
    results = {}
    
    for i in range(m):
        for j in range(m):
            coeff = find_coefficients(m, gen_a, gen_b, i, j)
            if coeff is not None:
                # Verify
                if verify_coefficients(m, gen_a, gen_b, i, j, coeff[0], coeff[1]):
                    results[(i, j)] = coeff
    
    return results


def analyze_mod(m: int, verbose: bool = True) -> Dict:
    """Analyze a specific modulus m."""
    if verbose:
        print(f"\n{'='*60}")
        print(f"Analyzing modulus m = {m}")
        print(f"{'='*60}")
    
    # Find generating sequences
    if is_prime(m):
        gen = find_generating_sequences_prime(m)
    else:
        # For composite, need different approach - skip for now
        if verbose:
            print(f"Skipping composite modulus {m}")
        return None
    
    if gen is None:
        if verbose:
            print(f"No generating sequences found for modulus {m}")
        return None
    
    gen_a, gen_b = gen
    
    if verbose:
        print(f"\nGenerating sequences:")
        print(f"  D_n = (1, {gen_a}): {generate_sequence(1, gen_a, m, 10)}")
        print(f"  C_n = (1, {gen_b}): {generate_sequence(1, gen_b, m, 10)}")
    
    # Generate Fibonacci sequence for verification
    fib = generate_sequence(0, 1, m)
    if verbose:
        print(f"\nFibonacci sequence (0,1): {fib[:10]}...")
    
    # Find coefficients for all sequences
    all_coeffs = find_all_sequence_coefficients(m, gen_a, gen_b)
    
    if verbose:
        print(f"\nTotal sequences found: {len(all_coeffs)}")
        
        # Show coefficients for (0, j) sequences
        print(f"\nCoefficients for sequences (0, j):")
        for j in range(min(m, 12)):
            coeff = all_coeffs.get((0, j))
            if coeff:
                print(f"  (0,{j}): {coeff[0]}*D + {coeff[1]}*C")
    
    # Verify Fibonacci formula
    fib_coeff = all_coeffs.get((0, 1))
    if fib_coeff and verbose:
        x, y = fib_coeff
        print(f"\nFibonacci (0,1) = {x}*D + {y}*C = {x}*(1,{gen_a}) + {y}*(1,{gen_b})")
        
        # Express as linear combination of D-C if possible
        # x*D + y*C = (x-y)*D + y*(D+C) etc.
        # Try to express as a*(D-C) + b*(D+C)
        print(f"       = {x}*D + {y}*C mod {m}")
        
        # Check if it matches 3*(D-C) or similar
        diff = (x - y) % m
        print(f"       = {diff}*(D-C) + {y}*(D+C) ?")
    
    return {
        'm': m,
        'gen_a': gen_a,
        'gen_b': gen_b,
        'D_seq': generate_sequence(1, gen_a, m),
        'C_seq': generate_sequence(1, gen_b, m),
        'coefficients': all_coeffs
    }


def save_all_coefficients_to_csv(m: int, output_file: str = None):
    """Save all sequence coefficients to CSV file."""
    if output_file is None:
        output_file = f"mod_{m}_coefficients.csv"
    
    gen = find_generating_sequences_prime(m)
    if gen is None:
        print(f"No generating sequences for modulus {m}")
        return
    
    gen_a, gen_b = gen
    all_coeffs = find_all_sequence_coefficients(m, gen_a, gen_b)
    
    # Get sequence periods
    D_period = len(generate_sequence(1, gen_a, m))
    C_period = len(generate_sequence(1, gen_b, m))
    fib_period = len(generate_sequence(0, 1, m))
    
    with open(output_file, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['start_i', 'start_j', 'coeff_D', 'coeff_C', 'period'])
        
        for (i, j), (x, y) in sorted(all_coeffs.items()):
            period = len(generate_sequence(i, j, m))
            writer.writerow([i, j, x, y, period])
    
    print(f"Saved {len(all_coeffs)} sequences to {output_file}")
    
    # Also create a summary with the generating sequences
    summary_file = output_file.replace('.csv', '_summary.txt')
    with open(summary_file, 'w') as f:
        f.write(f"Modulus m = {m}\n")
        f.write(f"=" * 40 + "\n\n")
        f.write(f"Generating sequences:\n")
        f.write(f"  D_n = (1, {gen_a}): period = {D_period}\n")
        f.write(f"  C_n = (1, {gen_b}): period = {C_period}\n")
        f.write(f"  Fibonacci: period = {fib_period}\n\n")
        
        f.write(f"Linear combination formula:\n")
        f.write(f"  Sequence(i,j) = x*D_n + y*C_n (mod {m})\n\n")
        
        f.write(f"Coefficients for all (0,j) sequences:\n")
        for j in range(m):
            coeff = all_coeffs.get((0, j))
            if coeff:
                f.write(f"  (0,{j}): {coeff[0]}*D + {coeff[1]}*C\n")
        
        f.write(f"\nFirst few terms of generating sequences:\n")
        D_seq = generate_sequence(1, gen_a, m, fib_period)
        C_seq = generate_sequence(1, gen_b, m, fib_period)
        fib_seq = generate_sequence(0, 1, m, fib_period)
        
        f.write(f"  n:     ")
        for n in range(min(fib_period, 12)):
            f.write(f"{n:4d} ")
        f.write(f"\n")
        
        f.write(f"  D_n:   ")
        for a, b in D_seq[:12]:
            f.write(f"({a:2d},{b:2d})")
        f.write(f"\n")
        
        f.write(f"  C_n:   ")
        for a, b in C_seq[:12]:
            f.write(f"({a:2d},{b:2d})")
        f.write(f"\n")
        
        f.write(f"  Fib:   ")
        for a, b in fib_seq[:12]:
            f.write(f"({a:2d},{b:2d})")
        f.write(f"\n")
        
        f.write(f"\nCoefficients for all sequences:\n")
        for (i, j), (x, y) in sorted(all_coeffs.items()):
            f.write(f"  ({i:2d},{j:2d}): {x:3d}*D + {y:3d}*C\n")
    
    print(f"Saved summary to {summary_file}")


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Find sequence coefficients for generating sequences')
    parser.add_argument('--mod', '-m', type=int, required=True, help='Modulus m to analyze')
    parser.add_argument('--output', '-o', type=str, help='Output CSV file')
    parser.add_argument('--verbose', '-v', action='store_true', help='Verbose output')
    
    args = parser.parse_args()
    
    # Analyze the modulus
    result = analyze_mod(args.mod, args.verbose or True)
    
    if result:
        # Save to CSV
        save_all_coefficients_to_csv(args.mod, args.output)
