import { View, Text, Animated } from "react-native";
import { useTheme } from "../../context/ThemeContext";


export default function Profile() {
  const { bgColor } = useTheme();

  return (
    <Animated.View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: bgColor, // 👈 use shared color
      }}
    >
      <Text style={{ color: "black" }}>Profile Page</Text>
    </Animated.View>
  );
}
