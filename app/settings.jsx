import React, { useState } from "react";
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../lib/supabase";
import CustomAlert from "../components/CustomAlert";

export default function SettingsPage() {
  const router = useRouter();
  const [youtubeLink, setYoutubeLink] = useState("");
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertAction, setAlertAction] = useState(null);
  const [alertMessage, setAlertMessage] = useState("");

  const saveSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("user_settings")
        .upsert({
          user_id: user.id,
          celebrationType: "youtube",
          youtube_link: youtubeLink,
          updated_at: new Date(),
        });

      if (error) throw error;
      setAlertMessage("✅ Saved Successfully!");
      setAlertAction(() => () => router.replace("/profile"));
      setAlertVisible(true);
    } catch (err) {
      console.error("Error saving settings:", err);
      alert("Failed to save settings");
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <View style={styles.celebrationBody}>
        <Text style={styles.title}>Celebration Settings 🎉</Text>

        <View style={{ width: "100%", marginTop: 20 }}>
          <Text style={styles.label}>YouTube Link:</Text>
          <TextInput
            value={youtubeLink}
            onChangeText={setYoutubeLink}
            placeholder="Paste your YouTube video URL"
            placeholderTextColor="#999"
            style={styles.input}
          />
        </View>

        <TouchableOpacity onPress={saveSettings} style={styles.saveBtn}>
          <Text style={styles.saveText}>Save</Text>
        </TouchableOpacity>
      </View>

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#141338",
    padding: 20,
    alignItems: "center",
  },
  backButton: { alignSelf: "flex-start", marginBottom: 20 },
  celebrationBody: {display: "flex", alignItems: "center",justifyContent: "center", height: 600},
  backText: { color: "#fff", fontSize: 16 },
  title: { color: "#fff", fontSize: 22, fontWeight: "bold", marginBottom: 20 },
  label: { color: "#fff", marginBottom: 8 },
  input: {
    backgroundColor: "rgba(255,255,255,0.1)",
    color: "#fff",
    padding: 10,
    borderRadius: 8,
  },
  saveBtn: {
    backgroundColor: "#252363",
    marginTop: 40,
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 16,
  },
  saveText: { color: "#fff", fontWeight: "600", fontSize: 16 },
});
