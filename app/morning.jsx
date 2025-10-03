import { useState } from "react";
import { View, Text, TextInput, Button } from "react-native";
import { useRouter } from "expo-router";

export default function MorningScreen() {
  const [gratitude, setGratitude] = useState("");
  const router = useRouter();

  const finishMorning = () => {
    alert("🌞 Morning ritual done!");
    router.push("/"); // go back to today’s plan
  };

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text>🙏 One thing you’re grateful for:</Text>
      <TextInput
        value={gratitude}
        onChangeText={setGratitude}
        placeholder="Write here..."
        style={{ borderWidth: 1, padding: 10, marginVertical: 10 }}
      />
      <Button title="Finish & See Plan" onPress={finishMorning} />
    </View>
  );
}
