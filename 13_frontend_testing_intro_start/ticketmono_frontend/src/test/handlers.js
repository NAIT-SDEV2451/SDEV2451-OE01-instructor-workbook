import { http, HttpResponse } from 'msw'

const BASE_URL = 'http://localhost:8000/api/v1'

export const mockEvents = [
    {
        id: 1,
        name: 'Indie Rock Night',
        date_time: '2026-11-14T190:30:00Z',
        venue: { id: 1, name: 'The Aurora Room', address: "221 King St W" }
    },
    {
        id: 2,
        name: 'Comedy Open Mic',
        date_time: '2026-11-20T20:00:00Z',
        venue: { id: 2, name: 'Backroom Lounge', address: '77 Jasper Ave' }
    }
]

export const mockUser = { id: 1, username: 'sam', role: 'user' }

const FAKE_ACCESS_TOKEN = `header.${btoa(JSON.stringify({ user_id: 1 }))}.signature`

export const handlers = [
    http.get(`${BASE_URL}/events/`, () => {
        return HttpResponse.json(mockEvents)
    }),

    http.post(`${BASE_URL}/auth/login/`, () => {
        return HttpResponse.json({
            access: FAKE_ACCESS_TOKEN,
            refresh: 'fake-refresh-token'
        })
    }),

    http.get(`${BASE_URL}/auth/me/`, () => {
        return HttpResponse.json(mockUser)
    })
]