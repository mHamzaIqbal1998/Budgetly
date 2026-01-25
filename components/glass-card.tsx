// Glassy Card Component with Spotify Theme
import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Card, useTheme } from 'react-native-paper';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'primary' | 'elevated';
  mode?: 'elevated' | 'contained' | 'outlined';
}

export function GlassCard({ children, style, variant = 'default', mode = 'elevated' }: GlassCardProps) {
  const theme = useTheme();

  const getCardStyle = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: 'rgba(29, 185, 84, 0.15)', // Spotify green with transparency
          borderColor: 'rgba(29, 185, 84, 0.3)',
          borderWidth: 1,
        };
      case 'elevated':
        return {
          backgroundColor: 'rgba(40, 40, 40, 0.8)', // Dark gray with transparency
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
        };
      default:
        return {
          backgroundColor: 'rgba(40, 40, 40, 0.6)', // Semi-transparent dark gray
          borderColor: 'rgba(255, 255, 255, 0.05)',
          borderWidth: 1,
        };
    }
  };

  return (
    <Card 
      style={[
        styles.glassCard,
        getCardStyle(),
        style,
      ]} 
      mode={mode}
    >
      {children}
    </Card>
  );
}

// Glassy Container for sections
interface GlassContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'primary';
}

export function GlassContainer({ children, style, variant = 'default' }: GlassContainerProps) {
  const theme = useTheme();
  
  const backgroundColor = variant === 'primary' 
    ? 'rgba(29, 185, 84, 0.12)' 
    : 'rgba(40, 40, 40, 0.6)';
    
  const borderColor = variant === 'primary'
    ? 'rgba(29, 185, 84, 0.3)'
    : 'rgba(255, 255, 255, 0.05)';

  return (
    <View 
      style={[
        styles.glassContainer,
        { 
          backgroundColor,
          borderColor,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  glassCard: {
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  glassContainer: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    overflow: 'hidden',
  },
});

