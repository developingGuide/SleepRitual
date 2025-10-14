import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";

export async function scheduleDailyReminder(hour = 21, minute = 0) {
  try {
    const todayKey = "lastNotificationDate";
    const today = new Date().toDateString();
    const lastScheduled = await AsyncStorage.getItem(todayKey);

    if (lastScheduled === today) {
      // Already scheduled today, do nothing
      return;
    }

    await Notifications.cancelAllScheduledNotificationsAsync(); // optional: prevent duplicates

    const now = new Date();
    let trigger = new Date();
    trigger.setHours(hour);
    trigger.setMinutes(minute);
    trigger.setSeconds(0);

    // if the time has already passed today, schedule for tomorrow
    if (trigger <= now) {
      trigger.setDate(trigger.getDate() + 1);
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "🕯 Time to unwind",
        body: "Prepare for sleep with your nightly ritual 😌",
      },
      trigger,
    });

    // save today as last scheduled
    await AsyncStorage.setItem(todayKey, today);

  } catch (err) {
    console.log("Error scheduling daily reminder:", err);
  }
}
