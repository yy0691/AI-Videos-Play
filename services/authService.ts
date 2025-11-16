import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not configured. Auth features will be disabled.');
}

export const supabase: SupabaseClient | null = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  // Optional reference to Supabase auth.users (NULL for Linux.do-only profiles)
  auth_user_id?: string;
  // Flag to indicate if this is a Linux.do-only profile (no Supabase auth account)
  is_linuxdo_only?: boolean;
  // Linux.do OAuth fields
  linuxdo_user_id?: string;
  linuxdo_username?: string;
  linuxdo_avatar_url?: string; // Linux.do user avatar/logo URL
  linuxdo_access_token?: string;
  linuxdo_token_expires_at?: string;
  linuxdo_user_data?: any; // JSON data from Linux.do API
}

export const authService = {
  isAvailable(): boolean {
    return supabase !== null;
  },

  async signUpWithEmail(email: string, password: string, fullName?: string) {
    if (!supabase) throw new Error('Supabase not configured');

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) throw error;
    return data;
  },

  async signInWithEmail(email: string, password: string) {
    if (!supabase) throw new Error('Supabase not configured');

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  },

  async signInWithGoogle() {
    if (!supabase) throw new Error('Supabase not configured');

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) throw error;
    return data;
  },

  async signInWithGithub() {
    if (!supabase) throw new Error('Supabase not configured');

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) throw error;
    return data;
  },

  async signOut() {
    if (!supabase) throw new Error('Supabase not configured');

    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getCurrentUser(): Promise<User | null> {
    if (!supabase) return null;

    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  /**
   * Sync avatar from OAuth provider (Google/GitHub) to profile
   * Extracts avatar URL from user metadata and updates profile if needed
   */
  async syncAvatarFromProvider(user: User): Promise<void> {
    if (!supabase || !user) return;

    try {
      // Get current profile
      const currentProfile = await this.getProfile(user.id);
      
      // If profile already has avatar, skip
      if (currentProfile?.avatar_url) {
        return;
      }

      // Extract avatar from user metadata (OAuth providers store it here)
      // Google: user_metadata.avatar_url or user_metadata.picture
      // GitHub: user_metadata.avatar_url
      const avatarUrl = user.user_metadata?.avatar_url || 
                       user.user_metadata?.picture ||
                       user.user_metadata?.avatar ||
                       undefined;

      if (avatarUrl) {
        // Update profile with avatar
        await this.updateProfile(user.id, { avatar_url: avatarUrl });
        console.log('Avatar synced from OAuth provider:', avatarUrl);
      }
    } catch (error) {
      console.error('Error syncing avatar from provider:', error);
      // Don't throw, this is a non-critical operation
    }
  },

  async getSession(): Promise<Session | null> {
    if (!supabase) return null;

    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },

  async getProfile(userId: string): Promise<Profile | null> {
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }

    return data;
  },

  async updateProfile(userId: string, updates: Partial<Profile>) {
    if (!supabase) throw new Error('Supabase not configured');

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Find or create profile by Linux.do user ID
   * This allows Linux.do users to register independently without Supabase account
   * Creates a new profile with an independent UUID if one doesn't exist
   */
  async findOrCreateProfileByLinuxDoId(linuxdoUserId: string, linuxdoUserInfo: any): Promise<Profile | null> {
    if (!supabase) return null;

    try {
      // First, try to find existing profile by linuxdo_user_id
      const { data: existingProfile, error: findError } = await supabase
        .from('profiles')
        .select('*')
        .eq('linuxdo_user_id', linuxdoUserId)
        .maybeSingle();

      if (findError && findError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error finding profile by Linux.do ID:', findError);
        return null;
      }

      if (existingProfile) {
        // Profile exists, update it with latest info
        const avatarUrl = linuxdoUserInfo.avatar_url || 
                         linuxdoUserInfo.avatar || 
                         linuxdoUserInfo.logo || 
                         linuxdoUserInfo.picture ||
                         undefined;

        const updates: Partial<Profile> = {
          linuxdo_username: linuxdoUserInfo.username || linuxdoUserInfo.name || existingProfile.linuxdo_username,
          linuxdo_avatar_url: avatarUrl || existingProfile.linuxdo_avatar_url,
          linuxdo_user_data: linuxdoUserInfo,
        };

        // Remove undefined values
        Object.keys(updates).forEach(key => {
          if (updates[key as keyof typeof updates] === undefined) {
            delete updates[key as keyof typeof updates];
          }
        });

        const { data: updatedProfile, error: updateError } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', existingProfile.id)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating profile:', updateError);
          return existingProfile; // Return existing profile even if update fails
        }

        return updatedProfile;
      }

      // Profile doesn't exist - create a new independent profile for Linux.do user
      // Use the RPC function to create the profile (bypasses RLS)
      const avatarUrl = linuxdoUserInfo.avatar_url || 
                       linuxdoUserInfo.avatar || 
                       linuxdoUserInfo.logo || 
                       linuxdoUserInfo.picture ||
                       undefined;

      const email = linuxdoUserInfo.email || `linuxdo_${linuxdoUserId}@linux.do`;
      const username = linuxdoUserInfo.username || linuxdoUserInfo.name || `Linux.do User ${linuxdoUserId}`;

      // Try to use the RPC function first (if migration has been applied)
      const { data: rpcProfile, error: rpcError } = await supabase
        .rpc('create_linuxdo_profile', {
          p_linuxdo_user_id: linuxdoUserId,
          p_email: email,
          p_username: username,
          p_avatar_url: avatarUrl || null,
          p_user_data: linuxdoUserInfo || null,
        });

      if (!rpcError && rpcProfile) {
        console.log('Created new Linux.do-only profile via RPC:', rpcProfile);
        return rpcProfile as Profile;
      }

      // Fallback: try direct insert (if RPC function doesn't exist or fails)
      // This will work if the migration has been applied and RLS allows anon access
      const newProfileId = crypto.randomUUID();
      const { data: createdProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: newProfileId,
          email: email,
          full_name: username,
          avatar_url: avatarUrl,
          linuxdo_user_id: linuxdoUserId,
          linuxdo_username: username,
          linuxdo_avatar_url: avatarUrl,
          linuxdo_user_data: linuxdoUserInfo,
          auth_user_id: null, // No Supabase auth user for Linux.do-only accounts
          is_linuxdo_only: true, // Mark as Linux.do-only profile
        } as any)
        .select()
        .single();

      if (insertError) {
        console.error('Error creating Linux.do profile:', insertError);
        console.error('RPC error (if tried):', rpcError);
        // If both methods fail, return null and let the caller handle it (store in localStorage)
        return null;
      }

      console.log('Created new Linux.do-only profile:', createdProfile);
      return createdProfile;
    } catch (error) {
      console.error('Error in findOrCreateProfileByLinuxDoId:', error);
      return null;
    }
  },

  /**
   * Get profile by Linux.do user ID
   */
  async getProfileByLinuxDoId(linuxdoUserId: string): Promise<Profile | null> {
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('linuxdo_user_id', linuxdoUserId)
      .maybeSingle();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No profile found
      }
      console.error('Error fetching profile by Linux.do ID:', error);
      return null;
    }

    return data;
  },

  onAuthStateChange(callback: (user: User | null) => void) {
    if (!supabase) {
      callback(null);
      return { data: { subscription: { unsubscribe: () => {} } } };
    }

    return supabase.auth.onAuthStateChange((_event, session) => {
      callback(session?.user ?? null);
    });
  },

  async resetPassword(email: string) {
    if (!supabase) throw new Error('Supabase not configured');

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) throw error;
  },

  async updatePassword(newPassword: string) {
    if (!supabase) throw new Error('Supabase not configured');

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;
  },
};
