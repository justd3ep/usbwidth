// usb.ts — shared TypeScript types for the usbWidth app.
//
// These mirror the shapes produced by the Electron main process (the
// detectors in `electron/windowsDetector.js` and `electron/linuxDetector.js`,
// plus the rule engine in `electron/ruleEngine.js` and the recommendation
// engine in `electron/recommendationEngine.js`).
//
// Any change to a detector's output should be reflected here, and any change
// here is a hint to verify the detector still emits the same shape.

// ─── Tier & status enums ────────────────────────────────────────────────────

export type Tier = 'HIGH' | 'MEDIUM' | 'LOW'
export type DeviceStatus = 'ADEQUATE' | 'OPTIMAL' | 'NORMAL' | 'LIMITED' | 'WARNING'
export type WarningSource = 'SYSTEM_LIMITATION' | 'HUB_LIMITATION' | 'DEVICE_LIMITATION' | null
export type WarningSeverity = 'critical' | 'warning'
export type RecommendationPriority = 'IMPORTANT' | 'OPTIONAL' | 'INFO'

// ─── Topology node types ────────────────────────────────────────────────────

export type UsbNodeType =
    | 'USBController'
    | 'USBHub'
    | 'DiskDrive'
    | 'ImageDevice'
    | 'Keyboard'
    | 'Mouse'
    | 'AudioEndpoint'
    | 'HIDClass'
    | 'Bluetooth'
    | 'Net'
    | 'SmartCard'
    | 'Camera'
    | 'USBDevice'
    | 'Miscellaneous'
    | 'VendorSpecific'
    | string  // allow custom classes

export interface UsbNode {
    instanceId: string
    type: UsbNodeType
    name: string | null
    parentId: string | null
    speedMbps: number | null
    portCapabilityMbps?: number | null
    idVendor: string | null
    idProduct: string | null
    isInternal: boolean
    viaHub?: boolean
    depth?: number
    bcdUsb?: number | null
    locationPath?: string
    class?: string
    displayName?: string | null

    // Set by the classifier
    profileKey?: string
    profileLabel?: string
    tier?: Tier
    tierReason?: string

    // Set by the rule engine
    status?: DeviceStatus
    statusMessage?: string

    // Tree structure
    children?: UsbNode[]
}

// ─── System info ───────────────────────────────────────────────────────────

export interface SystemInfo {
    manufacturer?: string
    model?: string
    cpu?: string
    os?: string
    totalRam?: string
    biosVersion?: string
    usbCapabilities?: string[]
}

// ─── Warnings / Recommendations ────────────────────────────────────────────

export interface UsbWarning {
    id: string
    severity: WarningSeverity
    status: DeviceStatus
    title: string
    detail: string
    affectedIds: string[]
    deviceName: string
    source: WarningSource
    portCapability: number | null
    deviceCapability: number | null
    connectionPath: 'Direct' | 'Via Hub' | 'Controller' | string
    verdict: string
}

export interface UsbRecommendation {
    id: string
    priorityTag: RecommendationPriority
    title: string
    steps: string[]
}

// ─── Top-level scan result ─────────────────────────────────────────────────

export interface TopologyData {
    systemInfo: SystemInfo
    tree: UsbNode[]
    classifiedDevices: UsbNode[]
    warnings: UsbWarning[]
    recommendations: UsbRecommendation[]
    error: string | null
    platform: 'win32' | 'linux' | 'darwin' | string
}

export type LoadState = 'idle' | 'loading' | 'success' | 'error'
