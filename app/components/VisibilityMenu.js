import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { lightTheme, darkTheme } from '../theme/colors';

export const VISIBILITY_OPTIONS = [
  {
    key: 'everyone',
    label: 'Herkes görebilir',
    icon: 'earth',
    color: '#1D9BF0',
  },
  {
    key: 'friends',
    label: 'Arkadaşlar',
    icon: 'people',
    color: '#00BA7C',
  },
  {
    key: 'only_me',
    label: 'Sadece ben',
    icon: 'lock-closed',
    color: '#F7931A',
  },
];

export default function VisibilityMenu({ visible, onSelect, onClose, selected }) {
  const themeMode = useSelector(state => state.theme?.mode || 'dark');
  const colors = themeMode === 'light' ? lightTheme : darkTheme;

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View
          style={{
            position: 'absolute',
            top: Platform.OS === 'ios' ? 190 : 160,
            left: 75,
            backgroundColor: colors.cardBackground,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: colors.border,
            paddingVertical: 6,
            minWidth: 200,
            zIndex: 100,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.18,
            shadowRadius: 8,
            elevation: 8,
          }}
        >
          {/* Soru Başlığı */}
          <View
            style={{
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <Text style={{ color: colors.textSub, fontSize: 12, fontWeight: '700' }}>
              Gönderiyi kim görebilir?
            </Text>
          </View>

          {/* Seçenekler */}
          {VISIBILITY_OPTIONS.map((opt, idx) => {
            const isLast = idx === VISIBILITY_OPTIONS.length - 1;
            const isSelected = selected === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderBottomWidth: !isLast ? 1 : 0,
                  borderBottomColor: colors.border,
                }}
                onPress={() => {
                  onSelect(opt.key);
                  onClose();
                }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={opt.icon}
                  size={20}
                  color={opt.color}
                  style={{ marginRight: 12 }}
                />
                <Text
                  style={{
                    color: colors.textMain,
                    fontSize: 14,
                    fontWeight: '600',
                    flex: 1,
                  }}
                >
                  {opt.label}
                </Text>
                {isSelected && (
                  <Ionicons name="checkmark" size={16} color={colors.primary} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
});
