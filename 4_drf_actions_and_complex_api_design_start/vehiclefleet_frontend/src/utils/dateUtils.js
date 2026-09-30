export function formatWeek(isoDate) {
    const date = new Date(isoDate)
    return date.toLocaleDateString('en-CA', { month: 'short', day: '2-digit' })
}