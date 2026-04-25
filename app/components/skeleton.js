import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Dimensions } from 'react-native';
import { useSelector } from 'react-redux';
import { lightTheme, darkTheme } from '../theme/colors';

const { width } = Dimensions.get('window');

const Skeleton = () => {
  const themeMode = useSelector(state => state.theme?.mode || 'dark');
  const colors = themeMode === 'light' ? lightTheme : darkTheme;
  const styles = getStyles(colors);
  
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.container}>
      {}
      <Animated.View style={[styles.banner, { opacity }]} />
      <Animated.View style={[styles.avatar, { opacity }]} />
      
      {}
      <View style={{ padding: 20 }}>
        <Animated.View style={[styles.line, { width: '60%', opacity }]} />
        <Animated.View style={[styles.line, { width: '90%', height: 100, opacity }]} />
        <Animated.View style={[styles.line, { width: '40%', opacity }]} />
        <Animated.View style={[styles.line, { width: '80%', height: 150, opacity }]} />
      </View>
    </View>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  banner: { width: '100%', height: 150, backgroundColor: colors.cardBackground },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.border, marginTop: -40, marginLeft: 20, borderWidth: 3, borderColor: colors.background },
  line: { height: 20, backgroundColor: colors.cardBackground, borderRadius: 8, marginBottom: 15 }
});

export default Skeleton;