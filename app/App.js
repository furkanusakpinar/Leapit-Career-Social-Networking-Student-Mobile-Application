import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider, useDispatch, useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';
import RootNavigation from './navigation/rootNavigation';
import store from './redux/store';
import { setTheme } from './redux/themeSlice';
import { lightTheme, darkTheme } from './theme/colors';

const warningIcon = require('../assets/images/warningIcon.png');

function buildToastConfig(colors) {
  return {
    success: (props) => (
      <BaseToast
        {...props}
        style={{
          borderLeftColor: '#69B958',
          backgroundColor: colors.cardBackground,
          height: 60,
          borderRadius: 10,
          width: '92%',
        }}
        text1Style={{ fontSize: 15, fontWeight: 'bold', color: colors.textMain }}
        text2Style={{ fontSize: 13, color: colors.textSub }}
      />
    ),
    error: (props) => (
      <ErrorToast
        {...props}
        style={{
          borderLeftColor: '#E63946',
          backgroundColor: colors.cardBackground,
          height: 60,
          borderRadius: 10,
          width: '92%',
        }}
        text1Style={{ fontSize: 15, fontWeight: 'bold', color: colors.textMain }}
        text2Style={{ fontSize: 13, color: colors.textSub }}
      />
    ),
    custom_error: ({ text1, text2 }) => (
      <View style={[toastStyles.container, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        <Image source={warningIcon} style={toastStyles.icon} />
        <View style={toastStyles.textContainer}>
          <Text style={[toastStyles.text1, { color: colors.textMain }]}>{text1}</Text>
          <Text style={[toastStyles.text2, { color: colors.textSub }]}>{text2}</Text>
        </View>
      </View>
    ),
  };
}

const toastStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    width: '92%',
    borderWidth: 1,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  icon: { width: 24, height: 24, tintColor: '#E63946', marginRight: 12 },
  textContainer: { flex: 1 },
  text1: { fontSize: 15, fontWeight: 'bold', marginBottom: 2 },
  text2: { fontSize: 13 },
});

function AppWithToast() {
  const themeMode = useSelector(state => state.theme?.mode || 'dark');
  const colors = themeMode === 'light' ? lightTheme : darkTheme;

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
      .finally(() => setThemeLoaded(true));
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
