import { useEffect, useCallback, useContext, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  BackHandler,
  AppState,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { supabase } from "../lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthContext } from "../context/AuthContext";

export default function Sleeping() {
  const router = useRouter();
  const { session } = useContext(AuthContext);
  const appState = useRef(AppState.currentState);
  const isWakingUp = useRef(false);

  // ✅ Wake up handler
  const handleWakeUp = async () => {
    isWakingUp.current = true;

    const sleepEnd = new Date().toISOString();
    const sleepStart = await AsyncStorage.getItem("sleep_start");

    if (!sleepStart) return console.error("Sleep start not found");

    const userId = session.user.id;
    const durationMinutes =
      (new Date(sleepEnd) - new Date(sleepStart)) / 1000 / 60;

    const { error } = await supabase
      .from("sleep_logs")
      .update({
        sleep_end: sleepEnd,
        duration_minutes: Math.round(durationMinutes),
      })
      .eq("user_id", userId)
      .eq("sleep_start", sleepStart);

    if (error) console.error("Error saving sleep end:", error);

    await AsyncStorage.multiRemove(["sleep_start", "sleep_state_active"]);

    alert(`Woke up! You slept for ${Math.round(durationMinutes)} minutes 😴`);
    router.push("/morning");
  };

  // 🚫 Back button block
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        Alert.alert("Leaving so sooooon..?", "You’re supposed to be sleeping 😴");
        return true;
      };
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress
      );
      return () => subscription.remove();
    }, [])
  );

  // ⚙️ AppState background detection
  useEffect(() => {
    AsyncStorage.setItem("sleep_state_active", "true");

    const subscription = AppState.addEventListener("change", async (nextState) => {
      if (
        appState.current.match(/active|inactive/) &&
        nextState === "background"
      ) {
        if (!isWakingUp.current) {
          console.log("App backgrounded — checking sleep state");

          const sleepStart = await AsyncStorage.getItem("sleep_start");
          if (!sleepStart) return;

          const userId = session.user.id;
          const { error } = await supabase
            .from("sleep_logs")
            .update({
              duration_minutes: 0,
            })
            .eq("user_id", userId)
            .eq("sleep_start", sleepStart);

          if (error) console.error("Error resetting sleep:", error);

          await AsyncStorage.multiRemove(["sleep_start", "sleep_state_active"]);

          Alert.alert("You force-closed your sleep 😠", "Try again later.");
          router.replace("/");
        }
      }
      appState.current = nextState;
    });

    return () => subscription.remove();
  }, [session]);

  // ⚡ Cold start detection (phone off or force-close)
  useEffect(() => {
    (async () => {
      const wasSleeping = await AsyncStorage.getItem("sleep_state_active");
      const sleepStart = await AsyncStorage.getItem("sleep_start");

      if (wasSleeping === "true" && sleepStart) {
        console.log("Cold start detected — checking sleep state");

        const userId = session?.user?.id;
        if (!userId) return;

        const sleepStartTime = new Date(sleepStart).getTime();
        const now = Date.now();
        const timeDiffMinutes = (now - sleepStartTime) / 1000 / 60;

        // If phone was turned off but sleep is still valid (example: less than 12h)
        if (timeDiffMinutes < 720) {
          console.log("Phone turned off during sleep — letting them continue");
          return; // let them continue
        }

        // Else — force close detected
        await supabase
          .from("sleep_logs")
          .update({ duration_minutes: 0 })
          .eq("user_id", userId)
          .eq("sleep_start", sleepStart);

        await AsyncStorage.multiRemove(["sleep_start", "sleep_state_active"]);

        Alert.alert("You force-closed your sleep 😠", "Try again later.");
        router.replace("/");
      }
    })();
  }, []);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
        backgroundColor: "#1A237E",
      }}
    >
      <Text
        style={{
          fontSize: 24,
          fontWeight: "600",
          marginBottom: 20,
          color: "#fff",
        }}
      >
        😴 You’re sleeping now...
      </Text>

      <Text
        style={{
          fontSize: 16,
          color: "#fff",
          marginBottom: 40,
          textAlign: "center",
        }}
      >
        Put your phone away. Rest well.  
        You’ll continue tomorrow morning 🌅
      </Text>

      <TouchableOpacity
        onPress={handleWakeUp}
        style={{
          backgroundColor: "#FF9800",
          padding: 15,
          borderRadius: 10,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
          🌅 Wake Up
        </Text>
      </TouchableOpacity>
    </View>
  );
}
