import { useState } from 'react'
import type { UsbNode, UsbWarning } from '../types/usb'
import './TopologyTree.css'

// ─── Type labels (no emoji) ──────────────────────────────────────────

const TYPE_LABEL: Record<string, string> = {
  USBController: 'Controller',
  USBHub: 'Hub',
  DiskDrive: 'Storage',
  ImageDevice: 'Camera',
  Keyboard: 'Keyboard',
  Mouse: 'Mouse',
  AudioEndpoint: 'Audio',
  HIDClass: 'HID',
  Bluetooth: 'Bluetooth',
  Net: 'Network',
  SmartCard: 'Smart Card',
  Camera: 'Camera',
  USBDevice: 'Accessory',
  Miscellaneous: 'Accessory',
  VendorSpecific: 'Accessory',
}

// ─── Display Data ────────────────────────────────────────────────────

const TIER_COLOR: Record<string, string> = {
  HIGH: 'tier-high',
  MEDIUM: 'tier-medium',
  LOW: 'tier-low',
}

const TIER_LABEL: Record<string, string> = {
  HIGH: 'High',
  MEDIUM: 'Standard',
  LOW: 'Low',
}

const TIER_TOOLTIP: Record<string, string> = {
  HIGH: 'High-bandwidth device — benefits from a direct USB 3.x connection for best transfer speeds (e.g. external SSD, capture card).',
  MEDIUM: 'Standard-bandwidth device — works well on any modern port. No special connection is required.',
  LOW: 'Low-bandwidth device — keyboards, mice, headphones, Bluetooth. Any USB port is more than sufficient for this device type.',
}

const STATUS_BADGE: Record<string, { text: string; className: string }> = {
  ADEQUATE: { text: 'OK', className: 'status-adequate' },
  NORMAL: { text: 'OK', className: 'status-adequate' },
  OPTIMAL: { text: 'Full', className: 'status-optimal' },
  LIMITED: { text: 'Limited', className: 'status-limited' },
  WARNING: { text: 'Issue', className: 'status-bottleneck' },
}

// ─── Helpers ──────────────────────────────────────────────────────────

function formatSpeed(mbps: number) {
  if (mbps === 1.5) return 'USB 1.0'
  if (mbps === 12) return 'USB 1.1'
  if (mbps === 480) return 'USB 2.0'
  if (mbps === 5000) return 'USB 3.0'
  if (mbps === 10000) return 'USB 3.1'
  if (mbps === 20000) return 'USB 3.2'
  if (mbps === 40000) return 'USB4 / TB'
  if (mbps >= 1000) return `${(mbps / 1000).toFixed(0)} Gbps`
  return `${mbps} Mbps`
}

function getSpeedTooltip(mbps: number) {
  if (mbps <= 12) return 'USB 1.1 Full Speed — Optimised for input devices and audio.'
  if (mbps <= 480) return 'USB 2.0 Hi-Speed — Standard speed. Works great for audio, webcams, and most everyday devices.'
  if (mbps <= 5000) return 'USB 3.0 — Fast connection. Ideal for external storage drives and cameras.'
  if (mbps <= 20000) return 'USB 3.1/3.2 — Very fast. Handles demanding devices like fast SSDs and capture cards.'
  return 'USB4 / Thunderbolt — Ultra-fast connection for the most demanding devices.'
}

function flattenDescendants(nodes: UsbNode[]): UsbNode[] {
  return nodes.flatMap((n) => [n, ...flattenDescendants(n.children || [])])
}

function hasExternalDescendants(node: UsbNode): boolean {
  return flattenDescendants(node.children || []).some((n) => !n.isInternal)
}

function hasOnlyInternalDescendants(node: UsbNode): boolean {
  const desc = flattenDescendants(node.children || [])
  return desc.length > 0 && desc.every((n) => n.isInternal)
}

function deviceTag(node: UsbNode): { label: string; cls: string } {
  if (node.isInternal) return { label: 'Built-in', cls: 'tag-internal' }
  return { label: 'External', cls: 'tag-external' }
}

function getNotesText(node: UsbNode): { text: string; cls: string } {
  if (node.status === 'WARNING') return { text: 'Needs attention', cls: 'summary-red' }
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

// ─── Device Row ───────────────────────────────────────────────────────

type DeviceRowProps = {
  node: UsbNode
  warningIds: Set<string>
  depth?: number
  onSelect?: (node: UsbNode) => void
}

function DeviceRow({
  node,
  warningIds,
  depth = 0,
  onSelect,
}: DeviceRowProps) {
  if (node.type === 'USBHub') {
    return <HubGroup node={node} warningIds={warningIds} depth={depth} onSelect={onSelect} />
  }

  const isWarned = warningIds.has(node.instanceId)
  const typeLabel = TYPE_LABEL[node.type] || 'Device'
  const tag = deviceTag(node)
  const notes = getNotesText(node)

  // Detect port bottleneck: device claims USB 3.x but the port it sits on
  // is USB 2.0. Only meaningful for HIGH-tier devices or ones whose bcdUSB
  // says 3.x. A mouse at 12 Mbps on a USB 2.0 port is NOT a bottleneck.
  const portCap = node.portCapabilityMbps
  const claimsFast = node.tier === 'HIGH' || (node.bcdUsb && node.bcdUsb >= 3.0)
  const portCapsIt = portCap && portCap <= 480
  const actualSlow = node.speedMbps && node.speedMbps <= 480
  const bottleneck = claimsFast && portCapsIt && actualSlow

  return (
    <div
      className={`tn-row tn-row-leaf ${isWarned || bottleneck ? 'tn-warned' : ''} ${node.isInternal ? 'tn-row-internal' : ''}`}
      onClick={() => onSelect?.(node)}
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
    >
      {/* Device */}
      <div className="tn-col tn-col-device" style={{ paddingLeft: `${depth * 1.1}rem` }}>
        <div className="tt-align-toggle"></div>
        <div className="tn-type-pill" title={node.type}>{typeLabel}</div>
        <div className="tn-name-container">
          <div className="tn-name-line">
            <span className="tn-name" title={node.name || 'Unknown Device'}>
              {node.name || 'Unknown Device'}
            </span>
            <span className={`tn-origin-tag ${tag.cls}`}>{tag.label}</span>
          </div>
        </div>
      </div>

      {/* Speed (actual + tiny port-cap marker only on real mismatch) */}
      <div className="tn-col tn-col-speed">
        {node.speedMbps
          ? (
            <span className="tn-speed" title={`Actual: ${formatSpeed(node.speedMbps)} — ${getSpeedTooltip(node.speedMbps)}`}>
              {formatSpeed(node.speedMbps)}
              {bottleneck && <span className="tn-port-cap-warn" title="This device supports USB 3.x but the port it's plugged into only supports USB 2.0"> !</span>}
            </span>
          )
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
          ? <span className={`tn-badge ${STATUS_BADGE[node.status].className}`} title={node.statusMessage}>{STATUS_BADGE[node.status].text}</span>
          : <span className="tn-empty">—</span>}
      </div>

      {/* Notes */}
      <div className="tn-col tn-col-bottleneck">
        <span className={`tn-summary ${notes.cls}`}>{notes.text}</span>
      </div>
    </div>
  )
}

// ─── Hub Group ────────────────────────────────────────────────────────

type HubGroupProps = {
  node: UsbNode
  warningIds: Set<string>
  depth: number
  onSelect?: (node: UsbNode) => void
}

function HubGroup({
  node,
  warningIds,
  depth,
  onSelect,
}: HubGroupProps) {
  const [expanded, setExpanded] = useState(true)
  const isWarned = warningIds.has(node.instanceId)

  const externalChildren: UsbNode[] = (node.children || []).filter((c) => !c.isInternal)
  const internalChildren: UsbNode[] = (node.children || []).filter((c) => c.isInternal)

  const isStandard = node.speedMbps && node.speedMbps <= 480
  const isFast = node.speedMbps && node.speedMbps >= 5000

  const hubNote = isStandard
    ? 'USB 2.0 — shared'
    : 'High-speed — shared'

  const emptyNote = isFast
    ? 'No high-speed devices connected to this hub.'
    : 'No devices connected to this hub.'

  return (
    <div className={`tn-hub-group ${isWarned ? 'tn-hub-warned' : ''}`}>
      <div className="tn-hub-header" onClick={() => setExpanded(e => !e)}>
        <div className="tt-align-toggle">
          <span className="tn-hub-toggle">{expanded ? '▾' : '▸'}</span>
        </div>
        <div className="tn-type-pill">Hub</div>
        <div className="tn-hub-label-group">
          <span className="tn-hub-name">{node.name || 'USB Hub'}</span>
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

          {externalChildren.map((child) => (
            <DeviceRow key={child.instanceId} node={child} warningIds={warningIds} depth={depth + 1} onSelect={onSelect} />
          ))}

          {internalChildren.length > 0 && (
            <div className="tn-hub-internal-note">
              {internalChildren.length} built-in component{internalChildren.length > 1 ? 's' : ''} — see Built-in below.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Section ──────────────────────────────────────────────────────────

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
      <div className={`tn-section-header ${!collapsible ? 'tn-section-header-static' : ''}`} onClick={() => collapsible && setOpen(o => !o)}>
        <div className="tt-align-toggle">
          {collapsible && <span className="tn-section-toggle">{open ? '▾' : '▸'}</span>}
        </div>
        <div className="tn-section-label-group">
          <span className="tn-section-label">{label}</span>
          <span className="tn-section-note">{note}</span>
        </div>
        {count !== undefined && (
          <span className="tn-section-count">{count}</span>
        )}
      </div>

      {open && <div className="tn-section-body">{children}</div>}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────

interface Props {
  tree: UsbNode[]
  warnings: UsbWarning[]
  onSelectDevice?: (node: UsbNode) => void
}

export default function TopologyTree({ tree, warnings, onSelectDevice }: Props) {
  const warningIds = new Set<string>(warnings.flatMap((w) => w.affectedIds))

  const externalControllers = tree.filter(n => n.type === 'USBController' && hasExternalDescendants(n))
  const internalControllers = tree.filter(n => n.type === 'USBController' && hasOnlyInternalDescendants(n))
  const topLevelDevices = tree.filter(n => n.type !== 'USBController')

  const allExternalDevices = externalControllers.flatMap(ctrl =>
    (ctrl.children || []).filter((c) => !c.isInternal || c.type === 'USBHub')
  )

  const allInternalDevices = [
    ...internalControllers.flatMap(ctrl => ctrl.children || []),
    ...externalControllers.flatMap(ctrl =>
      flattenDescendants(ctrl.children || []).filter((n) => n.isInternal && n.type !== 'USBHub')
    ),
  ]
  const seenIds = new Set<string>()
  const dedupedInternal = allInternalDevices.filter(d => {
    if (seenIds.has(d.instanceId)) return false
    seenIds.add(d.instanceId)
    return true
  })

  const externalCount = flattenDescendants(allExternalDevices).filter((d) => d.type !== 'USBHub' && !d.isInternal).length

  return (
    <div className="tt-container">
      <div className="tt-header">
        <h2 className="tt-title">USB Devices</h2>
        <span className="tt-hint">Click section headers to collapse</span>
      </div>

      <div className="tt-tree-scroll-wrapper">
        <div className="tt-tree">
          <div className="tt-table-header">
            <div className="tt-col-label" style={{ display: 'flex', alignItems: 'center' }}>
              <div className="tt-align-toggle"></div>
              <div className="tt-align-icon"></div>
              <div>Device</div>
            </div>
            <div className="tt-col-label">Speed</div>
            <div className="tt-col-label">Bandwidth</div>
            <div className="tt-col-label">Health</div>
            <div className="tt-col-label">Notes</div>
          </div>

          {tree.length === 0 ? (
            <p className="tt-empty">No devices detected. Click "Scan Again" to rescan.</p>
          ) : (
            <>
              {allExternalDevices.length > 0 && (
                <Section
                  label="External Devices"
                  note="Devices you have plugged in"
                  count={externalCount}
                >
                  {allExternalDevices.map((node) => (
                    <DeviceRow key={node.instanceId} node={node} warningIds={warningIds} depth={0} onSelect={onSelectDevice} />
                  ))}
                </Section>
              )}

              {topLevelDevices.map(node => (
                <DeviceRow key={node.instanceId} node={node} warningIds={warningIds} onSelect={onSelectDevice} />
              ))}

              {dedupedInternal.length > 0 && (
                <Section
                  label="Built-in Devices"
                  note="Built into your computer"
                  count={dedupedInternal.length}
                  dimmed
                >
                  {dedupedInternal.map((node) => (
                    <DeviceRow key={node.instanceId} node={node} warningIds={warningIds} depth={0} onSelect={onSelectDevice} />
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
