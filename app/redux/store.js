import { configureStore } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import userReducer from './userSlice';
import themeReducer from './themeSlice';

const store = configureStore({
  reducer: {
    user: userReducer,
    theme: themeReducer,
  },
});

let previousThemeMode = store.getState().theme.mode;

store.subscribe(() => {
  const currentThemeMode = store.getState().theme.mode;
  if (currentThemeMode !== previousThemeMode) {
    previousThemeMode = currentThemeMode;
    AsyncStorage.setItem('@leapit_theme', currentThemeMode).catch(() => {});
  }
});

export default store;
