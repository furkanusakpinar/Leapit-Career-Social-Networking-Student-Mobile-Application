import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSelector } from 'react-redux';
import { db } from '../../firebaseConfig';
import { darkTheme, lightTheme } from '../theme/colors';
import SelectionModal from './SelectionModal';

const { width } = Dimensions.get('window');

const navIcons = [
  { normal: require('../../assets/images/Home.png'), active: require('../../assets/images/actionHome.png') },
  { normal: require('../../assets/images/Agim.png'), active: require('../../assets/images/actionAgim.png') },
  { normal: require('../../assets/images/Gonderi.png'), active: require('../../assets/images/actionGonderi.png') },
  { normal: require('../../assets/images/IsIlanlari.png'), active: require('../../assets/images/actionIsIlanlari.png') },
  { normal: require('../../assets/images/notifications.png'), active: require('../../assets/images/actionNotifications.png') },
];

const BottomNavBar = ({ userId }) => {
  const navigation = useNavigation();
  const route = useRoute();
  const themeMode = useSelector(state => state.theme?.mode || 'dark');
  const reduxUserId = useSelector(state => state.user?.userId);
  const colors = themeMode === 'light' ? lightTheme : darkTheme;
  const styles = getStyles(colors);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isModalVisible, setModalVisible] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const unsubRef = useRef(null);
  const unsubMsgRef = useRef(null);

  const activeUserId = userId || reduxUserId;

  const routeNameToIndex = {
    'HomePage': 0,
    'Social': 1,
    'PhotoSharePage': 2,
    'JobsPage': 3,
    'NotificationsPage': 4,
    'MainSwipe': 0,
  };

  useFocusEffect(
    useCallback(() => {
      const currentRouteIndex = routeNameToIndex[route.name];
      if (currentRouteIndex !== undefined) {
        setSelectedIndex(currentRouteIndex);
      }
    }, [route.name])
  );

  // Real-time unread notification listener
  useEffect(() => {
    if (!activeUserId) return;
    if (unsubRef.current) unsubRef.current();

    unsubRef.current = onSnapshot(
      collection(db, 'Users', activeUserId, 'notifications'),
      (snap) => {
        const count = snap.docs.filter(d => d.data().isRead === false).length;
        setUnreadCount(count);
      },
      () => setUnreadCount(0)
    );

    return () => unsubRef.current?.();
  }, [activeUserId]);

  // Real-time unread messages listener
  useEffect(() => {
    if (!activeUserId) return;
    if (unsubMsgRef.current) unsubMsgRef.current();

    unsubMsgRef.current = onSnapshot(
      collection(db, 'Users', activeUserId, 'chats'),
      (snap) => {
        const count = snap.docs.filter(d => d.data().unread === true).length;
        setUnreadMessages(count);
      },
      () => setUnreadMessages(0)
    );

    return () => unsubMsgRef.current?.();
  }, [activeUserId]);

  const handleNavigation = (index) => {
    if (index === 2) {
      setModalVisible(true);
    } else {
      setModalVisible(false);
      switch (index) {
        case 0: navigation.navigate('MainSwipe', { screen: 'HomePage', params: { userId } }); break;
        case 1: navigation.navigate('MainSwipe', { screen: 'Social', params: { userId } }); break;
        case 3: navigation.navigate('MainSwipe', { screen: 'JobsPage', params: { userId } }); break;
        case 4: navigation.navigate('MainSwipe', { screen: 'NotificationsPage', params: { userId } }); break;
      }
    }
  };

  return (
    <View style={styles.container}>
      {}
      <View style={styles.shadowContainer}>
        <BlurView
          intensity={Platform.OS === 'android' ? 50 : 30}
          tint={themeMode === 'light' ? 'light' : 'dark'}
          style={styles.bottomNav}
        >
          {navIcons.map((item, index) => (
            <Pressable
              key={index}
              onPress={() => handleNavigation(index)}
              style={styles.navButton}
            >
              <View style={styles.iconWrapper}>
                <Image
                  source={selectedIndex === index ? item.active : item.normal}
                  style={[
                    styles.navIcon,
                    selectedIndex === index && styles.activeIconStyle,
                    { tintColor: selectedIndex === index ? colors.primary : colors.textSub }
                  ]}
                />
                {/* Red badge on notifications icon */}
                {index === 4 && unreadCount > 0 && (
                  <View style={styles.badge}>
                    {unreadCount < 100 && (
                      <Text style={styles.badgeText}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </Text>
                    )}
                  </View>
                )}
                {/* Red badge on messages icon */}
                {index === 1 && unreadMessages > 0 && (
                  <View style={styles.badge}>
                    {unreadMessages < 100 && (
                      <Text style={styles.badgeText}>
                        {unreadMessages > 9 ? '9+' : unreadMessages}
                      </Text>
                    )}
                  </View>
                )}
              </View>
            </Pressable>
          ))}
        </BlurView>
      </View>

      <SelectionModal
        isVisible={isModalVisible}
        onClose={() => setModalVisible(false)}
        onSelectOption={(option) => {
          setModalVisible(false);
          if (option === 'Gönderi') navigation.navigate('PhotoSharePage', { userId });
          else if (option === 'Proje') navigation.navigate('ProjectPage', { userId });
          else if (option === 'İş İlanı') navigation.navigate('JobsPostingPage', { userId });
          else if (option === 'Blog') navigation.navigate('BlogPage', { userId });
        }}
        userId={userId}
        currentRouteName={route.name}
      />
    </View>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'android' ? 20 : 35, 
    width: '100%',
    backgroundColor: 'transparent',
    paddingHorizontal: 15,
    zIndex: 1000,
  },
  shadowContainer: {
    borderRadius: 38.5,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: colors.mode === 'light' ? 0.12 : 0.4,
    shadowRadius: 10,
    backgroundColor: Platform.OS === 'android' ? 
      (colors.mode === 'light' ? '#FFFFFF' : '#1A1D24') : 
      'transparent',
    borderWidth: colors.mode === 'light' ? 1 : 0,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 70, 
    borderRadius: 38.5,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.mode === 'light' ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.05)',
  },
  navButton: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
    opacity: 0.7,
  },
  activeIconStyle: {
    opacity: 1,
    transform: [{ scale: 1.15 }],
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: colors.background,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 5,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 12,
    fontVariant: ['tabular-nums'],
  },
});

export default BottomNavBar;