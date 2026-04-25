import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, SafeAreaView } from 'react-native';
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
          { 
            width: '100%', 
            transform: [{ translateX }],
            backgroundColor: colors.mode === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)' 
          }
        ]}
      />
    </View>
  );
};

const StudentPageSkeleton = () => {
  const themeMode = useSelector(state => state.theme?.mode || 'dark');
  const colors = themeMode === 'light' ? lightTheme : darkTheme;
  const styles = getStyles(colors);

  return (
    <SafeAreaView style={styles.container}>
      {}
      <View style={styles.topSection}>
        <View style={styles.header}>
          <Shimmer style={styles.title} colors={colors} styles={styles} />
          <View style={styles.imageWrapper}>
            <Shimmer style={styles.image} colors={colors} styles={styles} />
          </View>
        </View>
      </View>

      {}
      <View style={styles.card}>
        <View style={styles.fieldGroup}>
          <Shimmer style={styles.label} colors={colors} styles={styles} />
          <Shimmer style={styles.input} colors={colors} styles={styles} />
        </View>

        <View style={styles.row}>
          <View style={styles.halfGroup}>
            <Shimmer style={styles.label} colors={colors} styles={styles} />
            <Shimmer style={styles.input} colors={colors} styles={styles} />
          </View>
          <View style={styles.halfGroup}>
            <Shimmer style={styles.label} colors={colors} styles={styles} />
            <Shimmer style={styles.input} colors={colors} styles={styles} />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.halfGroup}>
            <Shimmer style={styles.label} colors={colors} styles={styles} />
            <Shimmer style={styles.input} colors={colors} styles={styles} />
          </View>
          <View style={styles.halfGroup}>
            <Shimmer style={styles.label} colors={colors} styles={styles} />
            <Shimmer style={styles.input} colors={colors} styles={styles} />
          </View>
        </View>

        <Shimmer style={styles.switchContainer} colors={colors} styles={styles} />

        <Shimmer style={styles.button} colors={colors} styles={styles} />
      </View>
    </SafeAreaView>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topSection: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  header: {
    alignItems: 'center',
    paddingTop: 20,
    gap: 10
  },
  shimmerContainer: {
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  shimmer: {
    height: '100%',
  },
  imageWrapper: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 180,
  },
  title: {
    height: 24,
    width: '60%',
    borderRadius: 8,
    marginBottom: 40,
  },
  image: {
    height: 180,
    width: 320,
    borderRadius: 16,
  },
  card: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    paddingHorizontal: 25,
    paddingTop: 30,
    paddingBottom: 40,
    gap: 15,
  },
  fieldGroup: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  halfGroup: {
    flex: 1,
    gap: 8,
  },
  label: {
    height: 14,
    width: '50%',
    borderRadius: 6,
  },
  input: {
    height: 55,
    borderRadius: 12,
    width: '100%',
  },
  switchContainer: {
    height: 60,
    borderRadius: 12,
    width: '100%',
    marginTop: 5,
  },
  button: {
    height: 56,
    borderRadius: 12,
    marginTop: 10,
  },
});

export default StudentPageSkeleton;