import { useState } from 'react'
import './RecommendationsPanel.css'

const PRIORITY_META: Record<string, { label: string; cls: string }> = {
  IMPORTANT: { label: 'IMPORTANT', cls: 'pri-1' },
  OPTIONAL:  { label: 'OPTIONAL',  cls: 'pri-2' },
  INFO:      { label: 'INFO',      cls: 'pri-3' },
}

interface Recommendation {
  id: string
  priorityTag: 'IMPORTANT' | 'OPTIONAL' | 'INFO'
  title: string
  steps: string[]
}

interface Props {
  recommendations: Recommendation[]
}

function RecCard({ rec }: { rec: Recommendation }) {
  const [open, setOpen] = useState(rec.priorityTag === 'IMPORTANT' || rec.priorityTag === 'INFO')
  const meta = PRIORITY_META[rec.priorityTag] || PRIORITY_META.INFO

  return (
    <div className={`rc-card ${meta.cls}`}>
      <div className="rc-header" onClick={() => setOpen(o => !o)}>
        <span className={`rc-priority-badge ${meta.cls}`}>{meta.label}</span>
        <span className="rc-title">{rec.title}</span>
        <span className="rc-chevron">{open ? '▴' : '▾'}</span>
      </div>
      {open && (
        <ol className="rc-steps">
          {rec.steps.map((step, i) => (
            <li key={i} className="rc-step">{step}</li>
          ))}
        </ol>
      )}
    </div>
  )
}

export default function RecommendationsPanel({ recommendations }: Props) {
  return (
    <div className="rp-container">
      <div className="rp-header">
        <h2 className="rp-title"><span>💡</span> Recommendations</h2>
        <span className="rp-count">{recommendations.length} action{recommendations.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="rp-list">
        {recommendations.length === 0 ? (
          <div className="rp-empty" style={{ padding: '2rem 1rem', textAlign: 'center' }}>
            <span className="rp-empty-icon" style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.5rem' }}>🎉</span>
            <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-color)' }}>No Action Needed</h3>
            <p style={{ margin: 0, opacity: 0.8, lineHeight: 1.5 }}>Your devices are perfectly distributed for maximum bandwidth.</p>
          </div>
        ) : (
          recommendations.map(r => <RecCard key={r.id} rec={r} />)
        )}
      </div>
    </div>
  )
}
