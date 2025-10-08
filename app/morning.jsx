import { useState, useEffect, useContext, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  TouchableOpacity,
  Alert,
  Vibration,
  PanResponder,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAudioPlayer } from "expo-audio";
import { supabase } from "../lib/supabase";
import { AuthContext } from "../context/AuthContext";
import Svg, { Circle } from "react-native-svg";

export default function MorningScreen() {
  const [mode, setMode] = useState(null);
  const [gratitudeList, setGratitudeList] = useState(["", "", "", "", ""]);
  const [customMinutes, setCustomMinutes] = useState("5");
  const [timer, setTimer] = useState(300);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef(null);
  const router = useRouter();
  const { session } = useContext(AuthContext);
  const audioSource = require("../assets/chime.mp3");
  const player = useAudioPlayer(audioSource);

  const [dragAngle, setDragAngle] = useState(0);
  const [revolutions, setRevolutions] = useState(0);
  const [manualEdit, setManualEdit] = useState(false);
  const [manualValue, setManualValue] = useState("");
  const [prevAngle, setPrevAngle] = useState(0);
  

  // Meditation Wheel Logic
  useEffect(() => {
    return () => clearInterval(intervalRef.current);
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (e, gestureState) => handleGesture(e),
    })
  ).current;

  const handleGesture = (e) => {
    const { locationX, locationY } = e.nativeEvent;
    const dx = locationX - (RADIUS + STROKE_WIDTH);
    const dy = locationY - (RADIUS + STROKE_WIDTH);

    let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    if (angle < 0) angle += 360;

    // Detect revolution (wrap-around)
    const diff = angle - prevAngle;
    if (diff > 300) {
      // Jumped backwards across 0°
      setRevolutions((r) => Math.max(0, r - 1));
    } else if (diff < -300) {
      // Completed a forward revolution
      setRevolutions((r) => r + 1);
    }

    setPrevAngle(angle);
    setDragAngle(angle);
  };

  const RADIUS = 120;
  const STROKE_WIDTH = 12;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const COLORS = ["#3F51B5", "#4CAF50", "#9C27B0", "#FF9800"];

  const totalAngle = revolutions * 360 + dragAngle;
  const formattedMinutes = Math.max(1, Math.round((totalAngle / 360) * 60));


  const handleManualChange = () => {
    const m = parseInt(manualValue);
    if (!isNaN(m) && m > 0) {
      const totalAngle = Math.min((m / 60) * 360, COLORS.length * 360 - 1);
      setRevolutions(Math.floor(totalAngle / 360));
      setDragAngle(totalAngle % 360);
      setManualEdit(false);
    }
  };

  // 🧠 Shared finish logic for both gratitude & meditation
  const finishMorningRoutine = async (extraData = {}) => {
    try {
      const userId = session.user.id;
      const sleepStart = await AsyncStorage.getItem("sleep_start");
      const sleepEnd = new Date().toISOString();
      await AsyncStorage.setItem("sleep_end", sleepEnd);

      if (!sleepStart) {
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
          gratitude_text: extraData.gratitude_text || null,
          meditation_minutes: extraData.meditation_minutes || null,
        })
        .eq("user_id", userId)
        .eq("sleep_start", sleepStart);

      if (error) {
        console.error(error);
        Alert.alert("Error", "Failed to save morning data.");
        return;
      }

      await AsyncStorage.removeItem("sleep_end");
      Alert.alert(
        "🌞 Morning complete!",
        `You slept for ${formattedDuration} hours 😴`,
        [{ text: "Continue", onPress: () => router.push("/") }]
      );
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Something went wrong while saving your morning entry.");
    }
  };

  // 🧘 Meditation Timer
  const playChime = async () => {
    try {
      player.play();
      Vibration.vibrate(500);
    } catch (err) {
      console.error("Audio error:", err);
    }
  };

  const startTimer = () => {
    if (isRunning) return;
    const totalSeconds = formattedMinutes * 60;
    setTimer(totalSeconds);
    setIsRunning(true);
    intervalRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          setIsRunning(false);
          playChime();
          Alert.alert("✨ Meditation complete!", "Hope you feel centered 🌞", [
            {
              text: "Finish",
              onPress: () => finishMorningRoutine({ meditation_minutes: Math.floor(timer / 60) })
            },
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

    finishMorningRoutine({ gratitude_text: filtered.join(", ") });
  };

  // ---------------- UI -----------------
  if (!mode) {
    return (
      <View
        style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 20 }}
      >
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

    const totalSetSeconds = formattedMinutes * 60;
    const progress = isRunning ? timer / totalSetSeconds : 1;


    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#000" }}>
        <Text style={{ fontSize: 18, fontWeight: "600", marginBottom: 30, color: "white" }}>
          🧘 Set your meditation time
        </Text>

        <View
          {...panResponder.panHandlers}
          style={{ justifyContent: "center", alignItems: "center" }}
        >
          <Svg
            height={2 * (RADIUS + STROKE_WIDTH)}
            width={2 * (RADIUS + STROKE_WIDTH)}
          >
            {/* background ring */}
            <Circle
              cx={RADIUS + STROKE_WIDTH}
              cy={RADIUS + STROKE_WIDTH}
              r={RADIUS}
              stroke="#222"
              strokeWidth={STROKE_WIDTH}
              fill="none"
            />

            {/* full revolutions */}
            {Array.from({ length: revolutions }).map((_, i) => (
              <Circle
                key={i}
                cx={RADIUS + STROKE_WIDTH}
                cy={RADIUS + STROKE_WIDTH}
                r={RADIUS}
                stroke={COLORS[i % COLORS.length]}
                strokeWidth={STROKE_WIDTH}
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={0}
                strokeLinecap="round"
                fill="none"
                transform={`rotate(-90, ${RADIUS + STROKE_WIDTH}, ${RADIUS + STROKE_WIDTH})`}
              />
            ))}

            {/* Active partial arc */}
            <Circle
              cx={RADIUS + STROKE_WIDTH}
              cy={RADIUS + STROKE_WIDTH}
              r={RADIUS}
              stroke={COLORS[revolutions % COLORS.length]}
              strokeWidth={STROKE_WIDTH}
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={
                isRunning
                  ? CIRCUMFERENCE * (1 - progress) // shrink during countdown
                  : CIRCUMFERENCE - (dragAngle / 360) * CIRCUMFERENCE // follow rotation
              }
              strokeLinecap="round"
              fill="none"
              transform={`rotate(-90, ${RADIUS + STROKE_WIDTH}, ${RADIUS + STROKE_WIDTH})`}
            />
          </Svg>

          {/* center number */}
          <View
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: 0,
              right: 0,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {isRunning ? (
              <>
                <Text style={{ fontSize: 48, fontWeight: "bold", color: "#fff" }}>
                  {formatTime(timer)}
                </Text>
                <Text style={{ color: "#aaa", marginTop: 4 }}>remaining</Text>
              </>
            ) : manualEdit ? (
              <TextInput
                value={manualValue}
                onChangeText={setManualValue}
                keyboardType="numeric"
                placeholder={`${formattedMinutes}`}
                onSubmitEditing={handleManualChange}
                onBlur={handleManualChange}
                style={{
                  fontSize: 42,
                  fontWeight: "bold",
                  textAlign: "center",
                  borderBottomWidth: 1,
                  borderColor: "#ccc",
                  width: 100,
                  color: "#fff",
                }}
              />
            ) : (
              <>
                <TouchableOpacity onPress={() => setManualEdit(true)}>
                  <Text style={{ fontSize: 48, fontWeight: "bold", color: "#fff" }}>
                    {formattedMinutes}
                  </Text>
                </TouchableOpacity>
                <Text style={{ color: "#aaa", marginTop: 4 }}>min</Text>
              </>
            )}
          </View>
        </View>

        <TouchableOpacity
          onPress={isRunning ? stopTimer : startTimer}
          style={{
            backgroundColor: isRunning
              ? "#ff4d4d" // 🔴 red for stop
              : COLORS[revolutions % COLORS.length], // original color
            paddingVertical: 12,
            paddingHorizontal: 32,
            borderRadius: 24,
            marginTop: 40,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 18, fontWeight: "600" }}>
            {isRunning ? "Stop" : "Start"}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }
}
