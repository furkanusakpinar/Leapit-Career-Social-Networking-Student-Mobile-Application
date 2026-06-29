import { useNavigation } from '@react-navigation/native';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  Dimensions,
  Image,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { db } from '../../firebaseConfig';
import { lightTheme, darkTheme } from '../theme/colors';
import { companyNames, getCompanyLogoUri } from '../utils/getCompanyLogoUri';
import { getSchoolLogoUri, schoolNames } from '../utils/getSchoolLogoUri';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const predefinedCompanies = companyNames.map((name, index) => ({
  id: `comp-${name.replace(/\s+/g, '-').toLowerCase()}-${index}`,
  companyName: name,
}));

const predefinedSchools = schoolNames.map((name, index) => ({
  id: `school-${name.replace(/\s+/g, '-').toLowerCase()}-${index}`,
  schoolName: name,
}));

const normalizeText = (text) => {
  return text
    .toLowerCase()
    .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u');
};

const AppHeader = () => {
  const navigation = useNavigation();
  const userId = useSelector(state => state.user.userId);
  const insets = useSafeAreaInsets();
  const themeMode = useSelector(state => state.theme?.mode || 'dark');
  const colors = themeMode === 'light' ? lightTheme : darkTheme;
  const styles = getStyles(colors);

  const [userData, setUserData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  useEffect(() => {
    if (!userId) return;
    const fetchUserData = async () => {
      try {
        const userRef = doc(db, 'Users', userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) setUserData(userSnap.data());
      } catch (error) {
        console.error('Kullanıcı verisi hatası:', error);
      }
    };
    fetchUserData();
  }, [userId]);

  const handleSearch = async (text) => {
    setSearchQuery(text);
    if (text.trim() === '') {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }
    setShowSearchResults(true);
    const normalizedText = normalizeText(text.trim());
    const results = [];

    try {
      
      const usersRef = collection(db, 'Users');
      const querySnapshotUsers = await getDocs(usersRef);
      querySnapshotUsers.forEach((docSnap) => {
        const uData = docSnap.data();
        if (uData.fullName && normalizeText(uData.fullName).includes(normalizedText)) {
          results.push({
            type: 'user',
            id: docSnap.id,
            name: uData.fullName,
            image: (typeof uData.profileImageUrl === 'string') ? uData.profileImageUrl : null,
          });
        }
      });

      // Jobs
      const jobsRef = collection(db, 'JobsPosts');
      const querySnapshotJobs = await getDocs(jobsRef);
      querySnapshotJobs.forEach((docSnap) => {
        const jData = docSnap.data();
        if (jData.jobTitle && normalizeText(jData.jobTitle).includes(normalizedText)) {
          results.push({
            type: 'job',
            id: docSnap.id,
            title: jData.jobTitle,
            company: jData.company || 'Bilinmeyen Şirket',
          });
        }
      });

      predefinedCompanies.filter(c => normalizeText(c.companyName).includes(normalizedText)).forEach(c => {
        results.push({ type: 'company', id: c.id, name: c.companyName, image: getCompanyLogoUri(c.companyName) });
      });
      predefinedSchools.filter(s => normalizeText(s.schoolName).includes(normalizedText)).forEach(s => {
        results.push({ type: 'school', id: s.id, name: s.schoolName, image: getSchoolLogoUri(s.schoolName) });
      });

      setSearchResults(results);
    } catch (error) {
      console.error("Arama hatası:", error);
    }
  };

  const handleSearchResultPress = (result) => {
    setSearchQuery('');
    setShowSearchResults(false);
    Keyboard.dismiss();
    const routes = { user: 'OtherProfilePage', job: 'JobsDetail', company: 'CompanyProfilePage', school: 'SchoolProfilePage' };
    const params = { user: { userId: result.id }, job: { jobId: result.id }, company: { companyId: result.id, companyName: result.name }, school: { schoolId: result.id, schoolName: result.name } };
    navigation.navigate(routes[result.type], params[result.type]);
  };

  const getSafeImageSource = (imageUrl) => {
    if (imageUrl && typeof imageUrl === 'string' && imageUrl.startsWith('http')) {
      return { uri: imageUrl };
    }
    return require('../../assets/images/ProfileSquare.png');
  };

  return (
    <View style={[styles.headerWrapper, { paddingTop: insets.top }]}>
      <StatusBar 
        barStyle={themeMode === 'light' ? 'dark-content' : 'light-content'} 
        backgroundColor="transparent"
        translucent={true} 
      />

      <View style={styles.header}>
        {}
        <Pressable onPress={() => navigation.navigate('ProfilePage', { userId: userId })}>
          <Image
            source={getSafeImageSource(userData?.profileImageUrl)}
            style={styles.profileImage}
          />
        </Pressable>

        {}
        <View style={styles.seacrhBar}>
          <Image source={require('../../assets/images/searchIcon.png')} style={[styles.SearchLogo, { tintColor: colors.textSub }]} />
          <TextInput
            placeholder="Leapit'de ara"
            placeholderTextColor={colors.textSub}
            style={styles.input}
            value={searchQuery}
            onChangeText={handleSearch}
            onFocus={() => setShowSearchResults(true)}
            onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <Image source={require('../../assets/images/Cancel.png')} style={[styles.CancelLogo, { tintColor: colors.textSub }]} />
            </Pressable>
          )}
        </View>

        {}
        <Pressable onPress={() => navigation.navigate('SettingPage')}>
          <Image source={require('../../assets/images/Menu.png')} style={styles.Noti} />
        </Pressable>
      </View>

      {/* Arama Sonuçları Listesi */}
      {showSearchResults && searchQuery.length > 0 && (
        <View style={[styles.searchResultsOverlay, { top: insets.top + 68 }]}>
          {searchResults.length > 0 ? (
            <ScrollView style={styles.searchResultsScrollView} keyboardShouldPersistTaps="handled">
              {searchResults.map((result, index) => (
                <Pressable key={index} style={styles.searchResultItem} onPress={() => handleSearchResultPress(result)}>
                  <Image
                    source={getSafeImageSource(result.image || result.logoUrl || result.profileImageUrl)}
                    style={styles.searchResultProfileImage}
                  />
                  <View style={styles.searchResultInfo}>
                    <Text style={styles.searchResultText} numberOfLines={1}>
                      {result.name || result.title}
                    </Text>
                    <Text style={styles.searchResultSubText}>
                      {result.type === 'job' ? result.company : 'Profili Gör'}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.noResultsText}>Sonuç bulunamadı.</Text>
          )}
        </View>
      )}
    </View>
  );
};

const getStyles = (colors) => StyleSheet.create({
  headerWrapper: {
    zIndex: 9999,
    elevation: colors.mode === 'light' ? 3 : 20,
    backgroundColor: colors.background,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: colors.mode === 'light' ? 0.05 : 0.3,
    shadowRadius: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 15,
    width: '100%',
  },
  profileImage: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border
  },
  seacrhBar: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 12,
    height: 40,
  },
  SearchLogo: {
    width: 16,
    height: 16,
    marginRight: 8,
  },
  CancelLogo: {
    width: 14,
    height: 14,
  },
  Noti: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
    tintColor: colors.iconTint
  },
  input: {
    flex: 1,
    color: colors.textMain,
    fontSize: 14,
    height: '100%',
    paddingVertical: 0
  },
  searchResultsOverlay: {
    position: 'absolute',
    top: 60,
    left: 15,
    right: 15,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    zIndex: 9999,
    maxHeight: 350,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 5
  },
  searchResultsScrollView: { paddingVertical: 5 },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  searchResultProfileImage: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    marginRight: 12,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border
  },
  searchResultInfo: { flex: 1 },
  searchResultText: { color: colors.textMain, fontSize: 14, fontWeight: '600' },
  searchResultSubText: { color: colors.textSub, fontSize: 12, marginTop: 2 },
  noResultsText: { color: colors.textSub, textAlign: 'center', padding: 20 }
});

export default AppHeader;