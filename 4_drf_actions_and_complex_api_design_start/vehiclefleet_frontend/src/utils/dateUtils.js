export function formatWeek(isoDate) {
    const date = new Date(isoDate)
    return date.toLocaleDateString('en-CA', { month: 'short', day: '2-digit' })
}

export function zeroTime(isoDate) {
    const date = new Date(isoDate)
    date.setHours(0)
    date.setMinutes(0)
    date.setSeconds(0)
    date.setMilliseconds(0)
    return date
}