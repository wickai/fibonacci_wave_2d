from typing import List, Tuple, Dict, Set

def enumerate_cycles(base: int) -> List[List[Tuple[int, int]]]:
    visited: Set[Tuple[int, int]] = set()
    cycles: List[List[Tuple[int, int]]] = []

    for a0 in range(base):
        for b0 in range(base):
            s = (a0, b0)
            if s in visited:
                continue

            path: List[Tuple[int, int]] = []
            seen_index: Dict[Tuple[int, int], int] = {}
            while s not in seen_index:
                seen_index[s] = len(path)
                path.append(s)
                s = (s[1], (s[0] + s[1]) % base)

            start = seen_index[s]
            cycle_states = path[start:]

            for node in path:
                visited.add(node)

            if cycle_states:
                min_idx = min(range(len(cycle_states)), key=lambda i: cycle_states[i])
                canonical = cycle_states[min_idx:] + cycle_states[:min_idx]
                cycles.append(canonical)

    unique = []
    seen = set()
    for cyc in cycles:
        key = tuple(cyc)
        if key not in seen:
            seen.add(key)
            unique.append(cyc)
    return unique


def to_centered(x: int, base: int) -> int:
    return x - base if x > (base / 2) else x
