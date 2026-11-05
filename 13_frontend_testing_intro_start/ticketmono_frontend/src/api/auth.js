import apiClient from './client'

export async function loginUser({ username, password }) {
  return apiClient('/auth/login/', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
}

export async function registerUser({ username, email, password, role }) {
  return apiClient('/auth/register/', {
    method: 'POST',
    body: JSON.stringify({ username, email, password, role }),
  })
}

export async function refreshToken({ refresh }) {
  return apiClient('/auth/token/refresh/', {
    method: 'POST',
    body: JSON.stringify({ refresh }),
  })
}

export async function fetchMe() {
  return apiClient('/auth/me/')
}
