import { useState, useRef, useContext, useEffect } from "react";
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
import { useRouter } from "expo-router";
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
  const inputRefs = useRef([]);
  const router = useRouter();
  const { session } = useContext(AuthContext);

  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);


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
          duration: 400,
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

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <Animated.View 
        style={{
          flex: 1,
          opacity, // 👈 bound to animation
        }}
      >

      <SafeAreaView style={{ flex: 1, padding: 20, backgroundColor: "#1A237E" }}>
        <TouchableOpacity
          onPress={() => router.back()}
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
                backgroundColor: mode === m ? "#4CAF50" : "transparent",
                paddingVertical: 8,
                paddingHorizontal: 20,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: "#4CAF50",
                marginHorizontal: 5,
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
                  placeholderTextColor="#888"
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
                  placeholderTextColor="#666"
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
                  <Text style={{ color: "#ff6b6b", fontSize: 18 }}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}

            {/* ➕ Add Button */}
            <TouchableOpacity
              onPress={handleAddAndFocus}
              style={{
                backgroundColor: "#4CAF50",
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
          onPress={saveData}
          style={{
            backgroundColor: "#3949AB",
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
