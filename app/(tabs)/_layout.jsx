import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ThemeProvider, useTheme } from "../../context/ThemeContext";
import { SafeAreaView } from "react-native-safe-area-context";

function TabLayout() {
  const { bgColor } = useTheme();
  const { textColor } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#4CAF50", // green accent
        tabBarInactiveTintColor: textColor,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: bgColor,
          borderTopColor: bgColor,
          paddingBottom: 6,
          height: 60,
        },
        animation: "fade",
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

      {/* <Tabs.Screen
        name="competition"
        options={{
          title: "Competition",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="trophy-outline" color={color} size={size} />
          ),
        }}
      /> */}

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
  const { bgColor } = useTheme(); // ✅ now inside the provider

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bgColor }}>
      <TabLayout />
    </SafeAreaView>
  );
}