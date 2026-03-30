import argparse
import os
from matrix_lib import build_matrix_be, write_matrix_csv, write_matrix_txt

def main():
    ap = argparse.ArgumentParser(description="Build B×E matrix for add/sub and write CSV/TXT")
    ap.add_argument("-m", "--mod", type=int, required=True)
    ap.add_argument("--op", choices=["add", "sub"], default="add")
    ap.add_argument("--csv", type=str, default=None)
    ap.add_argument("--txt", type=str, default=None)
    args = ap.parse_args()

    b_keys, e_keys, matrix, _ = build_matrix_be(args.mod, args.op)
    csv_path = args.csv or os.path.join(os.path.dirname(__file__), f"matrix_BxE_{args.op}_m{args.mod}.csv")
    txt_path = args.txt or os.path.join(os.path.dirname(__file__), f"matrix_BxE_{args.op}_m{args.mod}.txt")
    write_matrix_csv(csv_path, b_keys, e_keys, matrix)
    write_matrix_txt(txt_path, args.mod, b_keys, e_keys, matrix)
    print(csv_path)
    print(txt_path)

if __name__ == "__main__":
    main()

