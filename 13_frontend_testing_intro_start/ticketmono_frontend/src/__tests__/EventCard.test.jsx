import { describe, it, expect } from "vitest";
import { screen } from '@testing-library/react'

import EventCard from "../components/EventCard";
import { reanderWithProviders } from "../test/renderWithProviders";
import { mockEvents } from "../test/handlers";

describe('EventCard', () => {
    const event = mockEvents[0]

    it('renders the event name', () => {
        reanderWithProviders(<EventCard event={event} />)

        expect(screen.getByText('Indie Rock Night'))
    })

    it('renders the venue name and address', () => {
        reanderWithProviders(<EventCard event={event} />)

        expect(screen.getByText('The Aurora Room')).toBeInTheDocument()
        expect(screen.getByText('221 King St W')).toBeInTheDocument()
    })

    it('links to the event detail page', () => {
        reanderWithProviders(<EventCard event={event} />)

        const link = screen.getByRole('link', { name: 'Get Tickets' })
        expect(link).toHaveAttribute('href', "/events/1")
    })
})