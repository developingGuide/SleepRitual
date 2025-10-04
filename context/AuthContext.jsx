// app/context/AuthContext.jsx
import React, { createContext, useEffect, useState } from "react"
import { supabase } from "../lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const AuthContext = createContext();

export default function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        // 1️⃣ Try to load session from AsyncStorage first
        const stored = await AsyncStorage.getItem("supabase_session");
        if (stored) {
          const parsed = JSON.parse(stored);
          setSession(parsed);
          await supabase.auth.setSession(parsed);
        } else {
          // 2️⃣ Fallback: fetch current session from supabase
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            setSession(session);
            await AsyncStorage.setItem("supabase_session", JSON.stringify(session));
          }
        }
      } catch (err) {
        console.error("Error restoring session:", err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // 3️⃣ Listen for Supabase auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session) {
        await AsyncStorage.setItem("supabase_session", JSON.stringify(session));
      } else {
        await AsyncStorage.removeItem("supabase_session");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // 4️⃣ Expose login function
  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    if (data.session) {
      setSession(data.session);
      await AsyncStorage.setItem("supabase_session", JSON.stringify(data.session));
    }
    return data;
  };

  // 5️⃣ Expose logout function
  const logout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    await AsyncStorage.removeItem("supabase_session");
  };

  return (
    <AuthContext.Provider value={{ session, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
