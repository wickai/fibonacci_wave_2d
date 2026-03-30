import { useEffect, useMemo, useState } from "react";
import App from "./App";
import type { EncodedData } from "./types";

type Cell = {
  ids: string[];
  dom: 'A' | 'B' | 'E' | 'U';
  frac: number;
  unique: number;
  byType: { A: number; B: number; E: number; U: number };
  total: number;
  uniqE: number;
  uniqB: number;
};

const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:8000';

function parseCsv(text: string) {
  const lines = text.trim().split(/\r?\n/);
  const header = lines[0].split(',');
  const eKeys = header.slice(1);
  const rows = lines.slice(1).map(line => {
    // 不做复杂 CSV 转义，生成文件不含逗号与引号
    const parts = line.split(',');
    const b = parts[0];
    const cells = parts.slice(1).map(s => (s ? s.split('|') : []));
    return { b, cells };
  });
  return { eKeys, rows };
}

export default function Matrix() {
  const [base, setBase] = useState<number>(47);
  const [csvText, setCsvText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'dom' | 'unique' | 'uniqE' | 'uniqB'>('dom'); // 可视化模式：主导/E-B唯一覆盖
  const [op, setOp] = useState<'add' | 'sub'>('add');
  const [leftGroup, setLeftGroup] = useState<'B' | 'E'>('B');
  const [rightGroup, setRightGroup] = useState<'B' | 'E'>('E');
  const [encoded, setEncoded] = useState<EncodedData | null>(null);
  const [encodedErr, setEncodedErr] = useState<string | null>(null);
  const [vizTargets, setVizTargets] = useState<number[][]>([]);
  const [vizToken, setVizToken] = useState<number>(0);
  const [showUniqCounters, setShowUniqCounters] = useState<boolean>(false);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      setCsvText(null);
      const baseUrl = `/results/matrix_${leftGroup}x${rightGroup}_${op}_m${base}.csv`;
      const tryFetch = async (attempts: number, delayMs: number) => {
        for (let i = 0; i < attempts; i++) {
          const url = `${baseUrl}?t=${Date.now()}`;
          try {
            const res = await fetch(url, { cache: 'no-store' });
            if (res.ok) {
              const ct = (res.headers.get('content-type') || '').toLowerCase();
              if (ct.includes('text/csv') || ct.includes('text/plain') || ct.includes('application/octet-stream')) {
                const text = await res.text();
                if (!text.toLowerCase().includes('<!doctype html')) return text;
              }
            }
          } catch {}
          await new Promise(r => setTimeout(r, delayMs));
        }
        throw new Error('CSV 不可用');
      };
      let ok = false;
      try {
        const text = await tryFetch(1, 0);
        setCsvText(text);
        ok = true;
      } catch {}
      if (!ok) {
        try {
          let api = `${API_BASE}/matrix?base=${base}&left=${leftGroup}&right=${rightGroup}&op=${op}&publish=true`;
          let r2 = await fetch(api);
          if (!r2.ok) {
            if (op === 'add' && leftGroup === 'B' && rightGroup === 'E') {
              api = `${API_BASE}/matrix_be_add?base=${base}&publish=true`;
              r2 = await fetch(api);
            }
          }
          if (!r2.ok) throw new Error(`后端生成失败: HTTP ${r2.status}`);
          const text = await tryFetch(10, 200);
          setCsvText(text);
        } catch (e: any) {
          setError(e.message || '加载失败');
        }
      }
      setLoading(false);
    };
    run();
  }, [base, op, leftGroup, rightGroup]);

  // 加载编码 JSON（用于 id → 序列 映射）
  useEffect(() => {
    const loadEncoded = async () => {
      setEncoded(null);
      setEncodedErr(null);
      try {
        const url = `/results/cycles_m${base}_encoded.json`;
        let ok = false;
        try {
          const res = await fetch(url, { cache: "no-store" });
          if (res.ok && (res.headers.get("content-type") || "").toLowerCase().includes("application/json")) {
            const json: EncodedData = await res.json();
            setEncoded(json);
            ok = true;
          }
        } catch {}
        if (!ok) {
          const api = `${API_BASE}/encoded?base=${base}&publish=true`;
          const r2 = await fetch(api);
          if (!r2.ok) throw new Error(`后端生成失败: HTTP ${r2.status}`);
          const res = await fetch(url, { cache: "no-store" });
          if (!res.ok) throw new Error(`生成后读取失败: ${res.status}`);
          const json: EncodedData = await res.json();
          setEncoded(json);
        }
      } catch (e: any) {
        setEncodedErr(e.message || "编码JSON加载失败");
      }
    };
    loadEncoded();
  }, [base]);

  const parsed = useMemo(() => {
    if (!csvText) return null;
    try {
      return parseCsv(csvText);
    } catch (e) {
      setError('CSV 解析失败');
      return null;
    }
  }, [csvText]);

  const cells = useMemo(() => {
    if (!parsed) return null as null | { bKeys: string[]; eKeys: string[]; grid: Cell[][] };
    const bKeys = parsed.rows.map(r => r.b);
    const eKeys = parsed.eKeys;
    const grid: Cell[][] = parsed.rows.map(r => {
      return r.cells.map(ids => {
        const counts: Record<string, number> = {};
        ids.forEach(id => { counts[id] = (counts[id] || 0) + 1 });
        const total = ids.length || 1;
        const uniqE = new Set(ids.filter(id => id.startsWith('E_'))).size;
        const uniqB = new Set(ids.filter(id => id.startsWith('B_'))).size;
        const byType: Cell['byType'] = { A: 0, B: 0, E: 0, U: 0 };
        Object.entries(counts).forEach(([k, v]) => {
          if (k === 'A_0') byType.A += v;
          else if (k.startsWith('B_')) byType.B += v;
          else if (k.startsWith('E_')) byType.E += v;
          else byType.U += v;
        });
        // 主导类别按类型聚合后比较
        let domType: Cell['dom'] = 'U';
        let domCnt = byType.U;
        if (byType.A >= domCnt) { domType = 'A'; domCnt = byType.A; }
        if (byType.B >= domCnt) { domType = 'B'; domCnt = byType.B; }
        if (byType.E >= domCnt) { domType = 'E'; domCnt = byType.E; }
        return {
          ids,
          dom: domType,
          frac: domCnt / total,
          unique: Object.keys(counts).length,
          byType,
          total,
          uniqE,
          uniqB
        };
      });
    });
    return { bKeys, eKeys, grid };
  }, [parsed]);

  const globalTotals = useMemo(() => {
    if (!parsed) return { totalE: 1, totalB: 1 };
    const setE = new Set<string>();
    const setB = new Set<string>();
    parsed.rows.forEach(r => {
      r.cells.forEach(ids => {
        ids.forEach(id => {
          if (id.startsWith('E_')) setE.add(id);
          else if (id.startsWith('B_')) setB.add(id);
        });
      });
    });
    const totalE = Math.max(1, setE.size);
    const totalB = Math.max(1, setB.size);
    return { totalE, totalB };
  }, [parsed]);

  // 统计全局 E/B 比例的极值用于拉伸对比度
  const ebRange = useMemo(() => {
    if (!cells) return { min: 0, max: 1 };
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    let seen = false;
    cells.grid.forEach(row => row.forEach(c => {
      const eb = c.byType.B + c.byType.E;
      if (eb > 0) {
        const t = c.byType.B / eb;
        if (t < min) min = t;
        if (t > max) max = t;
        seen = true;
      }
    }));
    if (!seen || !(min < max)) return { min: 0, max: 1 };
    return { min, max };
  }, [cells]);

  // 唯一覆盖率的全局极值（E 与 B 各自独立拉伸）
  const uniqERange = useMemo(() => {
    if (!cells) return { min: 0, max: 1 };
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    let seen = false;
    cells.grid.forEach(row => row.forEach(c => {
      const denom = globalTotals.totalE || 1;
      const raw = c.uniqE / denom;
      if (isFinite(raw)) {
        if (raw < min) min = raw;
        if (raw > max) max = raw;
        seen = true;
      }
    }));
    if (!seen || !(min < max)) return { min: 0, max: 1 };
    return { min, max };
  }, [cells, globalTotals]);

  const uniqBRange = useMemo(() => {
    if (!cells) return { min: 0, max: 1 };
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    let seen = false;
    cells.grid.forEach(row => row.forEach(c => {
      const denom = globalTotals.totalB || 1;
      const raw = c.uniqB / denom;
      if (isFinite(raw)) {
        if (raw < min) min = raw;
        if (raw > max) max = raw;
        seen = true;
      }
    }));
    if (!seen || !(min < max)) return { min: 0, max: 1 };
    return { min, max };
  }, [cells, globalTotals]);

  const colorFor = (c: Cell) => {
    if (mode === 'unique') {
      const d = Math.min(c.unique / 8, 1);
      return `rgba(80,80,80,${0.15 + 0.7 * d})`;
    }
    if (mode === 'uniqE') {
      const raw = Math.min(c.uniqE / (globalTotals.totalE || 1), 1);
      let t = (raw - uniqERange.min) / Math.max(uniqERange.max - uniqERange.min, 1e-9);
      t = Math.max(0, Math.min(1, t));
      const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);
      const r = lerp(255, 244, t);
      const g = lerp(255, 160, t);
      const b = lerp(255, 0, t);
      return `rgba(${r},${g},${b},0.9)`; // 白→橙
    }
    if (mode === 'uniqB') {
      const raw = Math.min(c.uniqB / (globalTotals.totalB || 1), 1);
      let t = (raw - uniqBRange.min) / Math.max(uniqBRange.max - uniqBRange.min, 1e-9);
      t = Math.max(0, Math.min(1, t));
      const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);
      const r = lerp(255, 66, t);
      const g = lerp(255, 133, t);
      const bb = lerp(255, 244, t);
      return `rgba(${r},${g},${bb},0.9)`; // 白→蓝
    }
    // E/B 渐变：黄色(=E) ↔ 蓝色(=B)，按 B 占比插值
    const eb = c.byType.B + c.byType.E;
    if (eb === 0) return 'rgba(180,180,180,0.25)';
    // 使用全局极值进行归一化，增强可视对比度
    const rawT = c.byType.B / eb; // 0 → 全E(黄), 1 → 全B(蓝)
    let t = (rawT - ebRange.min) / Math.max(ebRange.max - ebRange.min, 1e-9);
    t = Math.max(0, Math.min(1, t));
    const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);
    const r = lerp(244, 66, t);
    const g = lerp(160, 133, t);
    const b = lerp(0, 244, t);
    return `rgba(${r},${g},${b},0.9)`;
  };

  const getSeqById = (id: string): number[] | null => {
    if (!encoded) return null;
    if (id === "A_0" && encoded.A?.A_0) return encoded.A.A_0.sequence;
    if (encoded.B?.[id]) return encoded.B[id].sequence;
    if (encoded.E?.[id]) return encoded.E[id].sequence;
    return null;
  };

  return (
    <div style={{ padding: 16 }}>
      <h1>{leftGroup}×{rightGroup} 矩阵（{op === 'add' ? '加法' : '减法'}）</h1>
      <p>
        模数 m：
        <input
          type="number"
          min={1}
          value={base}
          onChange={(e) => setBase(parseInt(e.target.value || '1', 10))}
          style={{ width: 100, marginLeft: 8 }}
        />
        <label style={{ marginLeft: 16 }}>
          运算：
          <select value={op} onChange={(e) => setOp(e.target.value as any)} style={{ marginLeft: 6, padding: '4px 6px' }}>
            <option value="add">加法</option>
            <option value="sub">减法</option>
          </select>
        </label>
        <label style={{ marginLeft: 16 }}>
          左：
          <select value={leftGroup} onChange={(e) => setLeftGroup(e.target.value as any)} style={{ marginLeft: 6, padding: '4px 6px' }}>
            <option value="B">B 组</option>
            <option value="E">E 组</option>
          </select>
        </label>
        <label style={{ marginLeft: 8 }}>
          右：
          <select value={rightGroup} onChange={(e) => setRightGroup(e.target.value as any)} style={{ marginLeft: 6, padding: '4px 6px' }}>
            <option value="B">B 组</option>
            <option value="E">E 组</option>
          </select>
        </label>
        <span style={{ marginLeft: 12, color: '#666' }}>来源：/results/matrix_{leftGroup}x{rightGroup}_{op}_m{base}.csv（缺失则自动生成）</span>
      </p>

      {loading && <p>加载中…</p>}
      {error && <p style={{ color: 'crimson' }}>{error}</p>}

      {cells && (
        <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr 1fr', gap: 12, alignItems: 'stretch', height: 'calc(100vh - 180px)' }}>
          <div>
            <h3>分析</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                可视化模式
                <select value={mode} onChange={(e) => setMode(e.target.value as any)} style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #aaa' }}>
                  <option value="dom">按 E/B 渐变着色</option>
                  <option value="uniqE">E 唯一覆盖率</option>
                  <option value="uniqB">B 唯一覆盖率</option>
                  <option value="unique">结果唯一值个数</option>
                </select>
              </label>
              <div style={{ fontSize: 12, color: '#555' }}>
                - E/B 渐变：黄色代表 E 占比高，蓝色代表 B 占比高（全局对比度拉伸）<br />
                - E/B 唯一覆盖率：该格向量内去重后的 E/B 种类数占全体 E/B 的比例（白→橙/白→蓝）<br />
                - 若该格出现 A_0（全 0 序列），将以黑色边框标记<br />
                - 结果唯一值个数：该单元格不同 ID 的数量，越多越深
              </div>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                <input type="checkbox" checked={showUniqCounters} onChange={(e) => setShowUniqCounters(e.target.checked)} />
                在单元格内显示 E/B 唯一个数
              </label>
            </div>
          </div>

          <div style={{ overflow: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: `120px repeat(${cells.eKeys.length}, 36px)`, gap: 2, alignItems: 'center' }}>
              <div></div>
              {cells.eKeys.map(e => (
                <div key={e} style={{ fontSize: 12, textAlign: 'center', color: '#666' }}>{e}</div>
              ))}
              {cells.bKeys.map((b, r) => (
                <>
                  <div key={`${b}-label`} style={{ fontSize: 12, color: '#333' }}>{b}</div>
                  {cells.grid[r].map((cell, c) => (
                  <div
                      key={`${b}-${cells.eKeys[c]}`}
                  title={
                    (() => {
                      const lines: string[] = [];
                      lines.push(`${b} × ${cells.eKeys[c]}`);
                      if (mode === 'dom') {
                        const p = (x: number) => ((x / (cell.total || 1)) * 100).toFixed(0) + '%';
                        lines.push(`主导: ${cell.dom}  比例: ${(cell.frac * 100).toFixed(0)}%`);
                        lines.push(`A: ${cell.byType.A} (${p(cell.byType.A)})  B: ${cell.byType.B} (${p(cell.byType.B)})  E: ${cell.byType.E} (${p(cell.byType.E)})`);
                        if (cell.byType.U) lines.push(`U: ${cell.byType.U} (${p(cell.byType.U)})`);
                      } else if (mode === 'uniqE' || mode === 'uniqB') {
                        const eRatio = (cell.uniqE / (globalTotals.totalE || 1)) * 100;
                        const bRatio = (cell.uniqB / (globalTotals.totalB || 1)) * 100;
                        lines.push(`E 唯一覆盖: ${cell.uniqE}/${globalTotals.totalE} (${eRatio.toFixed(0)}%)`);
                        lines.push(`B 唯一覆盖: ${cell.uniqB}/${globalTotals.totalB} (${bRatio.toFixed(0)}%)`);
                      } else {
                        lines.push(`唯一: ${cell.unique}`);
                      }
                      lines.push(`[${cell.ids.join(', ')}]`);
                      return lines.join('\n');
                    })()
                  }
                  onClick={() => {
                    if (!encoded) return;
                    const idsUniq = Array.from(new Set(cell.ids.filter(id => id && id !== 'UNMATCHED')));
                    const seqs: number[][] = [];
                    idsUniq.forEach(id => {
                      const s = getSeqById(id);
                      if (s) seqs.push(s);
                    });
                    if (seqs.length) {
                      setVizTargets(seqs);
                      setVizToken(t => t + 1);
                    }
                  }}
                  style={{
                    width: 36,
                    height: 28,
                    background: colorFor(cell),
                    border: cell.byType.A > 0 ? '2px solid #000' : '1px solid #eee',
                    cursor: encoded ? 'pointer' : 'default',
                    position: 'relative'
                  }}
                    >
                      {showUniqCounters && (
                        <>
                          <span style={{ position: 'absolute', top: 2, left: 2, fontSize: 10, color: '#a66', textShadow: '0 1px 0 #fff', pointerEvents: 'none' }}>
                            E:{cell.uniqE}
                          </span>
                          <span style={{ position: 'absolute', bottom: 2, right: 2, fontSize: 10, color: '#06c', textShadow: '0 1px 0 #fff', pointerEvents: 'none' }}>
                            B:{cell.uniqB}
                          </span>
                        </>
                      )}
                    </div>
                  ))}
                </>
              ))}
            </div>
          </div>
          <div style={{ minHeight: 0, overflow: 'auto' }}>
            <div style={{ minHeight: '100%' }}>
              <App requestedBase={base} highlightTargets={vizTargets} highlightToken={vizToken} />
              {encodedErr && <p style={{ color: 'crimson', marginTop: 8 }}>编码数据加载失败：{encodedErr}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
