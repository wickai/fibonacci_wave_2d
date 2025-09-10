import { useEffect, useMemo, useState } from 'react'
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
      </p>

      {loading && <p>Loading…</p>}
      {error && <p style={{ color: 'crimson' }}>Error: {error}</p>}

      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>
          <div>
            <h3>数列（点击切换显示）</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 480, overflow: 'auto' }}>
              {data.sequences.map((seq, idx) => {
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
                    }}
                    title={`颜色: ${color}`}
                  >
                    <span style={{ display: 'inline-block', width: 12, height: 12, background: color, borderRadius: 3, marginRight: 8 }} />
                    [{seq.join(', ')}]
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <h3>二维表格（显示坐标文字）</h3>
            <Grid base={data.base} cells={grid.cells} />
          </div>
        </div>
      )}
    </div>
  )
}

function Grid({ base, cells }: { base: number; cells: Record<string, { label: string; color: string }[]> }) {
  const size = base
  const rows = []
  for (let y = size - 1; y >= 0; y--) { // top row is highest y for visual clarity
    const cols = []
    for (let x = 0; x < size; x++) {
      const key = `${x},${y}`
      const items = cells[key] || []
      cols.push(
        <td key={key} style={{ width: 56, height: 48, border: '1px solid #ddd', verticalAlign: 'top', padding: 4, fontSize: 12 }}>
          {items.map((it, i) => (
            <div key={i} style={{ color: it.color, lineHeight: 1.2 }}>{it.label}</div>
          ))}
        </td>
      )
    }
    rows.push(<tr key={y}>{cols}</tr>)
  }

  return (
    <div style={{ overflow: 'auto' }}>
      <table style={{ borderCollapse: 'collapse' }}>
        <tbody>{rows}</tbody>
      </table>
      <p style={{ marginTop: 8, color: '#555' }}>坐标 (x,y) 由数列相邻元素组成，并包含环回（最后一个与第一个）。</p>
    </div>
  )
}