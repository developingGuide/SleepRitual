import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { supabase } from "../../lib/supabase";
import { SafeAreaView } from "react-native-safe-area-context";
import { BarChart } from "react-native-gifted-charts";
import { useFocusEffect } from "expo-router";

export default function Profile() {
  const { bgColor, textColor } = useTheme();
  const [sleepData, setSleepData] = useState([]);
  const [streak, setStreak] = useState(0);
  const [totalHours, setTotalHours] = useState(0);
  const [gratitudeHistory, setGratitudeHistory] = useState([]);
  const [journalHistory, setJournalHistory] = useState([]);
  const [meditationHistory, setMeditationHistory] = useState([]);
  const [activeTab, setActiveTab] = useState("gratitude");
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      console.log("🔁 Profile focused");
      setLoading(true);
      fetchSleepData().then(() => console.log("✅ Data fetched"));
    }, [])
  );

  async function fetchSleepData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("sleep_logs")
        .select(
          "sleep_start, duration_hours, gratitude_text, meditation_minutes, created_at"
        )
        .eq("user_id", user.id)
        .order("sleep_start", { ascending: false });

      if (error) throw error;

      // --- Total Sleep This Week ---
      const total = data
        .slice(0, 7)
        .reduce((sum, d) => sum + (parseFloat(d.duration_hours) || 0), 0);
      setTotalHours(total);

      // --- Chart Data ---
      const allDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      const dataMap = {};
      data.forEach((row) => {
        const d = new Date(row.sleep_start);
        const day = d.toLocaleDateString("en-US", { weekday: "short" });
        dataMap[day] = row.duration_hours;
      });
      const formatted = allDays.map((day) => ({
        label: day,
        value: parseFloat(dataMap[day]) || 0,
      }));
      setSleepData(formatted);

      // --- Streak ---
      calculateStreak(data);

      // --- History Data ---
      setGratitudeHistory(
        data
          .filter((d) => d.gratitude_text?.trim())
          .slice(0, 7)
          .map((d) => ({
            date: new Date(d.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            }),
            items: d.gratitude_text.split(",").map((i) => i.trim()),
          }))
      );

      setJournalHistory(
        data
          .filter((d) => d.journal_text?.trim())
          .slice(0, 7)
          .map((d) => ({
            date: new Date(d.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            }),
            text: d.journal_text,
          }))
      );

      setMeditationHistory(
        data
          .filter((d) => d.meditation_minutes)
          .slice(0, 7)
          .map((d) => ({
            date: new Date(d.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            }),
            minutes: d.meditation_minutes,
          }))
      );
    } catch (err) {
      console.error("Error fetching sleep data:", err);
    } finally {
      setLoading(false);
    }
  }

  function calculateStreak(rows) {
    if (!rows.length) return setStreak(0);
    const sorted = [...rows].sort(
      (a, b) => new Date(a.sleep_start) - new Date(b.sleep_start)
    );
    let streakCount = 1;
    for (let i = sorted.length - 2; i >= 0; i--) {
      const d1 = new Date(sorted[i].sleep_start);
      const d2 = new Date(sorted[i + 1].sleep_start);
      const diffDays = Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) streakCount++;
      else if (diffDays > 1) break;
    }
    setStreak(streakCount);
  }

  if (loading)
    return (
      <View style={[styles.center, { backgroundColor: "#1A237E" }]}>
        <ActivityIndicator size="large" color="#8effc1" />
      </View>
    );

  const renderActiveHistory = () => {
    switch (activeTab) {
      case "gratitude":
        return gratitudeHistory.length === 0 ? (
          <Text style={styles.emptyText}>No gratitude entries yet 🌙</Text>
        ) : (
          gratitudeHistory.map((entry, index) => (
            <View key={index} style={styles.card}>
              <Text style={styles.cardDate}>{entry.date}</Text>
              <View style={styles.tagsRow}>
                {entry.items.map((item, i) => (
                  <View key={i} style={styles.tag}>
                    <Text style={styles.tagText}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))
        );
      case "journal":
        return journalHistory.length === 0 ? (
          <Text style={styles.emptyText}>No journal entries yet ✍️</Text>
        ) : (
          journalHistory.map((entry, index) => (
            <View key={index} style={styles.card}>
              <Text style={styles.cardDate}>{entry.date}</Text>
              <Text style={styles.cardText}>{entry.text}</Text>
            </View>
          ))
        );
      case "meditation":
        return meditationHistory.length === 0 ? (
          <Text style={styles.emptyText}>No meditation sessions yet 🧘‍♂️</Text>
        ) : (
          meditationHistory.map((entry, index) => (
            <View key={index} style={styles.card}>
              <Text style={styles.cardDate}>{entry.date}</Text>
              <Text style={styles.cardText}>
                {entry.minutes} mins of peace
              </Text>
            </View>
          ))
        );
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: "#1A237E" }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* --- WEEK OVERVIEW --- */}
        <View style={styles.overviewBox}>
          <Text style={styles.overviewTitle}>This Week</Text>
          <Text style={styles.totalHours}>{totalHours.toFixed(1)} hrs</Text>
          <Text style={styles.subtext}>Total Sleep</Text>
          <View style={styles.streakBubble}>
            <Text style={styles.streakNumber}>{streak} 🔥</Text>
            <Text style={styles.subtext}>Day Streak</Text>
          </View>
        </View>

        {/* --- CHART --- */}
        <View style={styles.chartBox}>
          <Text style={styles.sectionTitle}>Sleep Hours</Text>
          <BarChart
            data={sleepData}
            width={255}
            barWidth={16}
            frontColor="#7DF9B8"
            barBorderRadius={6}
            xAxisLabelTextStyle={{ color: "#ccc", fontSize: 11 }}
            yAxisTextStyle={{ color: "#999", fontSize: 11 }}
            height={200}
            noOfSections={4}
            maxValue={12}
            yAxisThickness={0}
            xAxisThickness={0}
            hideRules
          />
        </View>

        {/* --- HISTORY SECTION --- */}
        <View style={styles.historyBox}>
          <View style={styles.tabsRow}>
            {["gratitude", "meditation"].map((tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[
                  styles.tabButton,
                  activeTab === tab && styles.tabButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === tab && styles.tabTextActive,
                  ]}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.historyContent}>{renderActiveHistory()}</View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  overviewBox: {
    backgroundColor: "#121212",
    borderRadius: 20,
    padding: 24,
    margin: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  overviewTitle: { color: "#8EFFC1", fontSize: 18, marginBottom: 8 },
  totalHours: { color: "#fff", fontSize: 46, fontWeight: "700" },
  subtext: { color: "#aaa", fontSize: 14 },
  streakBubble: {
    marginTop: 16,
    backgroundColor: "#1e1e1e",
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 14,
  },
  streakNumber: { color: "#8EFFC1", fontSize: 20, fontWeight: "bold", textAlign:"center" },

  chartBox: {
    backgroundColor: "#121212",
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 10,
    alignItems: "center",
  },
  sectionTitle: { color: "#8EFFC1", fontSize: 18, marginBottom: 12 },

  historyBox: {
    backgroundColor: "#0E1913",
    borderRadius: 20,
    margin: 16,
    padding: 16,
  },
  tabsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 14,
  },
  tabButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  tabButtonActive: { backgroundColor: "#1E3C2B" },
  tabText: { color: "#888", fontSize: 14 },
  tabTextActive: { color: "#8EFFC1", fontWeight: "600" },

  historyContent: { marginTop: 4 },
  card: {
    backgroundColor: "#172720",
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
  },
  cardDate: { color: "#8EFFC1", fontSize: 13, marginBottom: 4 },
  cardText: { color: "#fff", fontSize: 14, lineHeight: 20 },
  tagsRow: { flexDirection: "row", flexWrap: "wrap" },
  tag: {
    backgroundColor: "#8EFFC1",
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginRight: 6,
    marginBottom: 6,
  },
  tagText: { color: "#0E1913", fontSize: 13, fontWeight: "600" },
  emptyText: {
    color: "#666",
    textAlign: "center",
    paddingVertical: 10,
  },
});
