import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import moment from 'moment';
import 'moment/locale/tr';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, BackHandler, Dimensions, FlatList, Image, Keyboard, Modal, Platform, Pressable, StyleSheet, Text, TextInput, ToastAndroid, TouchableOpacity, View } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { db } from '../../firebaseConfig';
import VideoPlayer from '../components/VideoPlayer';
import VideoThumbnail from '../components/VideoThumbnail';
import { darkTheme, lightTheme } from '../theme/colors';

moment.locale('tr');

const showToast = (msg) => {
  if (Platform.OS === 'android') {
    ToastAndroid.show(msg, ToastAndroid.SHORT);
  }
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TypingIndicator = ({ color }) => {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const makeLoop = (v) =>
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(v, { toValue: 0.3, duration: 400, useNativeDriver: true }),
      ]);
    const loop = Animated.loop(
      Animated.stagger(180, [makeLoop(dot1), makeLoop(dot2), makeLoop(dot3)])
    );
    loop.start();
    return () => loop.stop();
  }, [dot1, dot2, dot3]);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' }}>
      <View style={{ flexDirection: 'row', marginRight: 5 }}>
        {[dot1, dot2, dot3].map((v, i) => (
          <Animated.View
            key={i}
            style={{
              width: 5,
              height: 5,
              borderRadius: 2.5,
              marginHorizontal: 1.5,
              alignSelf: 'center',
              opacity: v,
              backgroundColor: color,
            }}
          />
        ))}
      </View>
      <Text style={{ color, fontSize: 11, marginTop: 1 }}>yazıyor...</Text>
    </View>
  );
};

const MessagePressable = ({ children, onPress, onLongPress, style }) => {
  const scale = useRef(new Animated.Value(1)).current;

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={() => {
          Animated.spring(scale, { toValue: 0.93, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
        }}
        onPressOut={() => {
          Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
        }}
        style={style}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
};

const AnimatedBottomModal = ({ visible, onRequestClose, children }) => {
  const slideAnim = useRef(new Animated.Value(1)).current;
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (visible) {
      setShow(true);
      slideAnim.setValue(1);
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, speed: 50, bounciness: 6 }).start();
    } else if (show) {
      Animated.timing(slideAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start(() => setShow(false));
    }
  }, [visible]);

  return (
    <Modal transparent visible={show} animationType="fade" onRequestClose={onRequestClose}>
      <Pressable style={styles.modalOverlay} onPress={onRequestClose}>
        <Animated.View style={{
          width: '100%',
          alignItems: 'center',
          transform: [{ translateY: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 500] }) }],
          opacity: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
        }}>
          {children}
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

export default function SendMessage() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();

  const currentUserId = useSelector(state => state.user.userId);
  const themeMode = useSelector(state => state.theme?.mode || 'dark');
  const colors = themeMode === 'light' ? lightTheme : darkTheme;
  const styles = getStyles(colors);

  const {
    recipientId = null,
    recipientName = 'Bilinmeyen Kullanıcı',
    recipientJob = 'Bilinmeyen Meslek',
    recipientProfileImageUrl = null,
    recipientSchool = 'Bilinmeyen Okul',
    recipientCompany = 'Bilinmeyen Şirket'
  } = route.params || {};

  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [chatId, setChatId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [otherTyping, setOtherTyping] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const [currentUserName, setCurrentUserName] = useState('');
  const [currentUserJob, setCurrentUserJob] = useState('');
  const [currentUserSchool, setCurrentUserSchool] = useState('');
  const [currentUserCompany, setCurrentUserCompany] = useState('');
  const [currentUserProfileImageUrl, setCurrentUserProfileImageUrl] = useState(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [replyingToMessage, setReplyingToMessage] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [fullscreenVideo, setFullscreenVideo] = useState(null);

  const [headerMenuVisible, setHeaderMenuVisible] = useState(false);
  const headerMenuBtnRef = useRef(null);
  const [headerMenuPos, setHeaderMenuPos] = useState({ top: 0, right: 16 });

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState([]);
  const [selectionActionVisible, setSelectionActionVisible] = useState(false);

  const flatListRef = useRef(null);
  const swipeableRefs = useRef({});
  const typingFlushTimer = useRef(null);
  const typingLastSent = useRef(0);

  const closeAllSwipeables = useCallback(() => {
    Object.values(swipeableRefs.current).forEach((s) => {
      if (s && typeof s.close === 'function') s.close();
    });
  }, []);

  const startSwipeReply = useCallback((item) => {
    closeAllSwipeables();
    setReplyingToMessage(item);
    setEditingMessage(null);
  }, [closeAllSwipeables]);

  const getChatId = useCallback((user1Id, user2Id) => {
    const sortedIds = [user1Id, user2Id].sort();
    return `${sortedIds[0]}_${sortedIds[1]}`;
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    const risk = (insets?.bottom || 0);
    const show = Keyboard.addListener('keyboardWillShow', (e) => setKeyboardHeight(Math.max(0, e.endCoordinates.height - risk)));
    const hide = Keyboard.addListener('keyboardWillHide', () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, [insets]);

  useEffect(() => {
    if (!currentUserId) {
      console.error("SendMessage: Current user ID is missing.");
      if (Platform.OS === 'android') {
        ToastAndroid.show("Kullanıcı kimliğiniz alınamadı. Lütfen tekrar giriş yapın.", ToastAndroid.LONG);
      }
      setLoading(false);
      return;
    }
    if (!recipientId) {
      console.error("SendMessage: Recipient ID is missing from navigation parameters.");
      if (Platform.OS === 'android') {
        ToastAndroid.show("Sohbet edilecek kişi bilgisi eksik.", ToastAndroid.LONG);
      }
      setLoading(false);
      return;
    }

    const conversationId = getChatId(currentUserId, recipientId);
    setChatId(conversationId);

    const fetchCurrentUserProfile = async () => {
      if (currentUserId) {
        try {
          const userDocRef = doc(db, 'Users', currentUserId);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setCurrentUserName(userData.username || userData.fullName || 'Siz');
            setCurrentUserJob(userData.job || 'Meslek Bilgisi Yok');
            setCurrentUserSchool(userData.school || 'Okul Bilgisi Yok');
            setCurrentUserCompany(userData.company || 'Şirket Bilgisi Yok');
            setCurrentUserProfileImageUrl(userData.profileImageUrl || null);
          } else {
            console.warn("Current user profile not found in Users collection.");
            setCurrentUserName('Siz');
            setCurrentUserJob('Meslek Bilgisi Yok');
            setCurrentUserSchool('Okul Bilgisi Yok');
            setCurrentUserCompany('Şirket Bilgisi Yok');
          }
        } catch (error) {
          console.error("Error fetching current user profile:", error);
          setCurrentUserName('Siz');
          setCurrentUserJob('Meslek Bilgisi Yok');
          setCurrentUserSchool('Okul Bilgisi Yok');
          setCurrentUserCompany('Şirket Bilgisi Yok');
        }
      }
    };
    fetchCurrentUserProfile();

    const messagesRef = collection(db, 'chats', conversationId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMessages = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(doc.data().createdAt),
          updatedAt: doc.data().updatedAt?.toDate ? doc.data().updatedAt.toDate() : doc.data().updatedAt,
        }))
        .filter(m => !Array.isArray(m.deletedForMe) || !m.deletedForMe.includes(currentUserId));
      setMessages(fetchedMessages);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching messages from Firestore: ", error);
      if (Platform.OS === 'android') {
        ToastAndroid.show("Mesajlar yüklenirken bir sorun oluştu.", ToastAndroid.LONG);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [recipientId, currentUserId, getChatId]);

  const clearTyping = useCallback(() => {
    if (typingFlushTimer.current) {
      clearTimeout(typingFlushTimer.current);
      typingFlushTimer.current = null;
    }
    if (!chatId || !currentUserId) return;
    setDoc(doc(db, 'chats', chatId, 'typing', currentUserId), { isTyping: false }, { merge: true }).catch(() => { });
  }, [chatId, currentUserId]);

  const sendTyping = useCallback(() => {
    if (!chatId || !currentUserId) return;
    const now = Date.now();
    if (now - typingLastSent.current > 1500) {
      typingLastSent.current = now;
      setDoc(doc(db, 'chats', chatId, 'typing', currentUserId), { isTyping: true, timestamp: serverTimestamp() }, { merge: true }).catch(() => { });
    }
    if (typingFlushTimer.current) clearTimeout(typingFlushTimer.current);
    typingFlushTimer.current = setTimeout(() => {
      typingFlushTimer.current = null;
      setDoc(doc(db, 'chats', chatId, 'typing', currentUserId), { isTyping: false }, { merge: true }).catch(() => { });
    }, 2500);
  }, [chatId, currentUserId]);

  useEffect(() => {
    if (!chatId || !recipientId) return;
    const typingDocRef = doc(db, 'chats', chatId, 'typing', recipientId);
    const unsub = onSnapshot(typingDocRef, (snap) => {
      const data = snap.data();
      if (!data) {
        setOtherTyping(false);
        return;
      }
      const ts = data.timestamp;
      const isRecent = ts && typeof ts.toMillis === 'function' && (Date.now() - ts.toMillis()) < 4000;
      setOtherTyping(data.isTyping === true && (isRecent || ts == null));
    }, () => setOtherTyping(false));
    return () => {
      unsub();
      clearTyping();
    };
  }, [chatId, recipientId, clearTyping]);

  const updateLastMessage = async (newText, timestamp) => {
    if (!chatId) return;

    try {
      await updateDoc(doc(db, 'Users', currentUserId, 'chats', chatId), {
        lastMessageText: newText,
        lastMessageCreatedAt: timestamp,
      });
      await updateDoc(doc(db, 'Users', recipientId, 'chats', chatId), {
        lastMessageText: newText,
        lastMessageCreatedAt: timestamp,
      });
    } catch (error) {
      console.error("Error updating last message:", error);
    }
  };

  const handleSendMessage = async () => {
    if (message.trim() && chatId && currentUserId && recipientId && currentUserName) {
      const currentMessage = message.trim();
      setMessage('');
      clearTyping();
      if (flatListRef.current) {
        flatListRef.current.scrollToOffset({ animated: true, offset: 0 });
      }

      try {
        const timestamp = new Date();


        if (editingMessage) {
          const messageDocRef = doc(db, 'chats', chatId, 'messages', editingMessage.id);
          await updateDoc(messageDocRef, {
            text: currentMessage,
            updatedAt: timestamp,
          });

          if (editingMessage.id === messages[0]?.id) {
            await updateLastMessage(currentMessage, timestamp);
          }
          setEditingMessage(null);
          if (Platform.OS === 'android') {
            ToastAndroid.show("Mesaj başarıyla güncellendi.", ToastAndroid.SHORT);
          }
        } else {

          const newMessageData = {
            text: currentMessage,
            senderId: currentUserId,
            recipientId: recipientId,
            createdAt: timestamp,
          };

          if (replyingToMessage) {
            newMessageData.replyToMessageId = replyingToMessage.id;
            newMessageData.replyToMessageText = replyingToMessage.text;
            newMessageData.replyToMessageSenderName = replyingToMessage.senderId === currentUserId ? 'Siz' : recipientName;
          }

          await addDoc(collection(db, 'chats', chatId, 'messages'), newMessageData);

          await setDoc(doc(db, 'Users', currentUserId, 'chats', chatId), {
            otherUserId: recipientId,
            otherUserName: recipientName,
            otherUserJob: recipientJob ?? null,
            otherUserSchool: recipientSchool ?? null,
            otherUserCompany: recipientCompany ?? null,
            otherUserProfileImageUrl: recipientProfileImageUrl ?? null,
            lastMessageText: currentMessage,
            lastMessageCreatedAt: timestamp,
            unread: false,
          }, { merge: true });

          await setDoc(doc(db, 'Users', recipientId, 'chats', chatId), {
            otherUserId: currentUserId,
            otherUserName: currentUserName,
            otherUserJob: currentUserJob ?? null,
            otherUserSchool: currentUserSchool ?? null,
            otherUserCompany: currentUserCompany ?? null,
            otherUserProfileImageUrl: currentUserProfileImageUrl ?? null,
            lastMessageText: currentMessage,
            lastMessageCreatedAt: timestamp,
            unread: true,
          }, { merge: true });
        }
        setReplyingToMessage(null);
      } catch (error) {
        console.error("Error sending/updating message to Firestore: ", error);
        if (Platform.OS === 'android') {
          ToastAndroid.show("Mesaj gönderilirken/güncellenirken hata oluştu. Lütfen tekrar deneyin.", ToastAndroid.LONG);
        }
        setMessage(currentMessage);
      }
    } else if (!message.trim()) {
      if (Platform.OS === 'android') {
        ToastAndroid.show("Boş mesaj gönderilemez.", ToastAndroid.SHORT);
      }
    } else {
      if (Platform.OS === 'android') {
        ToastAndroid.show("Sohbet bilgileri eksik veya kullanıcı bilgileriniz alınamadı.", ToastAndroid.SHORT);
      }
      console.log("Debug: message:", message.trim(), "chatId:", chatId, "currentUserId:", currentUserId, "recipientId:", recipientId, "currentUserName:", currentUserName);
    }
  };

  const handleLongPressMessage = (messageItem) => {
    setSelectedMessage(messageItem);
    setModalVisible(true);
  };

  const openHeaderMenu = () => {
    headerMenuBtnRef.current?.measure((x, y, w, h, px, py) => {
      setHeaderMenuPos({ top: py + h + 4, right: SCREEN_WIDTH - px - w });
      setHeaderMenuVisible(true);
    });
  };

  const startSelection = () => {
    setHeaderMenuVisible(false);
    setSelectionMode(true);
    setSelectedMessages([]);
  };

  const cancelSelection = useCallback(() => {
    setSelectionMode(false);
    setSelectedMessages([]);
  }, []);

  const toggleSelectMessage = useCallback((item) => {
    setSelectedMessages(prev => {
      const exists = prev.some(m => m.id === item.id);
      if (exists) return prev.filter(m => m.id !== item.id);
      return [...prev, item];
    });
  }, []);

  useEffect(() => {
    if (!selectionMode) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      cancelSelection();
      return true;
    });
    return () => sub.remove();
  }, [selectionMode, cancelSelection]);

  const syncLastMessageAfterDelete = async () => {
    if (!chatId) return;
    try {
      const messagesRef = collection(db, 'chats', chatId, 'messages');
      const q = query(messagesRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const visible = snapshot.docs.filter(d => {
        const data = d.data();
        const deletedForMe = data.deletedForMe || [];
        return !deletedForMe.includes(currentUserId);
      });
      if (visible.length > 0) {
        const data = visible[0].data();
        const lastText = data.isDeleted ? 'Mesaj silindi' : (data.text || '');
        await updateLastMessage(lastText, data.createdAt || new Date());
      } else {
        await updateLastMessage('Sohbet başladı.', new Date());
      }
    } catch (error) {
      console.error("Error syncing last message:", error);
    }
  };

  const handleDeleteSelectedForMe = async () => {
    if (!chatId || selectedMessages.length === 0) return;
    setSelectionActionVisible(false);
    try {
      await Promise.all(selectedMessages.map(m =>
        updateDoc(doc(db, 'chats', chatId, 'messages', m.id), {
          deletedForMe: arrayUnion(currentUserId),
        })
      ));
      await syncLastMessageAfterDelete();
      cancelSelection();
      showToast(`${selectedMessages.length} mesaj sizden silindi.`);
    } catch (error) {
      console.error("Error deleting messages for me:", error);
      showToast('Mesajlar silinirken bir hata oluştu.');
    }
  };

  const handleDeleteSelectedForEveryone = async () => {
    if (!chatId || selectedMessages.length === 0) return;
    setSelectionActionVisible(false);
    Alert.alert(
      'Mesajları Sil',
      `${selectedMessages.length} mesaj herkes için silinsin mi? Bu işlem geri alınamaz.`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await Promise.all(selectedMessages.map(m =>
                updateDoc(doc(db, 'chats', chatId, 'messages', m.id), {
                  text: 'Mesaj silindi',
                  isDeleted: true,
                  replyToMessageId: null,
                  replyToMessageText: null,
                  replyToMessageSenderName: null,
                })
              ));
              await syncLastMessageAfterDelete();
              cancelSelection();
              showToast(`${selectedMessages.length} mesaj herkes için silindi.`);
            } catch (error) {
              console.error("Error deleting messages for everyone:", error);
              showToast('Mesajlar silinirken bir hata oluştu.');
            }
          },
        },
      ],
    );
  };

  const handleReply = () => {
    if (selectedMessage) {
      setReplyingToMessage(selectedMessage);
      setModalVisible(false);
      setSelectedMessage(null);
    }
  };

  const handleEdit = () => {
    if (selectedMessage) {
      setMessage(selectedMessage.text);
      setEditingMessage(selectedMessage);
      setModalVisible(false);
      setSelectedMessage(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
    setMessage('');
  };

  const handleDeleteMessage = async () => {
    if (selectedMessage && chatId) {
      try {
        const messageDocRef = doc(db, 'chats', chatId, 'messages', selectedMessage.id);
        await updateDoc(messageDocRef, {
          text: 'Mesaj silindi',
          isDeleted: true,

          replyToMessageId: null,
          replyToMessageText: null,
          replyToMessageSenderName: null,
        });


        if (selectedMessage.id === messages[0]?.id) {
          const messagesRef = collection(db, 'chats', chatId, 'messages');
          const q = query(messagesRef, orderBy('createdAt', 'desc'));
          const snapshot = await getDocs(q);
          const lastMessageText = snapshot.docs.length > 1 ? snapshot.docs[1].data().text : 'Sohbet başladı.';
          const lastMessageCreatedAt = snapshot.docs.length > 1 ? snapshot.docs[1].data().createdAt : new Date();
          await updateLastMessage(lastMessageText, lastMessageCreatedAt);
        }

        if (Platform.OS === 'android') {
          ToastAndroid.show("Mesaj başarıyla silindi.", ToastAndroid.SHORT);
        }
        setModalVisible(false);
        setSelectedMessage(null);
      } catch (error) {
        console.error("Error deleting message:", error);
        if (Platform.OS === 'android') {
          ToastAndroid.show("Mesaj silinirken hata oluştu.", ToastAndroid.SHORT);
        }
      }
    }
  };

  const handleDeleteSingleForMe = async () => {
    if (selectedMessage && chatId) {
      try {
        await updateDoc(doc(db, 'chats', chatId, 'messages', selectedMessage.id), {
          deletedForMe: arrayUnion(currentUserId),
        });
        await syncLastMessageAfterDelete();
        setModalVisible(false);
        setSelectedMessage(null);
        showToast('Mesaj sizden silindi.');
      } catch (error) {
        console.error("Error deleting message for me:", error);
        showToast('Mesaj silinirken bir hata oluştu.');
      }
    }
  };

  const formatMessageTime = (date) => {
    if (!date) return '';
    return moment(date).format('HH:mm');
  };

  const formatDayLabel = (date) => {
    if (!date) return '';
    if (moment(date).isSame(moment(), 'day')) return 'Bugün';
    if (moment(date).isSame(moment().subtract(1, 'day'), 'day')) return 'Dün';
    return moment(date).format('D MMMM YYYY');
  };

  const getMessagePreview = (item) => {
    if (!item) return '';
    if (item.isDeleted) return 'Mesaj silindi';
    if (item.text) return item.text;
    if (item.videoUri || item.type === 'video') return '🎥 Video';
    if (item.imageUri || item.type === 'image') return '📷 Fotoğraf';
    return '';
  };

  const renderMessageItem = useCallback(({ item, index }) => {
    const isMyMessage = item.senderId === currentUserId;
    const isSelected = selectedMessages.some(m => m.id === item.id);

    const repliedToMessage = item.replyToMessageId ? messages.find(m => m.id === item.replyToMessageId) : null;
    const repliedToMessageSenderName = item.replyToMessageSenderName || (repliedToMessage?.senderId === currentUserId ? 'Siz' : recipientName);
    const replyPreview = repliedToMessage ? getMessagePreview(repliedToMessage) : (item.replyToMessageText || '');

    const isNextMessageSameSender = index > 0 && messages[index - 1]?.senderId === item.senderId;
    const showPointer = !isNextMessageSameSender;

    const olderMessage = messages[index + 1];
    const showDayLabel = !olderMessage || !moment(item.createdAt).isSame(olderMessage.createdAt, 'day');

    return (
      <View style={styles.messageRow}>
        {showDayLabel && (
          <View style={styles.dayLabelContainer}>
            <Text style={styles.dayLabelText}>{formatDayLabel(item.createdAt)}</Text>
          </View>
        )}
        <Swipeable
          ref={(ref) => { swipeableRefs.current[index] = ref; }}
          friction={1}
          enabled={!selectionMode}
          rightThreshold={40}
          leftThreshold={40}
          overshootRight={false}
          overshootLeft={false}
          onSwipeableWillOpen={(direction) => {
            const shouldReply = isMyMessage ? direction === 'right' : direction === 'left';
            if (shouldReply) {
              startSwipeReply(item);
            }
          }}
          renderRightActions={isMyMessage ? () => <View style={styles.swipeReplySpacer} /> : undefined}
          renderLeftActions={!isMyMessage ? () => <View style={styles.swipeReplySpacer} /> : undefined}
        >
          <MessagePressable
            onLongPress={() => {
              if (selectionMode) {
                toggleSelectMessage(item);
                return;
              }
              if (item.senderId === currentUserId) {
                handleLongPressMessage(item);
              }
            }}
            onPress={() => {
              if (selectionMode) {
                toggleSelectMessage(item);
                return;
              }
              if (!item.isDeleted && (item.videoUri || item.type === 'video')) {
                setFullscreenVideo({
                  uri: item.videoUri,
                  name: isMyMessage ? currentUserName : recipientName,
                  imageUrl: isMyMessage ? currentUserProfileImageUrl : recipientProfileImageUrl,
                });
              }
            }}
            style={[
              styles.messageItemContainer,
              isMyMessage ? styles.myMessageItemContainer : styles.otherMessageItemContainer,
              isSelected && styles.messageItemSelected,
            ]}
          >
            {selectionMode && (
              <View style={[styles.selectionBadge, isMyMessage ? styles.selectionBadgeLeft : styles.selectionBadgeRight]}>
                <Ionicons
                  name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                  size={22}
                  color={isSelected ? colors.primary : colors.textSub}
                />
              </View>
            )}
            <View style={[
              styles.messageBubble,
              isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble,
              !item.isDeleted && (item.imageUri || item.videoUri || item.type === 'video') && styles.imageBubble,
              showPointer && !item.imageUri && !item.videoUri && !item.isDeleted && (isMyMessage ? styles.myMessageBubbleLast : styles.otherMessageBubbleLast),
              isSelected && styles.messageBubbleSelected,
            ]}>
              {item.replyToMessageId && (
                <View style={[styles.repliedMessageContainer, !isMyMessage && { borderLeftColor: colors.primary }]}>
                  <Text style={[styles.repliedMessageSender, !isMyMessage && { color: colors.primary }]} numberOfLines={1}>
                    {repliedToMessageSenderName === 'Siz' ? 'Yanıtınız' : `Yanıtlanıyor: ${repliedToMessageSenderName}`}
                  </Text>
                  <Text style={[styles.repliedMessageText, !isMyMessage && { color: colors.textSub }]} numberOfLines={2}>{replyPreview}</Text>
                </View>
              )}
              {item.isDeleted ? (
                <Text style={[styles.deletedMessageText, !isMyMessage && { color: colors.textSub }]}>Mesaj silindi</Text>
              ) : item.videoUri || item.type === 'video' ? (
                <View style={styles.imageContainer}>
                  <VideoThumbnail
                    videoUri={item.videoUri}
                    style={styles.videoMessage}
                    onPress={() => setFullscreenVideo({
                      uri: item.videoUri,
                      name: isMyMessage ? currentUserName : recipientName,
                      imageUrl: isMyMessage ? currentUserProfileImageUrl : recipientProfileImageUrl,
                    })}
                  />
                  <View style={styles.videoTimeOverlay}>
                    {item.updatedAt ? (
                      <Text style={styles.imageTimeText}>Düzeltildi · {formatMessageTime(item.createdAt)}</Text>
                    ) : (
                      <Text style={styles.imageTimeText}>{formatMessageTime(item.createdAt)}</Text>
                    )}
                  </View>
                </View>
              ) : item.imageUri ? (
                <View style={styles.imageContainer}>
                  <Image source={{ uri: item.imageUri }} style={styles.messageImage} />
                  <View style={styles.imageTimeOverlay}>
                    {item.updatedAt ? (
                      <Text style={styles.imageTimeText}>Düzeltildi · {formatMessageTime(item.createdAt)}</Text>
                    ) : (
                      <Text style={styles.imageTimeText}>{formatMessageTime(item.createdAt)}</Text>
                    )}
                  </View>
                </View>
              ) : (
                <>
                  <Text style={[styles.messageText, !isMyMessage && { color: colors.textMain }]}>{item.text}</Text>
                  <View style={styles.messageTimeRow}>
                    {item.updatedAt ? (
                      <Text style={[styles.messageTimeText, !isMyMessage && { color: colors.textSub }]}>Düzeltildi · {formatMessageTime(item.createdAt)}</Text>
                    ) : (
                      <Text style={[styles.messageTimeText, !isMyMessage && { color: colors.textSub }]}>{formatMessageTime(item.createdAt)}</Text>
                    )}
                  </View>
                </>
              )}
            </View>
          </MessagePressable>
        </Swipeable>
      </View>
    );
  }, [currentUserId, currentUserName, currentUserProfileImageUrl, recipientProfileImageUrl, messages, recipientName, styles, colors, startSwipeReply, selectionMode, selectedMessages, toggleSelectMessage]);

  const getUserTitle = () => {
    const titles = [recipientCompany, recipientJob, recipientSchool].filter(
      (title) => title && title !== 'Bilinmeyen Şirket' && title !== 'Bilinmeyen Meslek' && title !== 'Bilinmeyen Okul'
    );
    return titles.join(' | ');
  };

  const hasDeletedSelected = selectedMessages.some(m => m.isDeleted);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Mesajlar yükleniyor...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        {selectionMode ? (
          <>
            <Pressable onPress={cancelSelection} hitSlop={12} style={styles.headerBackBtn}>
              <MaterialCommunityIcons name="close" size={24} color={colors.textMain} />
            </Pressable>
            <View style={styles.headerTextBlock}>
              <Text style={styles.userName} numberOfLines={1}>
                {selectedMessages.length > 0 ? `${selectedMessages.length} seçili` : 'Mesaj Seç'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setSelectionActionVisible(true)}
              hitSlop={12}
              style={styles.headerOptionsBtn}
              disabled={selectedMessages.length === 0}
            >
              <MaterialCommunityIcons
                name="trash-can-outline"
                size={24}
                color={selectedMessages.length > 0 ? '#FF5252' : colors.textSub}
              />
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.headerBackBtn}>
              <Image
                source={require('../../assets/images/back.png')}
                style={[styles.backIcon, { tintColor: colors.iconTint }]}
              />
            </Pressable>
            <Pressable style={styles.profileInfo} onPress={() => navigation.navigate('OtherProfilePage', { userId: recipientId })}>
              {recipientProfileImageUrl ? (
                <Image
                  source={{ uri: recipientProfileImageUrl }}
                  style={styles.profileImage}
                />
              ) : (
                <View style={styles.profileImagePlaceholder}>
                  <MaterialCommunityIcons name="account" size={22} color={colors.textSub} />
                </View>
              )}
              <View style={styles.headerTextBlock}>
                <Text style={styles.userName} numberOfLines={1}>{recipientName}</Text>
                {otherTyping ? (
                  <TypingIndicator color={colors.textSub} />
                ) : (
                  getUserTitle() ? <Text style={styles.userTitle} numberOfLines={1}>{getUserTitle()}</Text> : null
                )}
              </View>
            </Pressable>
            <TouchableOpacity ref={headerMenuBtnRef} onPress={openHeaderMenu} hitSlop={12} style={styles.headerOptionsBtn}>
              <MaterialCommunityIcons name="dots-horizontal" size={24} color={colors.textMain} />
            </TouchableOpacity>
          </>
        )}
      </View>

      <View style={[styles.keyboardArea, { paddingBottom: keyboardHeight }]}>
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessageItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.messagesList, { paddingBottom: (insets.bottom || 0) }]}
          inverted
          style={styles.messagesFlatList}
        />

        <View style={styles.inputContainer}>
          <View style={styles.chatInputRow}>
            <View style={[styles.chatInputWrapper, (replyingToMessage || editingMessage) && styles.chatInputWrapperHasReply]}>
              {(replyingToMessage || editingMessage) && (
                <View style={styles.replyingToContainer}>
                  <View style={{ flex: 1 }}>
                    {replyingToMessage && (
                      <>
                        <Text style={styles.replyingToHeader}>
                          Yanıtlanıyor: <Text style={{ fontWeight: 'bold' }}>{replyingToMessage.senderId === currentUserId ? 'Siz' : recipientName}</Text>
                        </Text>
                        <Text style={styles.replyingToText} numberOfLines={1}>{getMessagePreview(replyingToMessage)}</Text>
                      </>
                    )}
                    {editingMessage && (
                      <>
                        <Text style={styles.replyingToHeader}>
                          Düzenleniyor:
                        </Text>
                        <Text style={styles.replyingToText} numberOfLines={1}>{editingMessage.text}</Text>
                      </>
                    )}
                  </View>
                  <Pressable onPress={replyingToMessage ? () => setReplyingToMessage(null) : handleCancelEdit} style={styles.replyingToCloseBtn} hitSlop={8}>
                    <MaterialCommunityIcons name="close" size={16} color={colors.textMain} />
                  </Pressable>
                </View>
              )}
              <TextInput
                style={styles.textInput}
                placeholder=""
                placeholderTextColor={colors.textSub}
                value={message}
                onChangeText={(t) => {
                  setMessage(t);
                  if (t.trim()) sendTyping();
                }}
                multiline
                maxHeight={100}
                minHeight={40}
                textAlignVertical="center"
                maxLength={1000}
              />
            </View>
            {message.trim() ? (
              <Pressable onPress={handleSendMessage} style={styles.sendButton}>
                <Image
                  source={require('../../assets/images/ArrowRight.png')}
                  style={styles.sendIcon}
                />
              </Pressable>
            ) : (
              <View style={[styles.sendButton, styles.sendButtonDisabled]}>
                <Image
                  source={require('../../assets/images/ArrowRight.png')}
                  style={[styles.sendIcon, { opacity: 0.3 }]}
                />
              </View>
            )}
          </View>
        </View>
      </View>

      <Modal transparent visible={headerMenuVisible} animationType="fade" onRequestClose={() => setHeaderMenuVisible(false)}>
        <Pressable style={{ flex: 1 }} onPress={() => setHeaderMenuVisible(false)}>
          <View style={[styles.headerMenuPopup, { top: headerMenuPos.top, right: headerMenuPos.right, backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setHeaderMenuVisible(false); navigation.navigate('OtherProfilePage', { userId: recipientId }); }}>
              <MaterialCommunityIcons name="account-outline" size={18} color={colors.textMain} style={{ marginRight: 8 }} />
              <Text style={[styles.menuItemText, { color: colors.textMain }]}>Profili Gör</Text>
            </TouchableOpacity>
            <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />
            <TouchableOpacity style={styles.menuItem} onPress={startSelection}>
              <MaterialCommunityIcons name="check-circle-outline" size={18} color={colors.textMain} style={{ marginRight: 8 }} />
              <Text style={[styles.menuItemText, { color: colors.textMain }]}>Seç</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      <Modal transparent visible={selectionActionVisible} animationType="fade" onRequestClose={() => setSelectionActionVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setSelectionActionVisible(false)}>
          <View style={styles.modalView}>
            <Text style={styles.selectionActionHeader}>
              {selectedMessages.length} mesaj seçildi
            </Text>
            <Pressable onPress={handleDeleteSelectedForMe} style={styles.modalButton}>
              <Text style={styles.modalButtonText}>Kendinden Sil</Text>
            </Pressable>
            <Pressable onPress={handleDeleteSelectedForEveryone} style={[styles.modalButton, hasDeletedSelected && styles.modalButtonDisabled]} disabled={hasDeletedSelected}>
              <Text style={[styles.modalButtonText, styles.deleteButtonText, hasDeletedSelected && { opacity: 0.4 }]}>Herkesden Sil</Text>
            </Pressable>
          </View>
          <View style={styles.cancelView}>
            <Pressable onPress={() => setSelectionActionVisible(false)} style={[styles.CanceltButton, styles.cancelButton]}>
              <Text style={styles.cancelButtonText}>İptal</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <Modal
        animationType="fade"
        transparent={false}
        visible={!!fullscreenVideo}
        onRequestClose={() => setFullscreenVideo(null)}
        supportedOrientations={['portrait']}
        statusBarTranslucent
      >
        <View style={styles.fullscreenVideoContainer}>
          <VideoPlayer
            videoUri={fullscreenVideo?.uri}
            style={styles.fullscreenVideoPlayer}
            resizeMode="cover"
          />
          <View style={[styles.fullscreenVideoTopBar, { paddingTop: (insets.top || 0) + 8 }]}>
            <View style={styles.fullscreenVideoTopRow}>
              <Pressable onPress={() => setFullscreenVideo(null)} style={styles.cameraCircleBtn} hitSlop={12}>
                <Ionicons name="close" size={28} color="#FFF" />
              </Pressable>
              <View style={styles.fullscreenSenderInfo}>
                {fullscreenVideo?.imageUrl ? (
                  <Image source={{ uri: fullscreenVideo.imageUrl }} style={styles.fullscreenSenderAvatar} />
                ) : (
                  <View style={styles.fullscreenSenderAvatarPlaceholder}>
                    <MaterialCommunityIcons name="account" size={16} color="#FFF" />
                  </View>
                )}
                <Text style={styles.fullscreenSenderName} numberOfLines={1}>{fullscreenVideo?.name || ''}</Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(false);
          setSelectedMessage(null);
        }}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <View style={styles.modalView}>
            {selectedMessage && selectedMessage.isDeleted ? (
              <Pressable onPress={handleDeleteSingleForMe} style={styles.modalButton}>
                <Text style={[styles.modalButtonText, styles.deleteButtonText]}>Kendinden Sil</Text>
              </Pressable>
            ) : (
              <>
                <Pressable onPress={handleReply} style={styles.modalButton2}>
                  <Text style={styles.modalButtonText}>Yanıtla</Text>
                </Pressable>
                {selectedMessage && selectedMessage.senderId === currentUserId && (
                  <>
                    <Pressable onPress={handleEdit} style={styles.modalButton}>
                      <Text style={styles.modalButtonText}>Mesajı Düzenle</Text>
                    </Pressable>
                    <Pressable onPress={handleDeleteSingleForMe} style={styles.modalButton}>
                      <Text style={[styles.modalButtonText, styles.deleteButtonText]}>Kendinden Sil</Text>
                    </Pressable>
                    <Pressable onPress={handleDeleteMessage} style={styles.modalButton2}>
                      <Text style={[styles.modalButtonText, styles.deleteButtonText]}>Herkesden Sil</Text>
                    </Pressable>
                  </>
                )}
              </>
            )}
          </View>
          <View style={styles.cancelView}>
            <Pressable onPress={() => setModalVisible(false)} style={[styles.CanceltButton, styles.cancelButton]}>
              <Text style={styles.cancelButtonText}>İptal</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.textMain,
    marginTop: 10,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  headerBackBtn: {
    padding: 4,
  },
  backIcon: { width: 24, height: 24, resizeMode: 'contain' },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 10,
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.inputBackground,
  },
  profileImagePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextBlock: {
    flex: 1,
    marginLeft: 10,
  },
  userName: {
    color: colors.textMain,
    fontSize: 16,
    fontWeight: '700',
  },
  userTitle: {
    color: colors.textSub,
    fontSize: 12,
    marginTop: 1,
  },
  headerOptionsBtn: {
    padding: 4,
    marginLeft: 4,
  },
  headerMenuPopup: {
    position: 'absolute',
    borderRadius: 14,
    borderWidth: 1,
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 10,
    overflow: 'hidden',
    paddingVertical: 4,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 16 },
  menuItemText: { fontSize: 15, fontWeight: '600' },
  menuDivider: { height: 1, marginHorizontal: 12 },
  messagesList: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  messageRow: {
    width: '100%',
  },
  messageItemContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 3,
  },
  messageItemSelected: {
    backgroundColor: 'rgba(0,102,255,0.10)',
    borderRadius: 12,
  },
  selectionBadge: {
    position: 'absolute',
    top: 4,
    zIndex: 10,
  },
  selectionBadgeRight: {
    right: 4,
  },
  selectionBadgeLeft: {
    left: 4,
  },
  messageBubbleSelected: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  myMessageItemContainer: {
    justifyContent: 'flex-end',
  },
  otherMessageItemContainer: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.inputBackground,
    marginHorizontal: 6,
  },
  messageAvatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.inputBackground,
    marginHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageAvatarSpacer: {
    width: 28,
    marginHorizontal: 6,
  },
  dayLabelContainer: {
    alignItems: 'center',
    marginVertical: 12,
  },
  dayLabelText: {
    color: colors.textSub,
    fontSize: 11,
    fontWeight: '600',
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  messageBubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    maxWidth: '76%',
    position: 'relative',
  },
  myMessageBubble: {
    backgroundColor: colors.primary,
    marginRight: 6,
  },
  myMessageBubbleLast: {
    borderBottomRightRadius: 6,
  },
  otherMessageBubble: {
    backgroundColor: colors.cardBackground,
    marginLeft: 6,
  },
  otherMessageBubbleLast: {
    borderBottomLeftRadius: 6,
  },
  imageBubble: {
    backgroundColor: 'transparent',
    padding: 0,
    borderWidth: 0,
  },
  messageText: {
    color: '#FFF',
    fontSize: 15,
    lineHeight: 20,
  },
  messageImage: {
    width: 220,
    height: 280,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: colors.inputBackground,
  },
  messageTimeRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 2,
  },
  messageTimeText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 10,
  },
  deletedMessageText: {
    color: colors.textSub,
    fontSize: 14,
    fontStyle: 'italic',
  },
  keyboardArea: {
    flex: 1,
  },
  messagesFlatList: {
    flex: 1,
  },
  inputContainer: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.background,
    marginTop: 2,
    marginBottom: 25,
  },
  cancelView: {
    backgroundColor: colors.cardBackground,
    paddingVertical: 5,
    borderRadius: 20,
    borderColor: colors.border,
    borderWidth: 1,
    width: '96%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 15,
    alignSelf: 'center',
    marginBottom: 20
  },
  cancelButton: {
    flexDirection: 'row',
    width: '100%',
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  cancelButtonText: {
    color: '#FF6B6B',
    fontSize: 18,
    fontWeight: '600',
  },
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatInputWrapper: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    backgroundColor: colors.mode === 'dark' ? '#13151C' : colors.border,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 50,
    paddingVertical: 6,
  },
  chatInputWrapperHasReply: {
    justifyContent: 'flex-start',
    paddingTop: 8,
    paddingBottom: 4,
  },
  inputRightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  icon: {
    width: 24,
    height: 24,
    marginHorizontal: 2,
  },
  textInput: {
    flex: 1,
    paddingHorizontal: 6,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    color: colors.textMain,
    fontSize: 16,
    maxHeight: 100,
    minHeight: 34,
    textAlignVertical: 'center',
  },
  sendButton: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendIcon: {
    width: 20,
    height: 20,
    tintColor: '#FFF',
    resizeMode: 'contain',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    backgroundColor: colors.cardBackground,
    paddingVertical: 5,
    borderRadius: 20,
    borderColor: colors.border,
    borderWidth: 1,
    width: '96%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 15,
    paddingBottom: 10,
    alignSelf: 'center',
    marginBottom: 10
  },
  modalButton: {
    flexDirection: 'row',
    width: '100%',
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  modalButton2: {
    flexDirection: 'row',
    width: '100%',
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonDisabled: {
    opacity: 0.5,
  },
  modalButtonText: {
    color: colors.textMain,
    fontSize: 18,
    textAlign: 'center',
  },
  selectionActionHeader: {
    color: colors.textSub,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 12,
  },
  deleteButtonText: {
    color: '#FF3B30',
  },
  replyingToContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 6,
    borderRadius: 8,
    backgroundColor: colors.mode === 'dark' ? 'rgba(0,102,255,0.18)' : 'rgba(0,102,255,0.10)',
  },
  replyingToHeader: {
    color: colors.primary,
    fontSize: 12,
  },
  replyingToText: {
    color: colors.textSub,
    fontSize: 14,
  },
  replyingToCloseBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.inputBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  repliedMessageContainer: {
    borderLeftWidth: 3,
    borderLeftColor: '#FFF',
    paddingLeft: '3%',
    marginBottom: 5,
  },
  repliedMessageSender: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  repliedMessageText: {
    color: '#EEE',
    fontSize: 14,
    marginTop: 2,
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    zIndex: 100,
  },
  cameraFlipWrap: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraView: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraTopBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cameraCircleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraCenterArea: {
    flex: 1,
  },
  cameraModeToggleWrap: {
    alignItems: 'center',
    paddingBottom: 10,
  },
  cameraModeToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 20,
    padding: 3,
  },
  cameraModeBtn: {
    paddingHorizontal: 22,
    paddingVertical: 7,
    borderRadius: 17,
  },
  cameraModeBtnActive: {
    backgroundColor: '#FFF',
  },
  cameraModeText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '600',
  },
  cameraModeTextActive: {
    color: '#000',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF3B30',
    marginRight: 6,
  },
  recordingText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  cameraBottomBar: {
    paddingHorizontal: 30,
    paddingTop: 24,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cameraShutterBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
  },
  cameraShutterInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#FFFFFF',
  },
  cameraShutterRecording: {
    borderColor: '#FF3B30',
    backgroundColor: 'rgba(255,59,48,0.25)',
  },
  recordingStopBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#FF3B30',
  },
  cameraPreviewContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraPreviewImage: {
    flex: 1,
    width: '100%',
  },
  cameraPreviewVideo: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  cameraPreviewActions: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cameraPreviewActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#262626',
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 6,
  },
  cameraActionText: {
    color: '#FFF',
    fontSize: 13,
    marginLeft: 6,
  },
  cameraSendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 6,
  },
  fullscreenVideoContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  fullscreenVideoPlayer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  fullscreenVideoTopBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
  },
  fullscreenVideoTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fullscreenSenderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
    flex: 1,
  },
  fullscreenSenderAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#333',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  fullscreenSenderAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenSenderName: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    flexShrink: 1,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  imageContainer: {
    position: 'relative',
  },
  swipeReplyActionRight: {
    width: 80,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    marginVertical: 3,
  },
  swipeReplyActionLeft: {
    width: 80,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
    marginVertical: 3,
  },
  swipeReplySpacer: {
    width: 80,
    backgroundColor: 'transparent',
  },
  swipeReplyText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  imageTimeOverlay: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  videoTimeOverlay: {
    position: 'absolute',
    right: 6,
    top: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  imageTimeText: {
    color: '#FFF',
    fontSize: 10,
  },
  videoMessage: {
    width: 240,
    height: 300,
    borderRadius: 16,
    backgroundColor: colors.inputBackground,
    overflow: 'hidden',
  },
});
