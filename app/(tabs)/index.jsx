import { useEffect, useState, useRef, useContext } from "react";
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
import { OverlayContext } from "../_layout";
import { supabase } from "../../lib/supabase";
import { AuthContext } from "../../context/AuthContext";

export default function Home() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bgColor] = useState(new Animated.Value(0));
  const [now, setNow] = useState(new Date());
  const router = useRouter();
  const listRef = useRef(null);

  const [showBreathe, setShowBreathe] = useState(false);
  const breatheOpacity = useRef(new Animated.Value(0)).current;
  const breatheY = useRef(new Animated.Value(0)).current;

  const { session } = useContext(AuthContext);

  const affirmations = [
    "Tiny steps are sacred too",
    "One thing at a time",
    "Stillness is progress",
    "Peace counts as productivity",
    "You showed up — that’s enough",
    "Breathe. That’s the reset button.",
    "Slow is smooth, smooth is fast",
  ];
  const [quote, setQuote] = useState("");

  const opacity = useRef(new Animated.Value(1)).current;

  const fadeOutAndNavigate = () => {
    Animated.timing(opacity, {
      toValue: 0,
      duration: 400,
      useNativeDriver: true,
    }).start(() => {
      router.push("/bedtime"); // Navigate after fade out
    });
  };

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

    if (saved) {
      const parsed = JSON.parse(saved);
      // Give each todo an ID if it doesn’t have one
      if (parsed.todoList) {
        parsed.todoList = parsed.todoList.map((t, idx) => ({
          id: t.id || `${Date.now()}-${idx}`,
          ...t,
        }));
      }
      setData(parsed);
    }
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

  const triggerBreathe = (taskText) => {
    const randomQuote = affirmations[Math.floor(Math.random() * affirmations.length)];
    setQuote(randomQuote);

    const localOpacity = new Animated.Value(0);
    const localY = new Animated.Value(0);
    const feelingOpacity = new Animated.Value(0);

    let selectedFeeling = null;

    const feelings = ["Calm", "Tired", "Proud", "Grateful", "Peaceful", "Anxious", "Okay"];

    const FeelingStep = () => (
      <Animated.View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "rgba(0,100,0,0.6)",
          opacity: feelingOpacity,
          paddingHorizontal: 25,
        }}
      >
        <Text
          style={{
            fontSize: 22,
            color: "#fff",
            fontWeight: "600",
            marginBottom: 10,
            textAlign: "center",
          }}
        >
          How are you feeling?
        </Text>

        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", width: "80%" }}>
          {feelings.map((f, i) => (
            <TouchableOpacity
              key={i}
              activeOpacity={0.6}
              onPress={async () => {
                selectedFeeling = f;

                const { error } = await supabase
                  .from("feelings")
                  .insert([
                    {
                      feeling: f,
                      task: taskText, // ✅ save it with the task
                      created_at: new Date().toISOString(),
                      user_id: session.user.id,
                    },
                  ]);

                if (error) console.log("Error saving feeling:", error);

                Animated.timing(feelingOpacity, {
                  toValue: 0,
                  duration: 800,
                  useNativeDriver: true,
                }).start(() => setOverlay(null));
              }}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 16,
                borderRadius: 20,
                backgroundColor: "rgba(255,255,255,0.15)",
                margin: 6,
              }}
            >
              <Text style={{ color: "#fff", fontSize: 15 }}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
    );

    const overlayView = (
      <Animated.View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          height: 850,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "rgba(0,100,0,0.6)",
          opacity: localOpacity,
          transform: [{ translateY: localY }],
          zIndex: 999,
        }}
      >
        <Text style={{ fontSize: 38, color: "#fff", fontWeight: "700", marginBottom: 20 }}>
          Breathe…
        </Text>
        <Text style={{ fontSize: 18, color: "#fff", opacity: 0.8 }}>{randomQuote}</Text>
      </Animated.View>
    );

    setOverlay(overlayView);

    Animated.sequence([
      Animated.parallel([
        Animated.timing(localOpacity, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(localY, { toValue: -30, duration: 2000, useNativeDriver: true }),
      ]),
      Animated.delay(1200),
      Animated.timing(localOpacity, { toValue: 0, duration: 1000, useNativeDriver: true }),
    ]).start(() => {
      // switch to feeling picker
      setOverlay(<FeelingStep />);
      Animated.timing(feelingOpacity, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }).start();
    });
  };

  const { setOverlay } = useContext(OverlayContext);

  
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
  
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
        <Text>Loading your bedtime data...</Text>
      </View>
    );
  }

  return (
    <Animated.View
      style={{
        flex: 1,
        padding: 20,
        backgroundColor: interpolatedColor,
        opacity
      }}
    >
      {data ? (
        <>
          <Text style={{ fontSize: 22, fontWeight: "600", marginBottom: 15, color: textColor, fontFamily: "Manrope-Bold" }}>
            {data.mode === "planner" ? "📅 Today’s Plan" : "✅ Today’s To-Do List"}
          </Text>

          {data.mode === "planner" ? (
            <FlatList
              ref={listRef}
              data={data.plan.filter((p) => p.task.trim() !== "")}
              keyExtractor={(item, i) => i.toString()}
              renderItem={({ item }) => (
                <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 10 }}>
                  <View
                    style={{
                      width: 1,
                      backgroundColor: textColor,
                      opacity: 0.15,
                      marginRight: 10,
                      borderRadius: 1,
                    }}
                  />
                  <Text
                    style={{
                      width: 60,
                      fontSize: 13,
                      color: textColor,
                      opacity: 0.4,
                      textAlign: "right",
                      fontFamily: "Manrope-Bold",
                    }}
                  >
                    {item.time}
                  </Text>
                  <Text
                    style={{
                      color: textColor,
                      flex: 1,
                      fontFamily: "Manrope-Regular",
                      fontSize: 15,
                      marginLeft: 12,
                    }}
                  >
                    {item.task}
                  </Text>
                </View>
              )}
            />
          ) : (
            // ✅ To-Do View
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
              {data.todoList
                .slice()
                .sort((a, b) => (a.done === b.done ? 0 : a.done ? 1 : -1))
                .map((t) => (
                  t.text.trim() !== "" && (
                    <TouchableOpacity
                      key={t.id}
                      onPress={() => {
                        const updated = data.todoList.map((item) =>
                          item.id === t.id ? { ...item, done: !item.done } : item
                        );

                        const newData = { ...data, todoList: updated };
                        setData(newData);

                        if (!t.done) {
                          // means the user just *completed* it
                          triggerBreathe(t.text);
                        }

                        AsyncStorage.setItem(
                          "night_data-" + new Date().toDateString(),
                          JSON.stringify(newData)
                        );
                      }}
                      activeOpacity={0.7}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        width: "90%",
                        paddingVertical: 10,
                        borderBottomWidth: 0.5,
                        borderColor: "rgba(0,0,0,0.1)",
                      }}
                    >
                      <Text
                        style={{
                          flex: 1,
                          fontSize: 16,
                          fontWeight: "500",
                          color: textColor,
                          textDecorationLine: t.done ? "line-through" : "none",
                          opacity: t.done ? 0.5 : 1,
                          fontFamily: "Manrope-Bold",
                        }}
                      >
                        {t.text}
                        {t.time ? (
                          <Text
                            style={{
                              fontSize: 13,
                              opacity: 0.4,
                              fontFamily: "Manrope-Regular",
                            }}
                          >
                            {"  @" + t.time}
                          </Text>
                        ) : null}
                      </Text>

                      <Animated.View
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 11,
                          borderWidth: 1.5,
                          borderColor: t.done ? "#4CAF50" : "rgba(0,0,0,0.25)",
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: t.done ? "rgba(76, 175, 80, 0.1)" : "transparent",
                          transform: [
                            {
                              scale: t.done ? 1 : 0.95,
                            },
                          ],
                        }}
                      >
                        {t.done && (
                          <Animated.View
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: 5,
                              backgroundColor: "#4CAF50",
                              opacity: 0.9,
                            }}
                          />
                        )}
                      </Animated.View>
                    </TouchableOpacity>
                  )
                ))}
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
        style={{
          backgroundColor: "#3F51B5",
          padding: 15,
          borderRadius: 10,
          alignItems: "center",
          marginTop: 15,
        }}
        activeOpacity={0.7}
        onPress={fadeOutAndNavigate}
      >
        <Text
          style={{
            color: "#fff",
            fontFamily: "Manrope-Regular",
            fontSize: 16,
          }}
        >
          😴 Sleeping Now...
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}
