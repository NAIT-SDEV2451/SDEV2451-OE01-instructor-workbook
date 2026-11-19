import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { render } from '@testing-library/react'
import { AuthProvider } from "../contexts/AuthContext";

export function reanderWithProviders(ui, { initialEntries = ['/'] } = {}) {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        }
    })

    return render(
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <MemoryRouter initialEntries={initialEntries}>
                    {ui}
                </MemoryRouter>
            </AuthProvider>
        </QueryClientProvider>
    )
}