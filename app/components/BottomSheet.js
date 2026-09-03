import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Modal, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { lightTheme, darkTheme } from '../theme/colors';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function BottomSheet({
  visible,
  onClose,
  title,
  subtitle,
  children,
  contentStyle,
  testID,
  transparent,
  hideCloseIcon,
  dismissOnContentSwipe,
}) {
  const themeMode = useSelector(state => state.theme?.mode || 'dark');
  const colors = themeMode === 'light' ? lightTheme : darkTheme;
  const styles = getStyles(colors);

  const [mounted, setMounted] = useState(false);
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdrop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(translateY, { toValue: 0, duration: 280, useNativeDriver: true }),
        Animated.timing(backdrop, { toValue: 1, duration: 280, useNativeDriver: true }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(translateY, { toValue: SCREEN_HEIGHT, duration: 250, useNativeDriver: true }),
        Animated.timing(backdrop, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start(() => setMounted(false));
    }
  }, [visible]);

  const handleRelease = () => {
    Animated.timing(translateY, {
      toValue: SCREEN_HEIGHT - 80,
      duration: 180,
      useNativeDriver: true,
    }).start();
    onClose?.();
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => g.dy > 8 && g.dy > Math.abs(g.dx),
        onPanResponderMove: (_, g) => {
          if (g.dy > 0) translateY.setValue(g.dy);
        },
        onPanResponderRelease: (_, g) => {
          if (g.dy > 120 || g.vy > 1) {
            handleRelease();
          } else {
            Animated.spring(translateY, {
              toValue: 0,
              useNativeDriver: true,
              speed: 30,
              bounciness: 4,
            }).start();
          }
        },
      }),
    [onClose, handleRelease]
  );

  if (!visible && !mounted) return null;

  return (
    <Modal transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.root} testID={testID}>
        <Animated.View style={[styles.backdrop, { opacity: backdrop }]}>
          <Pressable style={styles.backdropPressable} onPress={onClose} />
        </Animated.View>

        <Animated.View
          {...(dismissOnContentSwipe ? panResponder.panHandlers : {})}
          style={[styles.sheet, transparent && styles.sheetTransparent, { transform: [{ translateY }] }]}
        >
          <View style={styles.handleHitArea} {...panResponder.panHandlers}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
          </View>

          {(title || subtitle) && (
            <View style={styles.header}>
              <View style={styles.headerSide} />
              <View style={styles.headerCenter}>
                {!!title && (
                  <Text style={[styles.title, { color: colors.textMain }]} numberOfLines={1}>
                    {title}
                  </Text>
                )}
                {!!subtitle && (
                  <Text style={[styles.subtitle, { color: colors.textSub }]} numberOfLines={1}>
                    {subtitle}
                  </Text>
                )}
              </View>
              {!hideCloseIcon && onClose ? (
                <Pressable onPress={onClose} hitSlop={10} style={styles.headerSide}>
                  <MaterialCommunityIcons name="close" size={22} color={colors.textSub} />
                </Pressable>
              ) : (
                <View style={styles.headerSide} />
              )}
            </View>
          )}

          <View style={[styles.content, contentStyle]}>{children}</View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const getStyles = (colors) =>
  StyleSheet.create({
    root: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    backdropPressable: {
      flex: 1,
    },
    sheet: {
      backgroundColor: colors.cardBackground,
      width: '95%',
      alignSelf: 'center',
      marginBottom: 20,
      borderTopLeftRadius: 25,
      borderTopRightRadius: 25,
      borderBottomLeftRadius: 25,
      borderBottomRightRadius: 25,
      borderWidth: 1,
      borderColor: colors.border,
      maxHeight: '92%',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -5 },
      shadowOpacity: 0.3,
      shadowRadius: 10,
      elevation: 15,
      overflow: 'hidden',
    },
    sheetTransparent: {
      backgroundColor: 'transparent',
      borderWidth: 0,
      shadowOpacity: 0,
      elevation: 0,
    },
    handleHitArea: {
      alignSelf: 'center',
      paddingVertical: 4,
      paddingHorizontal: 40,
      zIndex: 1,
    },
    handle: {
      width: 40,
      height: 5,
      borderRadius: 10,
      marginTop: 8,
      marginBottom: 4,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingBottom: 10,
    },
    headerSide: {
      width: 40,
      alignItems: 'flex-end',
      justifyContent: 'center',
    },
    headerCenter: {
      flex: 1,
      alignItems: 'center',
      paddingHorizontal: 8,
    },
    title: {
      fontSize: 17,
      fontWeight: '700',
    },
    subtitle: {
      fontSize: 13,
      marginTop: 2,
    },
    content: {
      width: '100%',
    },
  });