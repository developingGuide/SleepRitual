import { useEffect, useState, useRef, useContext, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useFocusEffect } from "expo-router";
import { OverlayContext } from "../_layout";
import { supabase } from "../../lib/supabase";
import { AuthContext } from "../../context/AuthContext";
import { scheduleDailyReminder } from "../../lib/Notifications";
import PaywallModal from "../../components/PaywallModal";

export default function Home() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bgColor] = useState(new Animated.Value(0));
  const [now, setNow] = useState(new Date());
  const [showPaywall, setShowPaywall] = useState(false);
  const [currentLogId, setCurrentLogId] = useState()
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
      useNativeDriver: false,
    }).start(() => {
      router.push("/bedtime"); // Navigate after fade out
    });
  };

  // 🧠 Load data (either planner or to-do)
  const loadData = async () => {
    if (!session?.user) return;

    setLoading(true);

    try {
      const { data: logs, error } = await supabase
        .from("sleep_logs")
        .select("id, todo_list, planned_plan, created_at")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) {
        console.log("Error fetching sleep log:", error.message);
        setData(null);
        return;
      }

      if (!logs || logs.length === 0) {
        setData(null);
        return;
      }

      const latestLog = logs[0];
      setCurrentLogId(latestLog.id); // store for later updates

      const hasTodo = Array.isArray(latestLog.todo_list) && latestLog.todo_list.length > 0;
      const hasPlan = Array.isArray(latestLog.planned_plan) && latestLog.planned_plan.length > 0;

      let parsed = null;

      if (hasPlan) {
        parsed = {
          mode: "planner",
          plan: latestLog.planned_plan,
        };
      } else if (hasTodo) {
        parsed = {
          mode: "todo",
          todoList: latestLog.todo_list.map((t, idx) => ({
            id: t.id || `${Date.now()}-${idx}`,
            ...t,
          })),
        };
      }

      setData(parsed);
    } catch (err) {
      console.log("Unexpected error loading data:", err);
    } finally {
      setLoading(false);
    }
  };

  const saveData = async (newData) => {
    if (!session?.user || !currentLogId) return;

    try {
      const { error } = await supabase
        .from("sleep_logs")
        .update({ todo_list: newData.todoList })
        .eq("id", currentLogId)
        .eq("user_id", session.user.id);

      if (error) console.log("Error saving todo list:", error.message);
    } catch (err) {
      console.log("Unexpected error saving:", err);
    }
  };

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const init = async () => {
        setLoading(true);
        await loadData();
        setLoading(false);
        updateBackground();

        Animated.timing(opacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: false,
        }).start();
      };

      if (isActive) init();

      return () => {
        isActive = false;
      };
    }, [])
  );

  useEffect(() => {
    if (!data || data.mode !== "planner" || !data.plan) return;

    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const nearestIndex = data.plan.findIndex((item) => {
      const itemMinutes = parseToHalfHour(item.time);
      return (
        (currentMinutes >= itemMinutes && currentMinutes < itemMinutes + 30) ||
        Math.abs(currentMinutes - itemMinutes) < 15
      );
    });

    
    if (nearestIndex !== -1 && listRef.current) {
      listRef.current.scrollToIndex({
        index: nearestIndex,
        animated: true,
        viewPosition: 0.3,
      });
    }
  }, [data, now]);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    scheduleDailyReminder(21, 0); // schedule next reminder when user sleeps
  }, []);

  // example inside root layout or main App component
  useEffect(() => {
    const checkRoute = async () => {
      const lastRoute = await AsyncStorage.getItem("last_Route");
      if (lastRoute === "/sleeping") router.replace(lastRoute);
    };
    checkRoute();
  }, []);

  useEffect(() => {
    const checkRoutineFlag = async () => {
      const justFinished = await AsyncStorage.getItem("just_finished_routine");
      if (justFinished === "true") {
        await AsyncStorage.removeItem("just_finished_routine");
        handlePaywallCheck();
      }
    };
    checkRoutineFlag();
  }, []);


  useEffect(() => {
    const checkOnboarding = async () => {
      if (!session?.user) return; // Wait for user session

      const { data, error } = await supabase
        .from("user_state")
        .select("has_onboarded")
        .eq("user_id", session.user.id)
        .single();

      if (error && data) {
        console.log("Error checking onboarding:", error.message);
        return;
      }

      if (!data || !data.has_onboarded) {
        router.replace("/onboarding/onboarding");
      }
    };

    checkOnboarding();
  }, [session]);

  const handlePaywallCheck = async () => {
    // 1️⃣ Check if user is paid
    const { data: state, error } = await supabase
      .from("user_state")
      .select("has_paid")
      .eq("user_id", session.user.id)
      .single();

    if (error) {
      console.log("Error checking payment:", error.message);
      return;
    }

    // if user already paid, skip entirely
    if (state?.has_paid) return;

    // 2️⃣ Track morning routine count
    const countStr = await AsyncStorage.getItem("morning_count");
    const count = countStr ? parseInt(countStr) : 0;
    const newCount = count + 1;
    await AsyncStorage.setItem("morning_count", newCount.toString());

    // 3️⃣ Show paywall only when condition met
    if (newCount % 3 === 0) {
      setShowPaywall(true);
      setOverlay(
        <PaywallModal
          onSuccess={async () => {
            await supabase
              .from("user_state")
              .update({ has_paid: true })
              .eq("user_id", session.user.id);

            setShowPaywall(false);
            setOverlay(null); // close overlay after success
          }}
          onClose={() => {
            setShowPaywall(false);
            setOverlay(null);
          }}
        />
      );
    }
  };

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
    return "#6A8DD3"; // Night
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
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#6A8DD3" }}>
        <ActivityIndicator size="large" />
        <Text>Loading your bedtime data...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 20, backgroundColor: "#6A8DD3" }}>
      <Animated.View style={{ flex: 1, opacity }}>
      {data ? (
        <>
          <Text style={{ fontSize: 22, fontWeight: "600", marginBottom: 15, color: "#fff", fontFamily: "Manrope-Bold" }}>
            {data.mode === "planner" ? "Today’s Plan" : "To-Do"}
          </Text>

          {data.mode === "planner" ? (
            <FlatList
              onScrollToIndexFailed={(info) => {
                setTimeout(() => {
                  if (listRef.current) {
                    listRef.current.scrollToIndex({
                      index: info.index,
                      animated: true,
                      viewPosition: 0.3,
                    });
                  }
                }, 500);
              }}
              ref={listRef}
              data={data.plan.filter((p) => p.task.trim() !== "")}
              keyExtractor={(item, i) => i.toString()}
              renderItem={({ item }) => {
                const currentMinutes = now.getHours() * 60 + now.getMinutes();
                const itemMinutes = parseToHalfHour(item.time);

                // highlight if current time falls in this half-hour block
                const isNow =
                  (currentMinutes >= itemMinutes && currentMinutes < itemMinutes + 30) ||
                  Math.abs(currentMinutes - itemMinutes) < 15;

                return (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 10,
                      paddingVertical: 6,
                      backgroundColor: isNow ? "rgba(153, 175, 76, 0.15)" : "transparent",
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
                        backgroundColor: isNow ? "#F9D976" : "transparent",
                      }}
                    />

                    <Text
                      style={{
                        width: 70,
                        fontWeight: "600",
                        color: "#fff",
                        fontFamily: "Manrope-Bold",
                      }}
                    >
                      {item.time}
                    </Text>

                    <Text
                      style={{
                        flex: 1,
                        fontSize: 16,
                        fontFamily: "Manrope-Regular",
                        color: "#fff",
                        fontWeight: isNow ? "700" : "400",
                      }}
                    >
                      {item.task}
                    </Text>
                  </View>
                );
              }}
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
                      onPress={async () => {
                        const updated = data.todoList.map((item) =>
                          item.id === t.id ? { ...item, done: !item.done } : item
                        );

                        const newData = { ...data, todoList: updated };
                        setData(newData);
                        await saveData(newData);

                        await supabase
                          .from("sleep_logs")
                          .update({ todo_list: newData.todoList })
                          .eq("user_id", session.user.id)
                          .order("created_at", { ascending: false })
                          .limit(1);

                        if (!t.done) {
                          // means the user just *completed* it
                          triggerBreathe(t.text);
                        }
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
                          color: "#fff",
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
                          borderColor: t.done ? "#4CAF50" : "rgba(255,255,255,0.5)",
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
          <Text style={{ fontSize: 18, marginBottom: 15, color:"#fff" }}>No bedtime data found for today.</Text>
        </View>
      )}

      {/* Bottom button */}
      <TouchableOpacity
        style={{
          backgroundColor: "#3b6fd5",
          padding: 15,
          borderRadius: 30,
          alignItems: "center",
          marginTop: 15,
        }}
        activeOpacity={0.7}
        onPress={() => {
          fadeOutAndNavigate();
        }}
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
    </View>
  );
}
