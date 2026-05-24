import { Tabs } from "expo-router";
import { Text } from "react-native";

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: { backgroundColor: "#000", borderTopColor: "#222" },
      tabBarActiveTintColor: "#7C6FF7",
      tabBarInactiveTintColor: "#888",
    }}>
      <Tabs.Screen name="home" options={{ title: "Home", tabBarIcon: ({ color }) => <Text style={{ color }}>🏠</Text> }} />
      <Tabs.Screen name="wardrobe" options={{ title: "Wardrobe", tabBarIcon: ({ color }) => <Text style={{ color }}>👗</Text> }} />
      <Tabs.Screen name="builder" options={{ title: "Builder", tabBarIcon: ({ color }) => <Text style={{ color }}>✨</Text> }} />
      <Tabs.Screen name="calendar" options={{ title: "Calendar", tabBarIcon: ({ color }) => <Text style={{ color }}>📅</Text> }} />
      <Tabs.Screen name="community" options={{ title: "Community", tabBarIcon: ({ color }) => <Text style={{ color }}>🌐</Text> }} />
    </Tabs>
  );
}