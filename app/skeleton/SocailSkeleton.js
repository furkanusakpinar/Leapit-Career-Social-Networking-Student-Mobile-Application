import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, Platform } from 'react-native';
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
            transform: [{ translateX }],
            backgroundColor: colors.mode === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.12)' 
          }
        ]}
      />
    </View>
  );
};

const SocialSkeleton = () => {
  const themeMode = useSelector(state => state.theme?.mode || 'dark');
  const colors = themeMode === 'light' ? lightTheme : darkTheme;
  const styles = getStyles(colors);

  return (
    <View style={styles.container}>
      <View style={styles.navbarSkeleton}>
        <Shimmer style={styles.navIconSmall} colors={colors} styles={styles} />
        <Shimmer style={styles.navSearch} colors={colors} styles={styles} />
      </View>

      <View style={{ flex: 1, justifyContent: 'flex-start', marginTop: 20, marginBottom: 20 }}>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15, marginLeft: 15}}>
          <Shimmer style={styles.Title} colors={colors} styles={styles} />
        </View>
        <View style={{ flexDirection: 'row', gap: 25, marginLeft: 15}}>
          <View style={{ flexDirection: 'column', gap: 10 }}>
            <Shimmer style={styles.curcleImage} colors={colors} styles={styles} />
            <Shimmer style={styles.userName} colors={colors} styles={styles} />
          </View>
          <View style={{ flexDirection: 'column', gap: 10 }}>
            <Shimmer style={styles.curcleImage} colors={colors} styles={styles} />
            <Shimmer style={styles.userName} colors={colors} styles={styles} />
          </View>
          <View style={{ flexDirection: 'column', gap: 10 }}>
            <Shimmer style={styles.curcleImage} colors={colors} styles={styles} />
            <Shimmer style={styles.userName} colors={colors} styles={styles} />
          </View>
        </View>
        <View style={{ marginBottom: 15 , marginLeft: 15, marginTop: 30}}>
          <Shimmer style={styles.Title} colors={colors} styles={styles} />
        </View>
        <View style={{ flexDirection: 'column', gap: 15, marginTop: 15}}>
          <View >
            <Shimmer style={styles.image} colors={colors} styles={styles} />
          </View>
          <View>
            <Shimmer style={styles.image} colors={colors} styles={styles} />
          </View>
          <View>
            <Shimmer style={styles.image} colors={colors} styles={styles} />
          </View>
        </View>
      </View>

      {}
      <View style={styles.bottomBarSkeleton}>
        <Shimmer style={styles.bottomIcon} colors={colors} styles={styles} />
        <Shimmer style={styles.bottomIcon} colors={colors} styles={styles} />
        <Shimmer style={styles.bottomIcon} colors={colors} styles={styles} />
        <Shimmer style={styles.bottomIcon} colors={colors} styles={styles} />
        <Shimmer style={styles.bottomIcon} colors={colors} styles={styles} />
      </View>
    </View>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  
  navbarSkeleton: {
    height: 70,
    backgroundColor: colors.cardBackground,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: Platform.OS === 'ios' ? 40 : 10,
    gap: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  profile: {
    width: 42,
    height: 42,
    borderRadius: 99,
  },
  postProfile: {
    width: 42,
    height: 42,
    borderRadius: 99,
    marginLeft: 15,
    marginBottom: 10
  },
  userName: {
    height: 25,
    width: 110,
    borderRadius: 5,
  },
  Title: {
    height: 25,
    width: 150,
    borderRadius: 5,
  },
  content: {
    height: 25,
    width: 180,
    borderRadius: 5,
  },
  action: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  navIconSmall: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  navSearch: {
    height: 25,
    width: 150,
    borderRadius: 5,
  },
  
  bottomBarSkeleton: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 77,
    paddingBottom: 0,
    borderRadius: 99,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    bottom: 30,
    width: '95%',
    alignSelf: 'center',
  },
  bottomIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  shimmerContainer: {
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  shimmer: {
    width: '40%',
    height: '100%',
  },
  image: {
    height: 90,
    width: '95%',
    alignSelf: 'center',
    borderRadius: 12,
  },
  curcleImage: {
    height: 80,
    width: 80,
    alignSelf: 'center',
    marginBottom: 10,
    marginTop: 15,
    borderRadius: 99,
  },
});

export default SocialSkeleton;