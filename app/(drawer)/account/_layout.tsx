import { Stack } from "expo-router";
import { useTheme } from "react-native-paper";

export default function AccountLayout() {
  const theme = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.onSurface,
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: "600" },
        animation: "slide_from_left",
      }}
    />
  );
}
