import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ThemeProvider, useTheme } from "../../context/ThemeContext";
import { SafeAreaView } from "react-native-safe-area-context";
import { View } from "react-native";

function TabLayout() {
  const { bgColor } = useTheme();
  const { textColor } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#F9D976",
        tabBarInactiveTintColor: "#fff",
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: "#6A8DD3",
          borderTopColor: "#6A8DD3",
          paddingTop: 6,
          height: 60,
        },
        animation: "none",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" color={color} size={size} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <ThemedApp />
    </ThemeProvider>
  );
}

function ThemedApp() {

  return (
    <View style={{ flex: 1, backgroundColor: "#6A8DD3" }}>
      <SafeAreaView style={{ flex: 1 }}>
        <TabLayout />
      </SafeAreaView>
    </View>
  );
}