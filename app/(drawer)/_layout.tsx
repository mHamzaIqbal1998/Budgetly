// Drawer Navigation Layout
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { type DrawerContentComponentProps } from "@react-navigation/drawer";
import { CommonActions, DrawerActions } from "@react-navigation/native";
import { useRouter, type Href } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { StyleSheet } from "react-native";
import { Drawer } from "expo-router/drawer";
import { DrawerContentScrollView, DrawerItem } from "@react-navigation/drawer";
import { FAB, Portal, useTheme } from "react-native-paper";
import { GestureHandlerRootView } from "react-native-gesture-handler";

const TRANSACTIONS_ROUTE = "/(drawer)/transactions" as Href;

/** Custom drawer content so "Transactions" always opens with a clean URL (no accountId). */
function CustomDrawerContent(
  props: DrawerContentComponentProps & { router: ReturnType<typeof useRouter> }
) {
  const { state, navigation, descriptors, router } = props;
  const focusedRoute = state.routes[state.index];
  const focusedOptions = descriptors[focusedRoute.key]?.options ?? {};
  const {
    drawerActiveTintColor = undefined,
    drawerInactiveTintColor = undefined,
    drawerActiveBackgroundColor = undefined,
    drawerInactiveBackgroundColor = undefined,
    drawerContentStyle,
    drawerContentContainerStyle,
  } = focusedOptions;

  const visibleRoutes = state.routes.filter((route) => {
    const opts = descriptors[route.key]?.options;
    const style = opts?.drawerItemStyle as { display?: string } | undefined;
    return style?.display !== "none";
  });

  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={drawerContentContainerStyle}
      style={drawerContentStyle}
    >
      {visibleRoutes.map((route) => {
        const focused = state.routes[state.index]?.key === route.key;
        const {
          drawerLabel,
          drawerIcon,
          title,
          drawerItemStyle,
          drawerLabelStyle,
          drawerAllowFontScaling,
        } = descriptors[route.key].options;
        const label =
          typeof drawerLabel === "function"
            ? (p: { focused: boolean; color: string }) =>
                drawerLabel({ focused: p.focused, color: p.color })
            : ((drawerLabel ?? title ?? route.name) as string);

        const onPress = () => {
          if (route.name === "transactions") {
            router.replace(TRANSACTIONS_ROUTE);
            navigation.dispatch(DrawerActions.closeDrawer());
            return;
          }
          navigation.dispatch({
            ...(focused
              ? DrawerActions.closeDrawer()
              : CommonActions.navigate(route)),
            target: state.key,
          });
        };

        return (
          <DrawerItem
            key={route.key}
            route={route}
            label={label}
            icon={drawerIcon}
            focused={focused}
            activeTintColor={drawerActiveTintColor}
            inactiveTintColor={drawerInactiveTintColor}
            activeBackgroundColor={drawerActiveBackgroundColor}
            inactiveBackgroundColor={drawerInactiveBackgroundColor}
            style={drawerItemStyle}
            labelStyle={drawerLabelStyle}
            allowFontScaling={drawerAllowFontScaling}
            onPress={onPress}
          />
        );
      })}
    </DrawerContentScrollView>
  );
}

export default function DrawerLayout() {
  const theme = useTheme();
  const router = useRouter();
  const [fabOpen, setFabOpen] = useState(false);

  const drawerContent = useCallback(
    (props: DrawerContentComponentProps) => (
      <CustomDrawerContent {...props} router={router} />
    ),
    [router]
  );

  const onAddTransaction = useCallback(() => {
    setFabOpen(false);
    router.push("/(drawer)/transaction/create" as Href);
  }, [router]);

  const onCreateBudget = useCallback(() => {
    setFabOpen(false);
    // Placeholder; same as previous dashboard FAB behavior
  }, []);

  const onAddAccount = useCallback(() => {
    setFabOpen(false);
    router.push("/(drawer)/account/create" as Href);
  }, [router]);

  const fabActions = useMemo(
    () => [
      {
        icon: "plus-circle" as const,
        label: "Add Transaction",
        containerStyle: layoutStyles.fabLabelContainer,
        onPress: onAddTransaction,
      },
      {
        icon: "wallet-plus" as const,
        label: "Create Budget",
        containerStyle: layoutStyles.fabLabelContainer,
        onPress: onCreateBudget,
      },
      {
        icon: "bank-plus" as const,
        label: "Add Account",
        containerStyle: layoutStyles.fabLabelContainer,
        onPress: onAddAccount,
      },
    ],
    [onAddTransaction, onCreateBudget, onAddAccount]
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Drawer
        drawerContent={drawerContent}
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
          name="transactions"
          options={{
            title: "Transactions",
            drawerLabel: "Transactions",
            drawerIcon: ({ color, size }) => (
              <MaterialCommunityIcons
                name="swap-horizontal"
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
          name="transaction"
          options={{
            title: "Transaction Detail",
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

      {/* App-wide FAB */}
      <Portal>
        <FAB.Group
          open={fabOpen}
          visible
          icon={fabOpen ? "close" : "plus"}
          style={layoutStyles.fabGroup}
          fabStyle={layoutStyles.fabMain}
          actions={fabActions}
          onStateChange={({ open }) => setFabOpen(open)}
        />
      </Portal>
    </GestureHandlerRootView>
  );
}

const layoutStyles = StyleSheet.create({
  fabGroup: {
    paddingRight: 20,
    paddingBottom: 20,
  },
  fabMain: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  fabLabelContainer: {
    minWidth: 132,
    marginRight: 12,
  },
});
