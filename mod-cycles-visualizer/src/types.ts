export type Pair = [number, number];
export interface CyclesResponse {
  base: number;
  sequences: number[][];
  cycles_pairs: Pair[][];
}