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
  Animated,
  Platform,
  Easing
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAudioPlayer } from "expo-audio";
import { supabase } from "../lib/supabase";
import { AuthContext } from "../context/AuthContext";
import Svg, { Circle } from "react-native-svg";
import CustomAlert from "../components/CustomAlert";
import { Ionicons } from "@expo/vector-icons";
import { KeyboardAvoidingView } from "react-native";

export default function MorningScreen() {
  const [mode, setMode] = useState(null);
  const [gratitudeList, setGratitudeList] = useState(["", "", "", "", ""]);
  const [customMinutes, setCustomMinutes] = useState("5");
  const [timer, setTimer] = useState(300);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef(null);
  const inputRefs = useRef([]); // store refs for each input
  const router = useRouter();
  const { session } = useContext(AuthContext);
  const audioSource = require("../assets/chime.mp3");
  const player = useAudioPlayer(audioSource);

  const [dragAngle, setDragAngle] = useState(0);
  const [revolutions, setRevolutions] = useState(0);
  const [manualEdit, setManualEdit] = useState(false);
  const [manualValue, setManualValue] = useState("");
  const [prevAngle, setPrevAngle] = useState(0);

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertAction, setAlertAction] = useState(null);
  
  const opacity = useRef(new Animated.Value(1)).current;
  const modeOpacity = useRef(new Animated.Value(0)).current;

  const gratitudePrompts = [
    "I am grateful for...",
    "Did anyone say thank you to you today?",
  ];

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const [promptIndex, setPromptIndex] = useState(0);
  
  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem("last_route", "/");
  }, []);

  // Meditation Wheel Logic
  useEffect(() => {
    return () => clearInterval(intervalRef.current);
  }, []);

  useEffect(() => {
    const switchPrompt = () => {
      // fade out first
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 600,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        // after fade out completes, switch text
        setPromptIndex((p) => (p + 1) % gratitudePrompts.length);

        // then fade in new text
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }).start();
      });
    };

    const id = setInterval(switchPrompt, 10000); // every 10 seconds
    return () => clearInterval(id);
  }, [fadeAnim]);

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
        setAlertMessage("⚠️ Missing data\nCould not find your sleep session info.");
        setAlertVisible(true);
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
        setAlertMessage("❌ Failed to save morning data.");
        setAlertVisible(true);
        return;
      }

      await AsyncStorage.removeItem("sleep_end");

      setAlertMessage("✨ Morning complete!\nLet's start the day! 🌞");

      await AsyncStorage.setItem("just_finished_routine", "true");

      // ✅ set navigation callback after save
      setAlertAction(() => () => router.replace("/"));

      setAlertVisible(true);
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
    setIsRunning(true);``
    intervalRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          setIsRunning(false);
          playChime();

          setAlertMessage("✨ Meditation complete!\nHope you feel centered 🌞");

          // Store navigation as a callback (not executed yet)
          setAlertAction(() => () => router.replace("/"));

          setAlertVisible(true);
          finishMorningRoutine({ meditation_minutes: formattedMinutes });
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
      setAlertMessage("⏰ Invalid time", "Please enter a valid number of minutes.");
      setAlertVisible(true);
      return;
    }
    setRevolutions(Math.floor(minutes / 60));
    setDragAngle(((minutes % 60) / 60) * 360);
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const finishGratitude = async () => {
    // 🧩 Validate gratitude entries
    const trimmedList = gratitudeList.map((g) => g.trim());
    const filled = trimmedList.filter(Boolean);

    if (filled.length < 5) {
      setAlertMessage("⚠️ Please write at least five thing you’re grateful for 🙏");
      setAlertVisible(true);
      return;
    }

    try {
      await finishMorningRoutine({ gratitude_text: filled.join(", ") });
    } catch (err) {
      console.error(err);
      setAlertMessage("❌ Something went wrong saving your gratitude entry.");
      setAlertVisible(true);
    }
  };

  // ---------------- UI -----------------
  if (!mode || mode === null) {
    const handleModeSelect = (choice) => {
      // fade out bright screen
      Animated.timing(opacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        setMode(choice);
        // fade in new mode (meditation or gratitude)
        Animated.timing(modeOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }).start();
      });
    };

    return (
      <View style={{backgroundColor: "#FFF8E7", flex: 1}}>
      <Animated.View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 20,
          backgroundColor: "#FFF8E7",
          opacity: opacity, // 🔥 fade control here
        }}
      >
        <Text
          style={{
            fontSize: 28,
            fontFamily: "Manrope-Bold",
            color: "#2E2A1E",
            marginBottom: 8,
          }}
        >
          Good morning 🌤️
        </Text>

        <Text
          style={{
            fontSize: 17,
            color: "#5B564B",
            fontFamily: "Manrope-Regular",
            marginBottom: 35,
          }}
        >
          How do you want to begin your day?
        </Text>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-evenly",
            width: "100%",
          }}
        >
          {/* Gratitude */}
          <TouchableOpacity
            onPress={() => handleModeSelect("gratitude")}
            style={{
              flex: 1,
              aspectRatio: 1,
              marginHorizontal: 10,
              borderRadius: 25,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "#FFE7A0",
            }}
          >
            <Text style={{ fontSize: 44, marginBottom: 8 }}>☕</Text>
            <Text
              style={{
                color: "#6B4C00",
                fontFamily: "Manrope-SemiBold",
                fontSize: 16,
              }}
            >
              Gratitude
            </Text>
          </TouchableOpacity>

          {/* Meditation */}
          <TouchableOpacity
            onPress={() => handleModeSelect("meditation")}
            style={{
              flex: 1,
              aspectRatio: 1,
              marginHorizontal: 10,
              borderRadius: 25,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "#C7EBD9",
            }}
          >
            <Text style={{ fontSize: 44, marginBottom: 8 }}>🌿</Text>
            <Text
              style={{
                color: "#184C3C",
                fontFamily: "Manrope-SemiBold",
                fontSize: 16,
              }}
            >
              Meditation
            </Text>
          </TouchableOpacity>
        </View>

        <Text
          style={{
            marginTop: 45,
            color: "#8C8575",
            fontSize: 15,
            fontStyle: "italic",
          }}
        >
          “Every sunrise brings a new beginning.”
        </Text>
      </Animated.View>
      </View>
    );
  }

  if (mode === "gratitude") {
    const handleNextInput = (index) => {
      if (index < gratitudeList.length - 1) {
        inputRefs.current[index + 1].focus();
      } else {
        inputRefs.current[index].blur(); // close keyboard at the end
      }
    };

    return (
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
      <View
        style={{
          flex: 1,
          backgroundColor: "#FFF7D1",
          paddingHorizontal: 20,
          paddingVertical: 40,
        }}
      >
        <TouchableOpacity
          onPress={() => {
            // fade out current mode first
            Animated.timing(modeOpacity, {
              toValue: 0,
              duration: 500,
              useNativeDriver: true,
            }).start(() => {
              // switch back to mode select
              setMode(null);
              // fade in the main screen again
              Animated.timing(opacity, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
              }).start();
            });
          }}
          style={{
            position: "absolute",
            top: 15,
            left: 15,
            zIndex: 10,
            padding: 8,
          }}
        >
          <Ionicons name="chevron-back" size={26} color="#000" />
        </TouchableOpacity>

        {/* Centered content */}
        <View style={{ flex: 1, justifyContent: "center" }}>
          <Animated.Text
            style={{
              fontSize: 20,
              fontWeight: "700",
              textAlign: "center",
              marginBottom: 20,
              opacity: fadeAnim, // animated opacity object
            }}
          >
            {gratitudePrompts[promptIndex]}
          </Animated.Text>


          {gratitudeList.map((g, i) => (
            <TextInput
            key={i}
            ref={(ref) => (inputRefs.current[i] = ref)}
            value={g}
            onChangeText={(text) => {
                const newList = [...gratitudeList];
                newList[i] = text;
                setGratitudeList(newList);
              }}
              blurOnSubmit={false}
              placeholder={`#${i + 1}`}
              placeholderTextColor={"#848484"}
              returnKeyType={i === gratitudeList.length - 1 ? "done" : "next"}
              onSubmitEditing={() => handleNextInput(i)} // ✅ go to next input
              style={{
                padding: 12,
                marginVertical: 6,
                fontSize: 16,
              }}
              />
          ))}
        </View>

        {/* Bottom button */}
        <TouchableOpacity
          onPress={finishGratitude}
          activeOpacity={0.8}
          style={{
            backgroundColor: "#4CAF50",
            alignItems: "center",
            justifyContent: "center",
            width: 50,
            height: 50,
            borderRadius: 25,
            alignSelf: "flex-end",
            right: 10,
          }}
        >
          <Text
            style={{
              color: "white"
            }}
          >
            <Ionicons name="checkmark" color="#fff" size={25}/>
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
      </KeyboardAvoidingView>
    );
  }

  if (mode === "meditation") {

    const totalSetSeconds = formattedMinutes * 60;
    const progress = isRunning ? timer / totalSetSeconds : 1;


    return (
      <Animated.View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#000", opacity: modeOpacity }}>
        <TouchableOpacity
          onPress={() => {
            // fade out current mode first
            Animated.timing(modeOpacity, {
              toValue: 0,
              duration: 400,
              useNativeDriver: true,
            }).start(() => {
              // switch back to mode select
              setMode(null);
              // fade in the main screen again
              Animated.timing(opacity, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
              }).start();
            });
          }}
          style={{
            position: "absolute",
            top: 15,
            left: 15,
            zIndex: 10,
            padding: 8,
          }}
        >
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </TouchableOpacity>

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
      </Animated.View>
    );
  }
}