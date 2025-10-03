import { useEffect } from "react";
import { View, Text, TouchableOpacity, Alert, BackHandler, AppState } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";

export default function Sleeping() {
  const router = useRouter();

  // Handle Android back button
  useFocusEffect(() => {
    const onBackPress = () => {
      Alert.alert("Leaving so sooooon..?", "You’re supposed to be sleeping 😴");
      return true; // prevent going back
    };

    BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () =>
      BackHandler.removeEventListener("hardwareBackPress", onBackPress);
  });

  // Handle app going background/foreground
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "background") {
        Alert.alert("Leaving so sooooon..?", "Go get your rest 😴");
      }
    });
    return () => subscription.remove();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: "600", marginBottom: 20 }}>
        😴 You’re sleeping now...
      </Text>

      <Text style={{ fontSize: 16, color: "#666", marginBottom: 40, textAlign: "center" }}>
        Put your phone away. Rest well.  
        You’ll continue tomorrow morning 🌅
      </Text>

      <TouchableOpacity
        onPress={() => router.push("/morning")}
        style={{
          backgroundColor: "#FF9800",
          padding: 15,
          borderRadius: 10,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
          🌅 Wake Up
        </Text>
      </TouchableOpacity>
    </View>
  );
}
