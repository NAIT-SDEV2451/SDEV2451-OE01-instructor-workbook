import { usePagination } from "../hooks/usePagination"

function TripsPagination() {
    const {
        page, totalCount, totalPages, hasNext, hasPrev, goToNext, goToPrev
    } = usePagination()

    return (
        <div className="flex items-center gap-3 mt-4">
            <button
                className="btn btn-sm btn-outline"
                onClick={goToPrev}
                disabled={!hasPrev}
            >
                Previous
            </button>
            <span className="text-sm text-base-content/60">
                Page {page} of {totalPages} - {totalCount} trips total
            </span>
            <button
                className="btn btn-sm btn-outline"
                onClick={goToNext}
                disabled={!hasNext}
            >
                Next
            </button>
        </div>
    )
}

export default TripsPagination