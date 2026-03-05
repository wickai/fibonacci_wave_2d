#!/usr/bin/env python3
"""
Find modulus m that have generating sequences for Fibonacci-like sequences.

Theory: When 5 is a quadratic residue modulo m, there exist two generating
sequences (1,a) and (1,b) that can generate all other sequences through
linear combinations.

For prime p, 5 is a quadratic residue mod p iff:
    5^((p-1)/2) ≡ 1 (mod p)  (Euler's criterion)
"""

import math
from typing import List, Tuple, Optional

def is_quadratic_residue(a: int, m: int) -> bool:
    """
    Check if a is a quadratic residue modulo m.
    For prime power modulus, use Euler's criterion.
    """
    if m == 1:
        return True
    
    # Factor m into prime powers
    def prime_factors(n):
        factors = []
        d = 2
        while d * d <= n:
            while n % d == 0:
                factors.append(d)
                n //= d
            d += 1
        if n > 1:
            factors.append(n)
        return factors
    
    # For composite m, check all prime factors
    # 5 is a quadratic residue mod m iff it's a QR mod each prime power factor
    
    # Simple case: check for prime modulus using Euler's criterion
    def is_prime(n):
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
    
    # Use Legendre symbol / Jacobi symbol for efficiency
    def legendre_symbol(a: int, p: int) -> int:
        """Compute Legendre symbol (a/p)"""
        if a % p == 0:
            return 0
        a = a % p
        exp = (p - 1) // 2
        result = pow(a, exp, p)
        if result == p - 1:
            return -1
        return result
    
    # For prime p, check Legendre symbol
    if is_prime(m):
        return legendre_symbol(a, m) == 1
    
    # For composite m, try to find x such that x^2 ≡ a (mod m)
    # Brute force for small m
    for x in range(m):
        if (x * x) % m == a % m:
            return True
    return False


def find_generating_sequences_mod_prime(p: int) -> Optional[Tuple[int, int]]:
    """
    Find generating sequences (1,a) and (1,b) for prime modulus p.
    These satisfy: a + b ≡ 1 (mod p) and a * b ≡ 5 (mod p)
    or more generally, they generate all sequences.
    
    From examples:
    - mod 11: (1,8) and (1,4) -> 8+4=12≡1, 8*4=32≡9≡-2... hmm
    - mod 19: (1,15) and (1,5) -> 15+5=20≡1, 15*5=75≡17
    
    Actually, the condition seems to be related to solutions of:
    x^2 - x - 5 ≡ 0 (mod p)  (from the characteristic equation of Fibonacci)
    
    The roots are: (1 ± √5) / 2
    
    So we need √5 to exist mod p, i.e., 5 is a quadratic residue.
    If r is a root, then the other root is 1-r.
    """
    if p == 2:
        return None
    
    # Check if 5 is a quadratic residue
    if not is_quadratic_residue(5, p):
        return None
    
    # Find sqrt(5) mod p
    # We need x such that x^2 ≡ 5 (mod p)
    sqrt_5 = None
    for x in range(p):
        if (x * x) % p == 5 % p:
            sqrt_5 = x
            break
    
    if sqrt_5 is None:
        return None
    
    # The generating values are: (1 ± sqrt_5) * inv(2) mod p
    # i.e., (1 + sqrt_5)/2 and (1 - sqrt_5)/2
    inv_2 = pow(2, -1, p)  # Modular inverse of 2
    
    a = ((1 + sqrt_5) * inv_2) % p
    b = ((1 - sqrt_5) * inv_2) % p
    
    # Ensure a <= b for consistency
    if a > b:
        a, b = b, a
    
    return (a, b)


def check_generating_property(p: int, a: int, b: int) -> bool:
    """
    Check if sequences (1,a) and (1,b) can generate all sequences mod p.
    We verify by checking if their linear combinations can produce (1,1).
    """
    # Try to find coefficients x,y such that:
    # x*(1,a) + y*(1,b) = (1,1) mod p
    # This means: x + y ≡ 1 and x*a + y*b ≡ 1 (mod p)
    
    for x in range(p):
        for y in range(p):
            if (x + y) % p == 1 and (x * a + y * b) % p == 1:
                return True
    return False


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
    """
    Check if a is a quadratic residue mod m and return one square root.
    Returns None if no square root exists.
    """
    for x in range(m):
        if (x * x) % m == a % m:
            return x
    return None


def find_generating_sequences_composite(m: int) -> Optional[Tuple[int, int]]:
    """
    Find generating sequences for composite modulus m.
    
    For composite m, we need to find (1,a) and (1,b) such that they can
    generate all sequences. This happens when gcd(a-b, m) = 1 and other
    conditions are met.
    
    We use a brute force approach for small m.
    """
    if m <= 2:
        return None
    
    # Try all pairs (1,a) and (1,b) with 1 <= a < b < m
    for a in range(1, m):
        for b in range(a + 1, m):
            if check_generating_property(m, a, b):
                return (a, b)
    return None


def find_all_mod_with_generators(max_m: int = 1000, include_composite: bool = False) -> List[Tuple[int, Tuple[int, int]]]:
    """
    Find all modulus m up to max_m that have generating sequences.
    
    Args:
        max_m: Maximum modulus to check
        include_composite: Whether to also check composite moduli
    """
    results = []
    
    for m in range(2, max_m + 1):
        if is_prime(m):
            gen = find_generating_sequences_mod_prime(m)
            if gen:
                if check_generating_property(m, gen[0], gen[1]):
                    results.append((m, gen))
                    print(f"mod {m}: generating sequences (1,{gen[0]}) and (1,{gen[1]}) [PRIME]")
        elif include_composite:
            # For composite, we need to check if 5 has a square root mod m
            # This requires that 5 is a QR mod each prime power factor
            
            # Quick check: see if there's a square root
            sqrt_5 = is_square_in_mod(5, m)
            if sqrt_5 is not None:
                gen = find_generating_sequences_composite(m)
                if gen:
                    results.append((m, gen))
                    print(f"mod {m}: generating sequences (1,{gen[0]}) and (1,{gen[1]}) [COMPOSITE]")
    
    return results


def verify_with_examples():
    """Verify our implementation with known examples."""
    print("=== Verification with known examples ===")
    print()
    
    # mod 11: expected (1,4) and (1,8) or (1,8) and (1,4)
    print("mod 11:")
    result = find_generating_sequences_mod_prime(11)
    print(f"  Found: (1, {result[0]}) and (1, {result[1]})")
    print(f"  Expected: (1, 4) and (1, 8)")
    print(f"  Check generating: {check_generating_property(11, result[0], result[1])}")
    print()
    
    # mod 19: expected (1,5) and (1,15)
    print("mod 19:")
    result = find_generating_sequences_mod_prime(19)
    print(f"  Found: (1, {result[0]}) and (1, {result[1]})")
    print(f"  Expected: (1, 5) and (1, 15)")
    print(f"  Check generating: {check_generating_property(19, result[0], result[1])}")
    print()


def test_composite_mod():
    """Test for composite moduli."""
    print("=== Testing composite moduli ===")
    print()
    
    # For composite m, we need to check if there exist generating sequences
    # This is more complex - let's try brute force for small m
    
    for m in [6, 10, 14, 15, 21, 22, 26, 30]:
        print(f"mod {m}:")
        found = False
        for a in range(1, m):
            for b in range(1, m):
                if a >= b:
                    continue
                if check_generating_property(m, a, b):
                    print(f"  Found generating: (1,{a}) and (1,{b})")
                    found = True
                    break
            if found:
                break
        if not found:
            print(f"  No generating sequences found")
        print()


def save_results_to_csv(results: List[Tuple[int, Tuple[int, int]]], filename: str):
    """Save results to a CSV file."""
    import csv
    with open(filename, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['modulus', 'gen_seq_1_a', 'gen_seq_1_b', 'sum_mod', 'product_mod'])
        for m, (a, b) in results:
            writer.writerow([m, a, b, (a + b) % m, (a * b) % m])
    print(f"Results saved to {filename}")


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Find generating sequences for Fibonacci-like sequences modulo m')
    parser.add_argument('--max', '-m', type=int, default=500, help='Maximum modulus to check')
    parser.add_argument('--composite', '-c', action='store_true', help='Also check composite moduli')
    parser.add_argument('--output', '-o', type=str, default='generating_sequences.csv', help='Output CSV file')
    parser.add_argument('--verify', '-v', action='store_true', help='Verify with known examples first')
    
    args = parser.parse_args()
    
    if args.verify:
        verify_with_examples()
        print("=" * 50)
        print()
    
    # Find all moduli with generating sequences
    print(f"=== Finding all moduli with generating sequences (up to {args.max}) ===")
    if args.composite:
        print("Including composite moduli...")
    print()
    
    results = find_all_mod_with_generators(args.max, args.composite)
    
    print()
    print(f"Total: {len(results)} moduli with generating sequences")
    print()
    
    # Print summary
    print("Summary (prime moduli where 5 is quadratic residue):")
    for m, (a, b) in results:
        print(f"  mod {m}: (1,{a}), (1,{b})")
    
    # Save to CSV
    if results:
        save_results_to_csv(results, args.output)
