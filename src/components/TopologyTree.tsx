import { useState } from 'react'
import './TopologyTree.css'

// ─── Icons ────────────────────────────────────────────────────────────────────

const TYPE_ICON: Record<string, string> = {
  USBController: '🔌',
  USBHub:        '🔗',
  DiskDrive:     '💾',
  ImageDevice:   '📷',
  Keyboard:      '⌨️',
  Mouse:         '🖱️',
  AudioEndpoint: '🎧',
  HIDClass:      '🕹️',
}

const TIER_COLOR: Record<string, string> = {
  HIGH:   'tier-high',
  MEDIUM: 'tier-medium',
  LOW:    'tier-low',
}

const STATUS_BADGE: Record<string, { icon: string; className: string }> = {
  NORMAL:     { icon: '✅ NORMAL', className: 'status-normal' },
  LIMITED:    { icon: '⚠️ LIMITED', className: 'status-limited' },
  WARNING:    { icon: '❌ WARNING', className: 'status-bottleneck' },
}

// ─── Single Node ──────────────────────────────────────────────────────────────

function formatSpeed(mbps: number) {
  if (mbps === 1.5) return 'USB 1.0 (1.5 Mbps)'
  if (mbps === 12) return 'USB 1.1 (12 Mbps)'
  if (mbps === 480) return 'USB 2.0 (480 Mbps)'
  if (mbps === 5000) return 'USB 3.2 Gen 1 (5 Gbps)'
  if (mbps === 10000) return 'USB 3.2 Gen 2 (10 Gbps)'
  if (mbps === 20000) return 'USB 3.2 Gen 2x2 (20 Gbps)'
  if (mbps === 40000) return 'USB4 (40 Gbps)'
  if (mbps >= 1000) return `${(mbps / 1000).toFixed(0)} Gbps`
  return `${mbps} Mbps`
}

function TreeNode({
  node,
  warningIds,
  depth = 0,
}: {
  node: any
  warningIds: Set<string>
  depth?: number
}) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = node.children && node.children.length > 0
  const isLeaf = !hasChildren
  const isWarned = warningIds.has(node.instanceId)
  const icon = TYPE_ICON[node.type] || '📦'

  return (
    <div className={`tn-node depth-${Math.min(depth, 4)}`}>
      <div
        className={`tn-row ${isWarned ? 'tn-warned' : ''} ${isLeaf ? 'tn-leaf' : ''}`}
        onClick={() => hasChildren && setExpanded(e => !e)}
        title={node.instanceId}
      >
        {/* Expand toggle */}
        <span className="tn-toggle">
          {hasChildren ? (expanded ? '▾' : '▸') : '·'}
        </span>

        {/* Icon */}
        <span className="tn-icon">{icon}</span>

        {/* Name */}
        <span className="tn-name">{node.name || 'Unknown Device'}</span>

        {/* Badges */}
        <div className="tn-badges">
          {node.tier && (
            <span className={`tn-badge ${TIER_COLOR[node.tier]}`}>
              {node.tier}
            </span>
          )}
          {node.viaHub && (
            <span className="tn-badge tier-hub" title="Connected via USB hub">
              HUB
            </span>
          )}
          {node.status && STATUS_BADGE[node.status] && (
            <span
              className={`tn-badge ${STATUS_BADGE[node.status].className}`}
              title={node.statusMessage}
            >
              {STATUS_BADGE[node.status].icon}
            </span>
          )}
          {node.speedMbps && (
            <span className="tn-speed">
              {formatSpeed(node.speedMbps)}
            </span>
          )}
        </div>
      </div>

      {hasChildren && expanded && (
        <div className="tn-children">
          {node.children.map((child: any) => (
            <TreeNode
              key={child.instanceId}
              node={child}
              warningIds={warningIds}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  tree: any[]
  warnings: any[]
}

export default function TopologyTree({ tree, warnings }: Props) {
  // Build a set of all instanceIds that appear in any warning
  const warningIds = new Set<string>(warnings.flatMap((w: any) => w.affectedIds))

  return (
    <div className="tt-container">
      <div className="tt-header">
        <h2 className="tt-title">
          <span>🗂️</span> USB Topology
        </h2>
        <span className="tt-hint">Click a row to expand/collapse</span>
      </div>
      <div className="tt-tree">
        {tree.length === 0 ? (
          <p className="tt-empty">No USB topology data available.</p>
        ) : (
          tree.map((node: any) => (
            <TreeNode key={node.instanceId} node={node} warningIds={warningIds} />
          ))
        )}
      </div>
    </div>
  )
}
