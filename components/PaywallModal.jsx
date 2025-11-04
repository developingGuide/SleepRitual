import React, { useState, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Animated, ScrollView, Easing } from "react-native";
import { useStripe } from "@stripe/stripe-react-native";
import ConfettiCannon from "react-native-confetti-cannon";
import CustomAlert from "./CustomAlert";
import Purchases from "react-native-purchases";
import { supabase } from "../lib/supabase";


export default function PaywallModal({ onClose, onSuccess }) {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [loading, setLoading] = useState(false);
  
  const [showConfetti, setShowConfetti] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  
  const [offerings, setOfferings] = useState(null);
  
  const translateY = useRef(new Animated.Value(300)).current;
  
  // Inside component
  const session = supabase.auth.getSession();

  React.useEffect(() => {
    Animated.timing(translateY, {
      toValue: 0,
      duration: 300,
      easing: Easing.out(Easing.exp),
      useNativeDriver: true,
    }).start();
  }, []);

  React.useEffect(() => {
    getOfferings();
  }, []);

  const openPaymentSheet = async () => {
    console.log("Tapped Upgrade button"); // check if this appears
    setLoading(true);
    try {
      const res = await fetch(
        "https://aserazwykkmznreqjzbd.functions.supabase.co/create-payment-intent",
        {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ amount: 2000 }), // $20 example
        }
      );

      console.log("Response status:", res.status);
      const data = await res.json();

      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: data.clientSecret,
        merchantDisplayName: "DayAhead App",
      });

      console.log("initError:", initError);

      if (!initError) {
        const { error } = await presentPaymentSheet();
        if (error) alert(`Payment failed: ${error.message}`);
        else {
          setShowConfetti(true);
          setAlertMessage("Payment successful! 🎉 You’re now a Pro user.");
          setAlertVisible(true);

          // update DB
          onSuccess?.();

          // delay close so confetti can show
          setTimeout(() => {
            setShowConfetti(false);
            onClose?.();
          }, 3500);
        }
      }
    } catch (err) {
      alert("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const proFeatures = [
    "Includes all Free features",
    "See past journals",
    "Themes & custom sounds (Coming Soon)",
    "Home widget for today’s plan (Coming Soon)",
    "Auto-fill from yesterday’s tasks",
    "Full timeline view + export",
  ];

  const freeFeatures = [
    "Night time 'Plan tomorrow today",
    "Morning gratitude journaling",
    "Home screen planner/to-do list",
    "Evening Reminders",
    "Streaks",
    "Basic weekly graph"
  ];

  const getOfferings = async () => {
    try {
      const result = await Purchases.getOfferings();
      if (result.current && result.current.availablePackages.length > 0) {
        setOfferings(result);
      }
    } catch (err) {
      console.log("Error fetching offerings:", err);
    }
  };

  const handleSubscribe = async (pkg) => {
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      if(typeof customerInfo.entitlements.active["Day Ahead Pro"] !== "undefined") {
        console.log("Customer Info", JSON.stringify(customerInfo, null, 2))

        // 1. Show confetti + Alert
        setShowConfetti(true);
        setAlertMessage("Payment successful! 🎉 Welcome to DayAhead Pro.");
        setAlertVisible(true);

        // 2. Save to DB (Supabase)
        // await supabase.from("user_state").upsert(
        //   {
        //     user_id: session.user.id,
        //     has_paid: true,
        //     has_onboarded: true,
        //   },
        //   { onConflict: ["user_id"] }
        // );

        // 3. Optional: callback to update local state
        onSuccess?.();

        // 4. Close after a delay so user can see animation
        setTimeout(() => {
          setShowConfetti(false);
          setAlertVisible(false);
          onClose?.();
        }, 3000);
      }
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <Animated.View style={[styles.fullScreen, { transform: [{ translateY }] }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Unlock DayAhead Pro</Text>
      </View>

      <ScrollView
        style={{ flex: 1, width: "100%" }}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.priceText}>$20 Lifetime</Text>

        <View style={styles.section}>
          {/* <Text style={styles.sectionTitle}>🌿 Pro Features</Text> */}
          {proFeatures.map((item, i) => (
            <View key={i} style={styles.featureRow}>
              <Text style={styles.tick}>✅</Text>
              <Text style={styles.featureText}>{item}</Text>
            </View>
          ))}
        </View>

        {/* <View style={styles.section}>
          <Text style={styles.sectionTitle}>✨ Core Features</Text>
          {freeFeatures.map((item, i) => (
            <View key={i} style={styles.featureRow}>
              <Text style={styles.tick}>✅</Text>
              <Text style={styles.featureText}>{item}</Text>
            </View>
          ))}
        </View> */}
      </ScrollView>

      <View style={styles.bottomActions}>
        {offerings?.current?.availablePackages?.map((pkg) => (
          <TouchableOpacity
            key={pkg.identifier}
            style={[styles.button, loading && { opacity: 0.6 }]}
            onPress={() => handleSubscribe(pkg)}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "Loading..." : "Upgrade to Pro"}
            </Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity onPress={onClose} style={{ marginTop: 15 }}>
          <Text style={styles.laterText}>Maybe later</Text>
        </TouchableOpacity>
      </View>

      {showConfetti && (
        <ConfettiCannon
          count={60}
          origin={{ x: 200, y: 0 }}
          autoStart={true}
          fadeOut={true}
        />
      )}

      <CustomAlert
        visible={alertVisible}
        message={alertMessage}
        onClose={() => setAlertVisible(false)}
        onConfirm={() => {
          setAlertVisible(false);
        }}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(10, 14, 39, 0.97)",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 50,
    zIndex: 999,
  },
  header: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginBottom: 10,
  },
  closeText: {
    position: "absolute",
    left: 5,
    color: "#aaa",
    fontSize: 22,
  },
  headerTitle: {
    color: "white",
    fontSize: 22,
    fontWeight: "700",
  },
  priceText: {
    color: "#3BE489",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 25,
  },
  section: {
    width: "90%",
    alignSelf: "center",
    marginBottom: 30,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 15,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  tick: {
    color: "#3BE489",
    fontSize: 16,
    marginRight: 8,
    marginTop: 4,
  },
  featureText: {
    color: "#ccc",
    fontSize: 20,
    width: "90%",
    fontFamily: "Manrope-Bold",
  },
  bottomActions: {
    position: "absolute",
    bottom: 40,
    width: "90%",
    alignItems: "center",
  },
  button: {
    backgroundColor: "#3BE489",
    paddingVertical: 14,
    borderRadius: 10,
    width: "100%",
    alignItems: "center",
  },
  buttonText: {
    color: "#000",
    fontWeight: "700",
    fontSize: 16,
  },
  laterText: {
    color: "#aaa",
    fontSize: 15,
  },
});
