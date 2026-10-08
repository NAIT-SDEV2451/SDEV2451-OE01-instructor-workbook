import { createContext, useState, useEffect } from 'react'

export const PaginationContext = createContext(null)

export function PaginationProvider({ pageSize = 5, children }) {
    const [page, setPage] = useState(1)
    const [pSize, setPSize] = useState(pageSize)
    const [totalCount, setTotalCount] = useState(0)

    const totalPages = Math.ceil(totalCount / pSize) || 1

    useEffect(() => {
        setPage(1)
    }, [pSize, setPage])

    return (
        <PaginationContext.Provider value={{
            page,
            totalCount,
            totalPages,
            pSize,
            setPSize,
            setTotalCount,
            goToNext: () => setPage(p => Math.min(p + 1, totalPages)),
            goToPrev: () => setPage(p => Math.max(p - 1, 1)),
            goToPage: (n) => setPage(Math.max(1, Math.min(n, totalPages))),
        }}>
            {children}
        </PaginationContext.Provider>
    )
}
