import { Tabs } from 'expo-router';
import { Compass, Home, User } from 'lucide-react-native';
import { View } from 'react-native';

const ACTIVE = '#24458F';
const INACTIVE = '#7D8594';
const CENTER_BG = '#E8EEF9';

export default function AppTabs() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ACTIVE,
        tabBarInactiveTintColor: INACTIVE,
        tabBarHideOnKeyboard: true,
        sceneStyle: {
          backgroundColor: '#FFFFFF',
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
        },
        tabBarStyle: {
          height: 88,
          paddingTop: 10,
          paddingBottom: 20,
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E5E7EB',
          borderTopWidth: 1,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Home size={22} color={color} strokeWidth={focused ? 2.5 : 1.8} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Discover',
          tabBarLabel: () => null,
          tabBarIconStyle: {
            marginTop: 8,
          },
          tabBarIcon: ({ focused }) => <CenterTabIcon focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => (
            <User size={22} color={focused ? ACTIVE : INACTIVE} strokeWidth={focused ? 2.5 : 1.8} />
          ),
        }}
      />
    </Tabs>
  );
}

function CenterTabIcon({ focused }: { focused: boolean }) {
  return (
    <View
      style={{
        width: 56,
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 22,
        backgroundColor: focused ? CENTER_BG : CENTER_BG,
      }}
    >
      <Compass size={30} color={ACTIVE} strokeWidth={focused ? 2.7 : 2.2} />
    </View>
  );
}
