import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '../utils/test-utils'
import userEvent from '@testing-library/user-event'
import { Login } from './Login'

// Mock react-router-dom navigation
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    Link: ({ children, to }: any) => <a href={to}>{children}</a>
  }
})

// Use shared auth mock via test-utils by mocking only the needed function
const mockLogin = vi.fn()
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    login: mockLogin,
    user: null,
    loading: false
  })
}))

describe('Login Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders form fields and submit', () => {
    render(<Login />)
    expect(screen.getByLabelText(/Email address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument()
  })

  it('submits and navigates on success', async () => {
    const user = userEvent.setup()
    mockLogin.mockResolvedValue({ id: '123', email: 'test@example.com', name: 'Test User' })

    render(<Login />)

    await user.type(screen.getByLabelText(/Email address/i), 'test@example.com')
    await user.type(screen.getByLabelText(/Password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /Sign In/i }))

    expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123')
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/dashboard'))
  })

  it('handles login error gracefully', async () => {
    const user = userEvent.setup()
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockLogin.mockRejectedValue(new Error('Invalid credentials'))

    render(<Login />)

    await user.type(screen.getByLabelText(/Email address/i), 'wrong@example.com')
    await user.type(screen.getByLabelText(/Password/i), 'wrongpassword')
    await user.click(screen.getByRole('button', { name: /Sign In/i }))

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Login failed:', expect.any(Error))
    })

    consoleErrorSpy.mockRestore()
  })
})