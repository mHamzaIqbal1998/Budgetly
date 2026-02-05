// Drawer Navigation Layout
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Drawer } from "expo-router/drawer";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useTheme } from "react-native-paper";

export default function DrawerLayout() {
  const theme = useTheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Drawer
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.colors.surface,
          },
          headerTintColor: theme.colors.onSurface,
          drawerStyle: {
            backgroundColor: theme.colors.surface,
          },
          drawerActiveTintColor: theme.colors.primary,
          drawerInactiveTintColor: theme.colors.onSurfaceVariant,
          drawerActiveBackgroundColor: "rgba(29, 185, 84, 0.12)",
        }}
      >
        <Drawer.Screen
          name="dashboard"
          options={{
            title: "Dashboard",
            drawerLabel: "Dashboard",
            drawerIcon: ({ color, size }) => (
              <MaterialCommunityIcons
                name="view-dashboard"
                size={size}
                color={color}
              />
            ),
          }}
        />
        <Drawer.Screen
          name="expenses"
          options={{
            title: "Expenses",
            drawerLabel: "Expenses",
            drawerIcon: ({ color, size }) => (
              <MaterialCommunityIcons
                name="cash-multiple"
                size={size}
                color={color}
              />
            ),
          }}
        />
        <Drawer.Screen
          name="budgets"
          options={{
            title: "Budgets",
            drawerLabel: "Budgets",
            drawerIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="wallet" size={size} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="subscriptions"
          options={{
            title: "Subscriptions",
            drawerLabel: "Subscriptions",
            drawerIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="repeat" size={size} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="piggy-banks"
          options={{
            title: "Piggy Banks",
            drawerLabel: "Piggy Banks",
            drawerIcon: ({ color, size }) => (
              <MaterialCommunityIcons
                name="piggy-bank"
                size={size}
                color={color}
              />
            ),
          }}
        />
        <Drawer.Screen
          name="accounts"
          options={{
            title: "Accounts",
            drawerLabel: "Accounts",
            drawerIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="bank" size={size} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="account"
          options={{
            title: "Transactions",
            drawerItemStyle: { display: "none" },
            headerShown: false,
          }}
        />
        <Drawer.Screen
          name="reports"
          options={{
            title: "Reports & Insights",
            drawerLabel: "Reports",
            drawerIcon: ({ color, size }) => (
              <MaterialCommunityIcons
                name="chart-bar"
                size={size}
                color={color}
              />
            ),
          }}
        />
        <Drawer.Screen
          name="settings"
          options={{
            title: "Settings",
            drawerLabel: "Settings",
            drawerIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="cog" size={size} color={color} />
            ),
          }}
        />
      </Drawer>
    </GestureHandlerRootView>
  );
}
