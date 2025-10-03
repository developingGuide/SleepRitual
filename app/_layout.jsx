import { Stack } from "expo-router";
import * as Notifications from "expo-notifications";

// Notification setup
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function Layout() {
  return (
    <Stack screenOptions={{ headerShown: false }} />
  );
}