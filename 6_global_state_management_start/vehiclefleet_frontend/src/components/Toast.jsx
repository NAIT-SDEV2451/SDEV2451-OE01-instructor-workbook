import { useEffect } from 'react'

const AUTO_HIDE_MS = 3000

function Toast({ notification, hide }) {
    useEffect(() => {
        if (!notification) return
        const timer = setTimeout(hide, AUTO_HIDE_MS)
        return () => clearTimeout(timer)
    }, [notification, hide])

    if (!notification) return null

    const alertClass = notification.type === 'success' ? 'alert-success' : 'alert-error'

    return (
        <div className="toast toast-top toast-end z-50">
            <div className={`alert ${alertClass} flex justify-between gap-4`}>
                <span>
                    {notification.message}
                </span>
                <button className="btn btn-xs btn-ghost" onClick={hide}>X</button>
            </div>            
        </div>
    )
}

export default Toast