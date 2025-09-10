# Run with:
#   uvicorn main:app --reload --port 8000
# Requires: fastapi, uvicorn, pydantic, corsheaders

from typing import List, Tuple, Dict, Set
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Fibonacci–Lucas Mod Cycles API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CyclesResponse(BaseModel):
    base: int
    sequences: List[List[int]]            # sequences of first components along each cycle
    cycles_pairs: List[List[Tuple[int,int]]]  # optional: the (a,b) state cycles

# Transition on ordered pair (a,b): T(a,b) = (b, (a+b) mod base)
# This is the state evolution for Fibonacci-like recurrences modulo base.

def enumerate_cycles(base: int) -> List[List[Tuple[int,int]]]:
    visited: Set[Tuple[int,int]] = set()
    cycles: List[List[Tuple[int,int]]] = []

    for a0 in range(base):
        for b0 in range(base):
            s = (a0,b0)
            if s in visited:
                continue

            path: List[Tuple[int,int]] = []
            seen_index: Dict[Tuple[int,int], int] = {}
            while s not in seen_index:
                seen_index[s] = len(path)
                path.append(s)
                s = (s[1], (s[0] + s[1]) % base)

            # s just repeated; extract the cycle portion
            start = seen_index[s]
            cycle_states = path[start:]

            # mark entire path as visited to avoid reprocessing
            for node in path:
                visited.add(node)

            # Only append non-empty cycles (there is always at least a 1-length cycle)
            if cycle_states:
                # canonicalize cycle rotation for stability (optional)
                # rotate so that lexicographically smallest (a,b) comes first
                min_idx = min(range(len(cycle_states)), key=lambda i: cycle_states[i])
                canonical = cycle_states[min_idx:] + cycle_states[:min_idx]
                cycles.append(canonical)

    # deduplicate cycles (in case multiple entries with same states appear)
    # Use tuple of states as key
    unique = []
    seen = set()
    for cyc in cycles:
        key = tuple(cyc)
        if key not in seen:
            seen.add(key)
            unique.append(cyc)
    return unique

@app.get("/cycles", response_model=CyclesResponse)
def get_cycles(base: int = Query(ge=1, le=64)):
    """
    Return all distinct cycles for the Fibonacci-like map modulo `base`.
    Each cycle is represented as the list of (a,b) states; `sequences` returns the list of `a`'s.

    Examples expected by user:
      base=2 -> sequences includes [1,1,0] and [0]
      base=3 -> sequences includes [1,1,2,0,2,2,1,0] and [0]
      base=4 -> sequences includes [1,1,2,3,1,0], [0,2,2], [0,3,3,2,1,3], [0]
    """
    cycles_pairs = enumerate_cycles(base)
    sequences = [[a for (a, b) in cyc] for cyc in cycles_pairs]

    return CyclesResponse(base=base, sequences=sequences, cycles_pairs=cycles_pairs)
