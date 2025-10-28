import { useEffect, useState, useCallback, useContext } from "react";
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
import { useFocusEffect, useRouter } from "expo-router";
import CustomAlert from "../../components/CustomAlert";
import { OverlayContext } from "../_layout";

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
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [hasPaid, setHasPaid] = useState(false);

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertAction, setAlertAction] = useState("");

  const router = useRouter();

  const { setOverlay } = useContext(OverlayContext);

  useFocusEffect(
    useCallback(() => {
      console.log("🔁 Profile focused");
      setLoading(true);
      fetchSleepData().then(() => console.log("✅ Data fetched"));
    }, [])
  );

  async function handleLogout() {
    try {
      await supabase.auth.signOut();
      router.replace("/login"); // or "/" depending on your entry route
    } catch (err) {
      console.error("Logout failed:", err);
    }
  }

  async function fetchSleepData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 🟢 Fetch user_state
      const { data: userState, error: stateError } = await supabase
        .from("user_state")
        .select("has_paid")
        .eq("user_id", user.id)
        .single();

      if (stateError) console.log("User state fetch error:", stateError);
      setHasPaid(userState?.has_paid || false);

      const { data, error } = await supabase
        .from("sleep_logs")
        .select(
          "sleep_start, sleep_end, duration_hours, gratitude_text, meditation_minutes, created_at"
        )
        .eq("user_id", user.id)
        .order("sleep_start", { ascending: false });

      if (error) throw error;

      // --- Total Sleep This Week (Monday–Sunday) ---
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ...
      const monday = new Date(now);
      monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7)); // go back to Monday
      monday.setHours(0, 0, 0, 0);

      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);

      const weekSleep = data.filter((d) => {
        const sleepDate = new Date(d.sleep_start);
        return sleepDate >= monday && sleepDate <= sunday;
      });

      const totalThisWeek = weekSleep.reduce(
        (sum, d) => sum + (parseFloat(d.duration_hours) || 0),
        0
      );
      setTotalHours(totalThisWeek);


      console.log(totalHours)

      // --- Chart Data ---
      const allDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      const dataMap = {};

      weekSleep.forEach((row) => {
        const d = new Date(row.sleep_start);
        const day = d.toLocaleDateString("en-US", { weekday: "short" });
        dataMap[day] = (dataMap[day] || 0) + parseFloat(row.duration_hours || 0);
      });

      const formatted = allDays.map((day) => ({
        label: day,
        value: dataMap[day] || 0,
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

    // Filter valid rows with sleep_end
    const sorted = [...rows]
      .filter(r => r.sleep_end)
      .sort((a, b) => new Date(a.sleep_end) - new Date(b.sleep_end));

    if (sorted.length === 0) return setStreak(0);

    let streakCount = 1;

    for (let i = sorted.length - 2; i >= 0; i--) {
      const d1 = new Date(sorted[i].sleep_end);
      const d2 = new Date(sorted[i + 1].sleep_end);

      const day1 = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate());
      const day2 = new Date(d2.getFullYear(), d2.getMonth(), d2.getDate());

      const diffDays = Math.round(
        (day2 - day1) / (1000 * 60 * 60 * 24)
      );

      if (diffDays === 1) {
        streakCount++;
      } else if (diffDays > 1) {
        break; // break streak if a day was skipped
      }
    }

    // Reset streak if last log isn't from yesterday or today
    const lastLogDate = new Date(sorted[sorted.length - 1].sleep_end);
    const today = new Date();
    const diffFromToday = Math.round(
      (today - new Date(today.getFullYear(), today.getMonth(), today.getDate())) /
      (1000 * 60 * 60 * 24)
    );

    const gap = Math.round(
      (today - new Date(lastLogDate.getFullYear(), lastLogDate.getMonth(), lastLogDate.getDate())) /
      (1000 * 60 * 60 * 24)
    );

    if (gap > 1) {
      streakCount = 0; // missed yesterday
    }

    setStreak(streakCount);
  }

  if (loading)
    return (
      <View style={[styles.center, { backgroundColor: "#6A8DD3" }]}>
        <ActivityIndicator size="large" color="#8effc1" />
      </View>
    );

  const renderActiveHistory = () => {
    const limit = showAllHistory ? Infinity : 3;

    switch (activeTab) {
      case "gratitude":
        return gratitudeHistory.length === 0 ? (
          <Text style={styles.emptyText}>No gratitude entries yet 🌙</Text>
        ) : (
          gratitudeHistory.slice(0, limit).map((entry, index) => (
            <View key={index} style={styles.card}>
              <Text style={styles.cardDate}>{entry.date}</Text>
              <View style={styles.listContainerr}>
                {entry.items.map((item, i) => (
                  <Text key={i} style={styles.listItem}>
                    • {item}
                  </Text>
                ))}
              </View>
            </View>
          ))
        );

      case "meditation":
        return meditationHistory.length === 0 ? (
          <Text style={styles.emptyText}>No meditation sessions yet 🧘‍♂️</Text>
        ) : (
          meditationHistory.slice(0, limit).map((entry, index) => (
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
    <SafeAreaView style={[styles.container, { backgroundColor: "#6A8DD3" }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={{ fontSize: 22, fontWeight: "600", marginTop: 15, color: "#fff", fontFamily: "Manrope-Bold", paddingLeft: 20 }}>
          Profile
        </Text>

        {/* --- WEEK OVERVIEW --- */}
        <View style={styles.overviewBox}>
          <Text style={styles.overviewTitle}>This Week</Text>
          <Text style={styles.totalHours}>{totalHours.toFixed(1)} hrs</Text>
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
            xAxisLabelTextStyle={{ color: "#fff", fontSize: 11 }}
            yAxisTextStyle={{ color: "#fff", fontSize: 11 }}
            height={200}
            noOfSections={4}
            maxValue={12}
            yAxisThickness={0}
            xAxisThickness={0}
            hideRules
          />
        </View>

        {/* --- HISTORY SECTION --- */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => {
            if (!hasPaid) {
              setAlertMessage("🌙 Upgrade to unlock full history!")

              setAlertVisible(true)
              return;
            }
            router.push({
              pathname: "/history",
              params: { type: activeTab },
            })
          }}
          style={styles.historyBox}
        >
          <View style={styles.tabsRow}>
            {["gratitude", "meditation"].map((tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => {
                  setActiveTab(tab);
                  setShowAllHistory(false); // reset when switching tab
                }}
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

          {((activeTab === "gratitude" && gratitudeHistory.length > 3) ||
            (activeTab === "meditation" && meditationHistory.length > 3)) && (
            <TouchableOpacity
              onPress={() => {
                if (!hasPaid) {
                  alert("🌙 Upgrade to unlock full history!");
                  return;
                }
                setShowAllHistory(!showAllHistory);
              }}
            >
              <Text style={styles.showMoreText}>
                {showAllHistory ? "Tap to show less ▲" : "Tap to see more ▼"}
              </Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        <View style={styles.logoutButtonView}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Log out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <CustomAlert
        visible={alertVisible}
        message={alertMessage}
        onClose={() => {
          setAlertVisible(false);
          setAlertAction(null);
        }}
        onConfirm={() => {
          if (alertAction) {
            alertAction(); // ✅ safely call stored function
            setAlertAction(null);
          }
          setAlertVisible(false);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  logoutButton: {
    alignSelf: "center",
    borderWidth: 1,
    borderColor: "#ad1313",
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 20,
  },
  logoutText: {
    color: "#ad1313",
    fontWeight: "600",
    fontSize: 15,
    fontFamily: "Manrope-Bold"
  },

  overviewBox: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 20,
    padding: 24,
    margin: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  overviewTitle: { color: "#F9D976", fontSize: 18, fontFamily: "Manrope-Bold" },
  totalHours: { color: "#fff", fontSize: 46, marginBottom: 12, fontWeight: "700", fontFamily: "Manrope-Regular" },
  subtext: { color: "#fff", fontSize: 14, fontFamily: "Manrope-Regular" },
  streakBubble: {
    marginTop: 12,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 14,
  },
  streakNumber: { color: "#fff", fontSize: 20, fontFamily: "Manrope-Bold", textAlign:"center" },

  chartBox: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 10,
    alignItems: "center",
  },
  sectionTitle: { color: "#F9D976", fontSize: 18, marginBottom: 12, fontFamily: "Manrope-Bold" },

  historyBox: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 20,
    margin: 16,
    padding: 16,
  },
  showMoreText: {
    color: "#fff",
    textAlign: "center",
    marginTop: 8,
    fontSize: 13,
    fontFamily: "Manrope-Regular"
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
  tabButtonActive: { backgroundColor: "rgba(255, 255, 255, 0.1)" },
  tabText: { color: "#fff", fontSize: 14, fontFamily: "Manrope-Bold" },
  tabTextActive: { color: "#F9D976", fontWeight: "600", fontFamily: "Manrope-Bold" },

  historyContent: { marginTop: 4 },
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
  },
  cardDate: { color: "#F9D976", fontSize: 13, marginBottom: 4, fontFamily: "Manrope-Bold" },
  cardText: { color: "#fff", fontSize: 14, lineHeight: 20, fontFamily: "Manrope-Regular" },
  tagsRow: { flexDirection: "row", flexWrap: "wrap" },
  tag: {
    backgroundColor: "#F9D976",
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginRight: 6,
    marginBottom: 6,
  },
  tagText: { color: "#0E1913", fontSize: 13, fontWeight: "600", fontFamily: "Manrope-Regular" },
  emptyText: {
    color: "#fff",
    textAlign: "center",
    paddingVertical: 10,
    fontFamily: "Manrope-Regular"
  },
  listContainerr: {
    marginTop: 6,
  },
  listItem: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Manrope-Regular",
    lineHeight: 20,
    marginBottom: 3,
  },
});
