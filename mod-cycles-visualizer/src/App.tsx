import { useEffect, useMemo, useRef, useState } from "react";
import type { CyclesResponse, EncodedData } from './types'
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

export default function App(props: {
  requestedBase?: number;
  highlightTargets?: number[][];
  highlightToken?: number;
  highlightIds?: string[];
  highlightIdsToken?: number;
} = {}) {
  const [base, setBase] = useState<number>(props.requestedBase ?? 4)
  const [data, setData] = useState<CyclesResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [active, setActive] = useState<Record<number, boolean>>({})
  const [order, setOrder] = useState<'original' | 'lenAsc' | 'lenDesc'>('original')
  const [idLabels, setIdLabels] = useState<Record<number, string>>({})
  const [hoverText, setHoverText] = useState<string>("")

  // const palette = usePalette()
  const colorCount = data?.sequences.length ?? 0
  const palette = usePalette(colorCount)

  const [centered, setCentered] = useState<boolean>(false);

  useEffect(() => {
    if (typeof props.requestedBase === 'number' && props.requestedBase !== base) {
      setBase(props.requestedBase)
    }
  }, [props.requestedBase])

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

  // rotation/repeat canonical signature (minimal period + minimal rotation)
  const kmpPrefix = (arr: number[]) => {
    const n = arr.length
    const pi = new Array(n).fill(0)
    let j = 0
    for (let i = 1; i < n; i++) {
      while (j > 0 && arr[i] !== arr[j]) j = pi[j - 1]
      if (arr[i] === arr[j]) j++
      pi[i] = j
    }
    return pi
  }
  const minimalPeriod = (arr: number[]) => {
    if (arr.length === 0) return 0
    const pi = kmpPrefix(arr)
    const p = arr.length - pi[arr.length - 1]
    return arr.length % p === 0 ? p : arr.length
  }
  const boothMinRotation = (arr: number[]) => {
    if (arr.length === 0) return 0
    const s = arr.concat(arr)
    const n = arr.length
    let i = 0, j = 1, k = 0
    while (i < n && j < n && k < n) {
      const a = s[i + k]
      const b = s[j + k]
      if (a === b) { k++; continue }
      if (a > b) { i = i + k + 1; if (i <= j) i = j + 1 }
      else { j = j + k + 1; if (j <= i) j = i + 1 }
      k = 0
    }
    return Math.min(i, j)
  }
  const canonicalSignature = (arr: number[]) => {
    if (arr.length === 0) return ''
    const p = minimalPeriod(arr)
    const baseArr = arr.slice(0, p)
    const r = boothMinRotation(baseArr)
    const canon = baseArr.slice(r).concat(baseArr.slice(0, r))
    return canon.join(',')
  }

  // legacy highlight by sequences (kept for compatibility)
  useEffect(() => {
    if (!data || !props.highlightTargets || !props.highlightTargets.length) return
    const targets = props.highlightTargets.map(t =>
      centered ? t.map(x => (x > base / 2 ? x - base : x)) : t
    ).map(t => canonicalSignature(t))
    const targetSet = new Set(targets)
    const on: Record<number, boolean> = {}
    data.sequences.forEach((seq, idx) => {
      const raw = centered ? seq.map(x => (x < 0 ? x + base : x)) : seq
      on[idx] = targetSet.has(canonicalSignature(raw))
    })
    if (Object.values(on).some(Boolean)) setActive(on)
  }, [data, props.highlightToken, centered, base])

  // highlight by IDs (fast path)
  useEffect(() => {
    if (!data || !props.highlightIds || props.highlightIds.length === 0) return
    const idSet = new Set(props.highlightIds)
    const on: Record<number, boolean> = {}
    data.sequences.forEach((_, idx) => {
      on[idx] = !!idLabels[idx] && idSet.has(idLabels[idx])
    })
    if (Object.values(on).some(Boolean)) setActive(on)
  }, [data, props.highlightIdsToken, idLabels])

  useEffect(() => {
    const run = async () => {
      if (!data) return
      try {
        const url = `/results/cycles_m${base}_encoded.json`
        let enc: EncodedData | null = null
        try {
          const r = await fetch(url, { cache: 'no-store' })
          if (r.ok && (r.headers.get('content-type') || '').toLowerCase().includes('application/json')) {
            enc = await r.json()
          }
        } catch {}
        if (!enc) {
          const api = `${API_BASE}/encoded?base=${base}&publish=true`
          const r2 = await fetch(api)
          if (r2.ok) {
            const r3 = await fetch(url, { cache: 'no-store' })
            if (r3.ok) enc = await r3.json()
          }
        }
        if (!enc) return
        const sigToId: Record<string, string> = {}
        if (enc.A?.A_0) sigToId[canonicalSignature(enc.A.A_0.sequence)] = 'A_0'
        Object.keys(enc.B || {}).forEach(k => { sigToId[canonicalSignature(enc.B[k].sequence)] = k })
        Object.keys(enc.E || {}).forEach(k => { sigToId[canonicalSignature(enc.E[k].sequence)] = k })
        const labels: Record<number, string> = {}
        data.sequences.forEach((seq, idx) => {
          const rawSeq = centered ? seq.map(x => (x < 0 ? x + base : x)) : seq
          const sig = canonicalSignature(rawSeq)
          labels[idx] = sigToId[sig] || ''
        })
        setIdLabels(labels)
      } catch {}
    }
    run()
  }, [data, base, centered])

  const sequenceList = useMemo(() => {
    if (!data) return [] as { seq: number[]; idx: number; len: number }[]
    const arr = data.sequences.map((seq, idx) => ({ seq, idx, len: seq.length }))
    if (order === 'lenAsc') arr.sort((a, b) => (a.len - b.len) || (a.idx - b.idx))
    if (order === 'lenDesc') arr.sort((a, b) => (b.len - a.len) || (a.idx - b.idx))
    return arr
  }, [data, order])

  const grid = useMemo(() => {
    // Build cell -> list of labels of coordinates to show
    const cells: Record<string, { label: string; color: string; id?: string }[]> = {}
    if (!data) return { cells, size: base }

    data.sequences.forEach((seq, idx) => {
      if (!active[idx]) return
      const color = palette[idx % palette.length]
      const pairs = makePairsCircular(seq)
      pairs.forEach(([x, y]) => {
        const key = `${x},${y}`
        if (!cells[key]) cells[key] = []
        cells[key].push({ label: `(${x},${y})`, color, id: idLabels[idx] })
      })
    })

    return { cells, size: data.base }
  }, [data, active, palette, base, idLabels])

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
                    {idLabels[idx] && (
                      <span style={{
                        fontSize: 12,
                        padding: '2px 6px',
                        borderRadius: 8,
                        border: '1px solid #999',
                        color: '#333',
                        background: '#fff'
                      }}>
                        {idLabels[idx]}
                      </span>
                    )}
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
              <span style={{ marginLeft: 12, fontWeight: 500, color: '#444' }}>{hoverText}</span>
            </h3>
            <div style={{ flex: 1, minHeight: 0 }}>
              <Grid
                base={data.base}
                cells={grid.cells}
                showLabels={showLabels}
                centered={centered}
                onHoverChange={setHoverText}
              />
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
  centered,
  onHoverChange,
}: {
  base: number;
  cells: Record<string, { label: string; color: string; id?: string }[]>;
  showLabels: boolean;
  centered: boolean;
  onHoverChange?: (text: string) => void;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });

  const [tip, setTip] = useState<{ show: boolean; x: number; y: number; text: string }>({ show: false, x: 0, y: 0, text: "" });

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

  // ====== 关键：根据后端规则生成“显示坐标轴” ======
  // 后端规则：x > base/2 才减 base
  // -> 偶数 base：范围是 [-(half-1) .. +half]（没有 -half，有 +half）
  // -> 奇数 base：范围是 [-half .. +half]（对称）
  const half = Math.floor(base / 2);

  const displayRangeAsc = (min: number, max: number) =>
    Array.from({ length: max - min + 1 }, (_, i) => min + i);

  const displayXs = useMemo(() => {
    if (!centered) {
      return Array.from({ length: base }, (_, x) => x); // 0..base-1
    }
    if (base % 2 === 0) {
      const min = -(half - 1);
      const max = +half;
      return displayRangeAsc(min, max); // 偶数：-(half-1) .. +half
    } else {
      const min = -half;
      const max = +half;
      return displayRangeAsc(min, max); // 奇数：-half .. +half
    }
  }, [base, centered, half]);

  const displayYs = useMemo(() => {
    if (!centered) {
      return Array.from({ length: base }, (_, i) => base - 1 - i); // base-1..0
    }
    if (base % 2 === 0) {
      const min = -(half - 1);
      const max = +half;
      return displayRangeAsc(min, max).reverse(); // 上->下：max..min
    } else {
      const min = -half;
      const max = +half;
      return displayRangeAsc(min, max).reverse(); // 上->下：max..min
    }
  }, [base, centered, half]);

  // 生成渲染顺序与查找键
  const keys = useMemo(() => {
    if (!centered) {
      const arr: string[] = [];
      for (let y = base - 1; y >= 0; y--) {
        for (let x = 0; x < base; x++) arr.push(`${x},${y}`);
      }
      return arr.map(k => ({ displayKey: k, lookupKey: k }));
    }
    // 居中：显示坐标和 lookup 都用中心化键（后端就这么返回的）
    const arr: { displayKey: string; lookupKey: string }[] = [];
    for (const dy of displayYs) {
      for (const dx of displayXs) {
        const k = `${dx},${dy}`;
        arr.push({ displayKey: k, lookupKey: k });
      }
    }
    return arr;
  }, [base, centered, displayXs, displayYs]);

  // 悬浮提示：映射到“显示坐标”
  const onMouseMove: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (!wrapRef.current || !gridRef.current || cellPx === 0) return;
    const wrapRect = wrapRef.current.getBoundingClientRect();
    const gridRect = gridRef.current.getBoundingClientRect();

    const cx = e.clientX, cy = e.clientY;
    if (cx < gridRect.left || cx > gridRect.right || cy < gridRect.top || cy > gridRect.bottom) {
      if (tip.show) setTip((t) => ({ ...t, show: false }));
      if (onHoverChange) onHoverChange("");
      return;
    }

    const rx = cx - gridRect.left;
    const ry = cy - gridRect.top;
    const col = Math.min(Math.max(Math.floor(rx / cellPx), 0), base - 1);
    const rowFromTop = Math.min(Math.max(Math.floor(ry / cellPx), 0), base - 1);

    const dx = centered ? displayXs[col] : col;
    const dy = centered ? displayYs[rowFromTop] : (base - 1 - rowFromTop);

    const key = centered ? `${dx},${dy}` : `${col},${base - 1 - rowFromTop}`;
    const items = cells[key] || [];
    const uniqIds = Array.from(new Set(items.map(it => it.id).filter(Boolean))) as string[];
    const idPart = uniqIds.length ? uniqIds.join(' ') + ':' : '';
    const text = `${idPart}(${dx},${dy})`;
    if (onHoverChange) onHoverChange(text);
    setTip({ show: true, x: 0, y: 0, text });
  };

  const onMouseLeave: React.MouseEventHandler<HTMLDivElement> = () => {
    if (tip.show) setTip((t) => ({ ...t, show: false }));
    if (onHoverChange) onHoverChange("");
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

      {/* 移除跟随鼠标的浮动提示，改为由父组件在标题右侧展示 */}
    </div>
  );
}
