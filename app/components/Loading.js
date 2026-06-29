import React, { useEffect } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setUserId, setLoading, setAuth, setProfileStep } from '../redux/userSlice';
import { lightTheme, darkTheme } from '../theme/colors';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

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
          // Firestore'da kullanıcı gerçekten var mı kontrol et
          try {
            const userDocRef = doc(db, 'Users', storedUserId);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists()) {
              const userData = userDocSnap.data();

              if (!userData.profileCompleted) {
                const createdAt = userData.createdAt ? new Date(userData.createdAt).getTime() : 0;
                const elapsedMs = Date.now() - createdAt;
                const TWENTY_MINUTES = 20 * 60 * 1000;

                if (elapsedMs <= TWENTY_MINUTES) {
                  // Profil tamamlanmamış ve 20 dk geçmemiş — hangi adımda kaldığını belirle
                  dispatch(setUserId(storedUserId));
                  dispatch(setUserInfo(userData));
                  
                  let step = 'CreateProfile';
                  try {
                    const step1Raw = await AsyncStorage.getItem('step1_completed');
                    if (step1Raw) {
                      const parsed = JSON.parse(step1Raw);
                      if (Date.now() - parsed.timestamp < TWENTY_MINUTES) {
                        step = 'CreatePage2';
                      }
                    }
                  } catch (_) {}

                  dispatch(setProfileStep(step));
                  dispatch(setAuth(false));
                } else {
                  // 20 dk geçmiş — hesabı sil ve temizle
                  await deleteDoc(userDocRef);
                  await AsyncStorage.multiRemove([
                    'userId',
                    'userCredentials',
                    'isBiometricEnabled',
                    'rememberMe',
                    'create_profile_draft',
                    'create_page2_draft',
                    'student_page_draft',
                    'step1_completed'
                  ]);
                  dispatch(setAuth(false));
                }
              } else {
                // Profil tamam, normal giriş
                dispatch(setUserId(storedUserId));
                dispatch(setAuth(true));
              }
            } else {
              // Kullanıcı silinmiş, kayıtlı bilgileri temizle
              console.log('Stored user no longer exists in Firestore. Clearing credentials.');
              await AsyncStorage.multiRemove(['userId', 'userCredentials', 'isBiometricEnabled', 'rememberMe']);
              dispatch(setAuth(false));
            }
          } catch (firestoreError) {
            // Firestore hatası olursa güvenli tarafta kal, login ekranına gönder
            console.error('Firestore check error during startup:', firestoreError);
            dispatch(setAuth(false));
          }
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