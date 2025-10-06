import { useState, useEffect, useContext } from "react";
import { View, Text, TextInput, Button, Alert } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";
import { AuthContext } from "../context/AuthContext";

export default function MorningScreen() {
  const [gratitude, setGratitude] = useState("");
  const router = useRouter();
  const { session } = useContext(AuthContext);

  const finishMorning = async () => {
    if (!gratitude.trim()) {
      Alert.alert("Hold up!", "Please write something you’re grateful for first 🙏");
      return;
    }

    try {
      const userId = session.user.id;
      const sleepStart = await AsyncStorage.getItem("sleep_start");
      const sleepEnd = await AsyncStorage.getItem("sleep_end");

      if (!sleepStart || !sleepEnd) {
        Alert.alert("⚠️ Missing data", "Could not find your sleep session info.");
        return;
      }

      // Calculate duration (in hours, with 2 decimals)
      const start = new Date(sleepStart);
      const end = new Date(sleepEnd);
      const durationMs = end - start;
      const durationHours = (durationMs / (1000 * 60 * 60)).toFixed(2);

      const totalMinutes = Math.floor(durationMs / 1000 / 60);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      const formattedDuration = `${hours}h ${minutes}m`;

      // Save to Supabase
      const { error } = await supabase
        .from("sleep_logs")
        .update({
          sleep_end: sleepEnd,
          duration_hours: durationHours,
          gratitude_text: gratitude, // optional: if you added this column
        })
        .eq("user_id", userId)
        .eq("sleep_start", sleepStart);

      if (error) {
        console.error(error);
        Alert.alert("Error", "Failed to save sleep session.");
        return;
      }

      // Clean up local data
      await AsyncStorage.removeItem("sleep_end");

      Alert.alert(
        "🌞 Morning complete!",
        `You slept for ${formattedDuration} hours 😴`
      );
      router.push("/");
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Something went wrong while saving your morning entry.");
    }
  };

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 18, fontWeight: "500", marginBottom: 10 }}>
        🙏 One thing you’re grateful for:
      </Text>
      <TextInput
        value={gratitude}
        onChangeText={setGratitude}
        placeholder="Write here..."
        style={{
          borderWidth: 1,
          borderColor: "#aaa",
          padding: 10,
          marginVertical: 10,
          borderRadius: 8,
        }}
      />
      <Button title="Finish & See Plan" onPress={finishMorning} />
    </View>
  );
}
