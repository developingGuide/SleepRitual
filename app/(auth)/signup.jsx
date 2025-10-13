import React, { useState } from "react"
import { View, Text, TextInput, TouchableOpacity, StyleSheet, TouchableWithoutFeedback, Keyboard } from "react-native"
import { supabase } from "../../lib/supabase"
import { router } from "expo-router"

export default function SignupScreen({ navigation }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState(null)

  const handleSignup = async () => {
    const { error, data } = await supabase.auth.signUp({ email, password })
    if (error) {
      setError(error.message)
    } else {
      // move into the app once signed up
      router.replace("/")
    }
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <Text style={styles.title}>Sign Up</Text>
        {error && <Text style={styles.error}>{error}</Text>}
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#888"
          autoCapitalize="none"
          onChangeText={setEmail}
          value={email}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#888"
          secureTextEntry
          onChangeText={setPassword}
          value={password}
        />
        <TouchableOpacity style={styles.button} onPress={handleSignup}>
          <Text style={styles.buttonText}>Sign Up</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/login")}>
          <Text style={styles.link}>Already have an account? Log in</Text>
        </TouchableOpacity>
      </View>
    </TouchableWithoutFeedback>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20, backgroundColor: "#1A237E" },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 20, color: "#fff" },
  input: { borderWidth: 0.5, borderColor: "#ccc", padding: 12, borderRadius: 8, marginBottom: 12, color: "black" },
  button: { backgroundColor: "#6C63FF", padding: 15, borderRadius: 8, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "bold" },
  error: { color: "red", marginBottom: 10 },
  link: { marginTop: 12, textAlign: "center", color: "#6C63FF" },
})
