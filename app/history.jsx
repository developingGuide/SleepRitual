import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { supabase } from "../lib/supabase";
import DateTimePicker from "@react-native-community/datetimepicker";

export default function History() {
  const router = useRouter();
  const { type } = useLocalSearchParams(); // "gratitude" or "meditation"
  const [entries, setEntries] = useState([]);
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [filterStart, setFilterStart] = useState(null);
  const [filterEnd, setFilterEnd] = useState(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [durationFilter, setDurationFilter] = useState("all");

  useEffect(() => {
    fetchHistory();
  }, []);

  async function fetchHistory() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("sleep_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    let mapped = [];
    if (type === "gratitude") {
      mapped = data
        .filter((d) => d.gratitude_text?.trim())
        .map((d) => ({
          date: new Date(d.created_at),
          items: d.gratitude_text.split(",").map((i) => i.trim()),
        }));
    } else if (type === "meditation") {
      mapped = data
        .filter((d) => d.meditation_minutes)
        .map((d) => ({
          date: new Date(d.created_at),
          minutes: d.meditation_minutes,
        }));
    }

    setEntries(mapped);
    setFilteredEntries(mapped);
  }

  // --- Apply filters dynamically ---
  useEffect(() => {
    let filtered = [...entries];

    if (filterStart && filterEnd) {
      filtered = filtered.filter(
        (e) => e.date >= filterStart && e.date <= filterEnd
      );
    }

    if (type === "meditation" && durationFilter !== "all") {
      filtered = filtered.filter((e) => {
        const m = e.minutes;
        if (durationFilter === "short") return m < 10;
        if (durationFilter === "medium") return m >= 10 && m <= 30;
        if (durationFilter === "long") return m > 30;
        return true;
      });
    }

    setFilteredEntries(filtered);
  }, [filterStart, filterEnd, durationFilter, entries]);

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>
        {type === "gratitude" ? "Gratitude History" : "Meditation History"}
      </Text>

      {/* --- Filters --- */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          onPress={() => setShowStartPicker(true)}
          style={styles.filterBtn}
        >
          <Text style={styles.filterText}>
            {filterStart ? filterStart.toDateString() : "Start Date"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setShowEndPicker(true)}
          style={styles.filterBtn}
        >
          <Text style={styles.filterText}>
            {filterEnd ? filterEnd.toDateString() : "End Date"}
          </Text>
        </TouchableOpacity>

        {type === "meditation" && (
          <TouchableOpacity
            onPress={() => {
              // Cycle through filters
              const next =
                durationFilter === "all"
                  ? "short"
                  : durationFilter === "short"
                  ? "medium"
                  : durationFilter === "medium"
                  ? "long"
                  : "all";
              setDurationFilter(next);
            }}
            style={[styles.filterBtn, styles.durationBtn]}
          >
            <Text style={styles.filterText}>
              {durationFilter === "all"
                ? "All Durations"
                : durationFilter === "short"
                ? "< 10 mins"
                : durationFilter === "medium"
                ? "10–30 mins"
                : "> 30 mins"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* --- Date Pickers --- */}
      {showStartPicker && (
        <DateTimePicker
          value={filterStart || new Date()}
          mode="date"
          onChange={(e, date) => {
            setShowStartPicker(false);
            if (date) setFilterStart(date);
          }}
        />
      )}
      {showEndPicker && (
        <DateTimePicker
          value={filterEnd || new Date()}
          mode="date"
          onChange={(e, date) => {
            setShowEndPicker(false);
            if (date) setFilterEnd(date);
          }}
        />
      )}

      {/* --- Entries --- */}
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {filteredEntries.length === 0 ? (
          <Text style={styles.empty}>No entries found.</Text>
        ) : (
          filteredEntries.map((entry, i) => (
            <View key={i} style={styles.card}>
              <Text style={styles.dateText}>
                {entry.date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </Text>
              {type === "gratitude" ? (
                <View style={styles.listContainerr}>
                  {entry.items.map((item, j) => (
                    <Text key={j} style={styles.listItem}>
                      • {item}
                    </Text>
                  ))}
                </View>
              ) : (
                <Text style={styles.meditationText}>
                  {entry.minutes} minutes
                </Text>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#6A8DD3" },
  backBtn: { padding: 16 },
  backText: { color: "#fff", fontSize: 16, fontFamily: "Manrope-Bold" },
  title: {
    fontSize: 22,
    color: "#fff",
    textAlign: "center",
    fontFamily: "Manrope-Bold",
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
    marginVertical: 12,
    paddingHorizontal: 10,
  },
  filterBtn: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  filterText: { color: "#F9D976", fontFamily: "Manrope-Regular" },
  durationBtn: { backgroundColor: "rgba(255, 255, 255, 0.1)" },
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
  },
  dateText: { color: "#F9D976", fontFamily: "Manrope-Bold" },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 4 },
  tag: {
    backgroundColor: "#F9D976",
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginRight: 6,
    marginBottom: 6,
  },
  tagText: { color: "#0E1913", fontFamily: "Manrope-Regular" },
  meditationText: { color: "#fff", marginTop: 4, fontFamily: "Manrope-Regular" },
  empty: { color: "#fff", textAlign: "center", marginTop: 40 },
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
