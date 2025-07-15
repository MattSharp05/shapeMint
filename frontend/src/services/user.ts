import { supabase } from '../lib/supabase';
import type { UserWithProfile } from '../types/user';

const USERS_TABLE = 'users';
const PROFILES_TABLE = 'profiles';

export class UserService {
  // Get user with profile
  async getUserWithProfile(userId: string): Promise<UserWithProfile | null> {
    console.log('Fetching user and profile for:', userId);
    
    // First get user
    const { data: userData, error: userError } = await supabase
      .from(USERS_TABLE)
      .select('*')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('Error fetching user:', userError);
      return null;
    }

    // Then get profile
    const { data: profileData, error: profileError } = await supabase
      .from(PROFILES_TABLE)
      .select('*')
      .eq('user_id', userId)
      .single();

    if (profileError && profileError.code !== 'PGRST116') { // Ignore not found error
      console.error('Error fetching profile:', profileError);
    }

    console.log('Found user:', userData, 'profile:', profileData);
    
    return {
      ...userData,
      profile: profileData || undefined
    };
  }

  // Create or update user and profile
  async createUserWithProfile(userId: string, email: string, displayName: string): Promise<UserWithProfile | null> {
    console.log('Creating user and profile for:', userId);
    
    // First create user
    const { data: userData, error: userError } = await supabase
      .from(USERS_TABLE)
      .insert({
        id: userId,
        email: email,
        full_name: displayName
      })
      .select()
      .single();

    if (userError) {
      console.error('Error creating user:', userError);
      throw userError;
    }

    // Then create profile
    const { data: profileData, error: profileError } = await supabase
      .from(PROFILES_TABLE)
      .insert({
        user_id: userId,
        display_name: displayName
      })
      .select()
      .single();

    if (profileError) {
      console.error('Error creating profile:', profileError);
      throw profileError;
    }

    console.log('Created user:', userData, 'profile:', profileData);
    
    return {
      ...userData,
      profile: profileData
    };
  }

  // Update names
  async updateNames(userId: string, fullName: string, displayName: string): Promise<void> {
    console.log('Updating names for user:', userId, fullName, displayName);
    
    // Update user
    const { error: userError } = await supabase
      .from(USERS_TABLE)
      .update({ full_name: fullName })
      .eq('id', userId);

    if (userError) {
      console.error('Error updating user name:', userError);
      throw userError;
    }

    // Update profile
    const { error: profileError } = await supabase
      .from(PROFILES_TABLE)
      .upsert({
        user_id: userId,
        display_name: displayName
      });

    if (profileError) {
      console.error('Error updating display name:', profileError);
      throw profileError;
    }
    
    console.log('Names updated successfully');
  }
}

export const userService = new UserService();
