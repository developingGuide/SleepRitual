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
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bgColor] = useState(new Animated.Value(0)); // animated value
  const [now, setNow] = useState(new Date());
  const router = useRouter();
  const listRef = useRef(null);

  const loadPlan = async () => {
    const now = new Date();
    const hour = now.getHours();

    let dateToShow = new Date();

    if (hour < 6) {
      // 🌙 Before 6AM → show yesterday’s plan
      dateToShow.setDate(dateToShow.getDate());
    } else {
      // ☀️ After 6AM → show tomorrow’s plan (because Bedtime saves it as tomorrow)
      dateToShow.setDate(dateToShow.getDate() + 1);
    }

    const key = "plan-" + dateToShow.toDateString();
    let saved = await AsyncStorage.getItem(key);

    if (!saved && hour < 6) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      saved = await AsyncStorage.getItem("plan-" + yesterday.toDateString());
    }

    if (saved) {
      setPlan(JSON.parse(saved));
    } else {
      setPlan(null);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadPlan();
      setLoading(false);
    };
    init();
    updateBackground();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30 * 1000); // update every 30 s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!plan || plan.length === 0) return;

    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // same helper you already made earlier
    const parseToHalfHour = (timeStr) => {
      const lower = timeStr.toLowerCase();
      let [hour, minute] = timeStr.replace(/[^\d:]/g, "").split(":");
      hour = parseInt(hour);
      minute = parseInt(minute || 0);
      if (lower.includes("pm") && hour !== 12) hour += 12;
      if (lower.includes("am") && hour === 12) hour = 0;
      return hour * 60 + minute;
    };

    const nearestIndex = plan.findIndex((item) => {
      const itemMinutes = parseToHalfHour(item.time);
      return (
        (currentMinutes >= itemMinutes && currentMinutes < itemMinutes + 30) ||
        Math.abs(currentMinutes - itemMinutes) < 15
      );
    });

    if (nearestIndex !== -1 && listRef.current) {
      // scroll slightly below the top so header stays visible
      listRef.current.scrollToIndex({
        index: nearestIndex,
        animated: true,
        viewPosition: 0.3,
      });
    }
  }, [plan, now]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPlan();
    setRefreshing(false);
  };

  // 🌇 Change color based on time
  const getColorByTime = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 10) return "#FFF7D1"; // Morning
    if (hour >= 10 && hour < 17) return "#FFFFFF"; // Afternoon
    if (hour >= 17 && hour < 20) return "#FFD6A5"; // Evening
    return "#1A237E"; // Night
  };

  const getTextColorByTime = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 20) return "#000000"; // Morning → Evening: dark text
    return "#FFFFFF"; // Night: white text
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




  const parseToHalfHour = (timeStr) => {
    // handle things like "7:30 PM", "19:00", etc.
    const lower = timeStr.toLowerCase();
    let [hour, minute] = timeStr.replace(/[^\d:]/g, "").split(":");
    hour = parseInt(hour);
    minute = parseInt(minute || 0);
    if (lower.includes("pm") && hour !== 12) hour += 12;
    if (lower.includes("am") && hour === 12) hour = 0;
    return hour * 60 + minute;
};

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
        <Text>Loading your plan...</Text>
      </View>
    );
  }

  return (
    <Animated.View
      style={{
        flex: 1,
        padding: 20,
        backgroundColor: interpolatedColor, // 👈 dynamic bg color
      }}
    >
      {plan ? (
        <>
          <Text style={{ fontSize: 22, fontWeight: "600", marginBottom: 15, color: textColor }}>
            📅 Today’s Plan
          </Text>
          <FlatList
            ref={listRef}
            getItemLayout={(data, index) => ({
              length: 40, // roughly your row height in px
              offset: 40 * index,
              index,
            })}
            data={plan.filter((p) => p.task.trim() !== "")}
            keyExtractor={(item, i) => i.toString()}
            renderItem={({ item }) => {
              const currentMinutes = now.getHours() * 60 + now.getMinutes();
              const itemMinutes = parseToHalfHour(item.time);
              // find nearest 30-min block
              const isNow =
                Math.abs(currentMinutes - itemMinutes) < 15 ||
                (currentMinutes >= itemMinutes && currentMinutes < itemMinutes + 30);

              return (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 10,
                    paddingVertical: 6,
                    backgroundColor: isNow ? "rgba(76, 175, 80, 0.15)" : "transparent",
                    borderRadius: 6,
                  }}
                >
                  {/* marker dot */}
                  <View
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      marginRight: 8,
                      backgroundColor: isNow ? "#4CAF50" : "transparent",
                    }}
                  />
                  <Text
                    style={{
                      width: 70,
                      fontWeight: "500",
                      color: textColor,
                    }}
                  >
                    {item.time}
                  </Text>
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 16,
                      color: textColor,
                      fontWeight: isNow ? "700" : "400",
                    }}
                  >
                    {item.task}
                  </Text>
                </View>
              );
            }}
            refreshing={refreshing}
            onRefresh={onRefresh}
            contentContainerStyle={{ paddingBottom: 80 }}
          />
        </>
      ) : (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Text style={{ fontSize: 18, marginBottom: 15 }}>
            No plan found for today.
          </Text>
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
