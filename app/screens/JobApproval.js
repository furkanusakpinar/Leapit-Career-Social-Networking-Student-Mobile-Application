import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  StatusBar,
} from 'react-native';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useSelector } from 'react-redux';
import { sendEmail } from '../utils/emailjs';
import { useRoute, useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { lightTheme, darkTheme } from '../theme/colors';

const JobApproval = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { jobId } = route.params || {};
  const userData = useSelector(state => state.user.userData);
  const themeMode = useSelector(state => state.theme?.mode || 'dark');
  const colors = themeMode === 'light' ? lightTheme : darkTheme;
  const styles = getStyles(colors);

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const isAdmin = userData?.email === 'leapitapp@gmail.com' || userData?.isAdmin === true;

  useEffect(() => {
    if (userData && !isAdmin) {
      Alert.alert("Yetkisiz Erişim", "Bu sayfayı sadece adminler görüntüleyebilir.");
      navigation.navigate('JobsPage');
      return;
    }

    if (jobId) {
      fetchJob();
    } else {
      setLoading(false);
    }
  }, [jobId, userData]);

  const fetchJob = async () => {
    try {
      const docRef = doc(db, 'JobsPosts', jobId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setJob(docSnap.data());
      } else {
        Alert.alert("Hata", "İlan bulunamadı.");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (approve) => {
    const actionText = approve ? 'onaylamak' : 'reddetmek';
    Alert.alert(
      approve ? 'İlanı Onayla' : 'İlanı Reddet',
      `Bu ilanı ${actionText} istediğinize emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: approve ? 'Onayla' : 'Reddet',
          style: approve ? 'default' : 'destructive',
          onPress: () => performAction(approve),
        },
      ]
    );
  };

  const performAction = async (approve) => {
    try {
      setActionLoading(true);
      const docRef = doc(db, 'JobsPosts', jobId);

      await updateDoc(docRef, {
        status: approve ? 'active' : 'rejected'
      });

      const userParams = {
        user_name: job.advertiserName,
        to_email: job.userEmail,
        job_title: job.jobTitle,
        status: approve ? '✅ ONAYLANDI' : '❌ REDDEDİLDİ',
        message: approve
          ? 'Tebrikler! İlanınız başarıyla onaylandı ve yayına alındı.'
          : 'Maalesef ilanınız topluluk kurallarımıza uymadığı için reddedilmiştir.'
      };

      try {
        await sendEmail(
          'service_4xxp89b',
          'template_w218ay1',
          userParams
        );
      } catch (e) {
        console.warn("Kullanıcıya mail gönderilemedi:", e);
      }

      Alert.alert(
        "İşlem Başarılı",
        `İlan ${approve ? 'onaylandı ve yayına alındı' : 'reddedildi'}. Kullanıcıya bilgilendirme maili gönderildi.`,
        [{ text: 'Tamam', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert("Hata", "İşlem sırasında bir sorun oluştu.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return (
    <View style={[styles.container, styles.center]}>
      <StatusBar barStyle={themeMode === 'light' ? 'dark-content' : 'light-content'} translucent backgroundColor="transparent" />
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.loadingText}>İlan yükleniyor...</Text>
    </View>
  );

  if (!jobId) return (
    <View style={[styles.container, styles.center]}>
      <MaterialCommunityIcons name="alert-circle-outline" size={48} color={colors.textSub} />
      <Text style={styles.emptyText}>Geçersiz İlan ID</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle={themeMode === 'light' ? 'dark-content' : 'light-content'} translucent backgroundColor="transparent" />

      {}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Image source={require('../../assets/images/back.png')} style={[styles.backIcon, { tintColor: colors.iconTint }]} />
        </Pressable>
        <Text style={styles.headerTitle}>İlan Onayı</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {}
        <View style={styles.statusBadge}>
          <MaterialCommunityIcons name="clock-outline" size={18} color="#F59E0B" />
          <Text style={styles.statusText}>Onay Bekliyor</Text>
        </View>

        {job ? (
          <>
            {}
            <View style={styles.card}>
              <Text style={styles.cardHeader}>İlan Bilgileri</Text>

              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="briefcase-outline" size={20} color={colors.primary} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Pozisyon</Text>
                  <Text style={styles.infoValue}>{job.jobTitle || '-'}</Text>
                </View>
              </View>

              <View style={styles.separator} />

              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="domain" size={20} color={colors.primary} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Şirket</Text>
                  <Text style={styles.infoValue}>{job.company || '-'}</Text>
                </View>
              </View>

              <View style={styles.separator} />

              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="map-marker-outline" size={20} color={colors.primary} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Konum</Text>
                  <Text style={styles.infoValue}>{job.jobLocation || '-'}</Text>
                </View>
              </View>

              <View style={styles.separator} />

              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="cash" size={20} color={colors.primary} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Maaş</Text>
                  <Text style={styles.infoValue}>{job.wage || '-'}</Text>
                </View>
              </View>

              <View style={styles.separator} />

              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="clock-outline" size={20} color={colors.primary} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Çalışma Tipi</Text>
                  <Text style={styles.infoValue}>{job.jobType || '-'}</Text>
                </View>
              </View>
            </View>

            {}
            <View style={styles.card}>
              <Text style={styles.cardHeader}>Yayınlayan</Text>

              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="account-outline" size={20} color={colors.primary} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Ad Soyad</Text>
                  <Text style={styles.infoValue}>{job.advertiserName || '-'}</Text>
                </View>
              </View>

              <View style={styles.separator} />

              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="email-outline" size={20} color={colors.primary} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>E-posta</Text>
                  <Text style={styles.infoValue}>{job.userEmail || '-'}</Text>
                </View>
              </View>

              <View style={styles.separator} />

              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="link-variant" size={20} color={colors.primary} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Başvuru ({job.applicationMethod === 'email' ? 'E-posta' : 'Web'})</Text>
                  <Text style={[styles.infoValue, { color: colors.primary }]} numberOfLines={1}>{job.advertiser || '-'}</Text>
                </View>
              </View>
            </View>

            {}
            <View style={styles.btnRow}>
              <Pressable
                style={({ pressed }) => [styles.btn, styles.approveBtn, { opacity: pressed ? 0.8 : 1 }]}
                onPress={() => handleAction(true)}
                disabled={actionLoading}
              >
                <MaterialCommunityIcons name="check-circle-outline" size={22} color="white" />
                <Text style={styles.btnText}>ONAYLA</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.btn, styles.rejectBtn, { opacity: pressed ? 0.8 : 1 }]}
                onPress={() => handleAction(false)}
                disabled={actionLoading}
              >
                <MaterialCommunityIcons name="close-circle-outline" size={22} color="white" />
                <Text style={styles.btnText}>REDDET</Text>
              </Pressable>
            </View>

            {actionLoading && (
              <View style={styles.actionLoadingWrap}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingText}>İşlem yapılıyor...</Text>
              </View>
            )}
          </>
        ) : (
          <View style={styles.center}>
            <MaterialCommunityIcons name="alert-circle-outline" size={48} color={colors.textSub} />
            <Text style={styles.emptyText}>İlan verileri yüklenemedi.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? 40 : 50,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 50,
    marginBottom: 10,
  },
  headerBtn: { padding: 8, justifyContent: 'center', alignItems: 'center' },
  backIcon: { width: 24, height: 24, resizeMode: 'contain' },
  headerTitle: { fontSize: 20, color: colors.textMain, fontWeight: 'bold' },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
    gap: 6,
  },
  statusText: { color: '#F59E0B', fontWeight: '600', fontSize: 14 },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  cardHeader: {
    color: colors.textSub,
    fontWeight: '600',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  infoContent: { flex: 1 },
  infoLabel: { color: colors.textSub, fontSize: 12, marginBottom: 2 },
  infoValue: { color: colors.textMain, fontSize: 15, fontWeight: '500' },
  separator: { height: 1, backgroundColor: colors.border, marginVertical: 2 },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: 12,
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 16,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  approveBtn: { backgroundColor: '#10B981' },
  rejectBtn: { backgroundColor: '#EF4444' },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
  loadingText: { color: colors.textSub, fontSize: 14, marginTop: 10 },
  emptyText: { color: colors.textSub, fontSize: 16, marginTop: 15 },
  actionLoadingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 10,
  },
});

export default JobApproval;
