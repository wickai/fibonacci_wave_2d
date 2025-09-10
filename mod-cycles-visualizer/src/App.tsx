import { useEffect, useMemo, useRef, useState } from "react";
import type { CyclesResponse } from './types'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'

function usePalette() {
  // a simple repeating palette
  const colors = [
    '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728',
    '#9467bd', '#8c564b', '#e377c2', '#7f7f7f',
    '#bcbd22', '#17becf', '#393b79', '#637939',
  ]
  return colors
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

  const palette = usePalette()

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`${API_BASE}/cycles?base=${base}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json: CyclesResponse = await res.json()
        setData(json)
        setActive({}) // reset selection when base changes
      } catch (e: any) {
        setError(e.message || 'Fetch error')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [base])

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
          max={64}
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
        {/* 新增：坐标文字开关 */}
        <label style={{ marginLeft: 8 }}>
          <input
            type="checkbox"
            checked={showLabels}
            onChange={(e) => setShowLabels(e.target.checked)}
            style={{ marginRight: 6 }}
          />
          显示坐标文字
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
            <h3 style={{ marginBottom: 8 }}>二维表格（显示坐标文字）</h3>
            <div style={{ flex: 1, minHeight: 0 }}>
              {/* 传入新属性 showLabels */}
              <Grid base={data.base} cells={grid.cells} showLabels={showLabels} />
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
}: {
  base: number;
  cells: Record<string, { label: string; color: string }[]>;
  showLabels: boolean;
}) {
  // 容器尺寸监听
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });

  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0].contentRect;
      setBox({ w: cr.width, h: cr.height });
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  // 计算单元边长（像素），保证网格是正方形且不溢出容器
  const cellPx = useMemo(() => {
    if (!base || box.w === 0 || box.h === 0) return 0;
    const side = Math.min(box.w, box.h);            // 正方形区域边长
    return Math.max(6, Math.floor(side / base));    // 下限 6px，避免过小
  }, [base, box]);

  const gridSidePx = cellPx * base;
  const fontPx = Math.max(8, Math.floor(cellPx * 0.28)); // 字体随单元缩放

  // 预生成所有坐标键，避免 100x100 时反复拼 key
  const keys = useMemo(() => {
    const arr: string[] = [];
    for (let y = base - 1; y >= 0; y--) {
      for (let x = 0; x < base; x++) {
        arr.push(`${x},${y}`);
      }
    }
    return arr;
  }, [base]);

  return (
    <div ref={wrapRef} style={{ position:'relative', width:'100%', height:'100%', overflow:'auto',
      border:'1px solid #e5e5e5', borderRadius:8, background:'#fff' }}>
      <div
        style={{
          width: gridSidePx,
          height: gridSidePx,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: `repeat(${base}, ${cellPx}px)`,
          gridTemplateRows: `repeat(${base}, ${cellPx}px)`,
          boxSizing: 'content-box',
        }}
      >
        {keys.map((key) => {
          const items = cells[key] || []
          const bgColor = items.length > 0 ? items[items.length - 1].color : 'white'
          return (
            <div
              key={key}
              style={{
                // 为了让颜色“充分填充”，去掉边框与 padding
                // 如需网格线，可把 border 打开为浅灰 1px
                border: '1px solid #eee',
                background: bgColor,
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                lineHeight: 1.1,
                fontSize: fontPx,
                color: 'black',
                userSelect: 'none',
              }}
              title={showLabels ? key : undefined}
            >
              {showLabels && items.length > 0 ? `(${key})` : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}