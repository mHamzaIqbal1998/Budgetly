import { Stack } from "expo-router";
import { useTheme } from "react-native-paper";

export default function TransactionLayout() {
  const theme = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.onSurface,
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: "600" },
        contentStyle: { backgroundColor: theme.colors.background },
        animation: "slide_from_left",
      }}
    />
  );
}
