export type Pair = [number, number];
export interface CyclesResponse {
  base: number;
  sequences: number[][];
  cycles_pairs: Pair[][];
}

export interface EncodedEntry {
  id: string;
  type: 'A' | 'B' | 'E';
  start: [number, number];
  length: number;
  sequence: number[];
  cycle_pairs: Pair[];
}

export interface EncodedData {
  base: number;
  counts: { total: number; A: number; B: number; E: number };
  A: { A_0?: EncodedEntry };
  B: Record<string, EncodedEntry>;
  E: Record<string, EncodedEntry>;
}
