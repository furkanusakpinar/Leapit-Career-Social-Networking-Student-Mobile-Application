import { useNavigation, useRoute } from '@react-navigation/native';
import { useState } from 'react';
import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { lightTheme, darkTheme } from '../theme/colors';

const JobsPost2 = () => {
  const userId = useSelector(state => state.user.userId);
  const themeMode = useSelector(state => state.theme?.mode || 'dark');
  const colors = themeMode === 'light' ? lightTheme : darkTheme;
  const styles = getStyles(colors);

  const navigation = useNavigation();
  const route = useRoute();

  const {
    jobTitle = '',
    jobPolicy = '',
    jobType = '',
    wage = '',
    jobDescription: initialJobDescription = '',
    company = '',
    location = '',
    advertiserName = '',
  } = route.params || {};

  const [jobDescription, setJobDescription] = useState(initialJobDescription);
  const [jobSummary, setJobSummary] = useState('');
  const [isItalic, setIsItalic] = useState(false);
  const [isLargeText, setIsLargeText] = useState(false);

  const handleNext = () => {
    if (!jobSummary.trim() || !jobDescription.trim() || !company.trim() || !location.trim()) {
      alert('Lütfen gerekli alanları doldurunuz!');
      return;
    }
    Keyboard.dismiss();
    navigation.navigate('JobsPost3', {
      ...route.params,
      jobSummary,
      jobDescription,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.innerContent}>
            <View style={styles.topSection}>
              <View style={styles.header}>
                <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
                  <Image source={require('../../assets/images/back.png')} style={[styles.backIcon, { tintColor: colors.iconTint }]} />
                </Pressable>
                <Text style={styles.title}>İş İlan 1/2</Text>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Hatırlatıcı</Text>
                <Text style={styles.cardSubText}>Ünvan: {jobTitle}</Text>
                <Text style={styles.cardSubText}>Politika: {jobPolicy}</Text>
                <Text style={styles.cardSubText}>Tür: {jobType}</Text>
                <Text style={styles.cardSubText}>Maaş: {wage || 'Belirtilmemiş'}</Text>
              </View>

              <Text style={styles.label}>Kısa Özet *</Text>
              <TextInput
                placeholder="İlanı kısaca özetle..."
                placeholderTextColor={colors.textSub}
                value={jobSummary}
                onChangeText={setJobSummary}
                style={styles.singleLineInput}
                maxLength={50}
              />
              <View style={{ alignItems: 'flex-end', marginTop: -10, marginBottom: 12 }}>
                <Text style={styles.charCount}>{jobSummary.length} / 50</Text>
              </View>

              <Text style={styles.sectionTitle}>İlan Açıklaması</Text>
              <TextInput
                placeholder="İş tanımı ve sorumlulukları buraya yazın..."
                placeholderTextColor={colors.textSub}
                value={jobDescription}
                onChangeText={setJobDescription}
                style={[
                  styles.input,
                  {
                    fontSize: isLargeText ? 18 : 15,
                    fontStyle: isItalic ? 'italic' : 'normal',
                  },
                ]}
                multiline
                maxLength={10000}
              />

              <View style={styles.toolbar}>
                <View style={styles.formatActions}>
                  <Pressable onPress={() => setIsLargeText(!isLargeText)} style={styles.toolBtn}>
                    <Image source={require('../../assets/images/A.png')} style={[styles.toolIcon, { tintColor: isLargeText ? colors.primary : colors.textSub }]} />
                  </Pressable>
                  <Pressable onPress={() => setIsItalic(!isItalic)} style={styles.toolBtn}>
                    <Image source={require('../../assets/images/Italic.png')} style={[styles.toolIcon, { tintColor: isItalic ? colors.primary : colors.textSub }]} />
                  </Pressable>
                </View>
                <Text style={styles.charCount}>{jobDescription.length} / 10.000</Text>
              </View>
            </View>

            <Pressable onPress={handleNext} style={styles.publishBtn}>
              <Text style={styles.publishText}>DEVAM ET</Text>
            </Pressable>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  innerContent: { flex: 1, padding: '5%', justifyContent: 'space-between' },
  topSection: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backIcon: { width: 24, height: 24, resizeMode: 'contain' },
  title: { color: colors.textMain, fontSize: 18, fontWeight: 'bold', flex: 1, textAlign: 'center', marginRight: 30 },
  card: { backgroundColor: colors.cardBackground, borderRadius: 20, padding: 15, marginBottom: 20, borderWidth: 1, borderColor: colors.border },
  cardTitle: { color: colors.textMain, fontSize: 17, marginBottom: 8, fontWeight: '600' },
  cardSubText: { color: colors.textSub, fontSize: 14, marginBottom: 4 },
  sectionTitle: { color: colors.textMain, fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  label: { color: colors.textSub, fontSize: 14, marginBottom: 8 },
  input: {
    color: colors.textMain,
    backgroundColor: colors.border,
    borderRadius: 15,
    padding: 15,
    height: '40%', 
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: colors.border,
  },
  singleLineInput: {
    color: colors.textMain,
    backgroundColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 50,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
    fontSize: 15,
  },
  toolbar: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, alignItems: 'center' },
  formatActions: { flexDirection: 'row' },
  toolBtn: { marginRight: 20, padding: 5 },
  toolIcon: { width: 20, height: 20 },
  charCount: { color: colors.textSub, fontSize: 12 },
  publishBtn: { backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 15, alignItems: 'center', marginBottom: Platform.OS === 'ios' ? 10 : 20 },
  publishText: { color: 'white', fontWeight: 'bold', fontSize: 16, letterSpacing: 1 },
});

export default JobsPost2;