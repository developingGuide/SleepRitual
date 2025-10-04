// lib/supabase.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://aserazwykkmznreqjzbd.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzZXJhend5a2ttem5yZXFqemJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1NTQ3MDMsImV4cCI6MjA3NTEzMDcwM30.-lze9Sxq9WxWO4dg_pudJ4NlC3tlUt1edYiVWmVpc2I";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
