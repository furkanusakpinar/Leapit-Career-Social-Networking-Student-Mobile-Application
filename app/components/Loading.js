import React, { useEffect } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { useDispatch } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setUserId, setLoading, setAuth, setProfileStep, setUserInfo } from '../redux/userSlice';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

const CONTENT_DELAY = 2800;

const Loading = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    let active = true;

    const checkUserCredentials = async () => {
      try {
        dispatch(setLoading(true));

        const storedUserId = await AsyncStorage.getItem('userId');
        const storedCredentials = await AsyncStorage.getItem('userCredentials');

        if (storedUserId && storedCredentials) {
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
                dispatch(setUserId(storedUserId));
                dispatch(setAuth(true));
              }
            } else {
              console.log('Stored user no longer exists in Firestore. Clearing credentials.');
              await AsyncStorage.multiRemove(['userId', 'userCredentials', 'isBiometricEnabled', 'rememberMe']);
              dispatch(setAuth(false));
            }
          } catch (firestoreError) {
            console.error('Firestore check error during startup:', firestoreError);
            dispatch(setAuth(false));
          }
        } else {
          dispatch(setAuth(false));
        }
      } catch (error) {
        console.error('Kontrol hatası:', error);
        dispatch(setAuth(false));
      }
    };

    const minDelay = new Promise((resolve) => {
      setTimeout(resolve, CONTENT_DELAY);
    });

    Promise.all([checkUserCredentials(), minDelay]).then(() => {
      if (active) dispatch(setLoading(false));
    });

    return () => {
      active = false;
    };
  }, [dispatch]);

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/images/LeapitLogo1024.png')}
        style={styles.logo}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#161622' },
  logo: { width: 150, height: 150 },
});

export default Loading;