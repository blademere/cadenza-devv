import { View, Text, Pressable } from "react-native";
import { useState } from "react";
import { router } from "expo-router";

import Input from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { saveAuth } from "../../services/authStorage";
const MOCK_USERS = [
  {
    id: "INS-001",
    name: "John Cruz",
    email: "instructor@cadenza.com",
    password: "instructor123",
    role: "instructor",
  },
  {
    id: "STU-001",
    name: "Maria Santos",
    email: "student@cadenza.com",
    password: "student123",
    role: "student",
  },
];

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleLogin() {
    setErrorMessage("");

    if (!email.trim() || !password) {
      setErrorMessage("Please enter your email and password.");
      return;
    }

    try {
      setLoading(true);

      await new Promise((resolve) => setTimeout(resolve, 500));

      const user = MOCK_USERS.find(
        (item) =>
          item.email.toLowerCase() === email.trim().toLowerCase() &&
          item.password === password,
      );

      if (!user) {
        setErrorMessage("Invalid email or password.");
        return;
      }

      const authData = {
        token: `mock-token-${user.id}`,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      };

      await saveAuth(authData);

      switch (user.role) {
        case "instructor":
          router.replace("/instructor");
          break;

        case "student":
          router.replace("/student");
          break;

        default:
          setErrorMessage("This account cannot access the mobile application.");
      }
    } catch (error) {
      console.error("Login error:", error);
      setErrorMessage("Unable to log in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 justify-center bg-[#F8FAFC] px-6">
      <View className="mb-8">
        <Text className="text-4xl font-bold text-[#063970]">Cadenza</Text>

        <Text className="mt-2 text-base text-[#64748B]">
          Welcome back! Login to continue.
        </Text>
      </View>

      {errorMessage ? (
        <View className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4">
          <Text className="font-semibold text-red-700">Login Failed</Text>

          <Text className="mt-1 text-sm text-red-600">{errorMessage}</Text>
        </View>
      ) : null}

      <View className="gap-4">
        <Input
          placeholder="Email"
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            setErrorMessage("");
          }}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
        />

        <View>
          <View className="mb-2 flex-row justify-between px-1">
            <Text className="text-sm font-medium text-[#334155]">Password</Text>

            <Pressable>
              <Text className="text-sm font-medium text-[#063970]">
                Forgot password?
              </Text>
            </Pressable>
          </View>

          <Input
            placeholder="Password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setErrorMessage("");
            }}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <Button onPress={handleLogin} disabled={loading}>
          {loading ? "Loading..." : "Login"}
        </Button>
      </View>
    </View>
  );
}
