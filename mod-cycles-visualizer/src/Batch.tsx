import { useEffect, useMemo, useState } from "react";
import type { EncodedData, EncodedEntry } from "./types";
import App from "./App";
const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:8000';

function lcm(a: number, b: number) {
  const gcd = (x: number, y: number): number => (y === 0 ? x : gcd(y, x % y));
  return (a * b) / gcd(a, b);
}
function rotateSeq(seq: number[], offset: number) {
  const n = seq.length;
  if (n === 0) return [];
  const k = ((offset % n) + n) % n;
  return seq.slice(k).concat(seq.slice(0, k));
}
function repeatToLength(seq: number[], L: number) {
  if (seq.length === 0) return [];
  const out: number[] = new Array(L);
  for (let i = 0; i < L; i++) out[i] = seq[i % seq.length];
  return out;
}
function findMatch(result: number[], all: EncodedEntry[]): EncodedEntry | null {
  for (const ent of all) {
    const s = ent.sequence;
    const sLen = s.length;
    if (sLen === 0) continue;
    if (result.length % sLen !== 0) continue;
    outer: for (let r0 = 0; r0 < sLen; r0++) {
      for (let i = 0; i < result.length; i++) {
        if (result[i] !== s[(i + r0) % sLen]) continue outer;
      }
      return ent;
    }
  }
  return null;
}

export default function Batch({ onHighlightAdd }: { onHighlightAdd?: (base: number, seqs: number[][]) => void } = {}) {
  const [base, setBase] = useState<number>(47);
  const [data, setData] = useState<EncodedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [opA, setOpA] = useState<EncodedEntry | null>(null);
  const [opB, setOpB] = useState<EncodedEntry | null>(null);
  const [phaseA, setPhaseA] = useState<number>(0);
  const [batchStart, setBatchStart] = useState<number>(0);
  const [batchEnd, setBatchEnd] = useState<number>(0);
  const [rows, setRows] = useState<{ offset: number; l: number; addId: string; subId: string }[]>([]);
  const [vizTargets, setVizTargets] = useState<number[][]>([]);
  const [vizToken, setVizToken] = useState<number>(0);
  const [tableExpanded, setTableExpanded] = useState<boolean>(false);
  const [useSubForViz, setUseSubForViz] = useState<boolean>(false);
  const [vizSelectMode, setVizSelectMode] = useState<'add' | 'sub' | 'both'>('add');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      setData(null);
      try {
        const url = `/results/cycles_m${base}_encoded.json`;
        let ok = false;
        try {
          const res = await fetch(url, { cache: "no-store" });
          if (res.ok && (res.headers.get("content-type") || "").toLowerCase().includes("application/json")) {
            const json: EncodedData = await res.json();
            setData(json);
            ok = true;
          }
        } catch {}
        if (!ok) {
          const api = `${API_BASE}/encoded?base=${base}&publish=true`;
          const res2 = await fetch(api);
          if (!res2.ok) throw new Error(`后端生成失败: HTTP ${res2.status}`);
          const json2: EncodedData = await res2.json();
          setData(json2);
        }
        setOpA(null);
        setOpB(null);
        setPhaseA(0);
        setBatchStart(0);
        setBatchEnd(0);
        setRows([]);
      } catch (e: any) {
        setError(e.message || "加载失败");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [base]);

  const entriesB = useMemo(() => {
    if (!data) return [] as EncodedEntry[];
    return Object.keys(data.B).sort((a, b) => {
      const ia = parseInt(a.split("_")[1], 10);
      const ib = parseInt(b.split("_")[1], 10);
      return ia - ib;
    }).map(k => data.B[k]);
  }, [data]);
  const entriesE = useMemo(() => {
    if (!data) return [] as EncodedEntry[];
    return Object.keys(data.E).sort((a, b) => {
      const ia = parseInt(a.split("_")[1], 10);
      const ib = parseInt(b.split("_")[1], 10);
      return ia - ib;
    }).map(k => data.E[k]);
  }, [data]);
  const allEntries = useMemo(() => {
    const arr: EncodedEntry[] = [];
    if (data?.A?.A_0) arr.push({ ...data.A.A_0, id: "A_0" });
    arr.push(...entriesB);
    arr.push(...entriesE);
    return arr;
  }, [data, entriesB, entriesE]);

  const onDragStart = (ent: EncodedEntry) => (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", JSON.stringify(ent));
  };
  const onDropA = (e: React.DragEvent) => {
    e.preventDefault();
    try {
      const ent = JSON.parse(e.dataTransfer.getData("text/plain")) as EncodedEntry;
      setOpA(ent);
      setPhaseA(0);
      setRows([]);
    } catch {}
  };
  const onDropB = (e: React.DragEvent) => {
    e.preventDefault();
    try {
      const ent = JSON.parse(e.dataTransfer.getData("text/plain")) as EncodedEntry;
      setOpB(ent);
      setRows([]);
      setBatchStart(0);
      setBatchEnd(Math.max(0, ent.length - 1));
    } catch {}
  };
  const onDragOver: React.DragEventHandler = (e) => e.preventDefault();

  const canCompute = data && opA && opB;

  const onComputeBatch = () => {
    if (!data || !opA || !opB) return;
    const aRot = rotateSeq(opA.sequence, phaseA);
    const s = Math.max(0, Math.min(batchStart, opB.length - 1));
    const e = Math.max(0, Math.min(batchEnd, opB.length - 1));
    const start = Math.min(s, e);
    const end = Math.max(s, e);
    const out: { offset: number; l: number; addId: string; subId: string }[] = [];
    for (let off = start; off <= end; off++) {
      const bRot = rotateSeq(opB.sequence, off);
      const L = lcm(aRot.length, bRot.length);
      const la = repeatToLength(aRot, L);
      const rb = repeatToLength(bRot, L);
      const addRes = Array.from({ length: L }, (_, i) => (la[i] + rb[i]) % data.base);
      const subRes = Array.from({ length: L }, (_, i) => (la[i] - rb[i] + data.base) % data.base);
      const addId = findMatch(addRes, allEntries)?.id ?? "UNMATCHED";
      const subId = findMatch(subRes, allEntries)?.id ?? "UNMATCHED";
      out.push({ offset: off, l: L, addId, subId });
    }
    setRows(out);
  };

  useEffect(() => {
    if (!data || rows.length === 0) return;
    const ids = Array.from(new Set(rows.map(r => (useSubForViz ? r.subId : r.addId)).filter(id => id && id !== "UNMATCHED")));
    const seqs: number[][] = [];
    for (const id of ids) {
      const ent = id === "A_0" && data?.A?.A_0
        ? ({ ...data.A.A_0, id: "A_0" } as EncodedEntry)
        : (data?.B?.[id] ?? data?.E?.[id] ?? null);
      if (ent) seqs.push(ent.sequence);
    }
    setVizTargets(seqs);
    setVizToken(t => t + 1);
  }, [useSubForViz, rows, data]);

  const getEntryById = (id: string): EncodedEntry | null => {
    if (!data) return null;
    if (id === "A_0" && data.A?.A_0) return { ...data.A.A_0, id: "A_0" } as EncodedEntry;
    if (data.B[id]) return data.B[id];
    if (data.E[id]) return data.E[id];
    return null;
  };

  const onSelectInVisual = () => {
    if (!data) return;
    const ids = Array.from(new Set(rows.map(r => r.addId).filter(id => id && id !== "UNMATCHED")));
    const seqs: number[][] = [];
    for (const id of ids) {
      const ent = getEntryById(id);
      if (ent) seqs.push(ent.sequence);
    }
    if (seqs.length && onHighlightAdd) onHighlightAdd(base, seqs);
  };

  return (
    <div style={{ padding: 16 }}>
      <h1>批量运算（右操作数偏移区间）</h1>
      <p>
        选择模数 m：
        <input
          type="number"
          min={1}
          value={base}
          onChange={(e) => setBase(parseInt(e.target.value || "1", 10))}
          style={{ width: 100, marginLeft: 8 }}
        />
        <span style={{ marginLeft: 12, color: "#666" }}>
          从 /results/cycles_m{base}_encoded.json 加载
        </span>
      </p>
      {loading && <p>加载中…</p>}
      {error && <p style={{ color: "crimson" }}>{error}</p>}

      {data && (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(300px, 360px) minmax(340px, 480px) 1fr", gap: 16, alignItems: "stretch", height: "100%", minHeight: 0 }}>
          <div>
            <h3>B 组</h3>
            <div style={{ maxHeight: 260, overflow: "auto", border: "1px solid #eee", borderRadius: 8, padding: 8 }}>
              {entriesB.map((ent, idx) => {
                const color = `hsl(${(idx * 137.508) % 360}, 65%, 50%)`
                return (
                <div
                  key={ent.id}
                  draggable
                  onDragStart={onDragStart(ent)}
                  style={{
                    padding: "6px 8px",
                    border: "1px solid #ddd",
                    borderRadius: 8,
                    marginBottom: 6,
                    cursor: "grab",
                    background: "#fafafa",
                  }}
                  title={`[${ent.id}] 长度 ${ent.length} | 起点 (${ent.start[0]},${ent.start[1]})`}
                >
                  <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>
                    {ent.id}： （{ent.type}数列）
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                      <span style={{ display: "inline-block", width: 12, height: 12, background: color, borderRadius: 3 }} />
                      <span style={{ flex: 1, marginLeft: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        [{ent.sequence.join(", ")}]
                      </span>
                    </span>
                    <span style={{
                      fontSize: 12,
                      padding: "2px 6px",
                      borderRadius: 8,
                      border: `1px solid ${color}`,
                      color,
                      whiteSpace: "nowrap"
                    }}>
                      长度 {ent.length}
                    </span>
                  </div>
                </div>
                )
              })}
            </div>

            <h3 style={{ marginTop: 16 }}>E 组</h3>
            <div style={{ maxHeight: 260, overflow: "auto", border: "1px solid #eee", borderRadius: 8, padding: 8 }}>
              {entriesE.map((ent, idx) => {
                const color = `hsl(${(idx * 137.508) % 360}, 65%, 50%)`
                return (
                <div
                  key={ent.id}
                  draggable
                  onDragStart={onDragStart(ent)}
                  style={{
                    padding: "6px 8px",
                    border: "1px solid #ddd",
                    borderRadius: 8,
                    marginBottom: 6,
                    cursor: "grab",
                    background: "#fafafa",
                  }}
                  title={`[${ent.id}] 长度 ${ent.length} | 起点 (${ent.start[0]},${ent.start[1]})`}
                >
                  <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>
                    {ent.id}： （{ent.type}数列）
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                      <span style={{ display: "inline-block", width: 12, height: 12, background: color, borderRadius: 3 }} />
                      <span style={{ flex: 1, marginLeft: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        [{ent.sequence.join(", ")}]
                      </span>
                    </span>
                    <span style={{
                      fontSize: 12,
                      padding: "2px 6px",
                      borderRadius: 8,
                      border: `1px solid ${color}`,
                      color,
                      whiteSpace: "nowrap"
                    }}>
                      长度 {ent.length}
                    </span>
                  </div>
                </div>
                )
              })}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", minHeight: 0, height: "100%", overflow: "auto", maxWidth: 520 }}>
            <h3>设置与计算</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div
                onDrop={onDropA}
                onDragOver={onDragOver}
                style={{ border: "2px dashed #bbb", borderRadius: 10, padding: 12, minHeight: 80, width: "100%" }}
                title="拖拽一个序列到此处作为左操作数"
              >
                <div style={{ fontWeight: 600, marginBottom: 8 }}>操作数 A</div>
                {opA ? (
                  <div>
                    <div style={{ marginBottom: 6 }}>
                      <span style={{ padding: "2px 6px", border: "1px solid #ccc", borderRadius: 6 }}>
                        {opA.id}（长度 {opA.length}）
                      </span>
                    </div>
                    <label>
                      左相位偏移：
                      <input
                        type="number"
                        min={0}
                        max={Math.max(0, opA.length - 1)}
                        value={phaseA}
                        onChange={(e) => setPhaseA(parseInt(e.target.value || "0", 10))}
                        style={{ width: 100, marginLeft: 6 }}
                      />
                    </label>
                  </div>
                ) : (
                  <div style={{ color: "#777" }}>将 B_i 或 E_i 拖到这里</div>
                )}
              </div>

              <div
                onDrop={onDropB}
                onDragOver={onDragOver}
                style={{ border: "2px dashed #bbb", borderRadius: 10, padding: 12, minHeight: 80, width: "100%" }}
                title="拖拽一个序列到此处作为右操作数"
              >
                <div style={{ fontWeight: 600, marginBottom: 8 }}>操作数 B</div>
                {opB ? (
                  <div>
                    <div style={{ marginBottom: 6 }}>
                      <span style={{ padding: "2px 6px", border: "1px solid #ccc", borderRadius: 6 }}>
                        {opB.id}（长度 {opB.length}）
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                      <label>
                        起始偏移：
                        <input
                          type="number"
                          value={batchStart}
                          onChange={(e) => setBatchStart(parseInt(e.target.value || "0", 10))}
                          style={{ width: 100, marginLeft: 6 }}
                        />
                      </label>
                      <label>
                        结束偏移：
                        <input
                          type="number"
                          value={batchEnd}
                          onChange={(e) => setBatchEnd(parseInt(e.target.value || "0", 10))}
                          style={{ width: 100, marginLeft: 6 }}
                        />
                      </label>
                    </div>
                  </div>
                ) : (
                  <div style={{ color: "#777" }}>将 B_i 或 E_i 拖到这里</div>
                )}
              </div>
            </div>

            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <button
                onClick={onComputeBatch}
                disabled={!(data && opA && opB)}
                style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #aaa", background: "#f9f9f9" }}
              >
                计算批量
              </button>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <input
                  type="checkbox"
                  checked={useSubForViz}
                  onChange={(e) => setUseSubForViz(e.target.checked)}
                />
                右侧可视化选中减法匹配
              </label>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                可视化选中
                <select
                  value={vizSelectMode}
                  onChange={(e) => setVizSelectMode(e.target.value as any)}
                  style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #aaa" }}
                >
                  <option value="add">加法匹配</option>
                  <option value="sub">减法匹配</option>
                  <option value="both">加法 + 减法</option>
                </select>
              </label>
              <button
                onClick={onSelectInVisual}
                disabled={rows.length === 0}
                style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #aaa", background: "#eef6ff" }}
              >
                按选择选中
              </button>
            </div>

            {rows.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ marginBottom: 8, display: "flex", gap: 8 }}>
                  <button
                    onClick={() => setTableExpanded(v => !v)}
                    style={{ padding: "4px 10px", borderRadius: 8, border: "1px solid #aaa", background: "#f9f9f9" }}
                  >
                    {tableExpanded ? "限制高度滚动" : "展开表格"}
                  </button>
                </div>
                <div style={tableExpanded ? { overflowX: "auto" } : { maxHeight: 260, overflow: "auto" }}>
                <table style={{ borderCollapse: "collapse", minWidth: 520 }}>
                  <thead>
                    <tr>
                      <th style={{ border: "1px solid #ddd", padding: "6px 8px" }}>偏移</th>
                      <th style={{ border: "1px solid #ddd", padding: "6px 8px" }}>LCM 长度</th>
                      <th style={{ border: "1px solid #ddd", padding: "6px 8px" }}>加法匹配</th>
                      <th style={{ border: "1px solid #ddd", padding: "6px 8px" }}>减法匹配</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(r => (
                      <tr key={r.offset}>
                        <td style={{ border: "1px solid #ddd", padding: "6px 8px" }}>{r.offset}</td>
                        <td style={{ border: "1px solid #ddd", padding: "6px 8px" }}>{r.l}</td>
                        <td style={{ border: "1px solid #ddd", padding: "6px 8px" }}>
                          {r.addId}{r.addId === "A_0" ? "（A 数列，全 0）" : ""}
                        </td>
                        <td style={{ border: "1px solid #ddd", padding: "6px 8px" }}>
                          {r.subId}{r.subId === "A_0" ? "（A 数列，全 0）" : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            )}
          </div>
          <div style={{ height: "100%", minHeight: 0, overflow: "auto" }}>
            <div style={{ minHeight: "100%" }}>
              <App requestedBase={base} highlightTargets={vizTargets} highlightToken={vizToken} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
