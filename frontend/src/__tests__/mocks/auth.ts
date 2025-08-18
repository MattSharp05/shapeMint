import { vi } from 'vitest';

export const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  createdAt: '2024-01-01T00:00:00Z'
};

export const mockAuthValue = {
  user: mockUser,
  loading: false,
  login: vi.fn().mockResolvedValue(mockUser),
  register: vi.fn().mockResolvedValue(mockUser),
  logout: vi.fn().mockResolvedValue(undefined)
};

export const mockUseAuth = () => mockAuthValue;

// Helper to reset all mocks
export const resetAuthMocks = () => {
  mockAuthValue.login.mockClear();
  mockAuthValue.register.mockClear();
  mockAuthValue.logout.mockClear();
}; 