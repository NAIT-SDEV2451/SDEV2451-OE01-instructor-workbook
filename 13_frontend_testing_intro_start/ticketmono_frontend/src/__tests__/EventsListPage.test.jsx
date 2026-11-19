import { describe, it, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'

import EventsListPage from '../pages/attendee/EventsListPage'
import { reanderWithProviders } from '../test/renderWithProviders'
import { server } from '../test/server'

const EVENTS_URL = 'http://localhost:8000/api/v1/events/'

describe('EventsListPage', () => { 
    it('show a loading spinner while events are loading', () => {
        const { container } = reanderWithProviders(<EventsListPage />)

        expect(container.querySelector('.loading-spinner')).toBeInTheDocument()
    })

    it('renders every event once loading finishes', async () => {
        reanderWithProviders(<EventsListPage />)

        await waitFor(() => {
            expect(screen.getByText('Indie Rock Night')).toBeInTheDocument()
            expect(screen.getByText('Comedy Open Mic')).toBeInTheDocument()
        })
    })

    it('shows an error message if the request fails', async () => {
        server.use(
            http.get(EVENTS_URL, () => {
                return HttpResponse.json({ detail: 'Server Error'}, { status: 500 })
            })
        )

        reanderWithProviders(<EventsListPage />)

        await waitFor(() => {
            expect(screen.getByText('Failed to load events. Please try again later.')).toBeInTheDocument()
        })
    })
})