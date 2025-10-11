import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { supabase } from "../../lib/supabase";
import { SafeAreaView } from "react-native-safe-area-context";
import { BarChart } from "react-native-gifted-charts";

export default function Profile() {
  const { bgColor, textColor } = useTheme();
  const [sleepData, setSleepData] = useState([]);
  const [streak, setStreak] = useState(0);
  const [weekLogs, setWeekLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalHours, setTotalHours] = useState(0);

  useEffect(() => {
    fetchSleepData();
  }, []);

  async function fetchSleepData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("sleep_logs")
        .select("sleep_start, duration_hours")
        .eq("user_id", user.id)
        .order("sleep_start", { ascending: false });

      if (error) throw error;

      // Build weekly map
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
      const startOfWeekStr = startOfWeek.toISOString().split("T")[0];

      const weekSet = new Set();
      data.forEach((row) => {
        const dateStr = new Date(row.sleep_start).toISOString().split("T")[0];
        const logDate = new Date(dateStr);
        if (logDate >= startOfWeek) weekSet.add(dateStr); // use Set to avoid duplicates
      });
      setWeekLogs(Array.from(weekSet));


      const total = data
        .slice(0, 7)
        .reduce((sum, d) => sum + (parseInt(d.duration_hours) || 0), 0);
      setTotalHours(total);

      // Format chart data (Mon → Sun)
      const dataMap = {};
      data.forEach((row) => {
        const d = new Date(row.sleep_start);
        const day = d.toLocaleDateString("en-US", { weekday: "short" });
        dataMap[day] = row.duration_hours;
      });
      const allDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      const formatted = allDays.map((day) => ({
        label: day,
        value: parseInt(dataMap[day]) || 0,
      }));
      setSleepData(formatted);

      // Calculate streak
      calculateStreak(data);
    } catch (err) {
      console.error("Error fetching sleep data:", err);
    } finally {
      setLoading(false);
    }
  }

  function calculateStreak(rows) {
    if (!rows.length) return setStreak(0);

    // Sort ascending by date
    const sorted = [...rows].sort(
      (a, b) => new Date(a.sleep_start) - new Date(b.sleep_start)
    );

    let streakCount = 1;
    for (let i = sorted.length - 2; i >= 0; i--) {
      const d1 = new Date(sorted[i].sleep_start);
      const d2 = new Date(sorted[i + 1].sleep_start);
      const diffDays = Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        streakCount++;
      } else if (diffDays > 1) {
        break;
      }
    }
    setStreak(streakCount);
  }

  if (loading)
    return (
      <View style={[styles.center, { backgroundColor: bgColor }]}>
        <ActivityIndicator size="large" color="#92e1afff" />
      </View>
    );

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      {/* --- STREAK SECTION --- */}
      <View style={styles.streakSection}>
        <Text style={styles.streakTitle}>Sleep Streak</Text>
        <View style={styles.streakRow}>
          <View style={styles.streakCircle}>
            <Text style={styles.streakNumber}>{streak}</Text>
          </View>
          <View style={styles.daysRow}>
            {days.map((day, i) => {
              const dateForDay = new Date(startOfWeek);
              dateForDay.setDate(startOfWeek.getDate() + i);
              const dateStr = dateForDay.toISOString().split("T")[0];
              const filled = weekLogs.includes(dateStr);
              return (
                <View
                  key={i}
                  style={[
                    styles.dayCircle,
                    filled && {
                      backgroundColor: "#4CAF50",
                      borderColor: "#4CAF50",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      filled && { color: "#fff", fontWeight: "600" },
                    ]}
                  >
                    {day[0]}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>

      {/* --- WEEKLY SLEEP CHART --- */}
      <View style={{ padding: 20, alignItems: "center", marginTop: 40 }}>
        <Text style={styles.chartTitle}>Sleep Hours (Past 7 Days)</Text>
        <BarChart
          data={sleepData}
          width={250}
          barWidth={14}
          showGradient
          gradientColor="#2ecc71"
          barBorderRadius={8}
          frontColor="#4CAF50"
          isAnimated
          xAxisColor="transparent"
          yAxisColor="transparent"
          xAxisLabelTextStyle={{ color: "#6f6f6fff", fontSize: 12 }}
          yAxisTextStyle={{ color: "#888", fontSize: 12 }}
          noOfSections={6}
          maxValue={12}
          height={220}
        />

        {/* --- TOTAL HOURS SECTION --- */}
        <View style={{ padding: 20, marginTop: 40 }}>
          <Text style={styles.totalTitle}>Total Sleep This Week</Text>
          <Text style={[styles.totalHours, { color: textColor }]}>
            {totalHours.toFixed(1)} hrs
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  // Streak section
  streakSection: {
    paddingVertical: 20,
    alignItems: "center",
  },
  streakTitle: {
    fontSize: 25,
    color: "#4CAF50",
    marginBottom: 6,
    fontFamily: "Manrope-Bold",
  },
  streakRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 20,
    padding: 10,
  },
  streakCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#F2994A",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  streakNumber: { fontSize: 28, fontWeight: "bold", color: "#fff" },

  daysRow: { flexDirection: "row" },
  dayCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#ccc",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  dayText: { fontSize: 12, color: "#333" },

  // Chart section
  chartTitle: {
    fontSize: 25,
    color: "#4CAF50",
    marginBottom: 12,
    textAlign: "center",
    fontFamily: "Manrope-Bold",
  },
  totalTitle: {
    color: "#4CAF50",
    fontSize: 25,
    fontFamily: "Manrope-Bold",
  },
  totalHours: {
    fontSize: 50,
    marginTop: 4,
    textAlign: "center",
    fontFamily: "Manrope-Regular",
  },
});
