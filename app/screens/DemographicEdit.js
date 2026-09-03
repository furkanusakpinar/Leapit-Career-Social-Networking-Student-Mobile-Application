import { useNavigation } from '@react-navigation/native';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { db } from '../../firebaseConfig';
import { darkTheme, lightTheme } from '../theme/colors';

const SUGGESTED_SKILLS = [
  'Yazılım', 'Tasarım', 'Pazarlama', 'Satış', 'Proje Yönetimi',
  'Veri Analizi', 'UI/UX', 'Mobil Geliştirme', 'İnsan Kaynakları', 'Finans'
];

const SUGGESTED_LANGUAGES = [
  'Türkçe', 'İngilizce', 'Almanca', 'Fransızca', 'İspanyolca',
  'Rusça', 'Arapça', 'Çince'
];

const SUGGESTED_CITIES = [
  'İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya',
  'Adana', 'Gaziantep', 'Konya', 'Eskişehir', 'Trabzon'
];

const SUGGESTED_INTERESTS = [
  'Teknoloji', 'Startup', 'Eğitim', 'Spor', 'Sanat',
  'Girişimcilik', 'Yapay Zeka', 'Kariyer', 'Sürdürülebilirlik', 'Sağlık'
];

const truncateItem = (str, max = 10) => {
  if (!str) return '';
  return str.length <= max ? str : str.substring(0, max) + '...';
};

const ChipInput = ({ label, chipColor, items, setItems, allItems, colors, styles, zIndex = 40, maxItems = 6 }) => {
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [focused, setFocused] = useState(false);

  const removeItem = (item) => setItems(items.filter(i => i !== item));

  const addItem = (value) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (!items.includes(trimmed)) {
      if (items.length >= maxItems) return;
      setItems([...items, trimmed]);
    }
    setInput('');
    setSuggestions([]);
  };

  const onChange = (text) => {
    setInput(text);
    if (text.length > 0) {
      const filtered = allItems.filter(
        s => s.toLowerCase().includes(text.toLowerCase()) && !items.includes(s)
      ).slice(0, 5);
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  };

  return (
    <View style={styles.section}>
      <Text style={styles.labelText}>{label}</Text>
      <View style={[styles.fieldWrapper, { zIndex }]}>
        <View style={styles.chipBox}>
          {items.map((item) => (
            <TouchableOpacity
              key={item}
              style={[styles.chip, { backgroundColor: chipColor, borderColor: chipColor }]}
              onPress={() => removeItem(item)}
              activeOpacity={0.7}
            >
              <Text style={styles.chipText} numberOfLines={1} ellipsizeMode="tail">{truncateItem(item)}</Text>
              <Text style={styles.chipRemove}>×</Text>
            </TouchableOpacity>
          ))}
          <TextInput
            style={styles.chipInput}
            placeholder={items.length === 0 ? 'Ekle...' : ''}
            placeholderTextColor={colors.textSub}
            value={input}
            onChangeText={onChange}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onSubmitEditing={() => addItem(input)}
            blurOnSubmit={false}
            editable={items.length < maxItems}
            maxLength={60}
          />
        </View>
        {focused && suggestions.length > 0 && (
          <View style={styles.suggestionBox}>
            {suggestions.map((s, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.suggestionItem, index === suggestions.length - 1 && { borderBottomWidth: 0 }]}
                onPress={() => addItem(s)}
                activeOpacity={0.7}
              >
                <Text style={styles.suggestionText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
      <Text style={styles.chipHint}>
        {items.length > 0
          ? `${items.length}/${maxItems} eklendi · dokunarak kaldırabilirsin`
          : `Yazıp ekleyebilir veya önerilerden seçebilirsin (en fazla ${maxItems})`}
      </Text>
    </View>
  );
};

export default function DemographicEdit() {
  const userId = useSelector(state => state.user.userId);
  const themeMode = useSelector(state => state.theme?.mode || 'dark');
  const colors = themeMode === 'light' ? lightTheme : darkTheme;
  const styles = getStyles(colors);

  const navigation = useNavigation();

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [interests, setInterests] = useState([]);

  const [showSkills, setShowSkills] = useState(true);
  const [showLanguages, setShowLanguages] = useState(true);
  const [showInterests, setShowInterests] = useState(true);

  const [citySuggestions, setCitySuggestions] = useState([]);

  useEffect(() => {
    const fetchUser = async () => {
      if (!userId) return;
      setIsLoading(true);
      try {
        const snap = await getDoc(doc(db, 'Users', userId));
        if (snap.exists()) {
          const d = snap.data();
          setCity(d.city || '');
          setCountry(d.country || '');
          setBio(d.bio || '');
          setSkills(d.skills || []);
          setLanguages(d.languages || []);
          setInterests(d.interests || []);
          setShowSkills(d.showSkills !== false);
          setShowLanguages(d.showLanguages !== false);
          setShowInterests(d.showInterests !== false);
        }
      } catch (e) {
        console.error('Demografik bilgi çekme hatası:', e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUser();
  }, [userId]);

  const handleSave = async () => {
    if (!userId) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'Users', userId), {
        city: city.trim(),
        country: country.trim(),
        bio: bio.trim(),
        skills,
        languages,
        interests,
        showSkills,
        showLanguages,
        showInterests,
      });
      navigation.goBack();
    } catch (e) {
      console.error('Demografik bilgi kaydetme hatası:', e);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.innerContent}>
            <View style={styles.header}>
              <Pressable onPress={() => navigation.goBack()}>
                <Image source={require('../../assets/images/back.png')} style={[styles.backIcon, { tintColor: colors.iconTint }]} />
              </Pressable>
              <Text style={styles.title}>Kişisel Bilgiler</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.sectionHint}>
                Bu bilgiler profilinizde ve size özel önerilerde kullanılır.
              </Text>

              <View style={styles.section}>
                <Text style={styles.labelText}>Konum</Text>
                <View style={styles.rowFields}>
                  <View style={[styles.inputContainer, styles.flex, { zIndex: 60 }]}>
                    <TextInput
                      placeholder="Şehir"
                      placeholderTextColor={colors.textSub}
                      value={city}
                      onChangeText={(text) => {
                        setCity(text);
                        if (text.length > 0) {
                          setCitySuggestions(
                            SUGGESTED_CITIES.filter(c => c.toLowerCase().includes(text.toLowerCase())).slice(0, 6)
                          );
                        } else {
                          setCitySuggestions([]);
                        }
                      }}
                      style={styles.input}
                      maxLength={40}
                    />
                    {citySuggestions.length > 0 && (
                      <View style={styles.suggestionBox}>
                        {citySuggestions.map((c, index) => (
                          <TouchableOpacity key={index} style={styles.suggestionItem} onPress={() => { setCity(c); setCitySuggestions([]); }}>
                            <Text style={styles.suggestionText}>{c}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                  <View style={[styles.inputContainer, styles.flex]}>
                    <TextInput
                      placeholder="Ülke"
                      placeholderTextColor={colors.textSub}
                      value={country}
                      onChangeText={setCountry}
                      style={styles.input}
                      maxLength={40}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.labelText}>Hakkında</Text>
                <TextInput
                  style={styles.bioInput}
                  placeholder="Kendinden kısaca bahset..."
                  placeholderTextColor={colors.textSub}
                  value={bio}
                  onChangeText={setBio}
                  multiline
                  maxLength={500}
                />
                <Text style={styles.characterCount}>{bio.length}/500</Text>
              </View>

              <View style={styles.section}>
                <TouchableOpacity style={[styles.showBox, showSkills && styles.showBoxActive]} onPress={() => setShowSkills(!showSkills)} activeOpacity={0.8}>
                  <View style={[styles.checkbox, showSkills && styles.checkboxActive]}>
                    {showSkills && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={styles.showText}>Becerileri profilde göster</Text>
                </TouchableOpacity>

                <ChipInput
                  label="Beceriler"
                  chipColor={colors.primary + '22'}
                  items={skills}
                  setItems={setSkills}
                  allItems={SUGGESTED_SKILLS}
                  colors={colors}
                  styles={styles}
                  zIndex={70}
                />
              </View>

              <View style={styles.section}>
                <TouchableOpacity style={[styles.showBox, showLanguages && styles.showBoxActive]} onPress={() => setShowLanguages(!showLanguages)} activeOpacity={0.8}>
                  <View style={[styles.checkbox, showLanguages && styles.checkboxActive]}>
                    {showLanguages && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={styles.showText}>Dilleri profilde göster</Text>
                </TouchableOpacity>

                <ChipInput
                  label="Diller"
                  chipColor={colors.primary + '33'}
                  items={languages}
                  setItems={setLanguages}
                  allItems={SUGGESTED_LANGUAGES}
                  colors={colors}
                  styles={styles}
                  zIndex={60}
                />
              </View>

              <View style={styles.section}>
                <TouchableOpacity style={[styles.showBox, showInterests && styles.showBoxActive]} onPress={() => setShowInterests(!showInterests)} activeOpacity={0.8}>
                  <View style={[styles.checkbox, showInterests && styles.checkboxActive]}>
                    {showInterests && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={styles.showText}>İlgi alanlarını profilde göster</Text>
                </TouchableOpacity>

                <ChipInput
                  label="İlgi Alanları"
                  chipColor={colors.primary + '44'}
                  items={interests}
                  setItems={setInterests}
                  allItems={SUGGESTED_INTERESTS}
                  colors={colors}
                  styles={styles}
                  zIndex={50}
                />
              </View>
            </ScrollView>

            <Pressable
              onPress={handleSave}
              style={({ pressed }) => [styles.publishBtn, { backgroundColor: pressed ? colors.primary + 'CC' : colors.primary }]}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.publishText}>KAYDET</Text>
              )}
            </Pressable>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  innerContent: {
    flex: 1,
    padding: 20,
  },
  flex: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
  },
  backBtn: {
    width: 32,
    justifyContent: 'center',
  },
  backIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  title: {
    color: colors.textMain,
    fontSize: 18,
    flex: 1,
    textAlign: 'center',
    marginRight: 32,
    fontWeight: 'bold',
  },
  sectionHint: {
    color: colors.textSub,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 22,
  },
  labelText: {
    color: colors.textSub,
    fontSize: 13,
    marginBottom: 6,
    fontWeight: '500',
  },
  rowFields: {
    flexDirection: 'row',
    gap: 10,
  },
  inputContainer: {
    backgroundColor: colors.mode === 'dark' ? '#13151C' : colors.border,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 50,
    marginBottom: 16,
    justifyContent: 'center',
  },
  input: {
    color: colors.textMain,
    fontSize: 16,
  },
  bioInput: {
    backgroundColor: colors.mode === 'dark' ? '#13151C' : colors.border,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    color: colors.textMain,
    fontSize: 15,
    minHeight: 90,
    textAlignVertical: 'top',
  },
  characterCount: {
    color: colors.textSub,
    fontSize: 11,
    textAlign: 'right',
    marginTop: 4,
  },
  fieldWrapper: {
    position: 'relative',
    width: '100%',
  },
  chipBox: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.mode === 'dark' ? '#13151C' : colors.border,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 50,
  },
  chipBoxFocused: {
    borderColor: colors.primary,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '31%',
    marginBottom: 8,
    paddingHorizontal: 4,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
  },
  chipText: {
    color: colors.textMain,
    fontSize: 13,
    textAlign: 'center',
  },
  chipRemove: {
    color: colors.textSub,
    fontSize: 13,
    marginLeft: 5,
    fontWeight: 'bold',
    opacity: 0.8,
  },
  chipInput: {
    minWidth: 90,
    flexGrow: 1,
    flexShrink: 1,
    color: colors.textMain,
    fontSize: 15,
    paddingVertical: 6,
    minHeight: 30,
  },
  chipHint: {
    color: colors.textSub,
    fontSize: 11,
    marginTop: 6,
  },
  showRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    backgroundColor: colors.mode === 'dark' ? '#13151C' : colors.border,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  showBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    backgroundColor: colors.mode === 'dark' ? '#13151C' : colors.border,
  },
  showBoxActive: {
    borderColor: colors.primary,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.textSub,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  checkboxActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  checkmark: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  showText: {
    color: colors.textMain,
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  suggestionBox: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    zIndex: 1000,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  suggestionItem: {
    padding: 13,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  suggestionText: {
    color: colors.textMain,
    fontSize: 14,
  },
  publishBtn: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  publishText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
