import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  Dimensions,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore'; 
import { db } from '../../firebaseConfig'; 
import { useSelector } from 'react-redux';
import { lightTheme, darkTheme } from '../theme/colors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export function UsePage() {
  const navigation = useNavigation();
  const route = useRoute();
  const themeMode = useSelector(state => state.theme?.mode || 'dark');
  const colors = themeMode === 'light' ? lightTheme : darkTheme;
  const styles = getStyles(colors);

  
  const { prePostId } = route.params || {};

  
  const [activeButton, setActiveButton] = useState('global');

  
  useEffect(() => {
    if (!prePostId) {
      console.warn("UsePage: No prePostId found in route params.");
      return;
    }

    const prePostRef = doc(db, 'prePosts', prePostId);
    const unsub = onSnapshot(prePostRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        setActiveButton(data.use || 'global');
      } else {
        console.log("UsePage: prePost document does not exist or was deleted.");
        
      }
    }, (error) => console.error('UsePage: Firestore listen error (prePosts):', error));

    return () => unsub(); 
  }, [prePostId]); 

  const handleContinue = async () => {
    try {
      let useSettingValue;
      switch (activeButton) {
        case 'Post':
          useSettingValue = 'Post';
          break;
        case 'Project':
          useSettingValue = 'Project';
          break;
        case 'Blog':
          useSettingValue = 'Blog';
          break;
        case 'Business':
          useSettingValue = 'Business';
          break;
        default:
          useSettingValue = 'Post';
      }

      
      if (prePostId) {
        const prePostRef = doc(db, 'prePosts', prePostId);
        await updateDoc(prePostRef, {
          use: useSettingValue,
        });
        console.log("prePost document updated with use setting:", useSettingValue);
      } else {
        console.warn("No prePostId found. Cannot update prePost document.");
      }

      
      navigation.navigate('SharePage', {
        prePostId: prePostId,
      });

    } catch (error) {
      console.error('Error updating prePost document (UsePage): ', error);
      Alert.alert('Hata', 'Ayarlar kaydedilirken bir hata oluştu. Lütfen tekrar deneyin.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
    >
      <ScrollView contentContainerStyle={styles.inner}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()}>
            <Image source={require('../../assets/images/back.png')} style={[styles.back, { tintColor: colors.iconTint }]} />
          </Pressable>
          <Text style={styles.title}>Kullanım ayarları</Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Kullanım</Text>
          <Image source={require('../../assets/images/Line.png')} style={[styles.fullWidthLine, { tintColor: colors.border }]} />
        </View>

        <View style={styles.choiceContainer}>
          <Pressable onPress={() => setActiveButton('Post')} style={styles.choice}>
            <View style={styles.choiceLeft}>
              <Image
                source={
                  activeButton === 'Post'
                    ? require('../../assets/images/Post.png')
                    : require('../../assets/images/PostGray.png')
                }
                style={styles.choiceIconGlobal}
              />
              <Text style={[styles.choiceText, { color: activeButton === 'Post' ? colors.textMain : colors.textSub }]}>
                Gönderi
              </Text>
            </View>
            {activeButton === 'Post' && (
              <Image source={require('../../assets/images/Check.png')} style={[styles.choiceCheck, { tintColor: colors.primary }]} />
            )}
          </Pressable>

          <Image source={require('../../assets/images/Line.png')} style={[styles.shortLine, { tintColor: colors.border }]} />

          <Pressable onPress={() => setActiveButton('Project')} style={styles.choice}>
            <View style={styles.choiceLeft}>
              <Image
                source={
                  activeButton === 'Project'
                    ? require('../../assets/images/project.png')
                    : require('../../assets/images/projectGray.png')
                }
                style={styles.choiceIconGlobal}
              />
              <Text style={[styles.choiceText, { color: activeButton === 'Project' ? colors.textMain : colors.textSub }]}>
                Proje
              </Text>
            </View>
            {activeButton === 'Project' && (
              <Image source={require('../../assets/images/Check.png')} style={[styles.choiceCheck, { tintColor: colors.primary }]} />
            )}
          </Pressable>

          <Image source={require('../../assets/images/Line.png')} style={[styles.shortLine, { tintColor: colors.border }]} />

          <Pressable onPress={() => setActiveButton('Blog')} style={styles.choice}>
            <View style={styles.choiceLeft}>
              <Image
                source={
                  activeButton === 'Blog'
                    ? require('../../assets/images/Blog.png')
                    : require('../../assets/images/BlogGray.png')
                }
                style={styles.choiceIconGlobal}
              />
              <Text style={[styles.choiceText, { color: activeButton === 'Blog' ? colors.textMain : colors.textSub }]}>
                Blog
              </Text>
            </View>
            {activeButton === 'Blog' && (
              <Image source={require('../../assets/images/Check.png')} style={[styles.choiceCheck, { tintColor: colors.primary }]} />
            )}
          </Pressable>

          <Image source={require('../../assets/images/Line.png')} style={[styles.shortLine, { tintColor: colors.border }]} />

          <Pressable onPress={() => setActiveButton('Business')} style={styles.choice}>
            <View style={styles.choiceLeft}>
              <Image
                source={
                  activeButton === 'Business'
                    ? require('../../assets/images/IsIlanlari.png')
                    : require('../../assets/images/IsIlanlariGray.png')
                }
                style={styles.choiceIcon}
              />
              <Text style={[styles.choiceText, { color: activeButton === 'Business' ? colors.textMain : colors.textSub }]}>
                İş İlanı
              </Text>
            </View>
            {activeButton === 'Business' && (
              <Image source={require('../../assets/images/Check.png')} style={[styles.choiceCheck, { tintColor: colors.primary }]} />
            )}
          </Pressable>
        </View>

        <Image source={require('../../assets/images/Line.png')} style={[styles.fullWidthLine, { marginTop: SCREEN_HEIGHT * 0.015, marginBottom: SCREEN_HEIGHT * 0.015, tintColor: colors.border }]} />

        <Pressable
          style={styles.continueButton}
          onPress={handleContinue}
        >
          <Text style={styles.continueButtonText}>Devam Et</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  inner: {
    paddingHorizontal: SCREEN_WIDTH * 0.05,
    paddingVertical: SCREEN_HEIGHT * 0.03,
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SCREEN_WIDTH * 0.08,
    marginBottom: SCREEN_HEIGHT * 0.015,
    marginTop: Platform.OS === 'ios' ? SCREEN_HEIGHT * 0.03 : SCREEN_HEIGHT * 0.02,
  },
  back: { width: 24, height: 24, resizeMode: 'contain' },
  title: {
    color: colors.textMain,
    fontSize: SCREEN_WIDTH * 0.055,
    fontWeight: 'bold',
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'column',
    marginBottom: SCREEN_HEIGHT * 0.01,
    marginTop: SCREEN_HEIGHT * 0.025,
  },
  sectionTitle: {
    color: colors.textMain,
    fontSize: SCREEN_WIDTH * 0.06,
    fontWeight: '600',
    marginBottom: SCREEN_HEIGHT * 0.005,
  },
  fullWidthLine: {
    width: SCREEN_WIDTH,
    height: 1,
    alignSelf: 'center',
    marginLeft: -SCREEN_WIDTH * 0.05,
  },
  shortLine: {
    width: SCREEN_WIDTH * 0.86,
    height: 1,
    marginVertical: SCREEN_HEIGHT * 0.008,
    marginLeft: SCREEN_WIDTH * 0.09,
    marginRight: 0,
  },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SCREEN_HEIGHT * 0.008,
  },
  choiceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: SCREEN_WIDTH * 0.03,
  },
  choiceIconGlobal: {
    width: SCREEN_WIDTH * 0.07,
    height: SCREEN_WIDTH * 0.07,
    resizeMode: 'contain',
  },
  choiceIcon: {
    width: SCREEN_WIDTH * 0.07,
    height: SCREEN_WIDTH * 0.07,
    resizeMode: 'contain',
  },
  choiceText: {
    fontSize: SCREEN_WIDTH * 0.045,
    fontWeight: '500',
  },
  choiceCheck: {
    width: SCREEN_WIDTH * 0.06,
    height: SCREEN_WIDTH * 0.06,
  },
  continueButton: {
    marginTop: SCREEN_HEIGHT * 0.04,
    paddingVertical: SCREEN_HEIGHT * 0.02,
    backgroundColor: colors.primary,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  continueButtonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: SCREEN_WIDTH * 0.045,
  },
});

export default UsePage;
