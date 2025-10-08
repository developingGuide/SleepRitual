import { useState, useEffect, useContext, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  TouchableOpacity,
  Alert,
  Vibration,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Audio } from "expo-av"; // ✅ still correct import
import { supabase } from "../lib/supabase";
import { AuthContext } from "../context/AuthContext";

export default function MorningScreen() {
  const [mode, setMode] = useState(null); // "gratitude" | "meditation"
  const [gratitudeList, setGratitudeList] = useState(["", "", "", "", ""]);
  const [customMinutes, setCustomMinutes] = useState("5"); // user input in minutes
  const [timer, setTimer] = useState(300); // default 5 min
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef(null);
  const router = useRouter();
  const { session } = useContext(AuthContext);

  useEffect(() => {
    return () => clearInterval(intervalRef.current);
  }, []);

  const playChime = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      const { sound } = await Audio.Sound.createAsync(
        require("../assets/chime.mp3")
      );

      await sound.playAsync();
      Vibration.vibrate(500);

      // optional cleanup
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (err) {
      console.error("Audio error:", err);
    }
  };

  const startTimer = () => {
    if (isRunning) return;
    setIsRunning(true);
    intervalRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          setIsRunning(false);
          playChime();
          Alert.alert("✨ Meditation complete!", "Hope you feel centered 🌞", [
            { text: "Finish", onPress: () => router.push("/") },
          ]);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopTimer = () => {
    clearInterval(intervalRef.current);
    setIsRunning(false);
  };

  const setCustomTimer = () => {
    const minutes = parseInt(customMinutes);
    if (isNaN(minutes) || minutes <= 0) {
      Alert.alert("⏰ Invalid time", "Please enter a valid number of minutes.");
      return;
    }
    setTimer(minutes * 60);
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const finishGratitude = async () => {
    const filtered = gratitudeList.map((g) => g.trim()).filter(Boolean);
    if (filtered.length < 1) {
      Alert.alert("Hold up!", "Write at least one thing you’re grateful for 🙏");
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

      const start = new Date(sleepStart);
      const end = new Date(sleepEnd);
      const durationMs = end - start;
      const durationHours = (durationMs / (1000 * 60 * 60)).toFixed(2);
      const totalMinutes = Math.floor(durationMs / 1000 / 60);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      const formattedDuration = `${hours}h ${minutes}m`;

      const { error } = await supabase
        .from("sleep_logs")
        .update({
          sleep_end: sleepEnd,
          duration_hours: durationHours,
          gratitude_text: filtered.join(", "),
        })
        .eq("user_id", userId)
        .eq("sleep_start", sleepStart);

      if (error) {
        console.error(error);
        Alert.alert("Error", "Failed to save sleep session.");
        return;
      }

      await AsyncStorage.removeItem("sleep_end");
      Alert.alert("🌞 Morning complete!", `You slept for ${formattedDuration} hours 😴`);
      router.push("/");
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Something went wrong while saving your morning entry.");
    }
  };

  // ---------------- UI -----------------
  if (!mode) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 20 }}>
        <Text style={{ fontSize: 20, marginBottom: 30 }}>Good morning! 🌅</Text>
        <TouchableOpacity
          onPress={() => setMode("gratitude")}
          style={{
            backgroundColor: "#4CAF50",
            padding: 15,
            borderRadius: 10,
            marginBottom: 15,
            width: "80%",
            alignItems: "center",
          }}
        >
          <Text style={{ color: "white", fontWeight: "600" }}>📝 Gratitude Journal</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setMode("meditation")}
          style={{
            backgroundColor: "#3F51B5",
            padding: 15,
            borderRadius: 10,
            width: "80%",
            alignItems: "center",
          }}
        >
          <Text style={{ color: "white", fontWeight: "600" }}>🧘 Meditation</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (mode === "gratitude") {
    return (
      <View style={{ flex: 1, padding: 20 }}>
        <Text style={{ fontSize: 18, fontWeight: "600", marginBottom: 10 }}>
          🙏 Write 5 things you’re grateful for
        </Text>
        {gratitudeList.map((g, i) => (
          <TextInput
            key={i}
            value={g}
            onChangeText={(text) => {
              const newList = [...gratitudeList];
              newList[i] = text;
              setGratitudeList(newList);
            }}
            placeholder={`#${i + 1}`}
            style={{
              borderWidth: 1,
              borderColor: "#aaa",
              padding: 10,
              marginVertical: 5,
              borderRadius: 8,
            }}
          />
        ))}
        <Button title="Finish & See Plan" onPress={finishGratitude} />
      </View>
    );
  }

  if (mode === "meditation") {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 20 }}>
        <Text style={{ fontSize: 18, fontWeight: "600", marginBottom: 10 }}>
          🧘 Meditation Timer
        </Text>

        <Text style={{ fontSize: 40, fontWeight: "bold", marginBottom: 20 }}>
          {formatTime(timer)}
        </Text>

        <View style={{ flexDirection: "row", gap: 10, marginBottom: 15 }}>
          {[3, 5, 10, 15].map((m) => (
            <TouchableOpacity
              key={m}
              onPress={() => setTimer(m * 60)}
              style={{
                backgroundColor: timer === m * 60 ? "#4CAF50" : "#ddd",
                padding: 10,
                borderRadius: 8,
              }}
            >
              <Text>{m} min</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* custom input */}
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
          <TextInput
            value={customMinutes}
            onChangeText={setCustomMinutes}
            placeholder="Custom (min)"
            keyboardType="numeric"
            style={{
              borderWidth: 1,
              borderColor: "#aaa",
              padding: 8,
              borderRadius: 8,
              width: 100,
              textAlign: "center",
              marginRight: 10,
            }}
          />
          <Button title="Set" onPress={setCustomTimer} />
        </View>

        <TouchableOpacity
          onPress={isRunning ? stopTimer : startTimer}
          style={{
            backgroundColor: isRunning ? "#E91E63" : "#3F51B5",
            padding: 15,
            borderRadius: 10,
            marginTop: 10,
            width: "70%",
            alignItems: "center",
          }}
        >
          <Text style={{ color: "white", fontWeight: "600" }}>
            {isRunning ? "Stop" : "Start"}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }
}
