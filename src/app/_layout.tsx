import { Tabs } from "expo-router";

export default function RootLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: { backgroundColor: "#000", borderTopColor: "#222" },
      tabBarActiveTintColor: "#7C6FF7", // your purple brand colour
      tabBarInactiveTintColor: "#888",
    }}>
      <Tabs.Screen name="home" options={{ title: "Home", tabBarIcon: () => <Text>🏠</Text> }} />
      <Tabs.Screen name="wardrobe" options={{ title: "Wardrobe", tabBarIcon: () => <Text>👗</Text> }} />
      <Tabs.Screen name="builder" options={{ title: "Builder", tabBarIcon: () => <Text>✨</Text> }} />
      <Tabs.Screen name="calendar" options={{ title: "Calendar", tabBarIcon: () => <Text>📅</Text> }} />
      <Tabs.Screen name="community" options={{ title: "Community", tabBarIcon: () => <Text>🌐</Text> }} />
    </Tabs>
  );
}