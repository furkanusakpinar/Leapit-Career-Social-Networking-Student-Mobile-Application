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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { lightTheme, darkTheme } from '../theme/colors';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function PostOptionsMenu({
  visible,
  isOwnPost,
  isSaved,
  onDelete,
  onReport,
  onSave,
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

  const menuHeight = isOwnPost ? 120 : 120;
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
      <Pressable style={styles.backdrop} onPress={onClose} />

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
        <TouchableOpacity
          style={[styles.menuItem, { borderBottomColor: colors.border, borderBottomWidth: 0.5 }]}
          onPress={onSave}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name={isSaved ? "bookmark-off-outline" : "bookmark-outline"} size={20} color={colors.textMain} style={styles.menuIcon} />
          <Text style={[styles.menuItemText, { color: colors.textMain }]}>
            {isSaved ? "Kaydedilenlerden Kaldır" : "Kaydet"}
          </Text>
        </TouchableOpacity>

        {isOwnPost ? (
          <TouchableOpacity
            style={styles.menuItem}
            onPress={onDelete}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="delete-outline" size={20} color="#FF3B30" style={styles.menuIcon} />
            <Text style={[styles.menuItemText, { color: '#FF3B30' }]}>Gönderiyi Sil</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.menuItem}
            onPress={onReport}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="alert-circle-outline" size={20} color={colors.textMain} style={styles.menuIcon} />
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
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  menuBox: {
    position: 'absolute',
    right: 20,
    width: 220,
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  menuIcon: {
    marginRight: 10,
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
