import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'

import LoginPage from '../pages/auth/LoginPage'
import { reanderWithProviders } from '../test/renderWithProviders'
import { server } from '../test/server'
import { useNavigate } from 'react-router-dom'

const LOGIN_URL = 'http://localhost:8000/api/v1/auth/login/'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async (importOriginal) => {
    const actual = await importOriginal()
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    }
})

describe('LoginPage', () => {
    const user = userEvent.setup()

    beforeEach(() => {
        mockNavigate.mockClear()
    })
    
    afterEach(() => {
        localStorage.clear()
    })

    it('navigates to home page after a successful login', async () => {
        reanderWithProviders(<LoginPage />)

        await user.type(screen.getByPlaceholderText('Enter your username'), 'sam')
        await user.type(screen.getByPlaceholderText('Enter your password'), 'password123')
        await user.click(screen.getByRole('button', { name: 'Log In'}))

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/')
        })
    })

    it('does not navigate when the login fails', async () => {
        server.use(
            http.post(LOGIN_URL, () => {
                return HttpResponse.json(
                    { detail: 'No active account found with the given credentials' },
                    { status: 401 }
                )
            })
        )

        reanderWithProviders(<LoginPage />)

        await user.type(screen.getByPlaceholderText('Enter your username'), 'sam')
        await user.type(screen.getByPlaceholderText('Enter your password'), 'wrong-password')
        await user.click(screen.getByRole('button', { name: 'Log In'}))

        await waitFor(() => {
            expect(
                screen.getByText('No active account found with the given credentials')
            ).toBeInTheDocument()
        })
        expect(mockNavigate).not.toHaveBeenCalled()
    })
})