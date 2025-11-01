import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { supabase } from "../lib/supabase";

export default function FeedbackModal({ onClose }) {
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!feedback.trim()) return;

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from("feedback").insert({
      user_id: user?.id,
      feedback_text: feedback,
    });

    setLoading(false);
    if (!error) {
      onClose(); // close modal
    } else {
      console.log("Error:", error);
    }
  }

  return (
    <View style={styles.overlay}>
      <View style={styles.modal}>
        <Text style={styles.title}>Send Feedback</Text>

        <TextInput
          style={styles.input}
          placeholder="Your thoughts, bugs, ideas..."
          placeholderTextColor="#ccc"
          value={feedback}
          multiline
          onChangeText={setFeedback}
        />

        <View style={styles.row}>
          <TouchableOpacity style={styles.btnCancel} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnSend} onPress={handleSubmit}>
            <Text style={styles.sendText}>{loading ? "Sending..." : "Send"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    width: "85%",
    backgroundColor: "#1E1E1E",
    borderRadius: 16,
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 10,
  },
  input: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: "#555",
    borderRadius: 10,
    padding: 10,
    color: "#fff",
    marginBottom: 15,
    textAlignVertical: "top",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  btnCancel: {
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  btnSend: {
    backgroundColor: "#4CAF50",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  cancelText: { color: "#fff" },
  sendText: { color: "#fff", fontWeight: "bold" },
});
