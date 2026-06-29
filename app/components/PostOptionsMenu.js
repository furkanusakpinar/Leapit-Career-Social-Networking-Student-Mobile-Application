import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
} from 'react-native';
import { useSelector } from 'react-redux';
import { lightTheme, darkTheme } from '../theme/colors';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * PostOptionsMenu – Anchored popup Context Menu
 *
 * Props:
 *   visible      {boolean}  – controls visibility
 *   isOwnPost    {boolean}  – true  → show "Sil",  false → show "Bildir"
 *   onDelete     {function} – called when user confirms delete
 *   onReport     {function} – called when user confirms report
 *   onClose      {function} – called when backdrop / cancel pressed
 *   anchorY      {number}   – vertical coordinate of the click to position menu
 */
export default function PostOptionsMenu({
  visible,
  isOwnPost,
  onDelete,
  onReport,
  onClose,
  anchorY = 0,
}) {
  const themeMode = useSelector(state => state.theme?.mode || 'dark');
  const colors = themeMode === 'light' ? lightTheme : darkTheme;

  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 150,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.85,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  // Prevent menu from overflowing off the bottom of the screen
  const menuHeight = isOwnPost ? 75 : 75; // Approx height of the menu
  const isCloseToBottom = anchorY + menuHeight > SCREEN_HEIGHT - 100;
  const topPos = isCloseToBottom ? anchorY - menuHeight - 15 : anchorY + 15;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Invisible backdrop to dismiss the context menu on press */}
      <Pressable style={styles.backdrop} onPress={onClose} />

      {/* Floating Context Menu Box */}
      <Animated.View
        style={[
          styles.menuBox,
          {
            backgroundColor: colors.cardBackground,
            borderColor: colors.border,
            top: topPos,
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {isOwnPost ? (
          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: colors.border }]}
            onPress={onDelete}
            activeOpacity={0.7}
          >
            <Text style={[styles.menuItemText, { color: '#FF3B30' }]}>Gönderiyi Sil</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: colors.border }]}
            onPress={onReport}
            activeOpacity={0.7}
          >
            <Text style={[styles.menuItemText, { color: colors.textMain }]}>Bildir</Text>
          </TouchableOpacity>
        )}

      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.15)', // Light overlay to emphasize popup without blocking
  },
  menuBox: {
    position: 'absolute',
    right: 20,
    width: 170,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  menuItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderBottomWidth: 0.5,
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
