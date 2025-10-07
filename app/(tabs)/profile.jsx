import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { supabase } from "../../lib/supabase";
import { SafeAreaView } from "react-native-safe-area-context";
import { BarChart } from "react-native-gifted-charts";

export default function Profile() {
  const { bgColor } = useTheme();
  const { textColor } = useTheme();
  const [sleepData, setSleepData] = useState([]);
  const [streak, setStreak] = useState(0);
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
        .order("sleep_start", { ascending: false })
        .limit(7);

      if (error) throw error;

      // Create lookup map
      const dataMap = {};
      data.forEach((row) => {
        const d = new Date(row.sleep_start);
        const day = d.toLocaleDateString("en-US", { weekday: "short" });
        dataMap[day] = row.duration_hours;
      });

      // Fixed day order (Mon → Sun)
      const allDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      const formatted = allDays.map((day) => ({
        label: day,
        value: parseInt(dataMap[day]) || 0,
      }));

      const total = formatted.reduce((sum, d) => sum + d.value, 0);
      setTotalHours(total);

      setSleepData(formatted);
      calculateStreak(data);
    } catch (err) {
      console.error("Error fetching sleep data:", err);
    } finally {
      setLoading(false);
    }
  }

  function calculateStreak(rows) {
    const sorted = rows.sort(
      (a, b) => new Date(b.sleep_start) - new Date(a.sleep_start)
    );
    let streakCount = 0;
    let current = new Date();
    for (let i = 0; i < sorted.length; i++) {
      const diffDays = Math.floor(
        (current - new Date(sorted[i].sleep_start)) / (1000 * 60 * 60 * 24)
      );
      if (diffDays === 0 || diffDays === streakCount) {
        streakCount++;
        current.setDate(current.getDate() - 1);
      } else break;
    }
    setStreak(streakCount);
  }

  if (loading)
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: bgColor,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color="#92e1afff" />
      </View>
    );


  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: bgColor,
        paddingHorizontal: 16,
        paddingTop: 12,
      }}
    >
      {/* --- STREAK SECTION --- */}
      <View
        style={{ padding: 20, display:"flex", alignItems:"center" }}
      >
        <Text style={{ fontSize: 25, color: "#4CAF50", marginBottom: 6, fontFamily: "Manrope-Bold" }}>
          Sleep Streak
        </Text>
        <Text style={{ fontSize: 50, color: {textColor}, fontWeight: "600", fontFamily: "Manrope-Regular" }}>
          {streak} days
        </Text>
      </View>

      {/* --- WEEKLY SLEEP CHART --- */}
      <View
        style={{ padding: 20, display:"flex", alignItems:"center", marginTop: 40 }}
      >
        <Text
          style={{
            fontSize: 25,
            color: "#4CAF50",
            marginBottom: 12,
            textAlign: "center",
            fontFamily: "Manrope-Bold"
          }}
        >
          Sleep Hours (Past 7 Days)
        </Text>

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
        <View
          style={{ padding: 20, marginTop: 40 }}
        >
          <Text style={{ color: "#4CAF50", fontSize: 25, fontFamily: "Manrope-Bold" }}>
            Total Sleep This Week
          </Text>
          <Text
            style={{
              color: {textColor},
              fontSize: 50,
              marginTop: 4,
              textAlign: "center",
              fontFamily: "Manrope-Regular"
            }}
          >
            {totalHours.toFixed(1)} hrs
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
