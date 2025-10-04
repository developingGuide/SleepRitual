import { useEffect, useState } from "react";
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
  const router = useRouter();

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

  const updateBackground = () => {
    const color = getColorByTime();
    Animated.timing(bgColor, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: false,
    }).start();
    bgColor.setValue(0); // reset for smooth transition
  };

  const interpolatedColor = bgColor.interpolate({
    inputRange: [0, 1],
    outputRange: ["#FFFFFF", getColorByTime()],
  });

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
          <Text style={{ fontSize: 22, fontWeight: "600", marginBottom: 15 }}>
            📅 Today’s Plan
          </Text>
          <FlatList
            data={plan.filter((p) => p.task.trim() !== "")}
            keyExtractor={(item, i) => i.toString()}
            renderItem={({ item }) => (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                <Text
                  style={{
                    width: 70,
                    fontWeight: "500",
                    color: "#444",
                  }}
                >
                  {item.time}
                </Text>
                <Text style={{ flex: 1, fontSize: 16 }}>{item.task}</Text>
              </View>
            )}
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
