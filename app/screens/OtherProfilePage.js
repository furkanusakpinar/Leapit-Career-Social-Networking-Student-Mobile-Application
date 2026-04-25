import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ToastAndroid,
  Pressable,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { lightTheme, darkTheme } from '../theme/colors';
import { withTimeout } from '../utils/timeoutUtils';
import {
  doc,
  getDoc,
  collection,
  getDocs,
  setDoc,
  deleteDoc,
  updateDoc,
  increment,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getCompanyLogoUri } from '../utils/getCompanyLogoUri';
import { getSchoolLogoUri } from '../utils/getSchoolLogoUri';
import axios from 'axios';

const BACKEND_URL = 'http://141.11.109.234:3000';

export default function OtherProfilePage() {
  const navigation = useNavigation();
  const route = useRoute();

  
  const profileUserId = route.params?.userId || null;

  const currentUserId = useSelector(state => state.user.userId);
  
  const currentUserFullName = useSelector(state => state.user.fullName);
  const [currentUserData, setCurrentUserData] = useState(null);

  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState('Blog');
  const [tabData, setTabData] = useState([]);
  const [isConnectionPending, setIsConnectionPending] = useState(false);
  const [connectionActionLoading, setConnectionActionLoading] = useState(false);
  const [connectionStatusLoading, setConnectionStatusLoading] = useState(true);

  const [logoUri, setLogoUri] = useState(null);
  const [schoolLogoUri, setSchoolLogoUri] = useState(null);

  const themeMode = useSelector(state => state.theme?.mode || 'dark');
  const colors = themeMode === 'light' ? lightTheme : darkTheme;
  const styles = getStyles(colors);

  const companyName = userData?.latestCompany;

  useEffect(() => {
    const fetchLogos = async () => {
      if (companyName) {
        const uri = await getCompanyLogoUri(companyName);
        setLogoUri(uri);
      } else {
        setLogoUri(null);
      }

      if (userData?.schoolName) {
        const uri = await getSchoolLogoUri(userData.schoolName);
        setSchoolLogoUri(uri);
      } else {
        setSchoolLogoUri(null);
      }
    };
    fetchLogos();
  }, [companyName, userData?.schoolName]);

  const fetchUser = async () => {
    if (!profileUserId) {
      setUserData(null);
      setLoading(false);
      return;
    }
    try {
      const docRef = doc(db, 'Users', profileUserId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setUserData(docSnap.data());
      } else {
        setUserData(null);
      }
    } catch (e) {
      console.error('User fetch error:', e);
      setUserData(null);
    }
    setLoading(false);
  };

  
  const fetchCurrentUserData = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const docRef = doc(db, 'Users', currentUserId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setCurrentUserData(docSnap.data());
      }
    } catch (e) {
      console.error('Current user data fetch error:', e);
    }
  }, [currentUserId]);


  const checkFollowStatus = useCallback(async () => {
    if (!currentUserId || !profileUserId) {
      setIsFollowing(false);
      return;
    }
    try {
      const followerDocRef = doc(db, 'Users', profileUserId, 'followers', currentUserId);
      const docSnap = await getDoc(followerDocRef);
      setIsFollowing(docSnap.exists());
    } catch (e) {
      console.error('Follow status check error:', e);
      setIsFollowing(false);
    }
  }, [currentUserId, profileUserId]);

  
  const checkExistingConnectionRequest = useCallback(async () => {
    if (!currentUserId || !profileUserId) {
      setIsConnectionPending(false);
      setConnectionStatusLoading(false);
      return;
    }
    setConnectionStatusLoading(true);
    try {
      const response = await axios.get(`${BACKEND_URL}/api/connection-requests`, {
        params: {
          senderUserId: currentUserId,
          receiverUserId: profileUserId,
        }
      });

      if (response.status === 200 && response.data.status === 'pending') {
        setIsConnectionPending(true);
      } else {
        setIsConnectionPending(false);
      }
    } catch (error) {
      console.error('Bağlantı isteği durumu kontrol edilirken hata oluştu:', error);
      setIsConnectionPending(false); 
    } finally {
      setConnectionStatusLoading(false);
    }
  }, [currentUserId, profileUserId]);

  const fetchTabData = async () => {
    try {
      
      const collectionRef = collection(db, selectedTab.toLowerCase());
      const q = query(collectionRef, where('userId', '==', profileUserId));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTabData(data);
    } catch (e) {
      console.error(`${selectedTab} verisi alınırken hata:`, e);
      setTabData([]);
    }
  };

  useEffect(() => {
    fetchUser();
    fetchCurrentUserData();
    checkFollowStatus();
    checkExistingConnectionRequest();
  }, [profileUserId, currentUserId, checkFollowStatus, checkExistingConnectionRequest, fetchCurrentUserData]);

  useEffect(() => {
    fetchTabData();
  }, [selectedTab, profileUserId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    
    Promise.all([fetchUser(), fetchCurrentUserData(), fetchTabData(), checkFollowStatus(), checkExistingConnectionRequest()]).then(() =>
      setRefreshing(false)
    );
  }, [profileUserId, selectedTab, currentUserId, checkFollowStatus, checkExistingConnectionRequest, fetchCurrentUserData]);


  const handleFollowToggle = async () => {
    if (!currentUserId) {
      ToastAndroid.show('Takip etmek için giriş yapmalısınız.', ToastAndroid.LONG);
      return;
    }
    if (currentUserId === profileUserId) {
      ToastAndroid.show('Kendi profilinizi takip edemezsiniz.', ToastAndroid.LONG);
      return;
    }

    setFollowLoading(true);
    try {
      const followedUserRef = doc(db, 'Users', profileUserId);
      const currentUserRef = doc(db, 'Users', currentUserId);

      const followerDocRef = doc(db, 'Users', profileUserId, 'followers', currentUserId);
      const currentUserFollowingDocRef = doc(db, 'Users', currentUserId, 'following', profileUserId);

      
      const followerName = currentUserFullName || currentUserData?.fullName || 'Bilinmeyen Kullanıcı';


      const timeoutMs = 15000; 

      if (isFollowing) {
        
        await withTimeout(deleteDoc(followerDocRef), timeoutMs);
        await withTimeout(deleteDoc(currentUserFollowingDocRef), timeoutMs);

        await withTimeout(updateDoc(followedUserRef, {
          followersCount: increment(-1),
        }), timeoutMs);

        await withTimeout(updateDoc(currentUserRef, {
          followingCount: increment(-1),
        }), timeoutMs);

        setIsFollowing(false);
        setUserData(prevData => ({
          ...prevData,
          followersCount: (prevData.followersCount || 0) - 1,
        }));
        ToastAndroid.show(`${userData.fullName} adlı kişiyi takip etmeyi bıraktınız.`, ToastAndroid.LONG);
      } else {
        
        
        await withTimeout(setDoc(followerDocRef, {
          followerId: currentUserId,
          followedAt: new Date(),
        }), timeoutMs);
        await withTimeout(setDoc(currentUserFollowingDocRef, {
          followedUserId: profileUserId,
          followedAt: new Date(),
        }), timeoutMs);

        
        await withTimeout(updateDoc(followedUserRef, {
          followersCount: increment(1),
        }), timeoutMs);

        await withTimeout(updateDoc(currentUserRef, {
          followingCount: increment(1),
        }), timeoutMs);

        
        const notificationData = {
          type: 'follow', 
          content: `${followerName} seni takip etmeye başladı.`,
          isRead: false,
          createdAt: new Date(),
          sourceUserId: currentUserId, 
        };

        
        const notificationRef = doc(collection(db, 'Users', profileUserId, 'notifications'));
        
        try {
          await withTimeout(setDoc(notificationRef, notificationData), 5000);
        } catch (noteError) {
          console.log("Bildirim gönderilmedi:", noteError);
        }
        

        setIsFollowing(true);
        setUserData(prevData => ({
          ...prevData,
          followersCount: (prevData.followersCount || 0) + 1,
        }));
        ToastAndroid.show(`${userData.fullName} adlı kişiyi takip etmeye başladınız.`, ToastAndroid.LONG);
      }
      fetchUser();
    } catch (e) {
      console.error('Takip işlemi hatası:', e);
      ToastAndroid.show('Takip işlemi sırasında bir sorun oluştu.', ToastAndroid.LONG);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleMessageUser = () => {
    navigation.navigate('sendMessage', {
      recipientId: profileUserId,
      recipientName: userData.fullName,
      recipientJob: userData.job,
    });
  };

  
  const sendNewConnectionRequest = async () => {
    if (!currentUserId || !userData) {
      ToastAndroid.show('Hata: Bağlantı isteği göndermek için giriş yapmalısınız veya profiliniz eksik.', ToastAndroid.LONG);
      return;
    }
    if (currentUserId === profileUserId) {
      ToastAndroid.show('Kendi profilinize bağlantı isteği gönderemezsiniz.', ToastAndroid.LONG);
      return;
    }

    setConnectionActionLoading(true);
    try {
      const requestData = {
        senderUserId: currentUserId,
        senderUserName: currentUserData?.username || currentUserData?.fullName || 'Bilinmiyor',
        senderUserJob: currentUserData?.job || 'Bilinmiyor',
        receiverUserId: profileUserId,
        receiverUserName: userData.username || userData.fullName || 'Bilinmiyor',
        receiverUserJob: userData.job || 'Bilinmiyor',
        status: 'pending',
        timestamp: new Date().toISOString(),
      };

      const response = await axios.post(`${BACKEND_URL}/api/connection-requests`, requestData);

      if (response.status === 200) {
        ToastAndroid.show(response.data.message || 'Bağlantı isteğiniz başarıyla gönderildi!', ToastAndroid.LONG);
        setIsConnectionPending(true);
      } else {
        ToastAndroid.show(response.data.error || 'Bağlantı isteği gönderilirken bir sorun oluştu.', ToastAndroid.LONG);
      }
    } catch (error) {
      console.error('Bağlantı isteği gönderilirken hata oluştu:', error.message);
      if (error.response) {
        console.error('Backend Yanıt Verisi:', error.response.data);
        console.error('Backend Yanıt Durumu:', error.response.status);
        ToastAndroid.show(error.response.data.error || 'Sunucu bağlantı isteğini işlerken bir sorun oluştu.', ToastAndroid.LONG);
      } else if (error.request) {
        console.error('Backend\'den yanıt alınamadı:', error.request);
        ToastAndroid.show('Sunucuya ulaşılamıyor. Lütfen internet bağlantınızı kontrol edin.', ToastAndroid.LONG);
      } else {
        ToastAndroid.show('Bağlantı isteği oluşturulurken bir hata oluştu: ' + error.message, ToastAndroid.LONG);
      }
    } finally {
      setConnectionActionLoading(false);
    }
  };
  const withdrawConnectionRequest = async () => {
    if (!currentUserId || !profileUserId) {
      ToastAndroid.show('Hata: Bağlantı isteğini geri çekmek için giriş yapmalısınız.', ToastAndroid.LONG);
      return;
    }
    setConnectionActionLoading(true);
    try {
      
      const response = await axios.delete(`${BACKEND_URL}/api/connection-requests`, {
        data: { 
          senderUserId: currentUserId,
          receiverUserId: profileUserId,
        }
      });

      if (response.status === 200) {
        ToastAndroid.show(response.data.message || 'Bağlantı isteği başarıyla geri çekildi.', ToastAndroid.LONG);
        setIsConnectionPending(false); 
      } else {
        ToastAndroid.show(response.data.error || 'Bağlantı isteği geri çekilirken bir sorun oluştu.', ToastAndroid.LONG);
      }
    } catch (error) {
      console.error('Bağlantı isteği geri çekilirken hata oluştu:', error.message);
      if (error.response) {
        ToastAndroid.show(error.response.data.error || 'Sunucu bağlantı isteğini geri çekerken bir sorun oluştu.', ToastAndroid.LONG);
      } else if (error.request) {
        ToastAndroid.show('Sunucuya ulaşılamıyor. Lütfen internet bağlantınızı kontrol edin.', ToastAndroid.LONG);
      } else {
        ToastAndroid.show('Bağlantı isteği geri çekilirken bir hata oluştu: ' + error.message, ToastAndroid.LONG);
      }
    } finally {
      setConnectionActionLoading(false);
    }
  };

  
  const handleConnectionToggle = () => {
    if (isConnectionPending) {
      withdrawConnectionRequest();
    } else {
      sendNewConnectionRequest();
    }
  };

  if (loading) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  
  if (!userData) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.notFoundText}>Kullanıcı bulunamadı.</Text>
        <Pressable onPress={() => navigation.goBack()} style={styles.goBackButton}>
          <Text style={styles.goBackButtonText}>Geri Dön</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <Image source={require('../../assets/images/back.png')} style={styles.back} />
        </Pressable>
        <Text style={styles.headerTitle}>Profil</Text>
        <Pressable onPress={() => console.log('CV button pressed for other user profile')} style={styles.cvButton}>
          <Image source={require('../../assets/images/CV.png')} style={styles.cvIcon} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textMain} />}
      >
        <View style={styles.profileContainer}>
          <Image
            source={
              userData.profileImageUrl
                ? { uri: userData.profileImageUrl }
                : require('../../assets/images/ProfileSquare.png')
            }
            style={styles.profileImage}
          />
          <View style={styles.profileInfoRight}>
            <Text style={styles.profileName}>{userData.fullName || 'İsimsiz'}</Text>
            <Text style={styles.profileJob}>{userData.job || 'Meslek yok'}</Text>

            <View style={styles.schoolInfoContainer}>
              {schoolLogoUri && (
                <Image source={{ uri: schoolLogoUri }} style={styles.logo} resizeMode="contain" />
              )}
              <Text style={styles.schoolNameText}>
                {userData.schoolName || 'Okul yok'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.followAndCompanyContainer}>
          <View style={styles.followStatsContainer}>
            <View style={styles.followStat}>
              <Text style={styles.followStatNumber}>{userData.followersCount || 0}</Text>
              <Text style={styles.followStatText}>Takipçi</Text>
            </View>
            <View style={styles.followStat}>
              <Text style={styles.followStatNumber}>{userData.followingCount || 0}</Text>
              <Text style={styles.followStatText}>Takip Edilen</Text>
            </View>
          </View>

          <View style={styles.companyInfoContainer}>
            {logoUri && (
              <Image source={{ uri: logoUri }} style={styles.logo} resizeMode="contain" />
            )}
            <Text style={styles.profileCompany}>
              {companyName || 'Şirket yok'}
            </Text>
          </View>
        </View>

        <View style={styles.links}>
          <Image source={require('../../assets/images/Instagram.png')} style={styles.socialIcon} />
          <Image source={require('../../assets/images/Github.png')} style={styles.socialIcon} />
          <Image source={require('../../assets/images/Youtube.png')} style={styles.socialIcon} />
        </View>

        <View style={{ marginLeft: 10, marginTop: 10 }}>
          <Text style={styles.bioTitle}>Hakkında</Text>
          <Text style={styles.bioText}>{userData.bio || 'Biyografi yok'}</Text>
        </View>

        <View style={styles.buttonContainer}>
          {currentUserId !== profileUserId && (
            <Pressable
              style={[
                styles.connectionButton,
                isConnectionPending ? styles.withdrawConnectionButton : styles.sendConnectionButton,
              ]}
              onPress={handleConnectionToggle}
              disabled={connectionActionLoading || connectionStatusLoading}
            >
              {connectionActionLoading || connectionStatusLoading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <>
                  {!isConnectionPending && (
                    <Image source={require('../../assets/images/connection.png')} style={styles.connectionButtonIcon} />
                  )}
                  <Text style={[
                    styles.connectionButtonText,
                    isConnectionPending && styles.withdrawConnectionButtonText
                  ]}>
                    {isConnectionPending ? 'İstek Gönderildi' : 'Bağlantı kur'}
                  </Text>
                </>
              )}
            </Pressable>
          )}

          {currentUserId !== profileUserId && (
            <Pressable
              style={[styles.followButton, isFollowing ? styles.unfollowButton : styles.followButtonBorder]}
              onPress={handleFollowToggle}
              disabled={followLoading}
            >
              {followLoading ? (
                <ActivityIndicator size="small" color={isFollowing ? colors.textMain : colors.primary} />
              ) : (
                <Text style={[styles.followButtonText, isFollowing && styles.unfollowButtonText]}>
                  {isFollowing ? 'Takibi Bırak' : 'Takip Et'}
                </Text>
              )}
            </Pressable>
          )}

          {currentUserId !== profileUserId && (
            <Pressable style={styles.messageButton} onPress={handleMessageUser}>
              <Text style={styles.messageButtonText}>Mesaj</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.heatTextSelection}>
          <Pressable onPress={() => setSelectedTab('Blog')}>
            <Text style={[styles.tabText, selectedTab === 'Blog' && styles.activeTab]}>Blog</Text>
          </Pressable>
          <Pressable onPress={() => setSelectedTab('Projeler')}>
            <Text style={[styles.tabText, selectedTab === 'Projeler' && styles.activeTab]}>Projeler</Text>
          </Pressable>
          <Pressable onPress={() => setSelectedTab('Postlar')}>
            <Text style={[styles.tabText, selectedTab === 'Postlar' && styles.activeTab]}>Postlar</Text>
          </Pressable>
        </View>

        <View style={{ paddingHorizontal: 10 }}>
          {tabData.length > 0 ? (
            tabData.map(item => (
              <View key={item.id} style={{ marginBottom: 10 }}>
                <Text style={{ color: colors.textMain, fontSize: 16 }}>{item.title || 'Başlık yok'}</Text>
                <Text style={{ color: colors.textSub }}>{item.description || 'Açıklama yok'}</Text>
              </View>
            ))
          ) : (
            <Text style={{ color: colors.textSub, textAlign: 'center', marginTop: 20 }}>Henüz veri yok.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tabText: {
    color: colors.textMain,
    fontSize: 18,
    paddingBottom: 5,
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: colors.border,
    borderRadius: 5,
  },
  heatTextSelection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    marginBottom: 15,
  },
  centeredContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notFoundText: {
    color: '#FF6347',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 22,
    fontWeight: 'bold',
    backgroundColor: colors.cardBackground,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#FF6347',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  goBackButton: {
    marginTop: 30,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  goBackButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 10,
    paddingHorizontal: 16,
  },
  back: { width: 24, height: 24, resizeMode: 'contain', tintColor: colors.iconTint },
  headerTitle: {
    color: colors.textMain,
    fontSize: 20,
    fontWeight: 'bold',
  },
  cvButton: {
    backgroundColor: colors.border,
    width: 40,
    height: 40,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cvIcon: {
    width: 35,
    height: 35,
    tintColor: colors.iconTint,
  },
  profileInfoRight: {
    marginLeft: 15,
    flex: 1,
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 15,
    backgroundColor: colors.border,
  },
  profileName: {
    color: colors.textMain,
    fontSize: 24,
    fontWeight: '500',
  },
  profileJob: {
    color: colors.textSub,
    fontSize: 16,
    marginTop: 3,
  },
  schoolInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    marginBottom: 10,
    gap: 5,
    flexShrink: 1,
  },
  schoolNameText: {
    color: colors.textSub,
    fontSize: 12,
    flexShrink: 1,
  },
  companyInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexWrap: 'wrap',
    flexShrink: 1,
  },
  profileCompany: {
    color: colors.textSub,
    fontSize: 14,
    marginTop: 5,
    flexShrink: 1,
  },
  followAndCompanyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 5,
    marginHorizontal: 12,
  },
  followStatsContainer: {
    flexDirection: 'row',
    flexShrink: 1,
  },
  followStat: {
    alignItems: 'center',
    marginRight: 20,
  },
  followStatNumber: {
    color: colors.textMain,
    fontSize: 18,
    fontWeight: 'bold',
  },
  followStatText: {
    color: colors.textSub,
    fontSize: 12,
  },
  links: {
    flexDirection: 'row',
    marginTop: 10,
    marginHorizontal: 12,
  },
  socialIcon: {
    width: 25,
    height: 25,
    marginRight: 16,
    tintColor: colors.iconTint,
  },
  bioTitle: {
    color: colors.textMain,
    fontSize: 14,
    marginBottom: 5,
  },
  bioText: {
    color: colors.textSub,
    fontSize: 14,
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    marginTop: 20,
    marginHorizontal: 10,
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  connectionButton: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sendConnectionButton: {
    backgroundColor: colors.primary,
  },
  withdrawConnectionButton: {
    backgroundColor: colors.border,
    borderWidth: 1,
    borderColor: colors.border,
  },
  connectionButtonIcon: {
    width: 13,
    height: 18,
    tintColor: 'white',
    marginRight: 6,
  },
  connectionButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: 'bold',
  },
  withdrawConnectionButtonText: {
    color: colors.textMain,
  },
  followButton: {
    backgroundColor: colors.cardBackground,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 90,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  followButtonBorder: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  followButtonText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: 'bold',
  },
  unfollowButton: {
    backgroundColor: colors.border,
    borderWidth: 0,
  },
  unfollowButtonText: {
    color: colors.textMain,
  },
  messageButton: {
    flexDirection: 'row',
    backgroundColor: colors.border,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 90,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  messageButtonText: {
    color: colors.textMain,
    fontSize: 13,
    fontWeight: 'bold',
  },
  logo: {
    width: 30,
    height: 30,
    borderRadius: 6,
  },
});