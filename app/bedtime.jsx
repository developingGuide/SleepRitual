import { useState, useRef, useContext, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Keyboard,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { supabase } from "../lib/supabase";
import { AuthContext } from "../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import CustomAlert from "../components/CustomAlert";

function generateSlots() {
  let slots = [];
  for (let h = 7; h < 23; h++) {
    for (let m of [0, 30]) {
      let label = (h < 10 ? "0" + h : h) + ":" + (m === 0 ? "00" : "30");
      slots.push({ time: label, task: "" });
    }
  }
  return slots;
}

export default function BedtimePlanner() {
  const [mode, setMode] = useState("planner"); // 👈 'planner' | 'todo'
  const [plan, setPlan] = useState(generateSlots());
  const [todoList, setTodoList] = useState([{ text: "", done: false }]);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertAction, setAlertAction] = useState(null);
  const [alertMessage, setAlertMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const inputRefs = useRef([]);
  const router = useRouter();
  const { session } = useContext(AuthContext);

  const opacity = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      opacity.setValue(0); // reset first
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }, [])
  );

  useEffect(() => {
    fetchPrefilledPlan();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem("last_route", "/bedtime");
  }, []);

  const fetchPrefilledPlan = async () => {
    setLoading(true);
    try {
      const userId = session.user.id;

      // 🗓 Step 1: Check if today's plan already exists
      const today = new Date().toISOString().split("T")[0]; // 'YYYY-MM-DD'

      const { data: todayLog, error: todayError } = await supabase
        .from("sleep_logs")
        .select("planned_plan, todo_list, created_at")
        .eq("user_id", userId)
        .gte("created_at", `${today}T00:00:00`)
        .lte("created_at", `${today}T23:59:59`)
        .maybeSingle();

      if (todayError) {
        console.error("Error fetching today's log:", todayError);
      }

      if (todayLog?.planned_plan) {
        console.log("Found today's plan:", todayLog.planned_plan);
        setPlan(todayLog.planned_plan);
        setLoading(false);
        return;
      }

      // 💎 Step 2: Check if user is premium
      const { data: userState, error: userError } = await supabase
        .from("user_state")
        .select("has_paid")
        .eq("user_id", userId)
        .single();

      if (userError) {
        console.error("Error fetching user state:", userError);
        setLoading(false);
        return;
      }

      if (!userState?.has_paid) {
        console.log("User is not premium — starting with empty planner.");
        setLoading(false);
        return;
      }

      // 🕓 Step 3: Fetch last non-null planned_plan
      const { data: lastLog, error: logError } = await supabase
        .from("sleep_logs")
        .select("planned_plan")
        .eq("user_id", userId)
        .not("planned_plan", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (logError) {
        console.error("Error fetching last plan:", logError);
        setLoading(false);
        return;
      }

      if (lastLog?.planned_plan && Array.isArray(lastLog.planned_plan)) {
        console.log("Prefilled from last plan:", lastLog.planned_plan);
        setPlan(lastLog.planned_plan);
      } else {
        console.log("No previous plan found — using default.");
      }


      // 🧩 Step 4: Fetch unfinished tasks from the most recent todo_list
      const { data: lastTodoLog, error: lastTodoError } = await supabase
        .from("sleep_logs")
        .select("todo_list")
        .eq("user_id", userId)
        .not("todo_list", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (lastTodoError) {
        console.error("Error fetching last todo list:", lastTodoError);
      } else if (lastTodoLog?.todo_list && Array.isArray(lastTodoLog.todo_list)) {
        // Filter unfinished ones
        const unfinished = lastTodoLog.todo_list.filter((t) => !t.done && t.text.trim() !== "");
        if (unfinished.length > 0) {
          console.log("Prefilled unfinished tasks:", unfinished);
          setTodoList([...unfinished, { text: "", done: false }]); // add empty line for new entry
        }
      }
    } catch (err) {
      console.error("Unexpected error:", err);
    } finally {
      setLoading(false);
    }
  };


  const updateTask = (index, text) => {
    const newPlan = [...plan];
    newPlan[index].task = text;
    setPlan(newPlan);
  };

  const updateTodo = (index, text) => {
    const newTodos = [...todoList];
    newTodos[index].text = text;
    setTodoList(newTodos);
  };

  const addTodo = () => setTodoList([...todoList, { text: "", done: false }]);

  const saveData = async () => {
    // 🧩 Step 1: Validate inputs before saving
    if (mode === "planner") {
      const hasAtLeastOneTask = plan.some((p) => p.task.trim() !== "");
      if (!hasAtLeastOneTask) {
        setAlertMessage("⚠️ Please fill in at least one task before saving!");
        setAlertVisible(true);
        return;
      }
    } else if (mode === "todo") {
      const allFilled = todoList.every(
        (t) => t.text.trim() !== ""
      );
      if (!allFilled) {
        setAlertMessage("⚠️ Please make sure every to-do has tasks!");
        setAlertVisible(true);
        return;
      }
    }

    // 🕒 Step 2: Continue with normal save
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateKey = "night_data-" + tomorrow.toDateString();

    const dataToSave =
      mode === "planner"
        ? { mode: "planner", plan }
        : { mode: "todo", todoList };

    await AsyncStorage.setItem(dateKey, JSON.stringify(dataToSave));

    const sleepStart = new Date().toISOString();
    await AsyncStorage.setItem("sleep_start", sleepStart);

    const { error } = await supabase.from("sleep_logs").insert([
      {
        user_id: session.user.id,
        sleep_start: sleepStart,
        planned_plan: mode === "planner" ? plan : null,
        todo_list: mode === "todo" ? todoList : null,
      },
    ]);

    if (error) {
      console.error(error);
      setAlertMessage("❌ Failed to save bedtime data.");
      setAlertVisible(true);
      return;
    }

    setAlertMessage("✅ Saved successfully!");
    setAlertAction(() => () => {
      Keyboard.dismiss();
      setTimeout(() => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }).start(() => router.push("/sleeping"));
      }, 100);
    });
    setAlertVisible(true);
  };

  const handleAddAndFocus = () => {
    setTodoList((prev) => {
      const updated = [...prev, { text: "", done: false }];
      // wait for next render to focus
      setTimeout(() => {
        const nextIndex = updated.length - 1;
        inputRefs.current[nextIndex]?.focus();
      }, 100);
      return updated;
    });
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#6A8DD3" }}>
        <Text style={{ color: "#fff", fontSize: 18 }}>Preparing your planner...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <Animated.View 
        style={{
          flex: 1,
          backgroundColor: "#6A8DD3",
          opacity, // 👈 bound to animation
        }}
      >

      <SafeAreaView style={{ flex: 1, padding: 20, backgroundColor: "#6A8DD3" }}>
        <TouchableOpacity
          onPress={() => router.replace('/')}
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

        <Text
          style={{
            fontSize: 22,
            fontWeight: "600",
            marginBottom: 15,
            color: "#fff",
            fontFamily: "Manrope-Bold",
            textAlign: "center",
          }}
        >
          Plan Your Tomorrow
        </Text>

        {/* 🔘 Mode Toggle */}
        <View style={{ flexDirection: "row", justifyContent: "center", marginBottom: 15 }}>
          {["planner", "todo"].map((m) => (
            <TouchableOpacity
              key={m}
              onPress={() => setMode(m)}
              style={{
                backgroundColor: mode === m ? "#3b6fd5" : "rgba(255,255,255,0.08)",
                paddingVertical: 8,
                paddingHorizontal: 20,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: "#3b6fd5",
                marginHorizontal: 5,
                zIndex: 100,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "600", fontFamily: "Manrope-Regular" }}>
                {m === "planner" ? "Planner" : "To-Do List"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>


        {/* 🕓 Planner */}
        {mode === "planner" && (
          <FlatList
            data={plan}
            keyExtractor={(item, i) => i.toString()}
            renderItem={({ item, index }) => (
              <View style={{ flexDirection: "row", marginBottom: 10, alignItems: "center" }}>
                <Text style={{ width: 70, color: "#fff", fontWeight: "500", fontFamily: "Manrope-Bold", fontVariant: ['tabular-nums'] }}>
                  {item.time}
                </Text>
                <TextInput
                  ref={(el) => (inputRefs.current[index] = el)}
                  value={item.task}
                  onChangeText={(text) => updateTask(index, text)}
                  placeholder="Task..."
                  placeholderTextColor="#ccc"
                  returnKeyType="next"
                  onSubmitEditing={() => {
                    if (index < plan.length - 1) inputRefs.current[index + 1]?.focus();
                  }}
                  blurOnSubmit={false}
                  style={{
                    borderWidth: 0,
                    padding: 10,
                    flex: 1,
                    color: "#fff",
                    fontFamily: "Manrope-Regular"
                  }}
                />
              </View>
            )}
          />
        )}

        {/* ✅ To-Do List */}
        {mode === "todo" && (
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {todoList.map((item, i) => (
              <View
                key={i}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 10,
                  width: "85%",
                  gap: 6,
                }}
              >
                {/* Task Text */}
                <TextInput
                  ref={(el) => (inputRefs.current[i] = el)} // 🔗 store ref
                  value={item.text}
                  onChangeText={(text) => updateTodo(i, text)}
                  placeholder={`Task ${i + 1}`}
                  placeholderTextColor="#ccc"
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    color: "#fff",
                    fontFamily: "Manrope-Regular",
                    backgroundColor: "rgba(255,255,255,0.08)",
                    borderRadius: 10,
                  }}
                  onSubmitEditing={() => {
                    // ⏩ Move to next line if available
                    if (i < todoList.length - 1) {
                      inputRefs.current[i + 1]?.focus();
                    } else {
                      handleAddAndFocus(); // add new + focus it
                    }
                  }}
                  blurOnSubmit={false} // keeps keyboard open
                  returnKeyType="next"
                />

                {/* Time Input */}
                <TextInput
                  value={item.time || ""}
                  onChangeText={(t) => {
                    let cleaned = t.replace(/\D/g, "");
                    if (cleaned.length > 4) cleaned = cleaned.slice(0, 4);
                    if (cleaned.length >= 3)
                      cleaned = cleaned.slice(0, 2) + ":" + cleaned.slice(2);
                    const newTodos = [...todoList];
                    newTodos[i].time = cleaned;
                    setTodoList(newTodos);
                  }}
                  placeholder="@09:00"
                  placeholderTextColor="#ccc"
                  keyboardType="numeric"
                  style={{
                    width: 70,
                    textAlign: "center",
                    color: "#fff",
                    fontFamily: "Manrope-Regular",
                    backgroundColor: "rgba(255,255,255,0.08)",
                    borderRadius: 10,
                    paddingVertical: 10,
                  }}
                />

                {/* ❌ Delete */}
                <TouchableOpacity
                  onPress={() => {
                    const filtered = todoList.filter((_, idx) => idx !== i);
                    setTodoList(filtered);
                  }}
                  style={{ padding: 6 }}
                >
                  <Text style={{ color: "#ad1313", fontSize: 18 }}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}

            {/* ➕ Add Button */}
            <TouchableOpacity
              onPress={handleAddAndFocus}
              style={{
                backgroundColor: "#537dd1",
                padding: 10,
                borderRadius: 30,
                alignItems: "center",
                justifyContent: "center",
                width: 50,
                height: 50,
                marginTop: 10,
                shadowColor: "#000",
                shadowOpacity: 0.3,
                shadowOffset: { width: 0, height: 2 },
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              <Text style={{ color: "#fff", fontSize: 22, fontWeight: "600" }}>＋</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          onPress={() => {
            setAlertMessage("Clear everything?");
            setAlertAction(() => () => {
              if (mode === "planner") setPlan(generateSlots());
              else setTodoList([{ text: "", done: false }]);
            });
            setAlertVisible(true);
          }}
          style={{
            backgroundColor: "transparent",
            borderWidth: 1,
            borderColor: "#ad1313",
            padding: 10,
            borderRadius: 25,
            alignItems: "center",
            marginBottom: 10,
            backgroundColor: "rgba(255,255,255,0.08)",
          }}
        >
          <Text style={{ color: "#ad1313", fontSize: 15, fontWeight: "600", fontFamily: "Manrope-Bold" }}>
            Clear All
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={saveData}
          style={{
            backgroundColor: "#3b6fd5",
            padding: 15,
            borderRadius: 25,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600", fontFamily: "Manrope-Bold" }}>Save</Text>
        </TouchableOpacity>
      </SafeAreaView>

      <CustomAlert
        visible={alertVisible}
        message={alertMessage}
        onClose={() => {
          setAlertVisible(false);
          if (alertAction) {
            alertAction(); // ✅ fade + navigate only after alert closes
            setAlertAction(null);
          }
        }}
      />

      </Animated.View>
    </KeyboardAvoidingView>
  );
}
