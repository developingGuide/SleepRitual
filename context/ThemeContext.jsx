import { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const getColorByTime = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 10) return "#FFF7D1"; // Morning
    if (hour >= 10 && hour < 17) return "#FFFFFF"; // Afternoon
    if (hour >= 17 && hour < 20) return "#FFD6A5"; // Evening
    return "#1A237E"; // Night
  };

  const getTextColorByTime = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 20) return "#000000"; // Morning → Evening: dark text
    return "#FFFFFF"; // Night: white text
  };

  const [textColor, setTextColor] = useState(getTextColorByTime());
  const [bgColor, setBgColor] = useState(getColorByTime());

  // auto-update every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setBgColor(getColorByTime());
      setTextColor(getTextColorByTime())
    }, 30 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <ThemeContext.Provider value={{ bgColor, textColor, setBgColor }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
