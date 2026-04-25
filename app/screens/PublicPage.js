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
import { useSelector } from 'react-redux';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore'; 
import { db } from '../../firebaseConfig'; 
import { lightTheme, darkTheme } from '../theme/colors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export function PublicPage() {
  const navigation = useNavigation();
  const route = useRoute();
  const themeMode = useSelector(state => state.theme?.mode || 'dark');
  const colors = themeMode === 'light' ? lightTheme : darkTheme;
  const styles = getStyles(colors);

  
  const { prePostId } = route.params || {};

  
  
  const [activeButton, setActiveButton] = useState('global'); 
  const [CommentActive, setCommentActive] = useState('Comment'); 

  
  useEffect(() => {
    if (!prePostId) {
      console.warn("PublicPage: No prePostId found in route params.");
      return;
    }

    const prePostRef = doc(db, 'prePosts', prePostId);
    const unsub = onSnapshot(prePostRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        setActiveButton(data.visibility || 'global');
        setCommentActive(data.comments || 'Comment');
      } else {
        console.log("PublicPage: prePost document does not exist or was deleted.");
        
      }
    }, (error) => console.error('PublicPage: Firestore listen error (prePosts):', error));

    return () => unsub(); 
  }, [prePostId]); 

  const handleContinue = async () => {
    try {
      
      const visibilitySettingValue = activeButton;
      const commentsSettingValue = CommentActive;

      
      if (prePostId) {
        const prePostRef = doc(db, 'prePosts', prePostId);
        await updateDoc(prePostRef, {
          visibility: visibilitySettingValue,
          comments: commentsSettingValue,
        });
        console.log("prePost document updated with visibility and comments:", { visibility: visibilitySettingValue, comments: commentsSettingValue });
      } else {
        console.warn("No prePostId found. Cannot update prePost document.");
      }

      
      navigation.navigate('SharePage', {
        prePostId: prePostId,
      });

    } catch (error) {
      console.error('Error updating prePost document (PublicPage): ', error);
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
          <Text style={styles.title}>Görünürlük ayarları</Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Paylaş</Text>
          <Image source={require('../../assets/images/Line.png')} style={[styles.fullWidthLine, { tintColor: colors.border }]} />
        </View>

        <View style={styles.choiceContainer}>
          {}
          <Pressable onPress={() => setActiveButton('global')} style={styles.choice}>
            <View style={styles.choiceLeft}>
              <Image
                source={
                  activeButton === 'global'
                    ? require('../../assets/images/Global.png')
                    : require('../../assets/images/GlobalGray.png')
                }
                style={[styles.choiceIconGlobal, { tintColor: activeButton === 'global' ? colors.primary : colors.textSub }]}
              />
              <Text style={[styles.choiceText, { color: activeButton === 'global' ? colors.textMain : colors.textSub }]}>
                Herkese Açık
              </Text>
            </View>
            {activeButton === 'global' && (
              <Image source={require('../../assets/images/Check.png')} style={[styles.choiceCheck, { tintColor: colors.primary }]} />
            )}
          </Pressable>

          <Image source={require('../../assets/images/Line.png')} style={[styles.shortLine, { tintColor: colors.border }]} />

          {}
          <Pressable onPress={() => setActiveButton('friends')} style={styles.choice}>
            <View style={styles.choiceLeft}>
              <Image
                source={
                  activeButton === 'friends'
                    ? require('../../assets/images/Users.png')
                    : require('../../assets/images/UsersGray.png')
                }
                style={[styles.choiceIconGlobal, { tintColor: activeButton === 'friends' ? colors.primary : colors.textSub }]}
              />
              <View>
                <Text style={[styles.choiceText, { color: activeButton === 'friends' ? colors.textMain : colors.textSub }]}>
                  Arkadaşlara Açık
                </Text>
                <Text style={[styles.choiceDescription, { color: colors.textSub }]}>
                  (Sadece bağlantı kurduğun kişiler görebilir)
                </Text>
              </View>
            </View>
            {activeButton === 'friends' && (
              <Image source={require('../../assets/images/Check.png')} style={[styles.choiceCheck, { tintColor: colors.primary }]} />
            )}
          </Pressable>

          <Image source={require('../../assets/images/Line.png')} style={[styles.shortLine, { tintColor: colors.border }]} />

          {}
          <Pressable onPress={() => setActiveButton('followers')} style={styles.choice}>
            <View style={styles.choiceLeft}>
              <Image
                source={
                  activeButton === 'followers'
                    ? require('../../assets/images/Follower.png')
                    : require('../../assets/images/FollowerGray.png')
                }
                style={[styles.choiceIconGlobal, { tintColor: activeButton === 'followers' ? colors.primary : colors.textSub }]}
              />
              <Text style={[styles.choiceText, { color: activeButton === 'followers' ? colors.textMain : colors.textSub }]}>
                Takipçilere Açık
              </Text>
            </View>
            {activeButton === 'followers' && (
              <Image source={require('../../assets/images/Check.png')} style={[styles.choiceCheck, { tintColor: colors.primary }]} />
            )}
          </Pressable>

          <Image source={require('../../assets/images/Line.png')} style={[styles.shortLine, { tintColor: colors.border }]} />

          {}
          <Pressable onPress={() => setActiveButton('Busniess')} style={styles.choice}>
            <View style={styles.choiceLeft}>
              <Image
                source={
                  activeButton === 'Busniess'
                    ? require('../../assets/images/IsIlanlari.png')
                    : require('../../assets/images/IsIlanlariGray.png')
                }
                style={[styles.choiceIcon, { tintColor: activeButton === 'Busniess' ? colors.primary : colors.textSub }]}
              />
              <View>
                <Text style={[styles.choiceText, { color: activeButton === 'Busniess' ? colors.textMain : colors.textSub }]}>
                  İş Sohbet
                </Text>
                <Text style={[styles.choiceDescription, { color: colors.textSub }]}>
                  (Sadece sizinle aynı meslektekiler görebilir)
                </Text>
              </View>
            </View>
            {activeButton === 'Busniess' && (
              <Image source={require('../../assets/images/Check.png')} style={[styles.choiceCheck, { tintColor: colors.primary }]} />
            )}
          </Pressable>

          <Image source={require('../../assets/images/Line.png')} style={[styles.shortLine, { tintColor: colors.border }]} />

          <Pressable onPress={() => setActiveButton('private')} style={styles.choice}>
            <View style={styles.choiceLeft}>
              <Image
                source={
                  activeButton === 'private'
                    ? require('../../assets/images/Private.png')
                    : require('../../assets/images/PrivateGray.png')
                }
                style={[styles.choiceIcon, { tintColor: activeButton === 'private' ? colors.primary : colors.textSub }]}
              />
              <View>
                <Text style={[styles.choiceText, { color: activeButton === 'private' ? colors.textMain : colors.textSub }]}>
                  Sadece Ben
                </Text>
              </View>
            </View>
            {activeButton === 'private' && (
              <Image source={require('../../assets/images/Check.png')} style={[styles.choiceCheck, { tintColor: colors.primary }]} />
            )}
          </Pressable>
        </View>
        <Image source={require('../../assets/images/Line.png')} style={[styles.fullWidthLine, { marginTop: SCREEN_HEIGHT * 0.015, marginBottom: SCREEN_HEIGHT * 0.015, tintColor: colors.border }]} />


        <View style={[styles.sectionHeader, { marginTop: SCREEN_HEIGHT * 0.02 }]}>
          <Text style={styles.sectionTitle}>Yorumlar</Text>
          <Image source={require('../../assets/images/Line.png')} style={[styles.fullWidthLine, { tintColor: colors.border }]} />
        </View>

        <View style={styles.choiceContainer}>
          {}
          <Pressable onPress={() => setCommentActive('Comment')} style={styles.choice}>
            <View style={styles.choiceLeft}>
              <Image
                source={
                  CommentActive === 'Comment'
                    ? require('../../assets/images/chat_bubble.png')
                    : require('../../assets/images/YorumGray.png')
                }
                style={[styles.choiceIcon, { tintColor: CommentActive === 'Comment' ? colors.primary : colors.textSub }]}
              />
              <Text style={[styles.choiceText, { color: CommentActive === 'Comment' ? colors.textMain : colors.textSub }]}>
                Yorumlara izin ver
              </Text>
            </View>
            {CommentActive === 'Comment' && (
              <Image source={require('../../assets/images/Check.png')} style={[styles.choiceCheck, { tintColor: colors.primary }]} />
            )}
          </Pressable>

          <Image source={require('../../assets/images/Line.png')} style={[styles.shortLine, { tintColor: colors.border }]} />

          {}
          <Pressable onPress={() => setCommentActive('commentprivate')} style={styles.choice}>
            <View style={styles.choiceLeft}>
              <Image
                source={
                  CommentActive === 'commentprivate'
                    ? require('../../assets/images/YorumEngel.png')
                    : require('../../assets/images/YorumEngelGray.png')
                }
                style={[styles.commentBlockIcon, { tintColor: CommentActive === 'commentprivate' ? colors.primary : colors.textSub }]}
              />
              <Text style={[styles.choiceText, { color: CommentActive === 'commentprivate' ? colors.textMain : colors.textSub }]}>
                Yorumları engelle
              </Text>
            </View>
            {CommentActive === 'commentprivate' && (
              <Image source={require('../../assets/images/Check.png')} style={[styles.choiceCheck, { tintColor: colors.primary }]} />
            )}
          </Pressable>
        </View>
        <Image source={require('../../assets/images/Line.png')} style={[styles.fullWidthLine, { marginTop: SCREEN_HEIGHT * 0.015, marginBottom: SCREEN_HEIGHT * 0.015, tintColor: colors.border }]} />

        <Text style={{ color: colors.textSub, alignItems: 'flex-start', fontSize: SCREEN_WIDTH * 0.028, opacity: 0.7 }}>
          Bu ayarıları daha sonra değiştirebilirsiniz
        </Text>

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
  commentBlockIcon: {
    width: SCREEN_WIDTH * 0.085,
    height: SCREEN_WIDTH * 0.085,
    resizeMode: 'contain',
  },
  choiceText: {
    fontSize: SCREEN_WIDTH * 0.045,
    fontWeight: '500',
  },
  choiceDescription: {
    fontSize: SCREEN_WIDTH * 0.028,
    opacity: 0.7,
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

export default PublicPage;
