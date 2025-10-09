import { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";

export default function Home() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bgColor] = useState(new Animated.Value(0));
  const [now, setNow] = useState(new Date());
  const router = useRouter();
  const listRef = useRef(null);

  // 🧠 Load data (either planner or to-do)
  const loadData = async () => {
    const now = new Date();
    const hour = now.getHours();
    let dateToShow = new Date();

    if (hour >= 6) dateToShow.setDate(dateToShow.getDate() + 1);
    const key = "night_data-" + dateToShow.toDateString();

    let saved = await AsyncStorage.getItem(key);

    // fallback to yesterday if early morning
    if (!saved && hour < 6) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      saved = await AsyncStorage.getItem("night_data-" + yesterday.toDateString());
    }

    if (saved) setData(JSON.parse(saved));
    else setData(null);
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadData();
      setLoading(false);
    };
    init();
    updateBackground();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30 * 1000);
    return () => clearInterval(interval);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // 🌇 Background color logic
  const getColorByTime = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 10) return "#FFF7D1"; // Morning
    if (hour >= 10 && hour < 17) return "#FFFFFF"; // Afternoon
    if (hour >= 17 && hour < 20) return "#FFD6A5"; // Evening
    return "#1A237E"; // Night
  };

  const getTextColorByTime = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 20) return "#000000";
    return "#FFFFFF";
  };

  const [currentColor, setCurrentColor] = useState(getColorByTime());
  const [textColor, setTextColor] = useState(getTextColorByTime());

  const updateBackground = () => {
    const newColor = getColorByTime();
    const newTextColor = getTextColorByTime();
    bgColor.setValue(0);
    Animated.timing(bgColor, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: false,
    }).start(() => {
      setCurrentColor(newColor);
      setTextColor(newTextColor);
    });
  };

  const interpolatedColor = bgColor.interpolate({
    inputRange: [0, 1],
    outputRange: [currentColor, getColorByTime()],
  });

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
        <Text>Loading your bedtime data...</Text>
      </View>
    );
  }

  // helper for planner view
  const parseToHalfHour = (timeStr) => {
    const lower = timeStr.toLowerCase();
    let [hour, minute] = timeStr.replace(/[^\d:]/g, "").split(":");
    hour = parseInt(hour);
    minute = parseInt(minute || 0);
    if (lower.includes("pm") && hour !== 12) hour += 12;
    if (lower.includes("am") && hour === 12) hour = 0;
    return hour * 60 + minute;
  };

  return (
    <Animated.View
      style={{
        flex: 1,
        padding: 20,
        backgroundColor: interpolatedColor,
      }}
    >
      {data ? (
        <>
          <Text style={{ fontSize: 22, fontWeight: "600", marginBottom: 15, color: textColor }}>
            {data.mode === "planner" ? "📅 Today’s Plan" : "✅ Today’s To-Do List"}
          </Text>

          {data.mode === "planner" ? (
            <FlatList
              ref={listRef}
              data={data.plan.filter((p) => p.task.trim() !== "")}
              keyExtractor={(item, i) => i.toString()}
              renderItem={({ item }) => (
                <View style={{ flexDirection: "row", marginBottom: 10 }}>
                  <Text style={{ width: 70, color: textColor }}>{item.time}</Text>
                  <Text style={{ color: textColor, flex: 1 }}>{item.task}</Text>
                </View>
              )}
            />
          ) : (
            <View>
              {data.todoList.map(
                (t, i) =>
                  t.text.trim() !== "" && (
                    <Text
                      key={i}
                      style={{
                        color: textColor,
                        marginBottom: 10,
                        fontSize: 16,
                        fontWeight: "500",
                        fontFamily: "Manrope-Regular",
                      }}
                    >
                      • {t.text} {t.time ? `@${t.time}` : ""}
                    </Text>
                  )
              )}
            </View>
          )}
        </>
      ) : (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ fontSize: 18, marginBottom: 15 }}>No bedtime data found for today.</Text>
        </View>
      )}

      {/* Bottom button */}
      <TouchableOpacity
        onPress={() => router.push("/bedtime")}
        style={{
          backgroundColor: "#4CAF50",
          padding: 15,
          borderRadius: 10,
          alignItems: "center",
          marginTop: 15,
        }}
      >
        <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
          😴 Sleeping Now...
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}
