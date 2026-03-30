import { useEffect, useMemo, useState } from "react";
import type { EncodedData, EncodedEntry } from "./types";
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
  // Try to find a sequence S and rotation r0 such that for all i: result[i] == S[(i+r0) % sLen]
  for (const ent of all) {
    const s = ent.sequence;
    const sLen = s.length;
    if (sLen === 0) continue;
    // Quick length compatibility check: result should be multiple of sLen
    if (result.length % sLen !== 0) continue;
    // Test all rotations
    outer: for (let r0 = 0; r0 < sLen; r0++) {
      for (let i = 0; i < result.length; i++) {
        if (result[i] !== s[(i + r0) % sLen]) {
          continue outer;
        }
      }
      return ent;
    }
  }
  return null;
}

export default function Operate() {
  const [base, setBase] = useState<number>(47);
  const [data, setData] = useState<EncodedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [opA, setOpA] = useState<EncodedEntry | null>(null);
  const [opB, setOpB] = useState<EncodedEntry | null>(null);
  const [phaseA, setPhaseA] = useState<number>(0);
  const [phaseB, setPhaseB] = useState<number>(0);

  const [resultAdd, setResultAdd] = useState<number[] | null>(null);
  const [matchedAdd, setMatchedAdd] = useState<EncodedEntry | null>(null);
  const [resultSub, setResultSub] = useState<number[] | null>(null);
  const [matchedSub, setMatchedSub] = useState<EncodedEntry | null>(null);
  const [viewer, setViewer] = useState<EncodedEntry | null>(null);

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
        setPhaseB(0);
        setResultAdd(null);
        setResultSub(null);
        setMatchedAdd(null);
        setMatchedSub(null);
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
    // 保持 B_i 按编号顺序
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
      setResultAdd(null);
      setResultSub(null);
      setMatchedAdd(null);
      setMatchedSub(null);
    } catch {}
  };
  const onDropB = (e: React.DragEvent) => {
    e.preventDefault();
    try {
      const ent = JSON.parse(e.dataTransfer.getData("text/plain")) as EncodedEntry;
      setOpB(ent);
      setPhaseB(0);
      setResultAdd(null);
      setResultSub(null);
      setMatchedAdd(null);
      setMatchedSub(null);
    } catch {}
  };
  const onDragOver: React.DragEventHandler = (e) => e.preventDefault();

  const canCompute = data && opA && opB;

  const onCompute = () => {
    if (!data || !opA || !opB) return;
    const aRot = rotateSeq(opA.sequence, phaseA);
    const bRot = rotateSeq(opB.sequence, phaseB);
    const L = lcm(aRot.length, bRot.length);
    const aRep = repeatToLength(aRot, L);
    const bRep = repeatToLength(bRot, L);
    const addRes: number[] = new Array(L);
    const subRes: number[] = new Array(L);
    for (let i = 0; i < L; i++) {
      addRes[i] = (aRep[i] + bRep[i]) % data.base;
      subRes[i] = (aRep[i] - bRep[i] + data.base) % data.base;
    }
    setResultAdd(addRes);
    setMatchedAdd(findMatch(addRes, allEntries));
    setResultSub(subRes);
    setMatchedSub(findMatch(subRes, allEntries));
  };

  const preview = (seq: number[], n = 20) => {
    const head = seq.slice(0, n);
    const tail = seq.length > n ? ", …" : "";
    return `[${head.join(", ")}${tail}]`;
  };

  const onComputeBatch = () => {};

  return (
    <div style={{ padding: 16 }}>
      <h1>序列运算（B_i / E_i 加减，含相位偏移）</h1>
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
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
          <div>
            <h3>B 组</h3>
            <div style={{ maxHeight: 260, overflow: "auto", border: "1px solid #eee", borderRadius: 8, padding: 8 }}>
              {entriesB.map((ent) => (
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
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <span>{ent.id}  长度 {ent.length}</span>
                    <button
                      draggable={false}
                      onClick={(e) => { e.stopPropagation(); setViewer(ent); }}
                      style={{ padding: "2px 6px", border: "1px solid #ccc", borderRadius: 6, background: "#fff", cursor: "pointer" }}
                    >
                      查看
                    </button>
                  </div>
                  <div style={{ fontFamily: "monospace", marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {preview(ent.sequence, 20)}
                  </div>
                </div>
              ))}
            </div>

            <h3 style={{ marginTop: 16 }}>E 组</h3>
            <div style={{ maxHeight: 260, overflow: "auto", border: "1px solid #eee", borderRadius: 8, padding: 8 }}>
              {entriesE.map((ent) => (
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
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <span>{ent.id}  长度 {ent.length}</span>
                    <button
                      draggable={false}
                      onClick={(e) => { e.stopPropagation(); setViewer(ent); }}
                      style={{ padding: "2px 6px", border: "1px solid #ccc", borderRadius: 6, background: "#fff", cursor: "pointer" }}
                    >
                      查看
                    </button>
                  </div>
                  <div style={{ fontFamily: "monospace", marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {preview(ent.sequence, 20)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3>运算区</h3>
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
                      <button onClick={() => { setOpA(null); setResultAdd(null); setResultSub(null); setMatchedAdd(null); setMatchedSub(null); }} style={{ marginLeft: 8 }}>
                        移除
                      </button>
                      <button onClick={() => setViewer(opA)} style={{ marginLeft: 8 }}>
                        查看完整数列
                      </button>
                    </div>
                    <div style={{ fontFamily: "monospace", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: 6 }}>
                      {preview(opA.sequence, 24)}
                    </div>
                    <label>
                      相位偏移：
                      <input
                        type="number"
                        min={0}
                        max={Math.max(0, opA.length - 1)}
                        value={phaseA}
                        onChange={(e) => setPhaseA(parseInt(e.target.value || "0", 10))}
                        style={{ width: 80, marginLeft: 6 }}
                      />
                    </label>
                  </div>
                ) : (
                  <div style={{ color: "#777" }}>将 B_i 或 E_i 拖到这里</div>
                )}
              </div>

              <div style={{ textAlign: "center", color: "#666" }}>计算加法与减法</div>

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
                      <button onClick={() => { setOpB(null); setResultAdd(null); setResultSub(null); setMatchedAdd(null); setMatchedSub(null); }} style={{ marginLeft: 8 }}>
                        移除
                      </button>
                      <button onClick={() => setViewer(opB)} style={{ marginLeft: 8 }}>
                        查看完整数列
                      </button>
                    </div>
                    <div style={{ fontFamily: "monospace", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: 6 }}>
                      {preview(opB.sequence, 24)}
                    </div>
                    <label>
                      相位偏移：
                      <input
                        type="number"
                        min={0}
                        max={Math.max(0, opB.length - 1)}
                        value={phaseB}
                        onChange={(e) => setPhaseB(parseInt(e.target.value || "0", 10))}
                        style={{ width: 80, marginLeft: 6 }}
                      />
                    </label>
                  </div>
                ) : (
                  <div style={{ color: "#777" }}>将 B_i 或 E_i 拖到这里</div>
                )}
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <button
                onClick={onCompute}
                disabled={!canCompute}
                style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #aaa", background: "#f9f9f9" }}
              >
                计算加法与减法
              </button>
            </div>

            {resultAdd && (
              <div style={{ marginTop: 16 }}>
                <h4>加法结果（长度 {resultAdd.length}）</h4>
                <div style={{ fontFamily: "monospace", whiteSpace: "nowrap", overflowX: "auto" }}>
                  [{resultAdd.join(", ")}]
                </div>
                <div style={{ marginTop: 8 }}>
                  {matchedAdd ? (
                    <span>
                      匹配到：<strong>{matchedAdd.id}</strong>
                      {matchedAdd.id === "A_0" ? "（A 数列，全 0）" : `（类型 ${matchedAdd.type}，长度 ${matchedAdd.length}）`}
                    </span>
                  ) : (
                    <span>未匹配到已知数列</span>
                  )}
                </div>
              </div>
            )}

            {resultSub && (
              <div style={{ marginTop: 16 }}>
                <h4>减法结果（长度 {resultSub.length}）</h4>
                <div style={{ fontFamily: "monospace", whiteSpace: "nowrap", overflowX: "auto" }}>
                  [{resultSub.join(", ")}]
                </div>
                <div style={{ marginTop: 8 }}>
                  {matchedSub ? (
                    <span>
                      匹配到：<strong>{matchedSub.id}</strong>
                      {matchedSub.id === "A_0" ? "（A 数列，全 0）" : `（类型 ${matchedSub.type}，长度 ${matchedSub.length}）`}
                    </span>
                  ) : (
                    <span>未匹配到已知数列</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {false}
      {viewer && (
        <div
          onClick={() => setViewer(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 10,
              width: "min(900px, 92vw)",
              maxHeight: "80vh",
              padding: 16,
              boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
              display: "flex",
              flexDirection: "column",
              gap: 12
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{viewer.id}（类型 {viewer.type}，长度 {viewer.length}）</div>
              <button onClick={() => setViewer(null)} style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #aaa" }}>
                关闭
              </button>
            </div>
            <div style={{ fontFamily: "monospace", whiteSpace: "pre-wrap", overflow: "auto", lineHeight: 1.4 }}>
              [{viewer.sequence.join(", ")}]
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
