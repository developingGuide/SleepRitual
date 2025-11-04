import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Animated,
  StatusBar,
} from "react-native";

export default function CustomAlert({ visible, message, onClose, onConfirm }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    } else {
      // Reset immediately when closing
      fadeAnim.setValue(0);
    }
  }, [visible]);

  if (!visible) return null;

  const handleClose = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 400,
      useNativeDriver: true,
    }).start(() => {
      if (onConfirm) onConfirm();
      onClose();
    });
  };

  return (
    <Modal transparent visible={visible} animationType="none">
      <Animated.View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.6)",
          justifyContent: "center",
          alignItems: "center",
          opacity: fadeAnim,
        }}
      >
        <StatusBar style="auto" />
        <Animated.View
          style={{
            backgroundColor: "#222",
            padding: 25,
            borderRadius: 16,
            width: "80%",
          }}
        >
          <Text
            style={{
              color: "#fff",
              fontSize: 16,
              textAlign: "center",
              marginBottom: 30,
              fontFamily: "Manrope-Bold",
            }}
          >
            {message}
          </Text>

          <TouchableOpacity
            onPress={handleClose}
            style={{
              backgroundColor: "#252363",
              paddingVertical: 10,
              borderRadius: 10,
            }}
          >
            <Text
              style={{
                textAlign: "center",
                color: "#fff",
                fontWeight: "600",
                fontFamily: "Manrope-Bold",
              }}
            >
              OK
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}