import { createContext, useState } from "react"
import Toast from '../components/Toast'

export const NotificationContext = createContext(null)

export function NotificationProvider({ children }) {
    const [notification, setNotification] = useState(null)

    function showSuccess(message) {
        setNotification({ message, type: 'success' })
    }

    function showError(message) {
        setNotification({ message, type: 'error' })
    }

    function hide() {
        setNotification(null)
    }

    return (
        <NotificationContext.Provider value={{ showSuccess, showError, hide }}>
            <Toast notification={notification} hide={hide} />
            {children}
        </NotificationContext.Provider>
    )
}