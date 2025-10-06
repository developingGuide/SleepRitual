import { useRef, useEffect } from "react";
import { Animated } from "react-native";
import { useFocusEffect } from "expo-router";

export function useFadeTransition(duration = 300) {
  const opacity = useRef(new Animated.Value(0)).current;

  useFocusEffect(() => {
    // fade in when focused
    Animated.timing(opacity, {
      toValue: 1,
      duration,
      useNativeDriver: true,
    }).start();

    // fade out when unfocused
    return () => {
      Animated.timing(opacity, {
        toValue: 0,
        duration,
        useNativeDriver: true,
      }).start();
    };
  });

  return opacity;
}
