import { createClient } from '@supabase/supabase-js';
import { config } from '../config';

// IMPORTANT: For this to be secure, you must enable Row Level Security (RLS) on your Supabase tables.
// The policies should ensure that users can only access their own data.
// This implementation uses an anonymous, locally-stored user ID.
// A full authentication system would be required for true user-specific data security.

export const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);