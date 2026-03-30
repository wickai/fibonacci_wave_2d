import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import Operate from './Operate'
import Batch from './Batch'
import './styles.css'

function Root() {
  const [tab, setTab] = useState<'visual' | 'operate' | 'batch'>('visual')
  const [visualReq, setVisualReq] = useState<{ base: number; targets: number[][]; token: number } | null>(null)
  return (
    <React.StrictMode>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <div style={{ display: 'flex', gap: 8, padding: 12, borderBottom: '1px solid #eee' }}>
          <button
            onClick={() => setTab('visual')}
            style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #aaa', background: tab === 'visual' ? '#eef6ff' : '#fff' }}
          >
            可视化
          </button>
          <button
            onClick={() => setTab('operate')}
            style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #aaa', background: tab === 'operate' ? '#eef6ff' : '#fff' }}
          >
            运算
          </button>
          <button
            onClick={() => setTab('batch')}
            style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #aaa', background: tab === 'batch' ? '#eef6ff' : '#fff' }}
          >
            批量
          </button>
          <div style={{ marginLeft: 'auto', color: '#666', alignSelf: 'center' }}>
            {'将 JSON 放到 /public/results/cycles_m{m}_encoded.json'}
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'auto' }}>
          {tab === 'visual' ? (
            <App
              requestedBase={visualReq?.base}
              highlightTargets={visualReq?.targets}
              highlightToken={visualReq?.token}
            />
          ) : (
            tab === 'operate' ? <Operate /> : <Batch onHighlightAdd={(base, seqs) => {
              setVisualReq(prev => ({ base, targets: seqs, token: (prev?.token ?? 0) + 1 }))
              setTab('visual')
            }} />
          )}
        </div>
      </div>
    </React.StrictMode>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(<Root />)
