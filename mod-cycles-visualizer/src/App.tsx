import { useEffect, useMemo, useRef, useState } from "react";
import type { CyclesResponse } from './types'
import * as d3 from "d3"

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'

// function usePalette() {
//   // a simple repeating palette
//   const colors = [
//     '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728',
//     '#9467bd', '#8c564b', '#e377c2', '#7f7f7f',
//     '#bcbd22', '#17becf', '#393b79', '#637939',
//   ]
//   return colors
// }
// function usePalette(n = 200) {
//   const colors = []
//   // 这里用 d3.interpolateRainbow 生成连续的彩虹色带
//   for (let i = 0; i < n; i++) {
//     const t = i / n // 0 ~ 1
//     colors.push(d3.interpolateRainbow(t))
//   }
//   return colors
// }

function usePalette(n: number) {
  return useMemo(() => {
    if (!n || n <= 0) return []
    const colors: string[] = []
    // 均匀取色：每个 seq 拿到不同的彩虹色
    for (let i = 0; i < n; i++) {
      const t = i / n // 0 ~ 1
      colors.push(d3.interpolateRainbow(t))
    }
    return colors
  }, [n])
}


function makePairsCircular(seq: number[]): [number, number][] {
  const pairs: [number, number][] = []
  if (seq.length === 0) return pairs
  for (let i = 0; i < seq.length; i++) {
    const a = seq[i]
    const b = seq[(i + 1) % seq.length]
    pairs.push([a, b])
  }
  return pairs
}

export default function App() {
  const [base, setBase] = useState<number>(4)
  const [data, setData] = useState<CyclesResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [active, setActive] = useState<Record<number, boolean>>({})
  const [order, setOrder] = useState<'original' | 'lenAsc' | 'lenDesc'>('original')

  // const palette = usePalette()
  const colorCount = data?.sequences.length ?? 0
  const palette = usePalette(colorCount)

  const [centered, setCentered] = useState<boolean>(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        // const res = await fetch(`${API_BASE}/cycles?base=${base}`)
        const res = await fetch(`${API_BASE}/cycles?base=${base}&centered=${centered}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json: CyclesResponse = await res.json()
        // 默认全选
        const all: Record<number, boolean> = {}
        json.sequences.forEach((_, idx) => { all[idx] = true })
        setData(json)
        setActive(all)
      } catch (e: any) {
        setError(e.message || 'Fetch error')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [base, centered])

  const sequenceList = useMemo(() => {
    if (!data) return [] as { seq: number[]; idx: number; len: number }[]
    const arr = data.sequences.map((seq, idx) => ({ seq, idx, len: seq.length }))
    if (order === 'lenAsc') arr.sort((a, b) => (a.len - b.len) || (a.idx - b.idx))
    if (order === 'lenDesc') arr.sort((a, b) => (b.len - a.len) || (a.idx - b.idx))
    return arr
  }, [data, order])

  const grid = useMemo(() => {
    // Build cell -> list of labels of coordinates to show
    const cells: Record<string, { label: string; color: string }[]> = {}
    if (!data) return { cells, size: base }

    data.sequences.forEach((seq, idx) => {
      if (!active[idx]) return
      const color = palette[idx % palette.length]
      const pairs = makePairsCircular(seq)
      pairs.forEach(([x, y]) => {
        const key = `${x},${y}`
        if (!cells[key]) cells[key] = []
        cells[key].push({ label: `(${x},${y})`, color })
      })
    })

    return { cells, size: data.base }
  }, [data, active, palette, base])

  const totalSeqCount = data?.sequences.length ?? 0
  const selectedCount = useMemo(
    () => Object.values(active).filter(Boolean).length,
    [active]
  )

  const [showLabels, setShowLabels] = useState<boolean>(false); // ← 新增：是否显示坐标文字

  return (
    <div style={{ fontFamily: 'Inter, system-ui, Arial', padding: 16 }}>
      <h1>Fibonacci–Lucas Mod Cycles Visualizer</h1>
      <p>
        选择进制：
        <input
          type="number"
          min={1}
          max={5000}
          value={base}
          onChange={(e) => setBase(parseInt(e.target.value || '1', 10))}
          style={{ width: 100, marginLeft: 8 }}
        />
        &nbsp;&nbsp;排序：
        <select value={order} onChange={(e) => setOrder(e.target.value as any)} style={{ marginLeft: 8 }}>
          <option value="original">原始顺序</option>
          <option value="lenAsc">按长度 ↑</option>
          <option value="lenDesc">按长度 ↓</option>
        </select>

        {/* 坐标文字开关 */}
        <label style={{ marginLeft: 8 }}>
          <input
            type="checkbox"
            checked={showLabels}
            onChange={(e) => setShowLabels(e.target.checked)}
            style={{ marginRight: 6 }}
          />
          显示坐标文字
        </label>

        {/* ✅ 新增：居中坐标开关 */}
        <label style={{ marginLeft: 12 }}>
          <input
            type="checkbox"
            checked={centered}
            onChange={(e) => setCentered(e.target.checked)}
            style={{ marginRight: 6 }}
          />
          居中坐标(x,y ∈ [-m/2, m/2))
        </label>
      </p>

      {loading && <p>Loading…</p>}
      {error && <p style={{ color: 'crimson' }}>Error: {error}</p>}

      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>
          <div>
            <h3>
              数列（{totalSeqCount} 个，已选 {selectedCount}）
              <button
                onClick={() => setActive({})}
                style={{
                  marginLeft: 12,
                  padding: '2px 8px',
                  fontSize: 12,
                  borderRadius: 6,
                  border: '1px solid #aaa',
                  cursor: 'pointer',
                  background: '#f9f9f9'
                }}
              >
                取消选择
              </button>
              {/* 新增的全选按钮 */}
              <button
                onClick={() => {
                  if (!data) return
                  const all: Record<number, boolean> = {}
                  data.sequences.forEach((_, idx) => { all[idx] = true })
                  setActive(all)
                }}
                style={{
                  marginLeft: 8,
                  padding: '2px 8px',
                  fontSize: 12,
                  borderRadius: 6,
                  border: '1px solid #aaa',
                  cursor: 'pointer',
                  background: '#f9f9f9'
                }}
              >
                全选
              </button>
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 480, overflow: 'auto' }}>
              {sequenceList.map(({ seq, idx, len }) => {
                const color = palette[idx % palette.length]
                const on = !!active[idx]
                return (
                  <button
                    key={idx}
                    onClick={() => setActive(prev => ({ ...prev, [idx]: !on }))}
                    style={{
                      textAlign: 'left',
                      padding: '8px 10px',
                      borderRadius: 10,
                      border: `2px solid ${on ? color : '#ccc'}`,
                      background: on ? '#fafafa' : 'white',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      justifyContent: 'space-between'
                    }}
                    title={`颜色: ${color} | 长度: ${len}`}
                  >
                    <span style={{ display: 'inline-block', width: 12, height: 12, background: color, borderRadius: 3 }} />
                    <span style={{ flex: 1, marginLeft: 4 }}>[{seq.join(', ')}]</span>
                    {/* 新增的长度徽标 */}
                    <span style={{
                      fontSize: 12,
                      padding: '2px 6px',
                      borderRadius: 8,
                      border: `1px solid ${color}`,
                      color,
                      whiteSpace: 'nowrap'
                    }}>
                      长度 {len}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', minHeight: '80vh' }}>
            <h3 style={{ marginBottom: 8 }}>
              二维表格（{centered ? "中心化坐标" : "原始坐标"}）

            </h3>
            <div style={{ flex: 1, minHeight: 0 }}>
              {/* ✅ 把 centered 传给 Grid */}
              <Grid base={data.base} cells={grid.cells} showLabels={showLabels} centered={centered} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Grid({
  base,
  cells,
  showLabels,
  centered, // ✅ 新增：是否中心化渲染（原点居中）
}: {
  base: number;
  cells: Record<string, { label: string; color: string }[]>;
  showLabels: boolean;
  centered: boolean; // ✅ 新增
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });

  const [tip, setTip] = useState<{ show: boolean; x: number; y: number; text: string }>({
    show: false, x: 0, y: 0, text: "",
  });

  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new (window as any).ResizeObserver((entries: any[]) => {
      const cr = entries[0].contentRect;
      setBox({ w: cr.width, h: cr.height });
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  const cellPx = useMemo(() => {
    if (!base || box.w === 0 || box.h === 0) return 0;
    const side = Math.min(box.w, box.h);
    return Math.max(6, Math.floor(side / base));
  }, [base, box]);

  const gridSidePx = cellPx * base;
  const fontPx = Math.max(8, Math.floor(cellPx * 0.28));

  // ====== 关键：根据 centered 生成显示坐标轴序列 ======
  const half = Math.floor(base / 2);

  // x 从负到正（左->右）
  const displayXs = useMemo(() => {
    if (!centered) {
      // 旧模式：0..base-1
      return Array.from({ length: base }, (_, x) => x);
    }
    // 居中：[-half .. base-half-1]
    return Array.from({ length: base }, (_, i) => i - half);
  }, [base, centered, half]);

  // y 从大到小（上->下）
  const displayYs = useMemo(() => {
    if (!centered) {
      // 旧模式：base-1..0
      return Array.from({ length: base }, (_, i) => base - 1 - i);
    }
    // 居中：max..min
    const minY = -half;
    const maxY = base - half - 1;
    return Array.from({ length: base }, (_, i) => maxY - i);
  }, [base, centered, half]);

  // ====== 渲染顺序与数据键 ======
  // centered=true 时，后端 cells 的 key 已是中心化坐标字符串，如 "-4,3"
  // centered=false 时，仍然是 "0,0" .. "m-1,m-1"
  const keys = useMemo(() => {
    if (!centered) {
      // 原逻辑
      const arr: string[] = [];
      for (let y = base - 1; y >= 0; y--) {
        for (let x = 0; x < base; x++) arr.push(`${x},${y}`);
      }
      return arr.map(k => ({ displayKey: k, lookupKey: k }));
    }
    // 居中：按显示坐标顺序渲染，同时 lookup 也用显示坐标（后端返回的就是中心化键）
    const arr: { displayKey: string; lookupKey: string }[] = [];
    for (const dy of displayYs) {
      for (const dx of displayXs) {
        const k = `${dx},${dy}`;
        arr.push({ displayKey: k, lookupKey: k });
      }
    }
    return arr;
  }, [base, centered, displayXs, displayYs]);

  // 悬浮提示：根据格子索引映射到显示坐标
  const onMouseMove: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (!wrapRef.current || !gridRef.current || cellPx === 0) return;
    const wrapRect = wrapRef.current.getBoundingClientRect();
    const gridRect = gridRef.current.getBoundingClientRect();

    const cx = e.clientX, cy = e.clientY;
    if (cx < gridRect.left || cx > gridRect.right || cy < gridRect.top || cy > gridRect.bottom) {
      if (tip.show) setTip((t) => ({ ...t, show: false }));
      return;
    }

    const rx = cx - gridRect.left;
    const ry = cy - gridRect.top;
    const col = Math.min(Math.max(Math.floor(rx / cellPx), 0), base - 1);
    const rowFromTop = Math.min(Math.max(Math.floor(ry / cellPx), 0), base - 1);

    const dx = centered ? displayXs[col] : col;
    const dy = centered ? displayYs[rowFromTop] : (base - 1 - rowFromTop);

    const tx = cx - wrapRect.left + 12;
    const ty = cy - wrapRect.top + 12;
    setTip({ show: true, x: tx, y: ty, text: `(${dx},${dy})` });
  };

  const onMouseLeave: React.MouseEventHandler<HTMLDivElement> = () => {
    if (tip.show) setTip((t) => ({ ...t, show: false }));
  };

  if (cellPx === 0) {
    return (
      <div ref={wrapRef} style={{ position: "relative", width: "100%", height: "100%",
        border: "1px solid #e5e5e5", borderRadius: 8, background: "#fff" }}
      />
    );
  }

  return (
    <div
      ref={wrapRef}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "auto",
        border: "1px solid #e5e5e5",
        borderRadius: 8,
        background: "#fff",
      }}
    >
      <div
        ref={gridRef}
        style={{
          width: gridSidePx,
          height: gridSidePx,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: `repeat(${base}, ${cellPx}px)`,
          gridTemplateRows: `repeat(${base}, ${cellPx}px)`,
          boxSizing: "content-box",
        }}
      >
        {keys.map(({ displayKey, lookupKey }) => {
          const items = cells[lookupKey] || [];
          const bgColor = items.length > 0 ? items[items.length - 1].color : "white";
          const label = showLabels && items.length > 0 ? `(${displayKey})` : undefined;

          return (
            <div
              key={displayKey}
              style={{
                border: '1px solid #eee',
                background: bgColor,
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                lineHeight: 1.1,
                fontSize: fontPx,
                color: "black",
                userSelect: "none",
              }}
              title={label}
            >
              {label}
            </div>
          );
        })}
      </div>

      {tip.show && (
        <div
          style={{
            position: "absolute",
            left: tip.x,
            top: tip.y,
            transform: "translate(-50%, -120%)",
            background: "rgba(0,0,0,0.8)",
            color: "white",
            fontSize: 12,
            padding: "4px 6px",
            borderRadius: 6,
            pointerEvents: "none",
            zIndex: 10,
            whiteSpace: "nowrap",
            boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
          }}
        >
          {tip.text}
        </div>
      )}
    </div>
  );
}