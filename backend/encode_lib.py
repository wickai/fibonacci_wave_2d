from typing import List, Tuple, Dict, Any
from .cycles_lib import enumerate_cycles  # type: ignore

def rotate_to_start(cycle: List[Tuple[int, int]], start_pair: Tuple[int, int]) -> List[Tuple[int, int]]:
    idx = cycle.index(start_pair)
    return cycle[idx:] + cycle[:idx]

def classify_and_encode(base: int) -> Dict[str, Any]:
    cycles: List[List[Tuple[int, int]]] = enumerate_cycles(base)

    a_entry: Dict[str, Any] = {}
    b_entries: List[Dict[str, Any]] = []
    e_entries: List[Dict[str, Any]] = []

    for cyc in cycles:
        if (0, 0) in cyc:
            rotated = rotate_to_start(cyc, (0, 0))
            entry = {
                "type": "A",
                "start": [0, 0],
                "length": len(rotated),
                "cycle_pairs": [[a, b] for (a, b) in rotated],
                "sequence": [a for (a, b) in rotated],
            }
            a_entry = entry
            continue

        zero_a = [(a, b) for (a, b) in cyc if a == 0]
        if zero_a:
            (a0, x) = zero_a[0]
            rotated = rotate_to_start(cyc, (a0, x))
            b_entries.append({
                "type": "B",
                "x": x,
                "start": [0, x],
                "length": len(rotated),
                "cycle_pairs": [[a, b] for (a, b) in rotated],
                "sequence": [a for (a, b) in rotated],
            })
        else:
            start_pair = min(cyc)
            rotated = rotate_to_start(cyc, start_pair)
            e_entries.append({
                "type": "E",
                "start": [start_pair[0], start_pair[1]],
                "length": len(rotated),
                "cycle_pairs": [[a, b] for (a, b) in rotated],
                "sequence": [a for (a, b) in rotated],
                "start_key": [start_pair[0], start_pair[1]],
            })

    b_entries.sort(key=lambda d: d["x"])
    for i, ent in enumerate(b_entries, start=1):
        ent["id"] = f"B_{i}"
        ent.pop("x", None)

    e_entries.sort(key=lambda d: tuple(d["start"]))
    for i, ent in enumerate(e_entries, start=1):
        ent["id"] = f"E_{i}"
        ent.pop("start_key", None)

    output: Dict[str, Any] = {
        "base": base,
        "counts": {
            "total": (1 if a_entry else 0) + len(b_entries) + len(e_entries),
            "A": 1 if a_entry else 0,
            "B": len(b_entries),
            "E": len(e_entries),
        },
        "A": {"A_0": a_entry} if a_entry else {},
        "B": {ent["id"]: ent for ent in b_entries},
        "E": {ent["id"]: ent for ent in e_entries},
    }
    return output

