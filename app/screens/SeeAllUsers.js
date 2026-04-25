import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  PixelRatio,
  ActivityIndicator,
  ToastAndroid,
  Image,
  Pressable,
  Animated,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import PropTypes from 'prop-types';
import { db } from '../../firebaseConfig';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
  getDocs,
  getDoc,
  where,
  serverTimestamp,
  addDoc,
} from 'firebase/firestore';
import axios from 'axios'; 
import { lightTheme, darkTheme } from '../theme/colors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const ANDROID_SCALE_FACTOR = 1.1;
const IOS_SCALE_FACTOR = 1;

const BACKEND_URL = 'http://141.11.109.234:3000'; 

const responsiveFontSize = (size) => {
  const standardScreenHeight = 680;
  const heightPercentage = (size / standardScreenHeight) * 100;
  const percentage = (heightPercentage * SCREEN_WIDTH) / 100;
  const scalingFactor = Platform.OS === 'android' ? 1.45 : 1.35;
  return Math.round((percentage / PixelRatio.getFontScale()) * scalingFactor);
};

const ConnectionItem = React.memo(({ name, job, profileImageUrl, onConnectPress, isDisabled, isSending, hasSentRequest, colors }) => (
  <View style={[styles(colors).userCard]}>
    <Image
      source={profileImageUrl ? { uri: profileImageUrl } : require('../../assets/images/ProfileSquare.png')}
      style={styles(colors).userProfileImage}
    />
    <Text style={styles(colors).userCardName} numberOfLines={1}>{name}</Text>
    <Text style={styles(colors).userCardJob} numberOfLines={1}>{job}</Text>
    <Pressable
      style={[
        styles(colors).modalActionButton,
        isDisabled && styles(colors).disabledConnectButton, 
        hasSentRequest && styles(colors).requestSentButton, 
      ]}
      onPress={onConnectPress}
      disabled={isDisabled} 
    >
      {isSending ? (
        <ActivityIndicator size="small" color={hasSentRequest ? '#FFF' : colors.primary} /> 
      ) : (
        <>
          <Image
            source={require('../../assets/images/connection.png')}
            style={[styles(colors).connectionIcon, hasSentRequest && styles(colors).connectionIconWhite, { tintColor: hasSentRequest ? 'white' : colors.primary }]} 
          />
          <Text style={[
            styles(colors).modalSubmitButtonText,
            hasSentRequest && styles(colors).requestSentButtonText, 
            isDisabled && styles(colors).disabledConnectButtonText, 
          ]}>
            {hasSentRequest ? 'İstek Gönderildi' : 'Bağlantı Kur'}
          </Text>
        </>
      )}
    </Pressable>
  </View>
));

ConnectionItem.displayName = 'ConnectionItem';
ConnectionItem.propTypes = {
  name: PropTypes.string.isRequired,
  job: PropTypes.string.isRequired,
  profileImageUrl: PropTypes.string,
  onConnectPress: PropTypes.func.isRequired,
  isDisabled: PropTypes.bool.isRequired,
  isSending: PropTypes.bool.isRequired,
  hasSentRequest: PropTypes.bool.isRequired,
  colors: PropTypes.object.isRequired,
};
ConnectionItem.defaultProps = {
  profileImageUrl: null,
};

const MessageItem = React.memo(({ name, lastMessage, time, unread, onChatPress, profileImageUrl, colors }) => (
  <View style={[
    styles(colors).messageWrapper,
    unread ? styles(colors).unreadMessageBackground : styles(colors).readMessageBackground
  ]}>
    <TouchableOpacity style={styles(colors).item} onPress={onChatPress}>
      <View style={styles(colors).avatarContainer}>
        {profileImageUrl ? (
          <Image source={{ uri: profileImageUrl }} style={styles(colors).profileImage} />
        ) : (
          <MaterialCommunityIcons
            name="account-circle"
            size={SCREEN_WIDTH * 0.12 * (Platform.OS === 'android' ? ANDROID_SCALE_FACTOR : IOS_SCALE_FACTOR)}
            color={colors.textSub}
          />
        )}
      </View>
      <View style={styles(colors).textContainer}>
        <Text style={styles(colors).name} numberOfLines={1}>{name}</Text>
        <Text style={styles(colors).message} numberOfLines={1}>
          {lastMessage}
          <Text style={styles(colors).time}> • {time}</Text>
        </Text>
      </View>
      <View style={styles(colors).rightContentContainer}>
        {unread && <Image source={require('../../assets/images/unread.png')} style={styles(colors).unreadProfileImage} />}
      </View>
    </TouchableOpacity>
  </View>
));

MessageItem.displayName = 'MessageItem';
MessageItem.propTypes = {
  name: PropTypes.string.isRequired,
  lastMessage: PropTypes.string.isRequired,
  time: PropTypes.string.isRequired,
  unread: PropTypes.bool,
  onChatPress: PropTypes.func.isRequired,
  profileImageUrl: PropTypes.string,
  colors: PropTypes.object.isRequired,
};
MessageItem.defaultProps = {
  profileImageUrl: null,
  unread: false,
};

export default function Social() {
  const navigation = useNavigation();
  const userId = useSelector(state => state.user.userId);
  const themeMode = useSelector(state => state.theme?.mode || 'dark');
  const colors = themeMode === 'light' ? lightTheme : darkTheme;
  const themedStyles = styles(colors);

  const [currentUserData, setCurrentUserData] = useState(null);
  const [isCurrentUserLoading, setIsCurrentUserLoading] = useState(true);

  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true); 
  const [refreshing, setRefreshing] = useState(false); 

  const [activeTab, setActiveTab] = useState('mesajlar');
  const translateX = useRef(new Animated.Value(0)).current;
  const mesajlarRef = useRef(null);
  const baglantilarRef = useRef(null);
  const [mesajlarLayout, setMesajlarLayout] = useState({ width: 0, x: 0 });
  const [baglantilarLayout, setBaglantilarLayout] = useState({ width: 0, x: 0 });

  const [sameJobUsers, setSameJobUsers] = useState([]);
  const [popularUsers, setPopularUsers] = useState([]);
  const [exploreUsers, setExploreUsers] = useState([]);
  const [sentConnectionRequestIds, setSentConnectionRequestIds] = useState(new Set());
  const [sendingStates, setSendingStates] = useState({});

  const [isLoadingConnections, setIsLoadingConnections] = useState(false); 
  const [hasConnectionsBeenFetched, setHasConnectionsBeenFetched] = useState(false); 

  const MAX_USERS_TO_DISPLAY = 10; 
  const MAX_CONNECTIONS_TO_SEND = 10; 
  const [connectionCount, setConnectionCount] = useState(0); 

  const onMesajlarLayout = useCallback((e) => setMesajlarLayout(e.nativeEvent.layout), []);
  const onBaglantilarLayout = useCallback((e) => setBaglantilarLayout(e.nativeEvent.layout), []);

  const formatTime = useCallback((date) => {
    if (!date) return '';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return `${seconds}sn`;
    if (minutes < 60) return `${minutes}dk`;
    if (hours < 24) return `${hours}sa`;
    if (days < 7) return `${days}gün`;

    return date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  }, []);

  const fetchConversations = useCallback(() => {
    if (!userId) {
      setLoading(false);
      return () => { }; 
    }
    setLoading(true);
    const userChatsRef = collection(db, 'Users', userId, 'chats');
    const q = query(userChatsRef, orderBy('lastMessageCreatedAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(docSnapshot => {
        const data = docSnapshot.data();
        return {
          id: docSnapshot.id,
          recipientId: data.otherUserId,
          name: data.otherUserName || 'Bilinmeyen Kullanıcı',
          job: data.otherUserJob || 'Meslek Bilgisi Yok',
          profileImageUrl: data.otherUserProfileImageUrl || null,
          lastMessage: data.lastMessageText,
          time: data.lastMessageCreatedAt ? formatTime(data.lastMessageCreatedAt.toDate()) : '',
          createdAtRaw: data.lastMessageCreatedAt ? data.lastMessageCreatedAt.toDate() : null,
          unread: data.unread || false,
        };
      });
      
      fetched.sort((a, b) => {
        const timeA = a.createdAtRaw ? a.createdAtRaw.getTime() : 0;
        const timeB = b.createdAtRaw ? b.createdAtRaw.getTime() : 0;
        return timeB - timeA;
      });
      setConversations(fetched);
      setLoading(false);
      setRefreshing(false);
    }, (error) => {
      console.error("Error fetching conversations: ", error);
      if (Platform.OS === 'android') {
        ToastAndroid.show("Sohbetler yüklenirken bir hata oluştu.", ToastAndroid.LONG);
      }
      setLoading(false);
      setRefreshing(false);
    });
  }, [userId, formatTime]);

  const fetchSentConnectionRequests = useCallback(async () => {
    if (!userId) return;
    try {
      
      const q = query(
        collection(db, 'connectionRequests'),
        where('senderUserId', '==', userId),
        where('status', '==', 'pending')
      );
      const querySnapshot = await getDocs(q);
      const ids = new Set();
      querySnapshot.forEach(docSnap => {
        ids.add(docSnap.data().receiverUserId);
      });
      setSentConnectionRequestIds(ids);
      setConnectionCount(ids.size); 
    } catch (error) {
      console.error("Error fetching sent connection requests: ", error);
      if (Platform.OS === 'android') {
        ToastAndroid.show("Gönderilen istekler çekilemedi.", ToastAndroid.LONG);
      }
    }
  }, [userId]);

  const fetchConnectionSuggestions = useCallback(async () => {
    if (!userId) {
      setIsLoadingConnections(false);
      setRefreshing(false);
      return;
    }
    if (isCurrentUserLoading) {
      return;
    }

    setIsLoadingConnections(true); 
    try {
      const usersRef = collection(db, 'Users');
      const allUsersSnapshot = await getDocs(usersRef);

      let potentialUsers = [];

      allUsersSnapshot.forEach((docSnapshot) => {
        const userData = docSnapshot.data();
        if (
          docSnapshot.id !== userId && 
          userData.fullName && 
          userData.job && 
          typeof userData.followersCount === 'number' && 
          !sentConnectionRequestIds.has(docSnapshot.id) 
        ) {
          potentialUsers.push({
            id: docSnapshot.id,
            fullName: userData.fullName,
            username: userData.username || '',
            job: userData.job,
            profileImageUrl: userData.profileImageUrl || null,
            followersCount: userData.followersCount || 0, 
            email: userData.email || null, 
          });
        }
      });

      const sameJob = currentUserData?.job
        ? potentialUsers.filter(user => user.job === currentUserData.job)
        : [];

      const popularWithFollowers = potentialUsers.filter(user => user.followersCount > 0);
      const popular = [...popularWithFollowers].sort((a, b) => b.followersCount - a.followersCount);

      const explore = potentialUsers.filter(
        user => currentUserData?.job ? user.job !== currentUserData.job : true
      );

      setSameJobUsers(sameJob.sort(() => 0.5 - Math.random()).slice(0, MAX_USERS_TO_DISPLAY));
      setPopularUsers(popular.slice(0, MAX_USERS_TO_DISPLAY));
      setExploreUsers(explore.sort(() => 0.5 - Math.random()).slice(0, MAX_USERS_TO_DISPLAY));

      setHasConnectionsBeenFetched(true); 

    } catch (error) {
      console.error("Error fetching connection suggestions: ", error);
      if (Platform.OS === 'android') {
        ToastAndroid.show("Bağlantı önerileri yüklenirken bir sorun oluştu.", ToastAndroid.LONG);
      }
    } finally {
      setIsLoadingConnections(false); 
      setRefreshing(false); 
    }
  }, [userId, currentUserData, sentConnectionRequestIds, isCurrentUserLoading]);

  useEffect(() => {
    const fetchCurrentUserData = async () => {
      if (!userId) {
        setIsCurrentUserLoading(false);
        return;
      }

      setIsCurrentUserLoading(true);
      try {
        const userDocRef = doc(db, 'Users', userId);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          setCurrentUserData(userDocSnap.data());
        } else {
          setCurrentUserData(null);
        }
      } catch (error) {
        console.error("Error fetching current user data: ", error);
        if (Platform.OS === 'android') {
          ToastAndroid.show("Profil bilgileri çekilirken hata oluştu.", ToastAndroid.LONG);
        }
      } finally {
        setIsCurrentUserLoading(false);
      }
    };

    fetchCurrentUserData();
  }, [userId]);

  useEffect(() => {
    
    if (activeTab === 'mesajlar') {
      const unsubscribe = fetchConversations();
      return () => unsubscribe && unsubscribe();
    }
  }, [activeTab, fetchConversations]);

  useEffect(() => {
    if (activeTab === 'baglantilar') {
      if (!userId) {
        setIsLoadingConnections(false);
        setRefreshing(false);
        return;
      }

      
      if (!hasConnectionsBeenFetched || refreshing) {
        fetchSentConnectionRequests()
          .then(() => fetchConnectionSuggestions())
          .catch(error => {
            console.error("Error in connection tab useEffect chain: ", error);
            setIsLoadingConnections(false);
            setRefreshing(false);
          });
      } else {
        
        setIsLoadingConnections(false);
      }
    } else {
      
      setIsLoadingConnections(false);
      setRefreshing(false);
    }
  }, [activeTab, userId, fetchSentConnectionRequests, fetchConnectionSuggestions, hasConnectionsBeenFetched, refreshing]);


  useEffect(() => {
    if (mesajlarLayout.width === 0 || baglantilarLayout.width === 0) return;
    const targetX = activeTab === 'mesajlar' ? mesajlarLayout.x : baglantilarLayout.x;
    Animated.spring(translateX, {
      toValue: targetX,
      useNativeDriver: true,
      bounciness: 5,
      speed: 15,
    }).start();
  }, [activeTab, mesajlarLayout, baglantilarLayout, translateX]);

  const handleChatPress = async (chatData) => {
    try {
      if (chatData.unread) {
        const chatDocRef = doc(db, 'Users', userId, 'chats', chatData.id);
        await updateDoc(chatDocRef, { unread: false });
      }
      navigation.navigate('sendMessage', {
        recipientId: chatData.recipientId,
        recipientName: chatData.name,
        recipientJob: chatData.job,
        recipientProfileImageUrl: chatData.profileImageUrl,
      });
    } catch (error) {
      console.error("Error handling chat press or updating unread status: ", error);
      if (Platform.OS === 'android') {
        ToastAndroid.show("Sohbete başlarken bir hata oluştu.", ToastAndroid.LONG);
      }
    }
  };

  
  const cancelConnectionRequest = async (targetUser) => {
    if (!userId || !currentUserData) {
      if (Platform.OS === 'android') {
        ToastAndroid.show('Hata: İstek iptal edilirken profil bilgileri eksik.', ToastAndroid.LONG);
      }
      return;
    }

    setSendingStates(prev => ({ ...prev, [targetUser.id]: true })); 

    try {
      
      const q = query(
        collection(db, 'connectionRequests'),
        where('senderUserId', '==', userId),
        where('receiverUserId', '==', targetUser.id),
        where('status', '==', 'pending')
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const requestDoc = querySnapshot.docs[0]; 
        const requestDocRef = doc(db, 'connectionRequests', requestDoc.id);

        
        await updateDoc(requestDocRef, { status: 'canceled' });

        
        
        
        

        if (Platform.OS === 'android') {
          ToastAndroid.show(`${targetUser.fullName} adlı kullanıcıya gönderilen bağlantı isteği iptal edildi.`, ToastAndroid.LONG);
        }
        setSentConnectionRequestIds(prevIds => {
          const newSet = new Set(prevIds);
          newSet.delete(targetUser.id);
          return newSet;
        });
        setConnectionCount(prevCount => Math.max(0, prevCount - 1)); 

      } else {
        if (Platform.OS === 'android') {
          ToastAndroid.show('İptal edilecek bekleyen bir bağlantı isteği bulunamadı.', ToastAndroid.LONG);
        }
      }
    } catch (error) {
      console.error("Error canceling connection request: ", error);
      if (Platform.OS === 'android') {
        ToastAndroid.show('Bağlantı isteği iptal edilirken bir hata oluştu.', ToastAndroid.LONG);
      }
    } finally {
      setSendingStates(prev => ({ ...prev, [targetUser.id]: false })); 
    }
  };


  const sendConnectionRequest = async (targetUser) => {
    if (!userId || !currentUserData) {
      if (Platform.OS === 'android') {
        ToastAndroid.show('Hata: Bağlantı isteği göndermek için giriş yapmalısınız veya profiliniz eksik.', ToastAndroid.LONG);
      }
      return;
    }

    
    if (sentConnectionRequestIds.has(targetUser.id)) {
      await cancelConnectionRequest(targetUser);
      return;
    }

    
    if (connectionCount >= MAX_CONNECTIONS_TO_SEND) {
      if (Platform.OS === 'android') {
        ToastAndroid.show(`Bilgi: Maksimum ${MAX_CONNECTIONS_TO_SEND} bağlantı isteği gönderebilirsiniz.`, ToastAndroid.LONG);
      }
      return;
    }

    setSendingStates(prev => ({ ...prev, [targetUser.id]: true })); 

    try {
      
      await addDoc(collection(db, 'connectionRequests'), {
        senderUserId: userId,
        senderUserName: currentUserData.fullName || currentUserData.username || 'Anonim',
        senderUserJob: currentUserData.job || 'Bilinmiyor',
        senderProfileImageUrl: currentUserData.profileImageUrl || null,
        receiverUserId: targetUser.id,
        receiverUserName: targetUser.fullName || targetUser.username || 'Anonim',
        receiverUserJob: targetUser.job || 'Bilinmiyor',
        receiverProfileImageUrl: targetUser.profileImageUrl || null,
        status: 'pending',
        timestamp: serverTimestamp(),
      });

      
      

      if (Platform.OS === 'android') {
        ToastAndroid.show(`${targetUser.fullName} adlı kullanıcıya bağlantı isteğiniz gönderildi!`, ToastAndroid.LONG);
      }
      setSentConnectionRequestIds(prevIds => new Set(prevIds).add(targetUser.id));
      setConnectionCount(prevCount => prevCount + 1); 

    } catch (error) {
      console.error("Error sending connection request: ", error);
      if (Platform.OS === 'android') {
        ToastAndroid.show('Bağlantı isteği gönderilirken bir hata oluştu.', ToastAndroid.LONG);
      }
    } finally {
      setSendingStates(prev => ({ ...prev, [targetUser.id]: false })); 
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    
    setIsCurrentUserLoading(true);
    setIsLoadingConnections(true);
    setLoading(true);

    
    if (userId) {
      try {
        const userDocRef = doc(db, 'Users', userId);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          setCurrentUserData(userDocSnap.data());
        } else {
          setCurrentUserData(null);
        }
      } catch (error) {
        console.error("Error during refresh - fetching current user data: ", error);
      } finally {
        setIsCurrentUserLoading(false); 
      }
    } else {
      setIsCurrentUserLoading(false); 
    }

    
    if (activeTab === 'mesajlar') {
      fetchConversations(); 
    } else {
      
      
      fetchSentConnectionRequests()
        .then(() => fetchConnectionSuggestions())
        .catch(error => {
          console.error("Error during refresh - connection data fetch: ", error);
          setIsLoadingConnections(false); 
          setRefreshing(false);
        });
    }
  }, [activeTab, userId, fetchConversations, fetchSentConnectionRequests, fetchConnectionSuggestions]);

  
  const showOverallLoading = (activeTab === 'mesajlar' && loading) ||
    (activeTab === 'baglantilar' && (refreshing || (!hasConnectionsBeenFetched && (isCurrentUserLoading || isLoadingConnections))));

  const hasConnectionSuggestions = sameJobUsers.length > 0 || popularUsers.length > 0 || exploreUsers.length > 0;
  const isMaxConnectionsReachedForDisplay = connectionCount >= MAX_CONNECTIONS_TO_SEND;

  return (
    <View style={themedStyles.container}>
      <View style={themedStyles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <Image source={require('../../assets/images/back.png')} style={[themedStyles.back, { tintColor: colors.iconTint }]} />
        </Pressable>
        <View style={themedStyles.headerTitleContainer}>
          <Text style={themedStyles.headerTitle}>Ağım</Text>
        </View>
        <View style={themedStyles.backPlaceholder} />
      </View>
      <View style={themedStyles.selectionHeader}>
        <Pressable onPress={() => setActiveTab('mesajlar')} onLayout={onMesajlarLayout} ref={mesajlarRef}>
          <Text style={[themedStyles.tabText, activeTab === 'mesajlar' && themedStyles.activeTabText]}>Mesajlar</Text>
        </Pressable>
        <Pressable onPress={() => setActiveTab('baglantilar')} onLayout={onBaglantilarLayout} ref={baglantilarRef}>
          <Text style={[themedStyles.tabText, activeTab === 'baglantilar' && themedStyles.activeTabText]}>Bağlantılar</Text>
        </Pressable>
      </View>
      <View style={[themedStyles.divider, { marginBottom: SCREEN_HEIGHT * 0.01 * (Platform.OS === 'android' ? ANDROID_SCALE_FACTOR : IOS_SCALE_FACTOR) }]}>
        <Animated.View style={[themedStyles.shortDivider, {
          width: activeTab === 'mesajlar' ? mesajlarLayout.width : baglantilarLayout.width,
          transform: [{ translateX }],
          backgroundColor: colors.primary,
        }]} />
      </View>

      {showOverallLoading ? (
        <View style={themedStyles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={themedStyles.loadingText}>
            {activeTab === 'mesajlar' ? 'Sohbetler yükleniyor...' : 'Bağlantı önerileri yükleniyor...'}
          </Text>
        </View>
      ) : (
        <>
          {activeTab === 'mesajlar' ? (
            conversations.length === 0 ? (
              <ScrollView
                contentContainerStyle={themedStyles.emptyContainer}
                refreshControl={
                  <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textMain} />
                }
              >
                <MaterialCommunityIcons name="message-text-outline" size={responsiveFontSize(60)} color={colors.textSub} />
                <Text style={themedStyles.emptyText}>Henüz hiç mesajınız yok.</Text>
                <Text style={themedStyles.emptySubText}>Yeni bağlantılar kurarak sohbete başlayın!</Text>
              </ScrollView>
            ) : (
              <View style={themedStyles.listContainer}>
                <FlatList
                  data={conversations}
                  renderItem={({ item }) => (
                    <MessageItem
                      name={item.name}
                      lastMessage={item.lastMessage}
                      time={item.time}
                      unread={item.unread}
                      onChatPress={() => handleChatPress(item)}
                      profileImageUrl={item.profileImageUrl}
                      colors={colors}
                    />
                  )}
                  keyExtractor={(item) => item.id}
                  refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textMain} />
                  }
                />
              </View>
            )
          ) : (
            <ScrollView
              style={themedStyles.connectionsContentScrollView}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textMain} />
              }
            >
              {(!currentUserData || !currentUserData.job) && !isCurrentUserLoading && (
                <Text style={themedStyles.noDataText}>
                  Profilinizdeki **meslek bilgisi eksik** olduğu için aynı meslekten kişiler gösterilemiyor veya profil veriniz yüklenemedi. Lütfen profilinizi güncelleyin.
                </Text>
              )}

              {!isLoadingConnections && hasConnectionSuggestions ? (
                <>
                  {sameJobUsers.length > 0 && currentUserData?.job && (
                    <View style={themedStyles.randomUsersContainer}>
                      <View style={themedStyles.randomUsersHeader}>
                        <Text style={themedStyles.randomUsersTitle}>Tanıyor Olabileceğin Kişiler ({currentUserData.job} alanından)</Text>
                        <Text style={themedStyles.connectionCounter}>{connectionCount}/{MAX_CONNECTIONS_TO_SEND}</Text>
                      </View>
                      <FlatList
                        data={sameJobUsers}
                        keyExtractor={(item) => item.id}
                        horizontal={true}
                        showsHorizontalScrollIndicator={false}
                        renderItem={({ item }) => {
                          const hasSentRequest = sentConnectionRequestIds.has(item.id);
                          const isCurrentlySending = sendingStates[item.id] === true;
                          
                          const isDisabledForButton = Boolean(isCurrentlySending || isMaxConnectionsReachedForDisplay);
                          return (
                            <ConnectionItem
                              name={item.fullName || item.username}
                              job={item.job}
                              profileImageUrl={item.profileImageUrl}
                              onConnectPress={() => sendConnectionRequest(item)}
                              isDisabled={isDisabledForButton}
                              isSending={isCurrentlySending}
                              hasSentRequest={hasSentRequest} 
                              colors={colors}
                            />
                          );
                        }}
                      />
                    </View>
                  )}

                  {popularUsers.length > 0 && (
                    <View style={themedStyles.randomUsersContainer}>
                      <View style={themedStyles.randomUsersHeader}>
                        <Text style={themedStyles.randomUsersTitle}>JobsCheck (Popüler Kişiler)</Text>
                        <Text style={themedStyles.connectionCounter}>{connectionCount}/{MAX_CONNECTIONS_TO_SEND}</Text>
                      </View>
                      <FlatList
                        data={popularUsers}
                        keyExtractor={(item) => item.id}
                        horizontal={true}
                        showsHorizontalScrollIndicator={false}
                        renderItem={({ item }) => {
                          const hasSentRequest = sentConnectionRequestIds.has(item.id);
                          const isCurrentlySending = sendingStates[item.id] === true;
                          const isDisabledForButton = Boolean(isCurrentlySending || isMaxConnectionsReachedForDisplay);
                          return (
                            <ConnectionItem
                              name={item.fullName || item.username}
                              job={item.job}
                              profileImageUrl={item.profileImageUrl}
                              onConnectPress={() => sendConnectionRequest(item)}
                              isDisabled={isDisabledForButton}
                              isSending={isCurrentlySending}
                              hasSentRequest={hasSentRequest}
                              colors={colors}
                            />
                          );
                        }}
                      />
                    </View>
                  )}

                  {exploreUsers.length > 0 && (
                    <View style={themedStyles.randomUsersContainer}>
                      <View style={themedStyles.randomUsersHeader}>
                        <Text style={themedStyles.randomUsersTitle}>Keşfet, Tanış (Rastgele Kişiler)</Text>
                        <Text style={themedStyles.connectionCounter}>{connectionCount}/{MAX_CONNECTIONS_TO_SEND}</Text>
                      </View>
                      <FlatList
                        data={exploreUsers}
                        keyExtractor={(item) => item.id}
                        horizontal={true}
                        showsHorizontalScrollIndicator={false}
                        renderItem={({ item }) => {
                          const hasSentRequest = sentConnectionRequestIds.has(item.id);
                          const isCurrentlySending = sendingStates[item.id] === true;
                          const isDisabledForButton = Boolean(isCurrentlySending || isMaxConnectionsReachedForDisplay);
                          return (
                            <ConnectionItem
                              name={item.fullName || item.username}
                              job={item.job}
                              profileImageUrl={item.profileImageUrl}
                              onConnectPress={() => sendConnectionRequest(item)}
                              isDisabled={isDisabledForButton}
                              isSending={isCurrentlySending}
                              hasSentRequest={hasSentRequest}
                              colors={colors}
                            />
                          );
                        }}
                      />
                    </View>
                  )}
                </>
              ) : (
                !isCurrentUserLoading && !isLoadingConnections && (
                  <View style={themedStyles.emptyConnectionsContainer}>
                    <MaterialCommunityIcons name="account-group-outline" size={responsiveFontSize(60)} color={colors.textSub} />
                    <Text style={themedStyles.emptyText}>Henüz hiç bağlantı önerisi bulunmuyor.</Text>
                    <Text style={themedStyles.emptySubText}>Ağınızı genişletmek için daha fazla kişiyi keşfedin!</Text>
                  </View>
                )
              )}
            </ScrollView>
          )}
        </>
      )}
    </View>
  );
};

const styles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? 35 : 0,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.textMain,
    marginTop: 10,
    fontSize: responsiveFontSize(16),
  },
  emptyContainer: {
    flexGrow: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyConnectionsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    minHeight: SCREEN_HEIGHT * 0.4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SCREEN_WIDTH * 0.04,
    paddingBottom: SCREEN_HEIGHT * 0.02,
    paddingTop: 10,
  },
  selectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    paddingVertical: 10,
  },
  messageWrapper: {
    marginVertical: 5,
    marginHorizontal: 10,
    borderRadius: 10,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 4,
  },
  readMessageBackground: {
    backgroundColor: colors.cardBackground,
  },
  unreadMessageBackground: {
    backgroundColor: colors.border,
  },
  back: { width: 24, height: 24, resizeMode: 'contain' },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: colors.textMain,
    fontSize: responsiveFontSize(22),
    fontWeight: 'bold',
  },
  backPlaceholder: {
    width: SCREEN_WIDTH * 0.1,
    height: SCREEN_WIDTH * 0.1,
  },
  tabText: {
    color: colors.textSub,
    fontSize: responsiveFontSize(22),
    fontWeight: 'bold',
  },
  activeTabText: {
    color: colors.textMain,
  },
  divider: {
    width: '100%',
    backgroundColor: colors.border,
    height: 4,
    borderRadius: 50,
    position: 'relative',
  },
  shortDivider: {
    height: 4,
    borderRadius: 50,
    position: 'absolute',
    bottom: 0,
  },
  emptyText: {
    color: colors.textMain,
    fontSize: responsiveFontSize(20),
    fontWeight: 'bold',
    marginTop: 15,
    textAlign: 'center',
  },
  emptySubText: {
    color: colors.textSub,
    fontSize: responsiveFontSize(15),
    marginTop: 5,
    textAlign: 'center',
  },
  listContainer: {
    backgroundColor: 'transparent',
    width: '95%',
    borderRadius: 10,
    alignSelf: 'center',
    marginTop: 10,
    flex: 1,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SCREEN_HEIGHT * 0.005 * (Platform.OS === 'android' ? ANDROID_SCALE_FACTOR : IOS_SCALE_FACTOR),
    paddingHorizontal: SCREEN_WIDTH * 0.04 * (Platform.OS === 'android' ? ANDROID_SCALE_FACTOR : IOS_SCALE_FACTOR),
  },
  avatarContainer: {
    marginRight: SCREEN_WIDTH * 0.04 * (Platform.OS === 'android' ? ANDROID_SCALE_FACTOR : IOS_SCALE_FACTOR),
  },
  profileImage: {
    width: SCREEN_WIDTH * 0.12 * (Platform.OS === 'android' ? ANDROID_SCALE_FACTOR : IOS_SCALE_FACTOR),
    height: SCREEN_WIDTH * 0.12 * (Platform.OS === 'android' ? ANDROID_SCALE_FACTOR : IOS_SCALE_FACTOR),
    borderRadius: (SCREEN_WIDTH * 0.12 * (Platform.OS === 'android' ? ANDROID_SCALE_FACTOR : IOS_SCALE_FACTOR)) / 2,
    backgroundColor: colors.border,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    color: colors.textMain,
    fontSize: responsiveFontSize(16),
    fontWeight: 'bold',
  },
  message: {
    color: colors.textSub,
    fontSize: responsiveFontSize(14),
    marginTop: SCREEN_HEIGHT * 0.003 * (Platform.OS === 'android' ? ANDROID_SCALE_FACTOR : IOS_SCALE_FACTOR),
  },
  rightContentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  time: {
    color: colors.textSub,
    fontSize: responsiveFontSize(12),
  },
  unreadProfileImage: {
    width: SCREEN_WIDTH * 0.03 * (Platform.OS === 'android' ? ANDROID_SCALE_FACTOR : IOS_SCALE_FACTOR),
    height: SCREEN_WIDTH * 0.03 * (Platform.OS === 'android' ? ANDROID_SCALE_FACTOR : IOS_SCALE_FACTOR),
    borderRadius: SCREEN_WIDTH * 0.03 * (Platform.OS === 'android' ? ANDROID_SCALE_FACTOR : IOS_SCALE_FACTOR),
    marginLeft: 8,
  },
  connectionsContentScrollView: {
    flex: 1,
    paddingVertical: 10,
  },
  randomUsersContainer: {
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  randomUsersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  randomUsersTitle: {
    color: colors.textMain,
    fontSize: responsiveFontSize(18),
    fontWeight: 'bold',
  },
  connectionCounter: {
    color: colors.textSub,
    fontSize: responsiveFontSize(16),
    fontWeight: 'bold',
  },
  userCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginRight: 10,
    width: SCREEN_WIDTH * 0.4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 4,
  },
  userProfileImage: {
    width: SCREEN_WIDTH * 0.18,
    height: SCREEN_WIDTH * 0.18,
    borderRadius: (SCREEN_WIDTH * 0.18) / 2,
    marginBottom: 10,
    backgroundColor: colors.border,
  },
  userCardName: {
    color: colors.textMain,
    fontSize: responsiveFontSize(16),
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  userCardJob: {
    color: colors.textSub,
    fontSize: responsiveFontSize(13),
    textAlign: 'center',
    marginBottom: 10,
  },
  modalActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.border, 
    borderRadius: 8,
    paddingVertical: SCREEN_HEIGHT * 0.012,
    paddingHorizontal: SCREEN_WIDTH * 0.03,
    borderWidth: 1,
    borderColor: colors.primary,
    justifyContent: 'center',
    marginTop: SCREEN_HEIGHT * 0.012,
  },
  modalSubmitButtonText: {
    color: colors.primary,
    fontSize: responsiveFontSize(15),
    fontWeight: '600',
    marginLeft: 5,
  },
  connectionIcon: {
    width: responsiveFontSize(13),
    height: responsiveFontSize(18),
    marginRight: SCREEN_WIDTH * 0.015,
  },
  requestSentButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  requestSentButtonText: {
    color: '#FFF',
  },
  connectionIconWhite: {
    tintColor: '#FFF',
  },
  disabledConnectButton: {
    backgroundColor: colors.border,
    borderColor: colors.textSub,
    opacity: 0.5,
  },
  disabledConnectButtonText: {
    color: colors.textSub,
  },
  noDataText: {
    color: colors.textSub,
    textAlign: 'center',
    marginTop: SCREEN_HEIGHT * 0.05,
    fontSize: responsiveFontSize(16),
    paddingHorizontal: 20,
  },
});