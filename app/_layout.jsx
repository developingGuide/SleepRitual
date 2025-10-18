import { useEffect, useState, useContext, createContext } from "react";
import { Stack, Redirect, usePathname } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { StatusBar } from "react-native";
import * as Font from "expo-font";
import * as Notifications from "expo-notifications";

import { supabase } from "../lib/supabase";
import AuthProvider, { AuthContext } from "../context/AuthContext";
import { StripeProvider } from "@stripe/stripe-react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const OverlayContext = createContext();

export default function Layout() {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [overlay, setOverlay] = useState(null);

  useEffect(() => {
    const loadFonts = async () => {
      await Font.loadAsync({
        "Manrope-Regular": require("../assets/fonts/Manrope-Regular.ttf"),
        "Manrope-Bold": require("../assets/fonts/Manrope-Bold.ttf"),
      });
      setFontsLoaded(true);
    };
    loadFonts();
  }, []);

  if (!fontsLoaded) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#1A237E",
        }}
      >
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <OverlayContext.Provider value={{ overlay, setOverlay }}>
      <View style={{ flex: 1, backgroundColor: "#1A237E" }}>
        <StatusBar style="auto" />
        <StripeProvider publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY}>
          <AuthProvider>
            <AuthGate>
              <Stack
                screenOptions={{
                  headerShown: false,
                  animation: "fade",
                  presentation: "transparentModal",
                  contentStyle: { backgroundColor: "#1A237E" },
                }}
              />
            </AuthGate>
          </AuthProvider>
        </StripeProvider>
        {overlay}
      </View>
    </OverlayContext.Provider>
  );
}

// 🔐 AuthGate ensures only logged-in users access protected routes
function AuthGate({ children }) {
  const { session, loading } = useContext(AuthContext);
  const pathname = usePathname();

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#1A237E",
        }}
      >
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  // If not logged in → send to login
  if (!session && !pathname.startsWith("/login") && !pathname.startsWith("/signup")) {
    return <Redirect href="/(auth)/login" />;
  }

  // If logged in but on login/register pages → send home
  if (session && pathname.startsWith("/login") && !pathname.startsWith("/signup")) {
    return <Redirect href="/" />;
  }

  // ✅ Otherwise, render normally
  return children;
}
