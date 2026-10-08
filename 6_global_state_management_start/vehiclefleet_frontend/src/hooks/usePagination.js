import { useContext } from 'react'
import { PaginationContext } from '../contexts/PaginationContext'

export function usePagination() {
    const context = useContext(PaginationContext)
    if (!context) {
        throw new Error('usePagination must be used inside of a PaginationProvider')
    }
    const { 
        page, pSize, setPSize, totalCount, totalPages, setTotalCount, goToNext, goToPrev, goToPage
    } = context;
    return {
        page,
        pSize,
        setPSize,
        totalCount,
        totalPages,
        setTotalCount,
        goToNext,
        goToPrev,
        goToPage,
        hasNext: page < totalPages,
        hasPrev: page > 1,
    }
}