import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { useSelector } from 'react-redux';
import { lightTheme, darkTheme } from '../theme/colors';

const { width } = Dimensions.get('window');

const Shimmer = ({ translateX, colors, styles }) => (
  <Animated.View
    style={[
      styles.shimmer,
      { 
        transform: [{ translateX }],
        backgroundColor: colors.mode === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.15)' 
      }
    ]}
  />
);

const Block = ({ style, children, styles }) => (
  <View style={[styles.block, style]}>
    {children}
  </View>
);

const LoginSkeleton = () => {
  const shimmerValue = useRef(new Animated.Value(-1)).current;
  const fade = useRef(new Animated.Value(0)).current;

  const themeMode = useSelector(state => state.theme?.mode || 'dark');
  const colors = themeMode === 'light' ? lightTheme : darkTheme;
  const styles = getStyles(colors);

  useEffect(() => {
    Animated.parallel([
      Animated.loop(
        Animated.timing(shimmerValue, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        })
      ),
      Animated.timing(fade, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const translateX = shimmerValue.interpolate({
    inputRange: [-1, 1],
    outputRange: [-width, width],
  });

  return (
    <Animated.View style={[styles.container, { opacity: fade }]}>
      <Block style={styles.logo} styles={styles}><Shimmer translateX={translateX} colors={colors} styles={styles} /></Block>
      <Block style={styles.logo2} styles={styles}><Shimmer translateX={translateX} colors={colors} styles={styles} /></Block>
      <Block style={styles.logo3} styles={styles}><Shimmer translateX={translateX} colors={colors} styles={styles} /></Block>
      <Block style={styles.logo4} styles={styles}><Shimmer translateX={translateX} colors={colors} styles={styles} /></Block>

      <View style={styles.bottom}>
        <Block style={styles.card} styles={styles}><Shimmer translateX={translateX} colors={colors} styles={styles} /></Block>
        <Block style={styles.input} styles={styles}><Shimmer translateX={translateX} colors={colors} styles={styles} /></Block>
        <Block style={styles.input} styles={styles}><Shimmer translateX={translateX} colors={colors} styles={styles} /></Block>
        <Block style={styles.button} styles={styles}><Shimmer translateX={translateX} colors={colors} styles={styles} /></Block>
      </View>
    </Animated.View>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  bottom: {
    padding: 24,
    justifyContent: 'flex-end',
    flex: 1
  },
  block: {
    backgroundColor: colors.border,
    overflow: 'hidden'
  },
  shimmer: {
    width: '40%',
    height: '100%',
    opacity: 0.4
  },
  logo: {
    height: 140,
    width: 140,
    borderRadius: 99,
    position: 'absolute',
    top: 250,
    alignSelf: 'center'
  },
  logo2: {
    height: 130,
    width: 130,
    borderRadius: 99,
    position: 'absolute',
    top: 140,
    left: 24
  },
  logo3: {
    height: 110,
    width: 110,
    borderRadius: 99,
    position: 'absolute',
    top: 140,
    right: 24
  },
  logo4: {
    height: 120,
    width: 120,
    borderRadius: 99,
    position: 'absolute',
    top: 50,
    alignSelf: 'center'
  },
  card: {
    height: 40,
    borderRadius: 12,
    marginBottom: 20
  },
  input: {
    height: 50,
    borderRadius: 12,
    marginBottom: 15
  },
  button: {
    height: 55,
    borderRadius: 12,
    marginTop: 10
  }
});

export default LoginSkeleton;
