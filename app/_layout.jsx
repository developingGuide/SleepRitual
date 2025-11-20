import { useEffect, useState, useContext, createContext } from "react";
import { Stack, Redirect } from "expo-router";
import { View, ActivityIndicator, Platform } from "react-native";
import { StatusBar } from "react-native";
import * as Font from "expo-font";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { supabase } from "../lib/supabase";
import AuthProvider, { AuthContext } from "../context/AuthContext";
import { StripeProvider } from "@stripe/stripe-react-native";
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import { usePathname } from "expo-router";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function InitialRoute() {
  const { session, loading } = useContext(AuthContext);
  const [initialPath, setInitialPath] = useState(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const savedRoute = await AsyncStorage.getItem("last_route");
        const sleepStart = await AsyncStorage.getItem("sleep_start");
        const sleepEnd = await AsyncStorage.getItem("sleep_end");

        // If we were sleeping and haven't logged a wake-up time yet
        if (savedRoute === "/sleeping" && sleepStart && !sleepEnd) {
          setInitialPath("/sleeping");
        } else {
          // Clear sleep tracking if we've completed the cycle or weren't sleeping
          if (sleepEnd) {
            await AsyncStorage.removeItem("sleep_start");
            await AsyncStorage.removeItem("sleep_end");
          }
          setInitialPath(savedRoute || "/");
        }
      } catch (error) {
        console.error("Error checking sleep state:", error);
        setInitialPath("/");
      } finally {
        setIsChecking(false);
      }
    })();
  }, []);

  if (loading || isChecking || initialPath === null) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#222" }}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  // 🔥 Redirect based on login status
  if (session) {
    return <Redirect href={initialPath} />;
  } else {
    return <Redirect href="/(auth)/login" />;
  }
}

export const OverlayContext = createContext();

export default function Layout() {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [overlay, setOverlay] = useState(null);

  const getCustomerInfo = async () => {
    const customerInfo = await Purchases.getCustomerInfo();
    console.log(customerInfo)
  }

  // useEffect(() => {
  //   Purchases.setLogLevel(LOG_LEVEL.VERBOSE);

  //   // if (Platform.OS === 'ios') {
  //   //    Purchases.configure({apiKey: <revenuecat_project_apple_api_key>});
  //   // } else if
  //   if (Platform.OS === 'android') {
  //     Purchases.configure({apiKey: "goog_fdJYlchfRoXYNJjsnXPNpwrPcGB"});
  //   }

  //   // getCustomerInfo()
  // }, []);

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
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#222" }}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <OverlayContext.Provider value={{ overlay, setOverlay }}>
      <View style={{ flex: 1, backgroundColor: "#222" }}>
        <StatusBar style="auto" />
        <StripeProvider publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY}>
          <AuthProvider>
            <Stack
              screenOptions={{
                headerShown: false,
                animation: "fade",
                presentation: "transparentModal",
                contentStyle: { backgroundColor: "#222" },
              }}
            />
            <InitialRoute />
          </AuthProvider>
        </StripeProvider>

        {overlay}
      </View>
    </OverlayContext.Provider>
  );
}
