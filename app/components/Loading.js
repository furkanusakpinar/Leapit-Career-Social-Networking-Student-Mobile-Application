import React, { useEffect } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setUserId, setLoading, setAuth } from '../redux/userSlice';
import { lightTheme, darkTheme } from '../theme/colors';

const Loading = () => {
  const dispatch = useDispatch();
  const themeMode = useSelector(state => state.theme?.mode || 'dark');
  const colors = themeMode === 'light' ? lightTheme : darkTheme;
  const styles = getStyles(colors);

  useEffect(() => {
    const checkUserCredentials = async () => {
      try {
        dispatch(setLoading(true));

        
        const storedUserId = await AsyncStorage.getItem('userId');
        const storedCredentials = await AsyncStorage.getItem('userCredentials');

        if (storedUserId && storedCredentials) {
          
          dispatch(setUserId(storedUserId));
          dispatch(setAuth(true)); 
        } else {
          
          dispatch(setAuth(false)); 
        }
      } catch (error) {
        console.error('Kontrol hatası:', error);
        dispatch(setAuth(false));
      } finally {
        
        setTimeout(() => {
          dispatch(setLoading(false)); 
        }, 2000);
      }
    };

    checkUserCredentials();
  }, [dispatch]);

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image source={require('../../assets/images/LeapitLogo.png')} style={styles.logo} />
        <Image source={require('../../assets/images/LEAPİT.png')} style={[styles.brandName, { tintColor: colors.textMain }]} />
      </View>
    </View>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  logoContainer: { flexDirection: 'row', alignItems: 'center' },
  logo: { width: 80, height: 80, resizeMode: 'contain', marginRight: -12 },
  brandName: { width: 160, height: 50, resizeMode: 'contain' },
});

export default Loading;