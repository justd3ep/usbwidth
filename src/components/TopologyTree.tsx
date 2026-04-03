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

const TIER_LABEL: Record<string, string> = {
  HIGH:   'High Performance Device',
  MEDIUM: 'Moderate Usage',
  LOW:    'Low Impact',
}

const TIER_TOOLTIP: Record<string, string> = {
  HIGH:   'Requires a fast connection to work properly. Needs to be plugged directly into your fastest port to avoid bottlenecks.',
  MEDIUM: 'Transfers moderate amounts of data. Generally fine on any port, but prefers higher speeds if available.',
  LOW:    'Uses very little data. Works perfectly on any standard USB port without causing slowdowns.',
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

function getContextTooltip(node: any) {
  if (node.tier === 'LOW') return 'This device uses minimal bandwidth and works normally on a standard port.';
  if (node.tier === 'HIGH' && node.speedMbps && node.speedMbps <= 480) return 'This device may benefit from a higher-speed connection.';
  if (node.tier === 'HIGH' && node.viaHub) return 'Performance is currently shared with other heavily used devices.';
  return null;
}

function getSpeedTooltip(mbps: number) {
  if (mbps <= 480) return 'Standard connection. Best used for low-bandwidth devices like keyboards, mice, and basic webcams.';
  if (mbps <= 20000) return 'High-speed connection. Ideal for external drives, modern cameras, and capture cards.';
  return 'Ultra high-speed port for demanding devices like multiple monitors or fast SSDs.';
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
  
  const displayName = node.name === 'USB Controller' || node.type === 'USBController' 
    ? 'USB System (Internal)' : node.name || 'Unknown Device';
  
  const contextText = getContextTooltip(node);

  return (
    <div className={`tn-node depth-${Math.min(depth, 4)}`}>
      <div
        className={`tn-row ${isWarned ? 'tn-warned' : ''} ${isLeaf ? 'tn-leaf' : ''}`}
        onClick={() => hasChildren && setExpanded(e => !e)}
        title={node.type === 'USBController' ? 'The built-in circuitry of your computer.' : node.instanceId}
      >
        {/* Column 1: Device (with dynamic indent) */}
        <div className="tn-col tn-col-device" style={{ paddingLeft: `${depth * 1.5 + 0.5}rem` }}>
          <span className="tn-toggle">
            {hasChildren ? (expanded ? '▾' : '▸') : '·'}
          </span>
          <span className="tn-icon">{icon}</span>
          <div className="tn-name-container">
            <span className="tn-name" title={displayName}>{displayName}</span>
            {contextText && <span className="tn-context" title={contextText}>{contextText}</span>}
          </div>
        </div>

        {/* Column 2: Speed */}
        <div className="tn-col tn-col-speed">
          {node.speedMbps ? (
            <span className="tn-speed" title={getSpeedTooltip(node.speedMbps)}>
              {formatSpeed(node.speedMbps)}
            </span>
          ) : <span className="tn-empty">-</span>}
        </div>

        {/* Column 3: Usage (Tier) */}
        <div className="tn-col tn-col-usage">
          {node.tier ? (
            <span className={`tn-badge ${TIER_COLOR[node.tier]}`} title={TIER_TOOLTIP[node.tier]}>
              {TIER_LABEL[node.tier]}
            </span>
          ) : <span className="tn-empty">-</span>}
        </div>

        {/* Column 4: Status */}
        <div className="tn-col tn-col-status">
          {node.status && STATUS_BADGE[node.status] ? (
            <span
              className={`tn-badge ${STATUS_BADGE[node.status].className}`}
              title={node.statusMessage}
            >
              {STATUS_BADGE[node.status].icon}
            </span>
          ) : <span className="tn-empty">-</span>}
        </div>

        {/* Column 5: Bottleneck / Inline Summary */}
        <div className="tn-col tn-col-bottleneck">
          {node.status !== 'NORMAL' && node.statusMessage ? (
            <span className={`tn-summary ${node.status === 'WARNING' ? 'summary-red' : 'summary-yellow'}`} title={node.statusMessage}>
              {node.statusMessage}
            </span>
          ) : node.viaHub ? (
            <span className="tn-summary summary-yellow">Connected via hub</span>
          ) : (
            <span className="tn-empty-muted">Optimized</span>
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
          <span>🗂️</span> USB Devices &amp; Setup
        </h2>
        <span className="tt-hint">Click a row to expand/collapse</span>
      </div>

      <div className="tt-table-header">
        <div className="tt-col-label">Device</div>
        <div className="tt-col-label">Speed</div>
        <div className="tt-col-label">Usage</div>
        <div className="tt-col-label">Status</div>
        <div className="tt-col-label">Bottleneck Source</div>
      </div>

      <div className="tt-tree-scroll-wrapper">
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
    </div>
  )
}
