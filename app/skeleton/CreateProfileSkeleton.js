import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { useSelector } from 'react-redux';
import { lightTheme, darkTheme } from '../theme/colors';

const { width } = Dimensions.get('window');

const Shimmer = ({ style, colors, styles }) => {
  const translateX = useRef(new Animated.Value(-width)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(translateX, {
        toValue: width,
        duration: 1200,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  return (
    <View style={[styles.shimmerContainer, style, { backgroundColor: colors.border }]}>
      <Animated.View
        style={[
          styles.shimmer,
          { transform: [{ translateX }], backgroundColor: colors.mode === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.12)' }
        ]}
      />
    </View>
  );
};

const CreateProfileSkeleton = () => {
  const themeMode = useSelector(state => state.theme?.mode || 'dark');
  const colors = themeMode === 'light' ? lightTheme : darkTheme;
  const styles = getStyles(colors);

  return (
    <View style={styles.container}>
      {}
      <View style={styles.header}>
        <Shimmer style={styles.title} colors={colors} styles={styles} />
        <Shimmer style={styles.image} colors={colors} styles={styles} />
      </View>

      {}
      <View style={styles.card}>
        <Shimmer style={styles.label} colors={colors} styles={styles} />
        <Shimmer style={styles.input} colors={colors} styles={styles} />

        <Shimmer style={styles.label} colors={colors} styles={styles} />
        <Shimmer style={styles.input} colors={colors} styles={styles} />

        <Shimmer style={styles.label} colors={colors} styles={styles} />
        <Shimmer style={styles.input} colors={colors} styles={styles} />

        <Shimmer style={styles.label} colors={colors} styles={styles} />
        <Shimmer style={styles.input} colors={colors} styles={styles} />

        <Shimmer style={styles.button} colors={colors} styles={styles} />
        <Shimmer style={styles.buttonOutline} colors={colors} styles={styles} />
      </View>
    </View>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'flex-end',
  },
  header: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  shimmerContainer: {
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  shimmer: {
    width: '40%',
    height: '100%',
  },
  title: {
    height: 26,
    width: '70%',
    borderRadius: 8,
    marginBottom: 50,
  },
  image: {
    height: 180,
    width: '80%',
    borderRadius: 16,
  },
  card: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    gap: 14,
  },
  label: {
    height: 14,
    width: '40%',
    borderRadius: 6,
  },
  input: {
    height: 50,
    borderRadius: 12,
  },
  button: {
    height: 54,
    borderRadius: 12,
    marginTop: 12,
  },
  buttonOutline: {
    height: 54,
    borderRadius: 12,
  },
});

export default CreateProfileSkeleton;
