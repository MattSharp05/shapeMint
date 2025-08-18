import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UserService } from './user'
import { createTestUser } from '../utils/test-data'

// Mock supabase client
const mockSupabase = {
  from: vi.fn(),
  auth: {
    getUser: vi.fn(),
    updateUser: vi.fn()
  }
}

vi.mock('../supabaseClient', () => ({
  supabase: mockSupabase
}))

describe('UserService', () => {
  let userService: UserService

  beforeEach(() => {
    vi.clearAllMocks()
    userService = new UserService()
  })

  it('getProfile returns profile when found', async () => {
    const mockUser = createTestUser()
    const mockProfile = {
      id: mockUser.id,
      user_id: mockUser.id,
      display_name: mockUser.full_name,
      avatar_url: null,
      bio: null,
      created_at: mockUser.created_at,
      updated_at: mockUser.created_at
    }

    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: mockProfile, error: null })
        }))
      }))
    })

    const result = await userService.getProfile(mockUser.id)
    expect(result).toEqual(mockProfile)
    expect(mockSupabase.from).toHaveBeenCalledWith('profiles')
  })

  it('getProfile returns null when not found', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
        }))
      }))
    })

    const result = await userService.getProfile('not-found')
    expect(result).toBeNull()
  })

  it('createUserWithProfile creates user and profile', async () => {
    const mockUser = createTestUser()

    mockSupabase.from.mockReturnValueOnce({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: { id: mockUser.id, email: mockUser.email },
            error: null
          })
        }))
      }))
    })
    .mockReturnValueOnce({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'profile-1',
              user_id: mockUser.id,
              display_name: mockUser.full_name,
              avatar_url: null,
              bio: null,
              created_at: mockUser.created_at,
              updated_at: mockUser.created_at
            },
            error: null
          })
        }))
      }))
    })

    const result = await userService.createUserWithProfile(mockUser.id, mockUser.email, mockUser.full_name)
    expect(result).toMatchObject({ user_id: mockUser.id, display_name: mockUser.full_name })
  })

  it('updateNames updates profile display_name', async () => {
    mockSupabase.from.mockReturnValue({
      update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }))
    })

    await expect(userService.updateNames('user-1', 'Full Name', 'Display Name')).resolves.toBeUndefined()
    expect(mockSupabase.from).toHaveBeenCalledWith('profiles')
  })
}) 