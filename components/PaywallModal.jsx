import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing } from "react-native";
import { useStripe } from "@stripe/stripe-react-native";

export default function PaywallModal({ onClose, onSuccess }) {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [loading, setLoading] = useState(false);
  const translateY = new Animated.Value(300);

  React.useEffect(() => {
    Animated.timing(translateY, {
      toValue: 0,
      duration: 300,
      easing: Easing.out(Easing.exp),
      useNativeDriver: true,
    }).start();
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
          body: JSON.stringify({ amount: 500 }), // $5 example
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
          alert("Payment successful! 🎉");
          onSuccess?.();
          onClose?.();
        }
      }
    } catch (err) {
      alert("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Animated.View style={[styles.overlay, { transform: [{ translateY }] }]}>
      <View style={styles.card}>
        <TouchableOpacity style={styles.close} onPress={onClose}>
          <Text style={{ color: "#999", fontSize: 20 }}>✕</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Unlock DayAhead Pro</Text>
        <Text style={styles.subtitle}>
          Support the app and unlock future updates for just $5!
        </Text>

        <TouchableOpacity
          style={[styles.button, loading && { opacity: 0.6 }]}
          onPress={openPaymentSheet}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Loading..." : "Upgrade for $5"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onClose} style={{ marginTop: 15 }}>
          <Text style={{ color: "#aaa", fontSize: 15 }}>Maybe later</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(10, 14, 39, 0.95)",
    padding: 30,
    alignItems: "center",
  },
  card: {
    backgroundColor: "#12173D",
    borderRadius: 20,
    padding: 25,
    width: "100%",
    alignItems: "center",
  },
  close: {
    position: "absolute",
    top: 10,
    right: 15,
    padding: 10,
  },
  title: {
    color: "white",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 10,
  },
  subtitle: {
    color: "#ccc",
    fontSize: 15,
    textAlign: "center",
    marginBottom: 30,
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
});
