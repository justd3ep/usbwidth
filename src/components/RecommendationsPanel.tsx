import { useState } from 'react'
import type { UsbRecommendation } from '../types/usb'
import './RecommendationsPanel.css'

const PRIORITY_META: Record<string, { label: string; cls: string }> = {
  IMPORTANT: { label: 'Recommended', cls: 'pri-1' },
  OPTIONAL: { label: 'Optional', cls: 'pri-2' },
  INFO: { label: 'Info', cls: 'pri-3' },
}

interface Props {
  recommendations: UsbRecommendation[]
}

function RecCard({ rec }: { rec: UsbRecommendation }) {
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
        <h2 className="rp-title">Suggestions</h2>
        <span className="rp-count">{recommendations.length > 0 ? `${recommendations.length}` : '0'}</span>
      </div>

      <div className="rp-list">
        {recommendations.length === 0 ? (
          <div className="rp-empty">
            <h3>Nothing to improve</h3>
            <p>Your USB setup is working great. No configuration changes needed.</p>
          </div>
        ) : (
          recommendations.map(r => <RecCard key={r.id} rec={r} />)
        )}
      </div>
    </div>
  )
}
