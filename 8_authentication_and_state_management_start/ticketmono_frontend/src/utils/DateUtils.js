export function eventToString(dateTime) {
    const date = new Date(dateTime)
    const formattedDate = date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    })
    const formattedTime = date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit'
    })

    return [formattedDate, formattedTime]
}