import { supabase } from '../lib/supabase';
import type { User } from '../types/user';

const USERS_TABLE = 'users';

export class UserService {
  // Get user by ID
  async getUser(userId: string): Promise<User | null> {
    console.log('Fetching user for:', userId);
    
    const { data: userData, error: userError } = await supabase
      .from(USERS_TABLE)
      .select('*')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('Error fetching user:', userError);
      return null;
    }

    console.log('Found user:', userData);
    return userData;
  }

  // Create user
  async createUser(userId: string, email: string, fullName: string, bio?: string): Promise<User | null> {
    console.log('Creating user for:', userId);
    
    const { data: userData, error: userError } = await supabase
      .from(USERS_TABLE)
      .insert({
        id: userId,
        email: email,
        full_name: fullName,
        bio: bio || null
      })
      .select()
      .single();

    if (userError) {
      console.error('Error creating user:', userError);
      throw userError;
    }

    console.log('Created user:', userData);
    return userData;
  }

  // Update user
  async updateUser(userId: string, updates: Partial<Omit<User, 'id' | 'created_at' | 'updated_at'>>): Promise<void> {
    console.log('Updating user:', userId, updates);
    
    const { error: userError } = await supabase
      .from(USERS_TABLE)
      .update(updates)
      .eq('id', userId);

    if (userError) {
      console.error('Error updating user:', userError);
      throw userError;
    }
    
    console.log('User updated successfully');
  }
}

export const userService = new UserService();
