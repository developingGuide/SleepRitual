import React, { useState, useRef, useEffect, useContext } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Image,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthContext } from "../../context/AuthContext";
import * as Notifications from "expo-notifications";
import PaywallModal from "../../components/PaywallModal";
import { OverlayContext } from "../_layout";

const steps = [
  {
    id: 1,
    type: "intro",
    title: "Welcome to DayAhead (Beta)!",
    description: "Let's help you build a better routine.",
  },
  {
    id: 2,
    type: "question",
    title: "What brings you to the app?",
    options: ["Increase Mood", "Track Sleep", "Have a better routine", "I'm not sure"],
    key: "from_where",
  },
  {
    id: 3,
    type: "question",
    title: "Before bed, you usually...",
    options: ["Read", "Meditate", "Plan next day", "Scroll phone 😅"],
    key: "before_bed",
  },
  {
    id: 4,
    type: "question",
    title: "What night-time routine have you tried?",
    options: ["Read", "Meditate", "Plan next day", "Neither 😅"],
    key: "night_routine",
  },
  {
    type: "question",
    title: "What time do you usually go to bed?",
    options: ["Before 10 PM", "10-11 PM", "11-12 AM", "After midnight 😬"],
    key: "sleep_time",
  },
  {
    type: "question",
    title: "How long do you want to sleep for?",
    options: ["7 Hours", "8 Hours", "9 Hours", "Any amount of hours"],
    key: "sleep_duration",
  },
  {
    type: "question",
    title: "What morning routine have you tried?",
    options: ["Gratitude Journaling", "Stretching", "Meditation", "Neither 😬"],
    key: "morning_routine",
  },
  {
    type: "question",
    title: "What do you want to do first thing in the morning?",
    options: ["Gratitude Journaling", "Stretching", "Meditation", "I don't mind any"],
    key: "first_thing",
  },
  {
    type: "transition"
  },
  {
    type: "question",
    title: "Do you prefer a calm or energizing vibe?",
    options: ["Calm", "Reflective", "Energizing"],
    key: "vibe_preference",
  },
  {
    type: "question",
    title: "How do you want the app to celebrate when you finish a task?",
    options: ["Confetti", "Peaceful", "Video", "None lol"],
    key: "celebration_type",
  },
  {
    type: "input",
    title: "Paste your YouTube link:",
    key: "youtube_link",
    condition: (answers) => answers.celebration_type === "Video",
  },
  {
    type: "notification",
    title: "Lastly, set reminders!",
    description: "Do you want notifications so we can remind you to wind down before bed.",
  },
  {
    type: "end",
    title: "All set!",
    description: "Let's start building your evenings the right way! (Do expect bugs as the app is in beta!)",
  },
];

export default function Onboarding() {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [granted, setGranted] = useState();
  const [answers, setAnswers] = useState({});
  const progress = useRef(new Animated.Value(0)).current;

  const { session } = useContext(AuthContext);
  const { setOverlay } = useContext(OverlayContext);


  // Animate progress bar when step changes
  useEffect(() => {
    Animated.timing(progress, {
      toValue: (stepIndex + 1) / steps.length,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [stepIndex]);

  useEffect(() => {
    if (!session) {
      router.replace("/auth"); // or your actual login/signup route
    }
  }, [session]);

  const visibleSteps = steps.filter((step) => {
    if (step.condition) {
      return step.condition(answers);
    }
    return true;
  });

  const current = visibleSteps[stepIndex];

  const saveAnswer = async (key, answer) => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    await supabase
      .from("onboarding_answers")
      .upsert({
        user_id: user.id,
        key,
        answer,
      })
      .select();
  };

  const nextStep = async () => {
    if (stepIndex < visibleSteps.length - 1) setStepIndex(stepIndex + 1);
    else {
      await supabase
      .from("user_state")
      .upsert({
        user_id: session.user.id,
        has_onboarded: true,
      });

      router.replace("/");
    }
  };

  const prevStep = () => {
    if (stepIndex > 0) setStepIndex(stepIndex - 1);
  };

  const requestNotificationPermission = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    setGranted(status === "granted");

    if (status === "granted") {
      // Example: schedule a test notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Welcome to DayAhead 🌙",
          body: "You’ll get a nightly reminder when it’s time to wind down.",
        },
        trigger: null, // immediately
      });

      nextStep()
    }else{
      nextStep()
    }
    
    
  }

  const handleOptionSelect = async (option) => {
    if (current.key) {
      await saveAnswer(current.key, option);

      setAnswers((prev) => ({ ...prev, [current.key]: option }));

      if (current.key === "celebration_type") {
        await supabase
          .from("user_settings")
          .upsert({
            user_id: session.user.id,
            celebrationType: option,
          });
      }
    }

    nextStep();
  };

  const skipOnboarding = () => {
    nextStep();
  };

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <Animated.View style={[styles.progressBar, { width: progressWidth }]} />
      </View>

      {/* Header with Back + Skip */}
      <View style={styles.header}>
        {stepIndex > 0 ? (
          <TouchableOpacity onPress={prevStep}>
            <Text style={styles.navText}>Back</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 50 }} /> // placeholder for alignment
        )}

        <TouchableOpacity onPress={skipOnboarding}>
          <Text style={styles.navText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={styles.container}>
        <Text style={styles.title}>{current.title}</Text>

        {current.type === "intro" && (
          <>
            <Image style={{width: 100, height: 100, marginTop: -30}} source={require("../../assets/WavingSun.png")}/>
            <Text style={styles.description}>{current.description}</Text>
            <TouchableOpacity style={styles.button} onPress={nextStep}>
              <Text style={styles.buttonText}>Next</Text>
            </TouchableOpacity>
          </>
        )}

        {current.type === "question" && (
          <View style={styles.optionsContainer}>
            {current.options.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={styles.option}
                onPress={() => handleOptionSelect(opt)}
              >
                <Text style={styles.optionText}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {current.type === "input" && (
          <View style={{ width: "100%" }}>
            <Text style={[styles.description, { marginBottom: 10 }]}>
              {current.title}
            </Text>

            <View
              style={{
                backgroundColor: "#1A1F40",
                borderRadius: 10,
                paddingHorizontal: 15,
                paddingVertical: 12,
                marginBottom: 20,
              }}
            >
              <TextInput
                placeholder="https://youtube.com/..."
                placeholderTextColor="#666"
                style={{
                  color: "white",
                  fontSize: 16,
                }}
                value={answers[current.key] || ""}
                onChangeText={(text) => {
                  setAnswers((prev) => ({ ...prev, [current.key]: text }));
                }}
                onSubmitEditing={async () => {
                  const link = answers[current.key];

                  await saveAnswer(current.key, link);

                  await supabase.from("user_settings").upsert({
                    user_id: session.user.id,
                    youtube_link: link,
                  });

                  nextStep();
                }}
              />
            </View>

            <TouchableOpacity
              style={styles.button}
              onPress={async () => {
                const link = answers[current.key];

                // Save to onboarding_answers (you already do this)
                await saveAnswer(current.key, link);

                // Save YouTube link into user_settings
                await supabase.from("user_settings").upsert({
                  user_id: session.user.id,
                  youtube_link: link,
                }, { onConflict: ["user_id"] });

                nextStep();
              }}
            >
              <Text style={styles.buttonText}>Next</Text>
            </TouchableOpacity>
          </View>
        )}

        {current.type === "transition" && (
          <View style={styles.container}>
            <Text style={styles.transition_text}>Lucky for you, you will have the option to choose!</Text>
            <Image style={styles.transition_image} source={require('../../assets/mode_choice.jpg')}/>
            <TouchableOpacity style={styles.button} onPress={nextStep}>
              <Text style={styles.buttonText}>Next</Text>
            </TouchableOpacity>
          </View>
        )}

        {current.type === "notification" && (
          <View style={styles.container}>
            <Text style={styles.description}>{current.description}</Text>
            <TouchableOpacity style={styles.button} onPress={requestNotificationPermission}>
              <Text style={styles.buttonText}>Allow Notifications</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={nextStep} style={{ marginTop: 20 }}>
              <Text style={{ color: "#aaa", fontSize: 15 }}>Skip for now</Text>
            </TouchableOpacity>
          </View>
        )}

        {current.type === "end" && (
          <>
            <Text style={styles.description}>{current.description}</Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => {
                setOverlay(
                  <PaywallModal
                    onClose={async () => {
                      try {
                        const { data: { session } } = await supabase.auth.getSession();

                        if (session?.user) {
                          await supabase
                            .from("user_state")
                            .upsert(
                              {
                                user_id: session.user.id,
                                has_onboarded: true,
                              },
                              { onConflict: ["user_id"] }
                            );
                        }

                        // only remove overlay after DB finishes
                        setOverlay(null);
                      } catch (e) {
                        console.error("Error closing paywall:", e);
                        setOverlay(null);
                      }
                    }}
                    onSuccess={async () => {
                      try {
                        const { data: { session } } = await supabase.auth.getSession();

                        if (session?.user) {
                          await supabase
                            .from("user_state")
                            .upsert(
                              {
                                user_id: session.user.id,
                                has_paid: true,
                                has_onboarded: true,
                              },
                              { onConflict: ["user_id"] }
                            );
                        }
                      } catch (e) {
                        console.error("Error updating success:", e);
                      }
                    }}
                  />
                );
              }}
            >
              <Text style={styles.buttonText}>Start</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0A0E27",
  },
  progressContainer: {
    height: 5,
    backgroundColor: "#222",
    width: "100%",
  },
  progressBar: {
    height: 5,
    backgroundColor: "#3BE489",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 25,
    paddingVertical: 15,
  },
  navText: {
    color: "#AAA",
    fontSize: 16,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "white",
    textAlign: "center",
    marginBottom: 25,
  },
  description: {
    color: "#aaa",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 40,
  },
  transition_text:{
    color: "#fff",
    fontSize: 26,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 25,
  },
  transition_image: {
    width: 200,
    height: 200,
    borderRadius: 20,
    marginBottom: 25
  },
  button: {
    backgroundColor: "#3BE489",
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 12,
  },
  buttonText: {
    color: "black",
    fontWeight: "600",
    fontSize: 16,
  },
  optionsContainer: {
    width: "100%",
  },
  option: {
    backgroundColor: "#1A1F40",
    paddingVertical: 15,
    borderRadius: 10,
    marginVertical: 8,
  },
  optionText: {
    color: "white",
    textAlign: "center",
    fontSize: 16,
  },
});
