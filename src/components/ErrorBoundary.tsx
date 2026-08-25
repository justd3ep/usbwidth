import { Component, type ErrorInfo, type ReactNode } from 'react'
import './ErrorBoundary.css'

interface Props {
    children: ReactNode
    fallback?: (error: Error, reset: () => void) => ReactNode
}

interface State {
    error: Error | null
}

/**
 * Catches render-time exceptions in the React tree below it and shows a
 * recoverable error card instead of crashing the whole window. The parent
 * is expected to provide a fallback UI; if not, a generic one is used.
 */
export class ErrorBoundary extends Component<Props, State> {
    state: State = { error: null }

    static getDerivedStateFromError(error: Error): State {
        return { error }
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        // In production we would send this to a crash reporter (Sentry, etc.).
        // For now: log to the console so devs can find it.
        console.error('[ErrorBoundary] Caught render error:', error, info.componentStack)
    }

    reset = () => {
        this.setState({ error: null })
    }

    render() {
        const { error } = this.state
        if (!error) return this.props.children
        if (this.props.fallback) return this.props.fallback(error, this.reset)

        return (
            <div className="eb-card" role="alert">
                <div className="eb-icon">!</div>
                <div className="eb-body">
                    <h2 className="eb-title">Something went wrong rendering this section</h2>
                    <p className="eb-msg">{error.message || 'Unknown error'}</p>
                    <details className="eb-details">
                        <summary>Stack trace</summary>
                        <pre>{error.stack}</pre>
                    </details>
                    <button className="eb-reset" onClick={this.reset}>Try again</button>
                </div>
            </div>
        )
    }
}
