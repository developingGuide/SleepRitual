import React, { useState } from "react";
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { useRouter } from "expo-router";
import { supabase } from "../lib/supabase";
import * as FileSystem from "expo-file-system";

export default function SettingsPage() {
  const router = useRouter();
  const [celebrationType, setCelebrationType] = useState("youtube"); // 'youtube' | 'video'
  const [youtubeLink, setYoutubeLink] = useState("");
  const [videoFile, setVideoFile] = useState(null);

  const pickVideo = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "video/*",
      });
      if (result.assets && result.assets[0]) {
        setVideoFile(result.assets[0]);
      }
    } catch (err) {
      console.log("Video pick failed:", err);
    }
  };

  const uploadVideo = async (userId, file) => {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}/celebration.${fileExt}`;

      const fileUri = file.uri;

      const fileContents = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const { data, error } = await supabase.storage
        .from("celebration-videos")
        .upload(fileName, Buffer.from(fileContents, "base64"), {
          cacheControl: "3600",
          upsert: true,
          contentType: `video/${fileExt}`,
        });

      if (error) throw error;

      const { publicURL } = supabase.storage
        .from("celebration-videos")
        .getPublicUrl(fileName);

      return publicURL;
    } catch (err) {
      console.error("Video upload error:", err);
      return null;
    }
  };

  const saveSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // let videoURL = videoFile ? await uploadVideo(user.id, videoFile) : null;

      const { error } = await supabase
        .from("user_settings")
        .upsert({
          user_id: user.id,
          celebrationType,
          youtube_link: celebrationType === "youtube" ? youtubeLink : null,
          video_url: celebrationType === "video" ? videoFile : null,
          updated_at: new Date(),
        });

      if (error) throw error;
      alert("Settings saved!");
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

      <Text style={styles.title}>Celebration Settings 🎉</Text>

      <View style={styles.switchRow}>
        <TouchableOpacity
          style={[styles.switchBtn, celebrationType === "youtube" && styles.activeBtn]}
          onPress={() => setCelebrationType("youtube")}
        >
          <Text style={styles.btnText}>YouTube</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.switchBtn, celebrationType === "video" && styles.activeBtn]}
          onPress={() => setCelebrationType("video")}
        >
          <Text style={styles.btnText}>Video Upload</Text>
        </TouchableOpacity>
      </View>

      {celebrationType === "youtube" ? (
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
      ) : (
        <View style={{ width: "100%", marginTop: 20, alignItems: "center" }}>
          <TouchableOpacity onPress={pickVideo} style={styles.uploadBtn}>
            <Text style={styles.uploadText}>
              {videoFile ? "Change Video" : "Upload Celebration Video"}
            </Text>
          </TouchableOpacity>
          {videoFile && (
            <Text style={{ color: "#aaa", marginTop: 10 }}>
              Selected: {videoFile.name}
            </Text>
          )}
        </View>
      )}

      <TouchableOpacity onPress={saveSettings} style={styles.saveBtn}>
        <Text style={styles.saveText}>Save</Text>
      </TouchableOpacity>
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
  backText: { color: "#fff", fontSize: 16 },
  title: { color: "#fff", fontSize: 22, fontWeight: "bold", marginBottom: 20 },
  switchRow: { flexDirection: "row", gap: 10 },
  switchBtn: {
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  activeBtn: { backgroundColor: "#8effc1" },
  btnText: { color: "#fff", fontWeight: "600" },
  label: { color: "#fff", marginBottom: 8 },
  input: {
    backgroundColor: "rgba(255,255,255,0.1)",
    color: "#fff",
    padding: 10,
    borderRadius: 8,
  },
  uploadBtn: {
    backgroundColor: "#8effc1",
    padding: 12,
    borderRadius: 12,
  },
  uploadText: { color: "#000", fontWeight: "bold" },
  saveBtn: {
    backgroundColor: "#252363",
    marginTop: 40,
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 16,
  },
  saveText: { color: "#fff", fontWeight: "600", fontSize: 16 },
});
