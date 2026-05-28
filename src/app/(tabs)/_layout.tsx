import { Tabs } from "expo-router";
import Svg, { Circle, Path, Rect } from "react-native-svg";

function HomeIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 3L2 10L2 21L9 21L9 15L15 15L15 21L22 21L22 10Z" fill={color} />
    </Svg>
  );
}

function WardrobeIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {/* J-shaped hook */}
      <Path
        d="M12 13L12 7C12 5.5 13.5 4.5 15 5.5C16 6.5 15.5 8.5 14 8.5"
        stroke={color}
        strokeWidth="1.8"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Arch + rounded crossbar */}
      <Path
        d="M3 20C3 14 12 13 12 13C12 13 21 14 21 20C21 21 20 22 19 22L5 22C4 22 3 21 3 20"
        stroke={color}
        strokeWidth="1.8"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function BuilderIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 2L13.5 9L20 9L14.5 13.5L17 21L12 17L7 21L9.5 13.5L4 9L10.5 9Z" fill={color} />
    </Svg>
  );
}

function CalendarIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x="3" y="5" width="18" height="16" rx="2" fill="none" stroke={color} strokeWidth="2" />
      <Rect x="3" y="5" width="18" height="5" rx="2" fill={color} />
      <Circle cx="8" cy="15" r="1.5" fill={color} />
      <Circle cx="12" cy="15" r="1.5" fill={color} />
      <Circle cx="16" cy="15" r="1.5" fill={color} />
      <Path d="M8 3L8 7" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Path d="M16 3L16 7" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

function ProfileIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="12" cy="8" r="4" fill={color} />
      <Path d="M4 20C4 16.7 7.6 14 12 14C16.4 14 20 16.7 20 20Z" fill={color} />
    </Svg>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#111",
          borderTopColor: "#222",
          borderTopWidth: 1,
          height: 80,
          paddingBottom: 16,
          paddingTop: 8,
        },
        tabBarActiveTintColor: "#7B7FE8",
        tabBarInactiveTintColor: "#555",
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <HomeIcon color={color as string} size={size} />,
        }}
      />
      <Tabs.Screen
        name="wardrobe"
        options={{
          title: "Wardrobe",
          tabBarIcon: ({ color, size }) => <WardrobeIcon color={color as string} size={size} />,
        }}
      />
      <Tabs.Screen
        name="builder"
        options={{
          title: "Builder",
          tabBarIcon: ({ color, size }) => <BuilderIcon color={color as string} size={size} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: "Calendar",
          tabBarIcon: ({ color, size }) => <CalendarIcon color={color as string} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <ProfileIcon color={color as string} size={size} />,
        }}
      />
      <Tabs.Screen name="stats" options={{ href: null }} />
      <Tabs.Screen name="community" options={{ href: null }} />
    </Tabs>
  );
}
