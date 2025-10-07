import { useEffect, useState, useContext } from "react";
import { Stack, Redirect } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { StatusBar } from "react-native";
import * as Font from "expo-font";

import { supabase } from "../lib/supabase";
import AuthProvider, { AuthContext } from "../context/AuthContext";

function InitialRoute() {
  const { session, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  // 🔥 Redirect based on login status
  if (session) {
    return <Redirect href="/" />;
  } else {
    return <Redirect href="/(auth)/login" />;
  }
}

export default function Layout() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    const loadFonts = async () => {
      await Font.loadAsync({
        "Manrope-Regular": require("../assets/fonts/Manrope-Regular.ttf"),
        "Manrope-Bold": require("../assets/fonts/Manrope-Bold.ttf")
      });
      setFontsLoaded(true);
    };
    loadFonts();
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="auto" />
      <AuthProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            presentation: "card",
            animation: "fade",
            animationDuration: 500,
          }}
        />
        <InitialRoute />
      </AuthProvider>
    </>
  );
}
