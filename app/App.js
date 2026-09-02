import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider, useDispatch, useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SystemUI from 'expo-system-ui';
import * as SplashScreen from 'expo-splash-screen';
import Toast from 'react-native-toast-message';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import RootNavigation from './navigation/rootNavigation';
import store from './redux/store';
import { setTheme } from './redux/themeSlice';
import { lightTheme, darkTheme } from './theme/colors';

// Disable system font scaling globally for consistent UI sizing
if (Text.defaultProps) {
  Text.defaultProps.allowFontScaling = false;
} else {
  Text.defaultProps = {};
  Text.defaultProps.allowFontScaling = false;
}

if (TextInput.defaultProps) {
  TextInput.defaultProps.allowFontScaling = false;
} else {
  TextInput.defaultProps = {};
  TextInput.defaultProps.allowFontScaling = false;
}

const TOAST_ACCENTS = {
  success: { icon: 'check-circle', color: '#2EBD59' },
  error: { icon: 'close-circle', color: '#E63946' },
  warning: { icon: 'alert-circle', color: '#F39C12' },
  info: { icon: 'information', color: '#3B82F6' },
  custom_error: { icon: 'alert-circle', color: '#E63946' },
};

const ToastView = ({ colors, type, text1, text2 }) => {
  const accent = TOAST_ACCENTS[type] || TOAST_ACCENTS.info;

  return (
    <View style={[toastStyles.container, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      <View style={[toastStyles.iconCircle, { backgroundColor: accent.color + '1A' }]}>
        <MaterialCommunityIcons name={accent.icon} size={22} color={accent.color} />
      </View>
      <View style={toastStyles.textContainer}>
        <Text style={[toastStyles.text1, { color: colors.textMain }]} numberOfLines={1}>{text1}</Text>
        {!!text2 && (
          <Text style={[toastStyles.text2, { color: colors.textSub }]} numberOfLines={2}>{text2}</Text>
        )}
      </View>
    </View>
  );
};

function buildToastConfig(colors) {
  return {
    success: (props) => <ToastView {...props} colors={colors} type="success" />,
    error: (props) => <ToastView {...props} colors={colors} type="error" />,
    warning: (props) => <ToastView {...props} colors={colors} type="warning" />,
    info: (props) => <ToastView {...props} colors={colors} type="info" />,
    custom_error: (props) => <ToastView {...props} colors={colors} type="custom_error" />,
  };
}

const toastStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    width: '92%',
    borderWidth: 1,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: { flex: 1 },
  text1: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  text2: { fontSize: 13, lineHeight: 18 },
});

function AppWithToast() {
  const themeMode = useSelector(state => state.theme?.mode || 'dark');
  const colors = themeMode === 'light' ? lightTheme : darkTheme;

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.background).catch(() => {});
  }, [colors.background]);

  return (
    <>
      <RootNavigation />
      <Toast
        config={buildToastConfig(colors)}
        position="top"
        topOffset={55}
        visibilityTime={3000}
      />
    </>
  );
}

function ThemeLoader({ children }) {
  const dispatch = useDispatch();
  const [themeLoaded, setThemeLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('@leapit_theme')
      .then((savedTheme) => {
        if (savedTheme === 'light' || savedTheme === 'dark') {
          dispatch(setTheme(savedTheme));
        }
      })
      .finally(() => {
        setThemeLoaded(true);
        SplashScreen.hideAsync().catch(() => {});
      });
  }, []);

  if (!themeLoaded) return null;
  return children;
}

export default function App() {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <ThemeLoader>
            <AppWithToast />
          </ThemeLoader>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </Provider>
  );
}
