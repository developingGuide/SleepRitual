import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../lib/supabase";
import CustomAlert from "../components/CustomAlert";

export default function SettingsPage() {
  const router = useRouter();
  const [celebrationType, setCelebrationType] = useState("None");
  const [youtubeLink, setYoutubeLink] = useState("");
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertAction, setAlertAction] = useState(null);
  const [alertMessage, setAlertMessage] = useState("");

  // Load current settings on mount
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("user_settings")
        .select("celebrationType, youtube_link")
        .single();

      if (data) {
        setCelebrationType(data.celebrationType || "None");
        setYoutubeLink(data.youtube_link || "");
      }
    })();
  }, []);

  const saveSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("user_settings")
        .update({
          celebrationType,
          youtube_link: celebrationType === "Video" ? youtubeLink : null,
          updated_at: new Date(),
        })
        .eq(
          'user_id', user.id
        )

      if (error) throw error;

      setAlertMessage("✅ Saved Successfully!");
      setAlertAction(() => () => router.replace("/profile"));
      setAlertVisible(true);
    } catch (err) {
      console.error("Error saving settings:", err);
      alert("Failed to save settings");
    }
  };

  const options = ["None", "Peaceful", "Confetti", "Video"];

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <View style={styles.celebrationBody}>
        <Text style={styles.title}>Celebration Settings 🎉</Text>

        <View style={{ width: "100%", marginTop: 20 }}>
          <Text style={styles.label}>Select Celebration Type:</Text>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[
                styles.optionBtn,
                celebrationType === opt && styles.optionSelected,
              ]}
              onPress={() => setCelebrationType(opt)}
            >
              <Text
                style={[
                  styles.optionText,
                  celebrationType === opt && styles.optionTextSelected,
                ]}
              >
                {opt}
              </Text>
            </TouchableOpacity>
          ))}

          {celebrationType === "Video" && (
            <View style={{ marginTop: 20 }}>
              <Text style={styles.label}>YouTube Link:</Text>
              <TextInput
                value={youtubeLink}
                onChangeText={setYoutubeLink}
                placeholder="Paste your YouTube video URL"
                placeholderTextColor="#999"
                style={styles.input}
              />
            </View>
          )}
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
            alertAction();
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
    backgroundColor: "#222",
    padding: 20,
    alignItems: "center",
  },
  backButton: { alignSelf: "flex-start", marginBottom: 20 },
  celebrationBody: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    width: "100%",
  },
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
  optionBtn: {
    backgroundColor: "#333",
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 12,
    marginVertical: 6,
  },
  optionSelected: { backgroundColor: "#3BE489" },
  optionText: { color: "#fff", fontSize: 16, textAlign: "center" },
  optionTextSelected: { color: "#000", fontWeight: "700" },
});
