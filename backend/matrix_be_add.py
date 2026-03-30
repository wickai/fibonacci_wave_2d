import argparse
import os
from typing import List
from matrix_lib import build_matrix_be_add, write_matrix_csv, write_matrix_txt

def main():
    ap = argparse.ArgumentParser(description="Enumerate B_i (+) E_j with B offset=0 and E offset in [0..pi(E)-1].")
    ap.add_argument("-m", "--mod", type=int, required=True, help="Modulus")
    ap.add_argument("--csv", type=str, default=None, help="CSV output path")
    ap.add_argument("--txt", type=str, default=None, help="TXT output path")
    args = ap.parse_args()

    m = args.mod
    b_keys, e_keys, matrix, _ = build_matrix_be_add(m)

    # CSV: rows = B_i, columns = E_j, cell = ids joined by '|'
    csv_path = args.csv or os.path.join(os.path.dirname(__file__), f"matrix_BxE_add_m{m}.csv")
    write_matrix_csv(csv_path, b_keys, e_keys, matrix)

    # TXT: pretty print
    txt_path = args.txt or os.path.join(os.path.dirname(__file__), f"matrix_BxE_add_m{m}.txt")
    write_matrix_txt(txt_path, m, b_keys, e_keys, matrix)

    print(csv_path)
    print(txt_path)

if __name__ == "__main__":
    main()
