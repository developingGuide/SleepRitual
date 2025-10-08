import { useState, useRef, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { supabase } from "../lib/supabase";
import { AuthContext } from "../context/AuthContext";

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
  const inputRefs = useRef([]);
  const router = useRouter();
  const { session } = useContext(AuthContext);

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

    // Save sleep start to Supabase
    const sleepStart = new Date().toISOString();
    await AsyncStorage.setItem("sleep_start", sleepStart);

    const { error } = await supabase.from("sleep_logs").insert([
      { user_id: session.user.id, sleep_start: sleepStart },
    ]);

    alert("✅ Saved successfully!");
    router.push("/sleeping");
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <SafeAreaView style={{ flex: 1, padding: 20, backgroundColor: "#1A237E" }}>
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
              <Text style={{ color: "#fff", fontWeight: "600" }}>
                {m === "planner" ? "📅 Planner" : "✅ To-Do List"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text
          style={{
            fontSize: 22,
            fontWeight: "600",
            marginBottom: 15,
            color: "#fff",
          }}
        >
          {mode === "planner" ? "✍️ Plan Your Tomorrow" : "📝 Your To-Do List"}
        </Text>

        {/* 🕓 Planner */}
        {mode === "planner" && (
          <FlatList
            data={plan}
            keyExtractor={(item, i) => i.toString()}
            renderItem={({ item, index }) => (
              <View style={{ flexDirection: "row", marginBottom: 10, alignItems: "center" }}>
                <Text style={{ width: 70, color: "#fff", fontWeight: "500" }}>
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
                    borderWidth: 1,
                    borderColor: "#3949AB",
                    borderRadius: 8,
                    padding: 10,
                    flex: 1,
                    color: "#fff",
                  }}
                />
              </View>
            )}
          />
        )}

        {/* ✅ To-Do List */}
        {mode === "todo" && (
          <View style={{ flex: 1 }}>
            {todoList.map((item, i) => (
              <TextInput
                key={i}
                value={item.text}
                onChangeText={(text) => updateTodo(i, text)}
                placeholder={`Task ${i + 1}`}
                placeholderTextColor="#ccc"
                style={{
                  borderWidth: 1,
                  borderColor: "#3949AB",
                  borderRadius: 8,
                  padding: 10,
                  color: "#fff",
                  marginBottom: 10,
                }}
              />
            ))}
            <TouchableOpacity
              onPress={addTodo}
              style={{
                backgroundColor: "#2196F3",
                padding: 12,
                borderRadius: 8,
                alignItems: "center",
                marginBottom: 15,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "600" }}>＋ Add Task</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          onPress={saveData}
          style={{
            backgroundColor: "#4CAF50",
            padding: 15,
            borderRadius: 10,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>💾 Save</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
