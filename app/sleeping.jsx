import { useEffect, useCallback, useContext } from "react";
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
  const { session, loading } = useContext(AuthContext);

  const handleWakeUp = async () => {
    const sleepEnd = new Date().toISOString();

    const sleepStart = await AsyncStorage.getItem("sleep_start");
    if (!sleepStart) {
      console.error("Sleep start not found");
      return;
    }

    const userId = session.user.id;

    const durationMinutes =
      (new Date(sleepEnd) - new Date(sleepStart)) / 1000 / 60;

    // Save to Supabase
    const { error } = await supabase
      .from("user_state")
      .update({
        sleep_end: sleepEnd,
        duration_minutes: Math.round(durationMinutes),
      })
      .eq("user_id", userId)
      .eq("sleep_start", sleepStart); //Latest change after working

    if (error) console.error("Error saving sleep end:", error);

    alert(
      `Woke up! You slept for ${Math.round(durationMinutes)} minutes 😴`
    );

    router.push("/morning");
  };

  // Handle Android back button
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        Alert.alert("Leaving so sooooon..?", "You’re supposed to be sleeping 😴");
        return true; // prevent going back
      };

      // ✅ Add event listener properly
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress
      );

      // ✅ Cleanup when screen loses focus
      return () => subscription.remove();
    }, [])
  );

  // Handle app going background/foreground
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "background") {
        Alert.alert("Leaving so sooooon..?", "Go get your rest 😴");
      }
    });

    return () => subscription.remove();
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
