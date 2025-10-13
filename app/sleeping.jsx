import { useEffect, useCallback, useContext, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  BackHandler,
  AppState,
  Animated
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { supabase } from "../lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthContext } from "../context/AuthContext";
import CustomAlert from "../components/CustomAlert";
import { Image } from "react-native";

export default function Sleeping() {
  const router = useRouter();
  const { session } = useContext(AuthContext);
  const appState = useRef(AppState.currentState);
  const isWakingUp = useRef(false);

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertAction, setAlertAction] = useState(null);

  const opacity = useRef(new Animated.Value(1)).current;

  // ✅ Wake up handler
  const handleWakeUp = async () => {
    const sleepEnd = new Date().toISOString();
    await AsyncStorage.setItem("sleep_end", sleepEnd);
    setAlertMessage("🌅 Good morning!!\nLet's start your morning routine! 🌞");

    setAlertAction(() => () => router.push("/morning"));

    setAlertVisible(true);
  };


  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

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
      const prevState = appState.current;
      appState.current = nextState;

      // 🌙 When going background → record time
      if (prevState.match(/active|inactive/) && nextState === "background") {
        const now = Date.now();
        await AsyncStorage.setItem("background_start", String(now));
        console.log("App went background at", new Date(now).toLocaleTimeString());
      }

      // 🌅 When returning active → check how long backgrounded
      if (prevState === "background" && nextState === "active") {
        const backgroundStart = await AsyncStorage.getItem("background_start");
        const sleepStart = await AsyncStorage.getItem("sleep_start");
        if (!backgroundStart || !sleepStart) return;

        const now = Date.now();
        const backgroundDuration = (now - Number(backgroundStart)) / 1000; // in seconds
        const sleepDuration = (now - new Date(sleepStart).getTime()) / 1000 / 60; // in minutes

        console.log(
          `Background duration: ${backgroundDuration}s, Sleep duration: ${sleepDuration}min`
        );

        // 🕒 If background < 30s → user just checked phone or false trigger
        if (backgroundDuration < 30) {
          console.log("Less than 30s background — ignoring");
          return;
        }

        // 🕓 If total sleep < 4h → didn't really sleep
        if (sleepDuration < 1) {
          console.log("Woke up before 4h — not real sleep");
          Alert.alert("You didn’t really sleep 😴", "Try to rest properly!");
          router.replace("/");
        } else {
          console.log("Real sleep detected (>4h) — ignoring");
        }
      }
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
        backgroundColor: "#141338",
      }}
    >
      <Image source={require('../assets/sleeping_mascot.png')} style={{width: 100, height: 100}}/>

      <Text
        style={{
          fontSize: 24,
          fontWeight: "600",
          marginBottom: 20,
          color: "#fff",
        }}
      >
        You’re sleeping now...
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

      <CustomAlert
        visible={alertVisible}
        message={alertMessage}
        onClose={() => {
          setAlertVisible(false);
          setAlertAction(null);
        }}
        onConfirm={() => {
          if (alertAction) {
            alertAction(); // ✅ safely call stored function
            setAlertAction(null);
          }
          setAlertVisible(false);
        }}
      />
    </View>
  );
}
