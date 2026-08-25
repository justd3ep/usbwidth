import { useEffect } from 'react'
import './AboutModal.css'

interface Props {
    open: boolean
    onClose: () => void
}

const APP_VERSION = '1.0.5'
const APP_REPO = 'https://github.com/your-org/usbwidth'

export default function AboutModal({ open, onClose }: Props) {
    useEffect(() => {
        if (!open) return
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [open, onClose])

    if (!open) return null

    const openLink = (url: string) => {
        window.api?.openExternal(url)
    }

    return (
        <div className="am-overlay" onClick={onClose}>
            <div className="am-modal" onClick={e => e.stopPropagation()}>
                <div className="am-modal-header">
                    <div>
                        <h2 className="am-modal-title">usbWidth</h2>
                        <p className="am-modal-sub">USB device topology and performance advisor</p>
                    </div>
                    <button className="am-modal-close" onClick={onClose} aria-label="Close">×</button>
                </div>

                <div className="am-modal-body">
                    <div className="am-modal-row">
                        <span className="am-modal-key">Version</span>
                        <span className="am-modal-val">v{APP_VERSION}</span>
                    </div>
                    <div className="am-modal-row">
                        <span className="am-modal-key">Platform</span>
                        <span className="am-modal-val">{navigator.platform || 'unknown'}</span>
                    </div>
                    <div className="am-modal-row">
                        <span className="am-modal-key">Electron</span>
                        <span className="am-modal-val">{(window as any).process?.versions?.electron || '—'}</span>
                    </div>
                    <div className="am-modal-row">
                        <span className="am-modal-key">Chrome</span>
                        <span className="am-modal-val">{(window as any).process?.versions?.chrome || '—'}</span>
                    </div>

                    <h3 className="am-modal-section">What it does</h3>
                    <p className="am-modal-text">
                        usbWidth enumerates every USB controller, hub, and device on your
                        computer, then tells you whether each one is operating at its full
                        speed or being throttled by a hub or port.
                    </p>

                    <h3 className="am-modal-section">Keyboard</h3>
                    <ul className="am-modal-keys">
                        <li><kbd>Esc</kbd> Close menus / dialogs</li>
                        <li><kbd>F5</kbd> Re-scan (use the Scan button)</li>
                    </ul>

                    <h3 className="am-modal-section">Links</h3>
                    <div className="am-modal-links">
                        <button className="am-modal-link" onClick={() => openLink(APP_REPO)}>
                            Source on GitHub
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
