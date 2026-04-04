import { useState } from 'react'
import './TopologyTree.css'

// ─── Icon Map ─────────────────────────────────────────────────────────────────

const TYPE_ICON: Record<string, string> = {
  USBController: '🔌',
  USBHub: '⬡',
  DiskDrive: '💾',
  ImageDevice: '📷',
  Keyboard: '⌨️',
  Mouse: '🖱️',
  AudioEndpoint: '🎧',
  HIDClass: '🕹️',
  Bluetooth: '⊙',
}

// ─── Display Data ────────────────────────────────────────────────────────────

const TIER_COLOR: Record<string, string> = {
  HIGH: 'tier-high',
  MEDIUM: 'tier-medium',
  LOW: 'tier-low',
}

const TIER_LABEL: Record<string, string> = {
  HIGH: 'High Bandwidth',
  MEDIUM: 'Standard Device',
  LOW: 'Low Bandwidth',
}

const TIER_TOOLTIP: Record<string, string> = {
  HIGH: 'High-bandwidth device — benefits from a direct USB 3.x connection for best transfer speeds (e.g. external SSD, capture card).',
  MEDIUM: 'Standard-bandwidth device — works well on any modern port. No special connection is required.',
  LOW: 'Low-bandwidth device — keyboards, mice, headphones, Bluetooth. Any USB port is more than sufficient for this device type.',
}

const STATUS_BADGE: Record<string, { icon: string; className: string }> = {
  ADEQUATE: { icon: 'Working as Expected', className: 'status-adequate' },
  NORMAL: { icon: 'Working as Expected', className: 'status-adequate' }, // legacy compat
  OPTIMAL: { icon: 'Running at Full Speed', className: 'status-optimal' }, // future use
  LIMITED: { icon: 'Performance Limited', className: 'status-limited' },
  WARNING: { icon: 'Needs Attention', className: 'status-bottleneck' },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatSpeed(mbps: number) {
  if (mbps === 1.5) return 'USB 1.0'
  if (mbps === 12) return 'USB 1.1'
  if (mbps === 480) return 'USB 2.0'
  if (mbps === 5000) return 'USB 3.0 (5 Gbps)'
  if (mbps === 10000) return 'USB 3.1 (10 Gbps)'
  if (mbps === 20000) return 'USB 3.2 (20 Gbps)'
  if (mbps === 40000) return 'USB4 / Thunderbolt'
  if (mbps >= 1000) return `${(mbps / 1000).toFixed(0)} Gbps`
  return `${mbps} Mbps`
}

function getSpeedTooltip(mbps: number) {
  if (mbps <= 12) return 'USB 1.1 Full Speed — Optimised for input devices and audio. More than adequate for keyboards, mice, and headphones.'
  if (mbps <= 480) return 'USB 2.0 Hi-Speed — Standard speed. Works great for audio, webcams, and most everyday devices. Expected and normal.'
  if (mbps <= 5000) return 'USB 3.0 — Fast connection. Ideal for external storage drives and cameras.'
  if (mbps <= 20000) return 'USB 3.1/3.2 — Very fast. Handles demanding devices like fast SSDs and capture cards.'
  return 'USB4 / Thunderbolt — Ultra-fast connection for the most demanding devices.'
}

function flattenDescendants(nodes: any[]): any[] {
  return nodes.flatMap((n: any) => [n, ...flattenDescendants(n.children || [])])
}

/**
 * A controller is "external-facing" if it has any descendant that is NOT
 * marked isInternal by the backend. We show it in the "Your Devices" section.
 */
function hasExternalDescendants(node: any): boolean {
  return flattenDescendants(node.children || []).some((n: any) => !n.isInternal)
}

/**
 * A controller is internal-only if ALL descendants are internal. We show it
 * under "Built-in Devices".
 */
function hasOnlyInternalDescendants(node: any): boolean {
  const desc = flattenDescendants(node.children || [])
  return desc.length > 0 && desc.every((n: any) => n.isInternal)
}

/**
 * Determine the tag label and CSS class for a device based on its own
 * isInternal flag set by the backend — NOT on which section it appears in.
 */
function deviceTag(node: any): { label: string; cls: string } {
  if (node.isInternal) return { label: 'Built-in', cls: 'tag-internal' }
  return { label: 'External', cls: 'tag-external' }
}

/**
 * Build the inline Notes text for a device row.
 */
function getNotesText(node: any): { text: string; cls: string } {
  if (node.status === 'WARNING') return { text: 'Needs attention — see below', cls: 'summary-red' }
  if (node.status === 'LIMITED' && node.viaHub)
    return { text: 'Via hub', cls: 'summary-yellow' }
  if (node.status === 'LIMITED')
    return { text: 'Below capable speed', cls: 'summary-yellow' }
  if (node.status === 'OPTIMAL')
    return { text: 'Full speed', cls: 'summary-ok' }
  if (node.viaHub)
    return { text: 'Via hub', cls: 'summary-muted' }
  if (node.isInternal)
    return { text: 'Built-in', cls: 'summary-muted' }
  return { text: 'As expected', cls: 'summary-ok' }
}

// ─── Device Row ───────────────────────────────────────────────────────────────

function DeviceRow({
  node,
  warningIds,
  depth = 0,
}: {
  node: any
  warningIds: Set<string>
  depth?: number
}) {
  if (node.type === 'USBHub') {
    return <HubGroup node={node} warningIds={warningIds} depth={depth} />
  }

  const isWarned = warningIds.has(node.instanceId)
  const icon = TYPE_ICON[node.type] || '📦'
  const tag = deviceTag(node)
  const notes = getNotesText(node)

  return (
    <div className={`tn-row tn-row-leaf ${isWarned ? 'tn-warned' : ''} ${node.isInternal ? 'tn-row-internal' : ''}`}>
      {/* Device */}
      <div className="tn-col tn-col-device" style={{ paddingLeft: `${depth * 1.2 + 0.25}rem` }}>
        <span className="tn-icon">{icon}</span>
        <div className="tn-name-container">
          <div className="tn-name-line">
            <span className="tn-name" title={node.name || 'Unknown Device'}>
              {node.name || 'Unknown Device'}
            </span>
            <span className={`tn-origin-tag ${tag.cls}`}>{tag.label}</span>
          </div>
        </div>
      </div>

      {/* Speed */}
      <div className="tn-col tn-col-speed">
        {node.speedMbps
          ? <span className="tn-speed" title={getSpeedTooltip(node.speedMbps)}>{formatSpeed(node.speedMbps)}</span>
          : <span className="tn-empty">—</span>}
      </div>

      {/* Bandwidth tier */}
      <div className="tn-col tn-col-usage">
        {node.tier
          ? <span className={`tn-badge ${TIER_COLOR[node.tier]}`} title={TIER_TOOLTIP[node.tier]}>{TIER_LABEL[node.tier]}</span>
          : <span className="tn-empty">—</span>}
      </div>

      {/* Health */}
      <div className="tn-col tn-col-status">
        {node.status && STATUS_BADGE[node.status]
          ? <span className={`tn-badge ${STATUS_BADGE[node.status].className}`} title={node.statusMessage}>{STATUS_BADGE[node.status].icon}</span>
          : <span className="tn-empty">—</span>}
      </div>

      {/* Notes */}
      <div className="tn-col tn-col-bottleneck">
        <span className={`tn-summary ${notes.cls}`}>{notes.text}</span>
      </div>
    </div>
  )
}

// ─── Hub Group ────────────────────────────────────────────────────────────────

function HubGroup({ node, warningIds, depth }: { node: any; warningIds: Set<string>; depth: number }) {
  const [expanded, setExpanded] = useState(true)
  const isWarned = warningIds.has(node.instanceId)

  // Only show external (user-connected) children inside this hub visual
  const externalChildren: any[] = (node.children || []).filter((c: any) => !c.isInternal)
  const internalChildren: any[] = (node.children || []).filter((c: any) => c.isInternal)

  const isStandard = node.speedMbps && node.speedMbps <= 480
  const isFast = node.speedMbps && node.speedMbps >= 5000

  const hubNote = isStandard
    ? 'Devices below share a standard-speed (USB 2.0) connection'
    : 'Devices below share this high-speed connection'

  const emptyNote = isFast
    ? 'No high-speed devices currently connected to this hub.'
    : 'No devices are currently connected to this hub.'

  return (
    <div className={`tn-hub-group ${isWarned ? 'tn-hub-warned' : ''}`}>
      <div
        className="tn-hub-header"
        onClick={() => setExpanded(e => !e)}
        title="A USB hub shares one port across multiple devices. Devices connected through it all share the same bandwidth."
      >
        <span className="tn-hub-toggle">{expanded ? '▾' : '▸'}</span>
        <span className="tn-hub-icon">⬡</span>
        <div className="tn-hub-label-group">
          <span className="tn-hub-name">{node.name || 'USB Hub'}</span>
          <span className="tn-hub-tag">Hub</span>
          {node.speedMbps && (
            <span
              className={`tn-hub-speed-badge ${isStandard ? 'hub-speed-std' : 'hub-speed-fast'}`}
              title={getSpeedTooltip(node.speedMbps)}
            >
              {formatSpeed(node.speedMbps)}
            </span>
          )}
        </div>
        <span className="tn-hub-note">{hubNote}</span>
      </div>

      {expanded && (
        <div className="tn-hub-children">
          {externalChildren.length === 0 && internalChildren.length === 0 && (
            <div className="tn-hub-empty">{emptyNote}</div>
          )}

          {externalChildren.map((child: any) => (
            <DeviceRow key={child.instanceId} node={child} warningIds={warningIds} depth={depth + 1} />
          ))}

          {/* Internal devices found under this hub (rare but possible on some laptops) */}
          {internalChildren.length > 0 && (
            <div className="tn-hub-internal-note">
              {internalChildren.length} built-in component{internalChildren.length > 1 ? 's' : ''} also share this controller — shown in Built-in Devices below.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Section ──────────────────────────────────────────────────────────────────

function Section({
  label,
  note,
  count,
  defaultOpen = true,
  collapsible = true,
  dimmed = false,
  children,
}: {
  label: string
  note: string
  count?: number
  defaultOpen?: boolean
  collapsible?: boolean
  dimmed?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className={`tn-section ${dimmed ? 'tn-section-dimmed' : ''}`}>
      <div
        className={`tn-section-header ${collapsible ? '' : 'tn-section-header-static'}`}
        onClick={() => collapsible && setOpen(o => !o)}
      >
        {collapsible && <span className="tn-section-toggle">{open ? '▾' : '▸'}</span>}
        <div className="tn-section-label-group">
          <span className="tn-section-label">{label}</span>
          <span className="tn-section-note">{note}</span>
        </div>
        {count !== undefined && (
          <span className="tn-section-count">{count} device{count !== 1 ? 's' : ''}</span>
        )}
      </div>

      {open && <div className="tn-section-body">{children}</div>}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  tree: any[]
  warnings: any[]
}

export default function TopologyTree({ tree, warnings }: Props) {
  const warningIds = new Set<string>(warnings.flatMap((w: any) => w.affectedIds))

  const externalControllers = tree.filter(n => n.type === 'USBController' && hasExternalDescendants(n))
  const internalControllers = tree.filter(n => n.type === 'USBController' && hasOnlyInternalDescendants(n))
  const topLevelDevices = tree.filter(n => n.type !== 'USBController')

  // Collect all external devices across all external controllers (non-internal)
  const allExternalDevices = externalControllers.flatMap(ctrl =>
    (ctrl.children || []).filter((c: any) => !c.isInternal || c.type === 'USBHub')
  )

  // Collect all internal devices (from internal-only controllers + internal children of mixed controllers)
  const allInternalDevices = [
    ...internalControllers.flatMap(ctrl => ctrl.children || []),
    ...externalControllers.flatMap(ctrl =>
      flattenDescendants(ctrl.children || []).filter((n: any) => n.isInternal && n.type !== 'USBHub')
    ),
  ]
  // De-duplicate by instanceId
  const seenIds = new Set<string>()
  const dedupedInternal = allInternalDevices.filter(d => {
    if (seenIds.has(d.instanceId)) return false
    seenIds.add(d.instanceId)
    return true
  })

  return (
    <div className="tt-container">
      <div className="tt-header">
        <h2 className="tt-title">USB Devices</h2>
        <span className="tt-hint">Click any section header to collapse</span>
      </div>

      <div className="tt-table-header">
        <div className="tt-col-label">Device</div>
        <div className="tt-col-label">Connection Speed</div>
        <div className="tt-col-label">Bandwidth Use</div>
        <div className="tt-col-label">Health</div>
        <div className="tt-col-label">Notes</div>
      </div>

      <div className="tt-tree-scroll-wrapper">
        <div className="tt-tree">
          {tree.length === 0 ? (
            <p className="tt-empty">No devices detected. Click "Scan Again" to rescan.</p>
          ) : (
            <>
              {/* ── External Devices ── */}
              {allExternalDevices.length > 0 && (
                <Section
                  label="External Devices"
                  note="Devices you have plugged into your computer"
                  count={allExternalDevices.filter(d => d.type !== 'USBHub').length}
                >
                  {allExternalDevices.map((node: any) => (
                    <DeviceRow key={node.instanceId} node={node} warningIds={warningIds} depth={0} />
                  ))}
                </Section>
              )}

              {/* ── Standalone top-level (not under a controller) ── */}
              {topLevelDevices.map(node => (
                <DeviceRow key={node.instanceId} node={node} warningIds={warningIds} />
              ))}

              {/* ── Built-in Devices ── */}
              {dedupedInternal.length > 0 && (
                <Section
                  label="Built-in Devices"
                  note="Keyboard, webcam, Bluetooth — built into your laptop. These do not affect external USB performance."
                  count={dedupedInternal.length}
                  dimmed
                >
                  {dedupedInternal.map((node: any) => (
                    <DeviceRow key={node.instanceId} node={node} warningIds={warningIds} depth={0} />
                  ))}
                </Section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
