import os
import json
import math
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

def eq_rotation_repeat(result: List[int], base_seq: List[int]) -> bool:
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

def _kmp_prefix(arr: List[int]) -> List[int]:
    n = len(arr)
    pi = [0] * n
    j = 0
    for i in range(1, n):
        while j > 0 and arr[i] != arr[j]:
            j = pi[j - 1]
        if arr[i] == arr[j]:
            j += 1
        pi[i] = j
    return pi

def _minimal_period(arr: List[int]) -> int:
    if not arr:
        return 0
    pi = _kmp_prefix(arr)
    p = len(arr) - pi[-1]
    if len(arr) % p == 0:
        return p
    return len(arr)

def _booth_min_rotation(arr: List[int]) -> int:
    if not arr:
        return 0
    s = arr + arr
    n = len(arr)
    i, j, k = 0, 1, 0
    while i < n and j < n and k < n:
        a = s[i + k]
        b = s[j + k]
        if a == b:
            k += 1
            continue
        if a > b:
            i = i + k + 1
            if i <= j:
                i = j + 1
        else:
            j = j + k + 1
            if j <= i:
                j = i + 1
        k = 0
    return min(i, j)

def _canonical_signature(arr: List[int]) -> Tuple[int, ...]:
    if not arr:
        return tuple()
    p = _minimal_period(arr)
    base = arr[:p]
    r = _booth_min_rotation(base)
    canon = base[r:] + base[:r]
    return tuple(canon)

def _build_signature_index(data: Dict[str, Any]) -> Dict[Tuple[int, ...], str]:
    index: Dict[Tuple[int, ...], str] = {}
    a0 = data.get("A", {}).get("A_0")
    if a0:
        sig = _canonical_signature(a0["sequence"])
        index[sig] = "A_0"
    for group in ("B", "E"):
        items = data.get(group, {})
        keys = sorted(items.keys(), key=lambda k: int(k.split("_")[1]))
        for k in keys:
            sig = _canonical_signature(items[k]["sequence"])
            if sig not in index:
                index[sig] = k
    return index

def find_match_id(result: List[int], data: Dict[str, Any], sig_index: Dict[Tuple[int, ...], str] = None) -> str:
    if sig_index is None:
        sig_index = _build_signature_index(data)
    sig = _canonical_signature(result)
    return sig_index.get(sig, "UNMATCHED")

def load_or_build_encoded(m: int) -> Dict[str, Any]:
    here = os.path.dirname(__file__)
    cache_path = os.path.join(here, f"cycles_m{m}_encoded.json")
    if os.path.exists(cache_path):
        with open(cache_path, "r", encoding="utf-8") as f:
            return json.load(f)
    from encode_cycles import classify_and_encode  # local import
    data = classify_and_encode(m)
    with open(cache_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    return data

def build_matrix(m: int, left_group: str = "B", right_group: str = "E", op: str = "add"):
    data = load_or_build_encoded(m)
    left_keys = sorted(data.get(left_group, {}).keys(), key=lambda k: int(k.split("_")[1]))
    right_keys = sorted(data.get(right_group, {}).keys(), key=lambda k: int(k.split("_")[1]))
    matrix: Dict[Tuple[str, str], List[str]] = {}
    sig_index = _build_signature_index(data)
    for lid in left_keys:
        lseq = data[left_group][lid]["sequence"]
        lrot0 = rotate(lseq, 0)
        for rid in right_keys:
            rseq = data[right_group][rid]["sequence"]
            vect: List[str] = []
            for off in range(len(rseq)):
                rrot = rotate(rseq, off)
                L = lcm(len(lrot0), len(rrot))
                la = repeat_to(lrot0, L)
                rb = repeat_to(rrot, L)
                if op == "add":
                    res = [(la[i] + rb[i]) % m for i in range(L)]
                else:
                    res = [(la[i] - rb[i] + m) % m for i in range(L)]
                mid = find_match_id(res, data, sig_index)
                vect.append(mid)
            matrix[(lid, rid)] = vect
    return left_keys, right_keys, matrix, data

def build_matrix_be(m: int, op: str = "add"):
    return build_matrix(m, "B", "E", op)

def build_matrix_be_add(m: int):
    return build_matrix(m, "B", "E", "add")

def write_matrix_csv(path: str, b_keys: List[str], e_keys: List[str], matrix: Dict[Tuple[str,str], List[str]]):
    with open(path, "w", encoding="utf-8") as f:
        f.write("B\\E," + ",".join(e_keys) + "\n")
        for b_id in b_keys:
            cells = ["|".join(matrix[(b_id, e_id)]) for e_id in e_keys]
            f.write(b_id + "," + ",".join(cells) + "\n")

def write_matrix_txt(path: str, m: int, b_keys: List[str], e_keys: List[str], matrix: Dict[Tuple[str,str], List[str]]):
    with open(path, "w", encoding="utf-8") as f:
        f.write(f"Mod {m} - Matrix B_i (+) E_j\n")
        f.write(f"Rows: B group ({len(b_keys)}), Cols: E group ({len(e_keys)})\n\n")
        for b_id in b_keys:
            f.write(f"{b_id}:\n")
            for e_id in e_keys:
                f.write(f"  {e_id}: [{', '.join(matrix[(b_id, e_id)])}]\n")
            f.write("\n")
