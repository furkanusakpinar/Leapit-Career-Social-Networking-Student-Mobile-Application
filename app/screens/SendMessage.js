import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Image, TextInput, Pressable, FlatList, KeyboardAvoidingView, Platform, Dimensions, StatusBar, Keyboard, ToastAndroid, Animated, PanResponder, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import moment from 'moment';


import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { lightTheme, darkTheme } from '../theme/colors';

export default function SendMessage() {
  const navigation = useNavigation();
  const route = useRoute();

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

  const [currentUserName, setCurrentUserName] = useState('');
  const [currentUserJob, setCurrentUserJob] = useState('');
  const [currentUserSchool, setCurrentUserSchool] = useState('');
  const [currentUserCompany, setCurrentUserCompany] = useState('');
  const [currentUserProfileImageUrl, setCurrentUserProfileImageUrl] = useState(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [replyingToMessage, setReplyingToMessage] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);

  const flatListRef = useRef(null);

  const getChatId = useCallback((user1Id, user2Id) => {
    const sortedIds = [user1Id, user2Id].sort();
    return `${sortedIds[0]}_${sortedIds[1]}`;
  }, []);

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
      const fetchedMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(doc.data().createdAt),
        updatedAt: doc.data().updatedAt?.toDate ? doc.data().updatedAt.toDate() : doc.data().updatedAt,
      }));
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
    if (messageItem.isDeleted) return;
    setSelectedMessage(messageItem);
    setModalVisible(true);
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

  const renderMessageItem = useCallback(({ item, index }) => {
    const isMyMessage = item.senderId === currentUserId;
    const profileImageUrl = isMyMessage ? currentUserProfileImageUrl : recipientProfileImageUrl;

    const repliedToMessage = item.replyToMessageId ? messages.find(m => m.id === item.replyToMessageId) : null;
    const repliedToMessageSenderName = item.replyToMessageSenderName || (repliedToMessage?.senderId === currentUserId ? 'Siz' : recipientName);

    // FlatList is inverted, so index 0 is the newest message.
    // The message chronologically newer (below the current one) is at `index - 1`.
    const isNextMessageSameSender = index > 0 && messages[index - 1]?.senderId === item.senderId;
    const showPointer = !isNextMessageSameSender;

    return (
      <Pressable onLongPress={() => handleLongPressMessage(item)} style={[styles.messageItemContainer, isMyMessage ? styles.myMessageItemContainer : styles.otherMessageItemContainer]}>
        {!isMyMessage && (
          profileImageUrl ? (
            <Image
              source={{ uri: profileImageUrl }}
              style={[styles.messageAvatar, { marginRight: '3%' }]}
            />
          ) : (
            <MaterialCommunityIcons
              name="account-circle"
              size={28}
              color={colors.textSub}
              style={{ marginRight: '3%' }}
            />
          )
        )}
        <View style={[
          styles.messageBubble,
          isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble
        ]}>
          {showPointer && (
            isMyMessage ? (
              <View style={styles.myMessageBubblePointer} />
            ) : (
              <View style={styles.otherMessageBubblePointer} />
            )
          )}
          {item.replyToMessageId && (
            <View style={[styles.repliedMessageContainer, !isMyMessage && { borderLeftColor: colors.primary }]}>
              <Text style={[styles.repliedMessageSender, !isMyMessage && { color: colors.primary }]}>{repliedToMessageSenderName}</Text>
              <Text style={[styles.repliedMessageText, !isMyMessage && { color: colors.textSub }]}>{item.replyToMessageText}</Text>
            </View>
          )}
          {item.isDeleted ? (
            <Text style={[styles.deletedMessageText, !isMyMessage && { color: colors.textSub }]}>Mesaj silindi</Text>
          ) : (
            <>
              <Text style={[styles.messageText, !isMyMessage && { color: colors.textMain }]}>{item.text}</Text>
              {item.updatedAt && (
                <Text style={[styles.editedMessageText, !isMyMessage && { color: colors.textSub }]}>Düzeltildi</Text>
              )}
            </>
          )}
        </View>
        {isMyMessage && (
          profileImageUrl ? (
            <Image
              source={{ uri: profileImageUrl }}
              style={[styles.messageAvatar, { marginLeft: '3%' }]}
            />
          ) : (
            <MaterialCommunityIcons
              name="account-circle"
              size={28}
              color={colors.textSub}
              style={{ marginLeft: '3%' }}
            />
          )
        )}
      </Pressable>
    );
  }, [currentUserId, currentUserProfileImageUrl, recipientProfileImageUrl, messages, recipientName, styles, colors]);

  const getUserTitle = () => {
    const titles = [recipientCompany, recipientJob, recipientSchool].filter(
      (title) => title && title !== 'Bilinmeyen Şirket' && title !== 'Bilinmeyen Meslek' && title !== 'Bilinmeyen Okul'
    );
    return titles.join(' | ');
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Mesajlar yükleniyor...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <Image
            source={require('../../assets/images/back.png')}
            style={[styles.backIcon, { tintColor: colors.iconTint }]}
          />
        </Pressable>
        <View style={styles.profileInfo}>
          {recipientProfileImageUrl ? (
            <Image
              source={{ uri: recipientProfileImageUrl }}
              style={styles.profileImage}
            />
          ) : (
            <MaterialCommunityIcons
              name="account-circle"
              size={40}
              color={colors.textSub}
              style={{ marginRight: '3%' }}
            />
          )}
          <View>
            <Text style={styles.userName}>{recipientName}</Text>
            {getUserTitle() ? <Text style={styles.userTitle}>{getUserTitle()}</Text> : null}
          </View>
        </View>
        <View style={{ width: '10%' }} />
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessageItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        inverted
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        style={styles.inputContainer}
      >
        {(replyingToMessage || editingMessage) && (
          <View style={styles.replyingToContainer}>
            <View style={{ flex: 1 }}>
              {replyingToMessage && (
                <>
                  <Text style={styles.replyingToHeader}>
                    Yanıtlanıyor: <Text style={{ fontWeight: 'bold' }}>{replyingToMessage.senderId === currentUserId ? 'Siz' : recipientName}</Text>
                  </Text>
                  <Text style={styles.replyingToText} numberOfLines={1}>{replyingToMessage.text}</Text>
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
            <Pressable onPress={replyingToMessage ? () => setReplyingToMessage(null) : handleCancelEdit}>
              <Image
                source={require('../../assets/images/Cancel.png')}
                style={styles.replyingToCloseIcon}
              />
            </Pressable>
          </View>
        )}
        <View style={styles.chatInputWrapper}>
          <View style={styles.inputLeftIcons}>
            <Pressable onPress={() => ToastAndroid.show('Kamera yakında eklenecek!', ToastAndroid.SHORT)}>
              <Image
                source={require('../../assets/images/Camera.png')}
                style={[styles.icon, { tintColor: colors.iconTint }]}
              />
            </Pressable>
          </View>
          <TextInput
            style={styles.textInput}
            placeholder="Mesaj..."
            placeholderTextColor={colors.textSub}
            value={message}
            onChangeText={setMessage}
            multiline
            maxHeight={100}
            minHeight={40}
            textAlignVertical="center"
            maxLength={5000}
          />
          <View style={styles.inputRightIcons}>
            {message.trim() ? (
              <Pressable onPress={handleSendMessage} style={styles.sendButton}>
                <Image
                  source={require('../../assets/images/ArrowRight.png')}
                  style={styles.sendIcon}
                />
              </Pressable>
            ) : (
              <>
                <Pressable onPress={() => ToastAndroid.show('Galeriden fotoğraf yakında eklenecek!', ToastAndroid.SHORT)}>
                  <Image
                    source={require('../../assets/images/Gallery.png')}
                    style={[styles.galleryIcon, { tintColor: colors.iconTint }]}
                  />
                </Pressable>
              </>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>

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
            <Pressable onPress={handleReply} style={styles.modalButton}>
              <Text style={styles.modalButtonText}>Yanıtla</Text>
            </Pressable>
            {selectedMessage && selectedMessage.senderId === currentUserId && (
              <>
                <Pressable onPress={handleEdit} style={styles.modalButton}>
                  <Text style={styles.modalButtonText}>Mesajı Düzenle</Text>
                </Pressable>
                <Pressable onPress={handleDeleteMessage} style={styles.modalButton}>
                  <Text style={[styles.modalButtonText, styles.deleteButtonText]}>Mesajı Sil</Text>
                </Pressable>
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
    justifyContent: 'space-between',
    paddingHorizontal: '4%',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border, 
    gap: 10
  },
  backIcon: { width: 24, height: 24, resizeMode: 'contain' },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: '4%',
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: '3%',
  },
  userName: {
    color: colors.textMain,
    fontSize: 18,
    fontWeight: 'normal',
  },
  userTitle: {
    color: colors.textSub,
    fontSize: 12,
  },
  messagesList: {
    paddingHorizontal: '4%',
    paddingVertical: 10,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  messageItemContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 5,
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
  },
  messageBubble: {
    padding: 10,
    borderRadius: 15,
    maxWidth: '80%',
    position: 'relative',
  },
  myMessageBubble: {
    backgroundColor: colors.primary,
    marginRight: '3%',
  },
  otherMessageBubble: {
    backgroundColor: colors.cardBackground,
    marginLeft: '3%',
  },
  myMessageBubblePointer: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 15,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: colors.primary,
    position: 'absolute',
    bottom: 4,
    right: -10,
    transform: [{ rotate: '90deg' }],
  },
  otherMessageBubblePointer: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 15,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: colors.cardBackground,
    position: 'absolute',
    bottom: 4,
    left: -10,
    transform: [{ rotate: '-90deg' }],
  },
  messageText: {
    color: 'white', 
    fontSize: 16,
  },
  deletedMessageText: {
    color: '#DDD',
    fontSize: 16,
    fontStyle: 'italic',
  },
  editedMessageText: {
    fontSize: 10,
    color: '#DDD',
    marginTop: 2,
    fontStyle: 'italic',
    alignSelf: 'flex-end'
  },
  inputContainer: {
    paddingHorizontal: '4%',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
    marginBottom: 5,
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
  chatInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 15,
    paddingHorizontal: '2%',
    paddingVertical: 2,
  },
  inputLeftIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: '2%',
  },
  inputRightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: '2%',
    gap: 10
  },
  galleryIcon: {
    width: 28,
    height: 23,
    marginHorizontal: '1%',
  },
  micIcon: {
    width: 16,
    height: 22,
    marginHorizontal: '1%',
    resizeMode: 'cover'
  },
  icon: {
    width: 28,
    height: 28,
    marginHorizontal: '1%',
  },
  textInput: {
    flex: 1,
    paddingHorizontal: '2%',
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    color: colors.textMain,
    fontSize: 16,
    maxHeight: 100,
    minHeight: 40,
    textAlignVertical: 'center',
  },
  sendButton: {
    backgroundColor: colors.primary,
    borderRadius: 25,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendIcon: {
    width: 24,
    height: 24,
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
  modalButtonText: {
    color: colors.textMain,
    fontSize: 18,
    textAlign: 'center',
  },
  deleteButtonText: {
    color: '#FF3B30',
  },
  replyingToContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.border,
    borderRadius: 10,
    padding: 8,
    marginBottom: 8,
  },
  replyingToHeader: {
    color: colors.textMain,
    fontSize: 12,
  },
  replyingToText: {
    color: colors.textSub,
    fontSize: 14,
  },
  replyingToCloseIcon: {
    width: 20,
    height: 20,
    tintColor: colors.textSub,
    marginLeft: '2%',
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
});
