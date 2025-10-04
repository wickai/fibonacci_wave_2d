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
    sequences: List[List[int]]                 # sequences of first components along each cycle
    cycles_pairs: List[List[Tuple[int,int]]]   # the (a,b) state cycles (possibly centered if requested)

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

            if cycle_states:
                # canonicalize cycle rotation for stability (optional)
                min_idx = min(range(len(cycle_states)), key=lambda i: cycle_states[i])
                canonical = cycle_states[min_idx:] + cycle_states[:min_idx]
                cycles.append(canonical)

    # deduplicate cycles
    unique = []
    seen = set()
    for cyc in cycles:
        key = tuple(cyc)
        if key not in seen:
            seen.add(key)
            unique.append(cyc)
    return unique

# ---------- NEW: center mapping helper ----------
def to_centered(x: int, base: int) -> int:
    """
    Map x in [0, base-1] to 'centered' range by rule:
      if x > base/2: x - base  else x
    NOTE: This follows the exact requirement "每个大于 m/2 的数值，减去 m".
    """
    # Using float division is fine for the strict ">" comparison.
    return x - base if x > (base / 2) else x
# ------------------------------------------------

@app.get("/cycles", response_model=CyclesResponse)
def get_cycles(
    base: int = Query(ge=1, le=700),
    centered: bool = Query(default=False, description="If true, map values to centered range by: x > m/2 => x-m"),
):
    """
    Return all distinct cycles for the Fibonacci-like map modulo `base`.

    If `centered=true`, every integer x in states and sequences is mapped by:
        x_centered = x - base  (if x > base/2) else x

    Examples (centered=false, raw 0..m-1):
      base=2 -> sequences includes [1,1,0] and [0]
      base=3 -> sequences includes [1,1,2,0,2,2,1,0] and [0]
      base=4 -> sequences includes [1,1,2,3,1,0], [0,2,2], [0,3,3,2,1,3], [0]
    """
    raw_cycles_pairs = enumerate_cycles(base)

    if centered:
        # Map both a and b for every state
        centered_cycles_pairs: List[List[Tuple[int,int]]] = [
            [(to_centered(a, base), to_centered(b, base)) for (a, b) in cyc]
            for cyc in raw_cycles_pairs
        ]
        sequences = [[a for (a, b) in cyc] for cyc in centered_cycles_pairs]
        print("length of cycles (centered):", len(centered_cycles_pairs))
        return CyclesResponse(base=base, sequences=sequences, cycles_pairs=centered_cycles_pairs)
    else:
        sequences = [[a for (a, b) in cyc] for cyc in raw_cycles_pairs]
        print("length of cycles:", len(raw_cycles_pairs))
        return CyclesResponse(base=base, sequences=sequences, cycles_pairs=raw_cycles_pairs)
