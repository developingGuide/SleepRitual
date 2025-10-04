import { useEffect, useState, useContext } from "react";
import { Stack, useRouter } from "expo-router";
import { supabase } from "../lib/supabase"; // 👈 import your Supabase client
import AuthProvider from "../context/AuthContext";
import { AuthContext } from "../context/AuthContext";
import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";

function InitialRoute() {
  const { session, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  // 🔥 If logged in → go to main app
  // 🚪 If not logged in → go to auth pages
  if (session) {
    return <Redirect href="/" />;
  } else {
    return <Redirect href="/(auth)/login" />;
  }
}

export default function Layout() {
  return (
    <AuthProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          presentation: "card",
          animation: "fade",
          animationDuration: 500,
        }}
      />
      <InitialRoute/>
    </AuthProvider>
  );
}
