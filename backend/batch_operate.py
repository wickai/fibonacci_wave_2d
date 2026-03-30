import argparse
import json
import math
import os
import csv
from typing import Dict, List, Tuple, Any

def lcm(a: int, b: int) -> int:
    return abs(a * b) // math.gcd(a, b) if a and b else 0

def rotate(seq: List[int], k: int) -> List[int]:
    n = len(seq)
    if n == 0:
        return []
    k = ((k % n) + n) % n
    return seq[k:] + seq[:k]

def repeat_to(seq: List[int], L: int) -> List[int]:
    if not seq:
        return []
    return [seq[i % len(seq)] for i in range(L)]

def load_encoded(path: str) -> Dict[str, Any]:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def build_entries_map(data: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
    m: Dict[str, Dict[str, Any]] = {}
    a0 = data.get("A", {}).get("A_0")
    if a0:
        a0 = dict(a0)
        a0["id"] = "A_0"
        m["A_0"] = a0
    for k, v in sorted(data.get("B", {}).items(), key=lambda kv: int(kv[0].split("_")[1])):
        vv = dict(v)
        vv["id"] = k
        m[k] = vv
    for k, v in sorted(data.get("E", {}).items(), key=lambda kv: int(kv[0].split("_")[1])):
        vv = dict(v)
        vv["id"] = k
        m[k] = vv
    return m

def all_entries_in_order(data: Dict[str, Any]) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    a0 = data.get("A", {}).get("A_0")
    if a0:
        vv = dict(a0)
        vv["id"] = "A_0"
        out.append(vv)
    for k, v in sorted(data.get("B", {}).items(), key=lambda kv: int(kv[0].split("_")[1])):
        vv = dict(v)
        vv["id"] = k
        out.append(vv)
    for k, v in sorted(data.get("E", {}).items(), key=lambda kv: int(kv[0].split("_")[1])):
        vv = dict(v)
        vv["id"] = k
        out.append(vv)
    return out

def is_rotation_repeat_equal(result: List[int], base_seq: List[int]) -> bool:
    sLen = len(base_seq)
    if sLen == 0 or len(result) % sLen != 0:
        return False
    for r in range(sLen):
        ok = True
        for i in range(len(result)):
            if result[i] != base_seq[(i + r) % sLen]:
                ok = False
                break
        if ok:
            return True
    return False

def find_match(result: List[int], entries: List[Dict[str, Any]]) -> str:
    for ent in entries:
        if is_rotation_repeat_equal(result, ent["sequence"]):
            return ent["id"]
    return "UNMATCHED"

def main():
    p = argparse.ArgumentParser()
    p.add_argument("-m", "--mod", type=int, required=True)
    p.add_argument("--json", type=str, default=None)
    p.add_argument("--left", required=True)
    p.add_argument("--right", required=True)
    p.add_argument("--op", choices=["+", "-", "plus", "minus"], default="+")
    p.add_argument("--left_phase", type=int, default=0)
    p.add_argument("--offset_start", type=int, default=None)
    p.add_argument("--offset_end", type=int, default=None)
    p.add_argument("-o", "--output", type=str, default=None)
    args = p.parse_args()

    base = args.mod
    json_path = args.json or os.path.join(os.path.dirname(__file__), f"cycles_m{base}_encoded.json")
    data = load_encoded(json_path)
    emap = build_entries_map(data)
    entries_order = all_entries_in_order(data)

    if args.left not in emap or args.right not in emap:
        raise SystemExit("left 或 right 未在 JSON 中找到")

    left = emap[args.left]
    right = emap[args.right]
    left_seq = rotate(left["sequence"], args.left_phase)
    right_len = len(right["sequence"])

    s = 0 if args.offset_start is None else max(0, args.offset_start)
    e = (right_len - 1) if args.offset_end is None else min(right_len - 1, args.offset_end)
    if s > e:
        raise SystemExit("offset_start 不能大于 offset_end")

    out_path = args.output or os.path.join(os.path.dirname(__file__), f"batch_{args.left}_{args.op}_{args.right}_m{base}.csv")
    with open(out_path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["m", "left_id", "left_phase", "op", "right_id", "right_offset", "lcm_len", "matched_id"])
        for off in range(s, e + 1):
            rseq = rotate(right["sequence"], off)
            L = lcm(len(left_seq), len(rseq))
            la = repeat_to(left_seq, L)
            rb = repeat_to(rseq, L)
            if args.op in ["+", "plus"]:
                res = [(la[i] + rb[i]) % base for i in range(L)]
            else:
                res = [(la[i] - rb[i] + base) % base for i in range(L)]
            mid = find_match(res, entries_order)
            w.writerow([base, args.left, args.left_phase, args.op, args.right, off, L, mid])

    print(out_path)

if __name__ == "__main__":
    main()

