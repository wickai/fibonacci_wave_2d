# Run with:
#   uvicorn main:app --reload --port 8000
# Requires: fastapi, uvicorn, pydantic, corsheaders

from typing import List, Tuple
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from cycles_lib import enumerate_cycles, to_centered
import os, json, shutil
from encode_cycles import classify_and_encode

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

#

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

@app.get("/encoded")
def get_encoded(
    base: int = Query(ge=1, le=700),
    publish: bool = Query(default=False, description="If true, also copy cache to mod-cycles-visualizer/public/results"),
):
    """
    Auto-cached encoded cycles for given base:
      - If backend cache exists: read and return
      - Else: compute, save to backend cache, then return
    Optionally publish a copy to the frontend public/results for direct static loading.
    """
    here = os.path.dirname(__file__)
    cache_path = os.path.join(here, f"cycles_m{base}_encoded.json")
    if os.path.exists(cache_path):
        with open(cache_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    else:
        data = classify_and_encode(base)
        with open(cache_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    if publish:
        repo_root = os.path.abspath(os.path.join(here, ".."))
        public_path = os.path.join(repo_root, "mod-cycles-visualizer", "public", "results", f"cycles_m{base}_encoded.json")
        os.makedirs(os.path.dirname(public_path), exist_ok=True)
        with open(public_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    return data
