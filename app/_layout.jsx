import { useEffect, useState, useContext, createContext } from "react";
import { Stack, Redirect } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { StatusBar } from "react-native";
import * as Font from "expo-font";
import * as Notifications from "expo-notifications";

import { supabase } from "../lib/supabase";
import AuthProvider, { AuthContext } from "../context/AuthContext";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function InitialRoute() {
  const { session, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#1A237E" }}>
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

export const OverlayContext = createContext();

export default function Layout() {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [overlay, setOverlay] = useState(null);

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
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#1A237E" }}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <OverlayContext.Provider value={{ overlay, setOverlay }}>
      <View style={{ flex: 1, backgroundColor: "#1A237E" }}>
        <StatusBar style="auto" />
        <AuthProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              animation: "fade",
              presentation: "transparentModal",
              contentStyle: { backgroundColor: "#1A237E" },
            }}
          />
          <InitialRoute />
        </AuthProvider>

        {overlay}
      </View>
    </OverlayContext.Provider>
  );
}
