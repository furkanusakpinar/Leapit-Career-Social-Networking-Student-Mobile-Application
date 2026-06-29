import { useNavigation, useRoute } from '@react-navigation/native';
import { doc, getDoc } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { db } from '../../firebaseConfig';
import { lightTheme, darkTheme } from '../theme/colors';
import { getCompanyLogoUri } from '../utils/getCompanyLogoUri';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const BACKEND_URL = 'http://141.11.109.234:3000';

const JobsDetail = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { jobsId } = route.params || {};
  const { userId } = useSelector(state => state.user);

  const themeMode = useSelector(state => state.theme?.mode || 'dark');
  const colors = themeMode === 'light' ? lightTheme : darkTheme;
  const styles = getStyles(colors);

  const [tabData, setTabData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [countryCodeModalVisible, setCountryCodeModalVisible] = useState(false);
  const [jobPosterUserData, setJobPosterUserData] = useState(null);

  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState('+90');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [advertiser, setAdvertiser] = useState('');
  const [company, setCompany] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [location, setLocation] = useState('');
  const [createdAtData, setCreatedAtData] = useState(null);
  const [jobPolicy, setJobPolicy] = useState('');
  const [companyLogoUri, setCompanyLogoUri] = useState(null);
  const [countrySearchTerm, setCountrySearchTerm] = useState('');

  
  const timeAgo = useCallback((timestamp) => {
    if (!timestamp) return 'Zaman bilgisi yok';
    let date;
    if (typeof timestamp.toDate === 'function') { date = timestamp.toDate(); }
    else if (timestamp instanceof Date || typeof timestamp === 'number') { date = new Date(timestamp); }
    else if (typeof timestamp === 'object' && timestamp?.seconds) {
      date = new Date(timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1000000);
    } else return 'Geçersiz zaman';

    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    if (seconds < 60) return 'şimdi';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} dk önce`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} saat önce`;
    return `${Math.floor(seconds / 86400)} gün önce`;
  }, []);

  
  const fetchJobsPosts = useCallback(async () => {
    if (!jobsId) {
      setError('Geçersiz iş kimliği.');
      setLoading(false);
      return;
    }
    if (!refreshing) setLoading(true);

    try {
      const jobDocRef = doc(db, 'JobsPosts', jobsId);
      const docSnap = await getDoc(jobDocRef);

      if (docSnap.exists()) {
        const postData = docSnap.data();
        let uData = { fullName: 'İsimsiz', bio: '', profileImageUrl: '' };

        if (postData.userId) {
          const userSnap = await getDoc(doc(db, 'Users', postData.userId));
          if (userSnap.exists()) {
            uData = userSnap.data();
            setJobPosterUserData({ id: postData.userId, ...uData });
          }
        }

        const logoUri = await getCompanyLogoUri(postData.company || '');
        setCompanyLogoUri(logoUri);

        setAdvertiser(postData.advertiser || '');
        setCompany(postData.company || '');
        setJobTitle(postData.jobTitle || '');
        setLocation(postData.jobLocation || '');
        setCreatedAtData(postData.createdAt || null);
        setJobPolicy(postData.jobPolicy || '');

        setTabData([{ id: docSnap.id, ...uData, ...postData }]);
      } else {
        setError('İlan bulunamadı.');
      }
    } catch (e) {
      setError('Yükleme hatası.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [jobsId, refreshing]);

  useEffect(() => { fetchJobsPosts(); }, [fetchJobsPosts]);

  const handleMessageUser = () => {
    if (!jobPosterUserData) return;
    if (jobPosterUserData.id === userId) {
      Alert.alert('Bilgi', 'Kendi ilanınıza mesaj gönderemezsiniz.');
      return;
    }
    navigation.navigate('SendMessage', {
      recipientId: jobPosterUserData.id,
      recipientName: jobPosterUserData.fullName,
      recipientJob: jobPosterUserData.job || jobPosterUserData.profession,
      recipientProfileImageUrl: jobPosterUserData.profileImageUrl,
    });
  };

  
  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchJobsPosts} tintColor={colors.primary} />}
          contentContainerStyle={styles.scrollContent}
        >
          {}
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Image source={require('../../assets/images/back.png')} style={[styles.iconSmall, { tintColor: colors.iconTint }]} />
          </Pressable>

          {tabData.map(item => (
            <View key={item.id} style={styles.mainContent}>
              {}
              <View style={styles.headerRow}>
                <Image
                  source={companyLogoUri ? { uri: companyLogoUri } : require('../../assets/images/DefaultCompanyLogo.png')}
                  style={styles.companyLogo}
                />
                <View style={styles.headerText}>
                  <Text style={styles.companyName}>{item.company}</Text>
                  <Text style={styles.descText}>{item.jobTitle}</Text>
                </View>
              </View>

              <Text style={styles.subInfoText}>
                {item.jobLocation} • {timeAgo(item.createdAt)} • {item.applications?.length || 0} başvuru
              </Text>

              {}
              <View style={styles.detailItem}>
                <MaterialCommunityIcons name="briefcase-outline" size={20} color={colors.iconTint} style={{ marginRight: 10 }} />
                <Text style={styles.detailText}>{item.wage ? `${item.wage} • ` : ''}{item.jobPolicy} • {item.jobType}</Text>
              </View>

              <View style={styles.detailItem}>
                <MaterialCommunityIcons name="clipboard-text-outline" size={20} color={colors.iconTint} style={{ marginRight: 10 }} />
                <Text style={styles.detailText} numberOfLines={2}>Yetenekler: {item.jobSummary}</Text>
              </View>

              {/* Button Group */}
              <View style={styles.buttonGroup}>
                <Pressable style={[styles.btn, styles.btnPrimary]} onPress={() => setModalVisible(true)}>
                  <Text style={styles.btnTextWhite}>Başvur</Text>
                </Pressable>
                <Pressable style={[styles.btn, styles.btnSecondary]}>
                  <Text style={styles.btnTextBlue}>Kaydet</Text>
                </Pressable>
              </View>

              {/* Hiring Team */}
              <Text style={styles.sectionTitle}>İşe alım takımı</Text>
              <View style={styles.teamCard}>
                <Image
                  source={item.profileImageUrl ? { uri: item.profileImageUrl } : require('../../assets/images/ProfileSquare.png')}
                  style={styles.teamAvatar}
                />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.teamName}>{item.fullName}</Text>
                  <Text style={styles.teamBio} numberOfLines={1}>{item.bio || 'Biyografi yok'}</Text>
                </View>
                <Pressable style={styles.miniMsgBtn} onPress={handleMessageUser}>
                  <Text style={styles.btnTextBlue}>Mesaj</Text>
                </Pressable>
              </View>

              {}
              <View style={styles.descBox}>
                <Text style={styles.descTitle}>İş ilanı hakkında</Text>
                <View style={styles.divider} />
                <Text style={styles.descText}>{item.jobDescription}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  scrollContent: { paddingBottom: 30 },
  backBtn: { padding: 15 },
  iconSmall: { width: 24, height: 24, resizeMode: 'contain' },

  mainContent: { paddingHorizontal: '5%' },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  companyLogo: { width: 60, height: 60, borderRadius: 10, backgroundColor: colors.cardBackground },
  headerText: { marginLeft: 15, flex: 1 },
  companyName: { color: colors.textMain, fontSize: 18, fontWeight: 'bold' },
  jobTitleText: { color: colors.textSub, fontSize: 15, marginTop: 2 },

  subInfoText: { color: colors.textSub, fontSize: 13, marginBottom: 15 },
  detailItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  iconTiny: { width: 20, height: 20, tintColor: colors.iconTint, marginRight: 10 },
  detailText: { color: colors.textMain, fontSize: 14, flex: 1 },

  buttonGroup: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 20 },
  btn: { flex: 0.48, height: 45, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  btnPrimary: { backgroundColor: colors.primary },
  btnSecondary: { backgroundColor: colors.cardBackground, borderWidth: 1, borderColor: colors.primary },
  btnTextWhite: { color: '#fff', fontWeight: 'bold' },
  btnTextBlue: { color: colors.primary, fontWeight: 'bold' },

  sectionTitle: { color: colors.textMain, fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  teamCard: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    padding: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center'
  },
  teamAvatar: { width: 50, height: 50, borderRadius: 25 },
  teamName: { color: colors.textMain, fontWeight: 'bold', fontSize: 14 },
  teamBio: { color: colors.textSub, fontSize: 12 },
  miniMsgBtn: { paddingHorizontal: 15, paddingVertical: 5, borderRadius: 20, backgroundColor: colors.border },

  descBox: { marginTop: 25, backgroundColor: colors.cardBackground, padding: 20, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
  descTitle: { color: colors.textMain, fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 15 },
  descText: { color: colors.textMain, fontSize: 14, lineHeight: 22, opacity: 0.9 }
});

export default JobsDetail;