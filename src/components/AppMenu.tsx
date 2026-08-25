import { useEffect, useRef, useState } from 'react'
import './AppMenu.css'

export interface MenuAction {
    id: string
    label: string
    hint?: string
    shortcut?: string
    disabled?: boolean
    danger?: boolean
    onClick: () => void
}

export interface MenuGroup {
    id: string
    label: string
    items: MenuAction[]
}

interface Props {
    groups: MenuGroup[]
}

export default function AppMenu({ groups }: Props) {
    const [openId, setOpenId] = useState<string | null>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    // Close on click outside or Escape
    useEffect(() => {
        if (!openId) return
        const onDown = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpenId(null)
            }
        }
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpenId(null)
        }
        document.addEventListener('mousedown', onDown)
        document.addEventListener('keydown', onKey)
        return () => {
            document.removeEventListener('mousedown', onDown)
            document.removeEventListener('keydown', onKey)
        }
    }, [openId])

    return (
        <div className="am-bar" ref={containerRef}>
            {groups.map(group => {
                const isOpen = openId === group.id
                return (
                    <div key={group.id} className={`am-item ${isOpen ? 'am-item-open' : ''}`}>
                        <button
                            className="am-trigger"
                            onClick={() => setOpenId(isOpen ? null : group.id)}
                            aria-expanded={isOpen}
                            aria-haspopup="menu"
                        >
                            {group.label}
                            <span className="am-caret">▾</span>
                        </button>
                        {isOpen && (
                            <div className="am-dropdown" role="menu">
                                {group.items.map(item => (
                                    <button
                                        key={item.id}
                                        className={`am-action ${item.danger ? 'am-action-danger' : ''}`}
                                        onClick={() => { item.onClick(); setOpenId(null) }}
                                        disabled={item.disabled}
                                        role="menuitem"
                                    >
                                        <span className="am-action-label">{item.label}</span>
                                        {item.hint && <span className="am-action-hint">{item.hint}</span>}
                                        {item.shortcut && <span className="am-action-shortcut">{item.shortcut}</span>}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}
