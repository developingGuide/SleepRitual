import {
  View,
  Text,
  TouchableOpacity,
  Modal
} from "react-native";

export default function CustomAlert({ visible, message, onClose, onConfirm }) {
  if (!visible) return null;

  const handleClose = () => {
    if (onConfirm) onConfirm(); // run custom callback
    onClose(); // close modal afterward
  };

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.6)",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 999,
        }}
      >
        <View
          style={{
            backgroundColor: "#222",
            padding: 25,
            borderRadius: 16,
            width: "80%",
            shadowColor: "#000",
            shadowOpacity: 0.5,
            shadowOffset: { width: 0, height: 3 },
            shadowRadius: 5,
            elevation: 10,
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
              backgroundColor: "#4CAF50",
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
        </View>
      </View>
    </Modal>
  );
}