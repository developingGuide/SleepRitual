import { useEffect, useCallback, useContext, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  BackHandler,
  AppState,
  Animated,
  StyleSheet
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

  const [isMorning, setIsMorning] = useState(false); // 👈 NEW
  const [currentMessage, setCurrentMessage] = useState("You’re sleeping now...");

  const opacity = useRef(new Animated.Value(1)).current;

  const morningFade = useRef(new Animated.Value(0)).current; // 👈 overlay opacity
  const [showMorningOverlay, setShowMorningOverlay] = useState(false);

  // ✅ Wake up handler
  const handleWakeUp = async () => {
    const sleepEnd = new Date().toISOString();
    await AsyncStorage.setItem("sleep_end", sleepEnd);

    await AsyncStorage.removeItem("last_route");
    
    // 👇 Start overlay fade animation
    setShowMorningOverlay(true);
    Animated.timing(morningFade, {
      toValue: 1,
      duration: 1200, // slower fade looks calmer
      useNativeDriver: true,
    }).start(() => {
      router.push("/morning");
    });
  };


  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  // 🕒 Check time every minute
  useEffect(() => {
    const checkTime = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();

      // If it's 5:00 AM or later → mark as morning
      if (hours >= 5 && hours <= 20) {
        setIsMorning(true);
        setCurrentMessage("You’ve slept well.\nLet’s begin today with peace.");
      }
    };

    checkTime(); // run once immediately
    const interval = setInterval(checkTime, 60 * 1000); // check every minute
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    AsyncStorage.setItem("last_route", "/sleeping");
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
          textAlign: "center"
        }}
      >
        {currentMessage}
      </Text>

      {!isMorning && (
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
      )}

      {isMorning && (
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
            Wake Up
          </Text>
        </TouchableOpacity>
      )}

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

      {showMorningOverlay && (
        <Animated.View
          style={{
            ...StyleSheet.absoluteFillObject,
            backgroundColor: "#FFF8E7", // same color as morning page
            opacity: morningFade,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
        </Animated.View>
      )}
    </View>
  );
}
