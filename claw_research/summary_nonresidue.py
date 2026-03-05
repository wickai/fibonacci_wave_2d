#!/usr/bin/env python3
"""
Summary: Finding generator sequences for primes where 5 is non-quadratic residue.

For primes p where 5 is NOT a quadratic residue mod p:
- We need 4 generators (from the field extension GF(p^2))
- These generators come from the 4 basis elements of GF(p^2) as a 2D vector space over GF(p)
- The period of sequences divides 2*(p+1)
"""

import math
from collections import defaultdict

def gen_seq(a, b, m):
    seen = {}
    seq = []
    x, y = a % m, b % m
    while (x, y) not in seen:
        seen[(x, y)] = len(seq)
        seq.append((x, y))
        x, y = y, (x + y) % m
    return seq

def is_prime(n):
    if n < 2: return False
    if n == 2: return True
    if n % 2 == 0: return False
    for i in range(3, int(n**0.5)+1, 2):
        if n % i == 0: return False
    return True

def legendre(a, p):
    return pow(a, (p-1)//2, p)

# Analyze all primes < 100
primes = [p for p in range(2, 100) if is_prime(p) and legendre(5, p) == p-1]

print("="*75)
print("100以内5是二次非剩余的素数 - 完整分析")
print("="*75)
print()

for p in primes:
    # Get period distribution
    periods = {}
    for i in range(p):
        for j in range(p):
            s = gen_seq(i, j, p)
            l = len(s)
            if l not in periods:
                periods[l] = 0
            periods[l] += 1
    
    max_period = max(periods.keys())
    
    # Get sequences with max period and group by gcd
    max_seqs = []
    for i in range(p):
        for j in range(p):
            s = gen_seq(i, j, p)
            if len(s) == max_period:
                max_seqs.append((i, j))
    
    gcd_groups = defaultdict(list)
    for (i, j) in max_seqs:
        g = math.gcd(i, j) if (i, j) != (0, 0) else 0
        gcd_groups[g].append((i, j))
    
    # Find 4 generators: Fibonacci + 3 from different gcd groups
    generators = [(0, 1)]  # Fibonacci
    
    # Add one from each gcd group with gcd > 0
    for g in sorted(gcd_groups.keys()):
        if g > 0 and len(generators) < 4:
            generators.append(gcd_groups[g][0])
    
    print(f"p = {p}")
    print(f"  周期: {max_period}")
    print(f"  最大周期序列数: {len(max_seqs)}")
    print(f"  GCD分组数: {len([g for g in gcd_groups.keys() if g > 0])}")
    print(f"  4个生成元候选:")
    for i, (gi, gj) in enumerate(generators):
        s = gen_seq(gi, gj, p)
        print(f"    G{i+1} = ({gi}, {gj}), 周期={len(s)}")
    print()

print("="*75)
print("说明:")
print("- G1 = (0,1) 是斐波那契数列")
print("- G2, G3, G4 来自不同的GCD分组")
print("- 这4个生成元理论上可以生成所有序列")
print("- 实际验证需要求解GF(p^2)上的线性方程组")
print("="*75)
