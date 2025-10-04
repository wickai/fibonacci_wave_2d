# Fibonacci–Lucas Mod Cycles Visualizer

![Fibonacci sequence modulo 300, first 30 sequences](figs/mod300_fib_30seqs.png)
(Fibonacci sequence modulo 300, first 30 sequences)

This project is designed to study the **cyclic behavior of Fibonacci–Lucas sequences modulo $m$**, and to visualize these cycles interactively.  
Different moduli $m$ generate multiple **distinct cycles**, each represented as a finite sequence.  
In the frontend interface, users can select a modulus, switch display modes, and observe the coordinate distribution of these cycles in a 2D grid.

## Background

The Fibonacci sequence modulo $m$ exhibits **pure periodicity**, with the fundamental period called the **Pisano period**.  
More generally, any initial pair $(a,b)$ modulo $m$ corresponds to a unique cycle.  
These cycles can be formalized as loops in a directed graph $G(m)$, which connects to the research problem: **enumerate all non-repeating cycles under different moduli and visualize their structure and distribution.**

Visualization approach:  
- Each cycle is assigned a unique color;  
- Adjacent values within a cycle $(x_i, x_{i+1})$ are used as coordinates in a grid and colored accordingly;  
- Users can toggle the display of certain cycles;  
- Supports showing/hiding coordinate text, hover tooltips, and filtering/sorting.

---

## References

- Wikipedia: [Pisano period](https://en.wikipedia.org/wiki/Pisano_period) — introduction to Pisano periods (denoted π(n)).  
- [SYMMETRIES OF FIBONACCI POINTS, MOD m](https://webspace.ship.edu/msrenault/fibonacci/Renault%20-%20Symmetries%20of%20Fibonacci%20Points%20Mod%20m.pdf) — observes periodicity of Fibonacci sequences modulo $m$.  
- Marc Renault. [*The Period, Rank, and Order of the (a,b)-Fibonacci Sequence Mod m*](https://webspace.ship.edu/msrenault/fibonacci/RenaultPeriodRankOrderMathMag.pdf). *Math. Magazine* (2013) — extends periodicity to general $(a,b)$-Fibonacci sequences.  
- [The Fibonacci Sequence Modulo m](https://webspace.ship.edu/msrenault/fibonacci/fib.htm)  
- [Fibonacci Random Generator and Fourier Analysis](https://surim.stanford.edu/sites/g/files/sbiybj26191/files/media/file/fibonacci_random_generator_and_fourier_analysis_0.pdf)

### 1. Fibonacci Sequence Overview

- [OI Wiki: Properties of Fibonacci numbers](https://oi-wiki.org/math/combinatorics/fibonacci/)  
  Overview of Fibonacci sequence definition, properties, and combinatorial applications.

- [OEIS: A000045 Fibonacci sequence](https://oeis.org/A000045)  
  OEIS record of Fibonacci numbers with first few terms, formulas, and references.

### 2. Quasicrystals and Tiling

- [Roger Penrose](https://zh.wikipedia.org/wiki/%E7%BE%85%E5%82%91%C2%B7%E6%BD%98%E6%B4%9B%E6%96%AF)  
  British mathematician, proposed **Penrose tiling**, the first non-periodic five-fold symmetric structure.

- [Penrose tiling](https://zh.wikipedia.org/wiki/%E5%BD%AD%E7%BE%85%E6%96%AF%E5%AF%86%E9%8B%AA)  
  A non-periodic tiling method that produces five-fold symmetric patterns, relevant to quasicrystals.

- [Wang tiles](https://zh.wikipedia.org/wiki/%E7%8E%8B%E6%B0%8F%E7%A0%96)  
  A quasi-periodic tiling method proposed by Chinese mathematician Wang, capable of producing complex non-repeating patterns.

---

## Getting Started

### Backend (FastAPI)
1. Navigate to the backend directory:
   ```bash
   cd backend
    ```

2. Install dependencies:

   ```bash
   pip install fastapi uvicorn pydantic python-multipart
   ```
3. Start the server:

   ```bash
   uvicorn main:app --reload --port 8000
   ```

   The backend runs by default at [http://localhost:8000](http://localhost:8000).

---

### Frontend (React + Vite + TypeScript)

1. Create and enter the frontend directory:

   ```bash
   npm create vite@latest frontend -- --template react-ts
   cd frontend
   npm install
   ```
2. Replace `src/App.tsx`, `src/types.ts`, `src/styles.css` with the versions provided in this project.
3. Start the development server:

   ```bash
   npm run dev
   ```
4. Open [http://localhost:5173](http://localhost:5173) to access the interactive visualization.

---

## Features

* Input any modulus $m$ to enumerate all non-repeating cycles.
* Buttons on the left allow toggling individual cycles.
* Sort cycles (original order / by length).
* Grid displays the coordinate distribution of cycles, with colors distinguishing different cycles.
* Hover shows coordinate tooltip + highlights grid cells.
* Toggle display of coordinate text on the grid.
* Clear all selections.

---

## TODO / Extensions

* Export cycle data to CSV/JSON.
* Add statistics panel (cycle length histogram, residue class distribution).
* Support visualization of Lucas sequences and general $(a,b)$-Fibonacci sequences.


---

## License / Copyright

© 2025 Wei Kai (weikai105b@gmail.com)  

This project is **for personal, educational, or research use only**.  
**Commercial use is not permitted** without explicit permission from the author.  

You may freely **view, modify, and share** this content under the condition that it is **not used for commercial purposes** and proper attribution is given.

---
