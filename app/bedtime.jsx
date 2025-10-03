import { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";

function generateSlots() {
  let slots = [];
  for (let h = 7; h < 23; h++) {
    // 7am - 11pm
    for (let m of [0, 30]) {
      let label = (h < 10 ? "0" + h : h) + ":" + (m === 0 ? "00" : "30");
      slots.push({ time: label, task: "" });
    }
  }
  return slots;
}

export default function BedtimePlanner() {
  const [plan, setPlan] = useState(generateSlots());
  const router = useRouter();

  // keep refs for jumping between inputs
  const inputRefs = useRef([]);

  const updateTask = (index, text) => {
    const newPlan = [...plan];
    newPlan[index].task = text;
    setPlan(newPlan);
  };

  const savePlan = async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateKey = "plan-" + tomorrow.toDateString();
    await AsyncStorage.setItem(dateKey, JSON.stringify(plan));
    alert("✅ Plan saved for tomorrow!");
    router.push("/sleeping"); // 👈 go to sleeping screen
  };


  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={{ flex: 1, padding: 20 }}>
        <Text style={{ fontSize: 22, fontWeight: "600", marginBottom: 15 }}>
          ✍️ Plan Your Tomorrow
        </Text>

        <FlatList
          data={plan}
          keyExtractor={(item, i) => i.toString()}
          renderItem={({ item, index }) => (
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
              <TextInput
                ref={(el) => (inputRefs.current[index] = el)}
                value={item.task}
                onChangeText={(text) => updateTask(index, text)}
                placeholder="Task..."
                returnKeyType="next"
                onSubmitEditing={() => {
                  if (index < plan.length - 1) {
                    inputRefs.current[index + 1].focus();
                  }
                }}
                blurOnSubmit={false}
                style={{
                  borderWidth: 1,
                  borderColor: "#ccc",
                  borderRadius: 8,
                  padding: 10,
                  flex: 1,
                  backgroundColor: "#fff",
                }}
              />
            </View>
          )}
        />

        <TouchableOpacity
          onPress={savePlan}
          style={{
            backgroundColor: "#4CAF50",
            padding: 15,
            borderRadius: 10,
            alignItems: "center",
            marginTop: 10,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
            💾 Save Plan
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
