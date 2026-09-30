import {useState, useEffect } from 'react'

export function useDebounce(value = "", delay = 300) {
    const [debounceValue, setDebounceValue] = useState(value)

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setDebounceValue(value)
        }, delay)
        
        return () => {
            clearTimeout(timeoutId)
        }
    }, [value, delay])

    return debounceValue
}