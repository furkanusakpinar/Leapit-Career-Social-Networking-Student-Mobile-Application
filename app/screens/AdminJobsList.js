import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, ActivityIndicator, Image, Modal, TextInput } from 'react-native';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { lightTheme, darkTheme } from '../theme/colors';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const AdminJobsList = () => {
  const navigation = useNavigation();
  const themeMode = useSelector(state => state.theme?.mode || 'dark');
  const colors = themeMode === 'light' ? lightTheme : darkTheme;
  
  const [pendingJobs, setPendingJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  // History and Filtering State
  const [showHistory, setShowHistory] = useState(false);
  const [historyJobs, setHistoryJobs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState('all'); // 'all', 'week', 'month', 'year'
  const [historyLoading, setHistoryLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchPendingJobs();
      fetchHistoryJobs();
    }, [])
  );

  const fetchPendingJobs = async () => {
    try {
      const q = query(
        collection(db, 'JobsPosts'), 
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const jobs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPendingJobs(jobs);
    } catch (error) {
      console.error("Hata:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistoryJobs = async () => {
    try {
      setHistoryLoading(true);
      const q = query(
        collection(db, 'JobsPosts'), 
        where('status', 'in', ['active', 'rejected']),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const jobs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHistoryJobs(jobs);
    } catch (error) {
      console.error("Geçmiş çekme hatası:", error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const filteredHistoryJobs = useMemo(() => {
    return historyJobs.filter(job => {
      const matchesSearch = 
        (job.jobTitle?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (job.company?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (job.advertiserName?.toLowerCase() || '').includes(searchQuery.toLowerCase());
      
      if (!matchesSearch) return false;
      
      if (timeFilter === 'all') return true;
      
      if (!job.createdAt) return false;
      const jobDate = new Date(job.createdAt.seconds * 1000);
      const now = new Date();
      const diffTime = now - jobDate;
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      
      if (timeFilter === 'week') return diffDays <= 7;
      if (timeFilter === 'month') return diffDays <= 30;
      if (timeFilter === 'year') return diffDays <= 365;
      
      return true;
    });
  }, [historyJobs, searchQuery, timeFilter]);

  const renderItem = ({ item }) => (
    <Pressable 
      style={[styles.jobItem, { backgroundColor: colors.cardBackground, borderColor: colors.border }]} 
      onPress={() => navigation.navigate('JobApproval', { jobId: item.id })}
    >
      <View style={styles.jobInfo}>
        <Text style={[styles.jobTitle, { color: colors.textMain }]}>{item.jobTitle}</Text>
        <Text style={[styles.jobCompany, { color: colors.textSub }]}>{item.company} - {item.jobLocation}</Text>
        <Text style={styles.jobUser}>Yayınlayan: {item.advertiserName}</Text>
      </View>
      <Image source={require('../../assets/images/Arrow.png')} style={[styles.arrow, { tintColor: colors.iconTint }]} />
    </Pressable>
  );

  const renderHistoryItem = ({ item }) => {
    const isApproved = item.status === 'active';
    let dateStr = '';
    if (item.createdAt) {
      const date = new Date(item.createdAt.seconds * 1000);
      dateStr = date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    return (
      <Pressable 
        style={[styles.historyItem, { backgroundColor: colors.background, borderColor: colors.border }]} 
        onPress={() => {
          setShowHistory(false);
          navigation.navigate('JobApproval', { jobId: item.id });
        }}
      >
        <View style={styles.historyInfo}>
          <Text style={[styles.historyTitle, { color: colors.textMain }]} numberOfLines={1}>{item.jobTitle}</Text>
          <Text style={[styles.historyCompany, { color: colors.textSub }]} numberOfLines={1}>{item.company} - {item.jobLocation}</Text>
          <Text style={styles.historyUser}>Yayınlayan: {item.advertiserName}</Text>
          {dateStr ? <Text style={styles.historyDate}>{dateStr}</Text> : null}
        </View>
        <View style={styles.historyRight}>
          <View style={[
            styles.statusBadgeSmall,
            { backgroundColor: isApproved ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)' }
          ]}>
            <Text style={[
              styles.statusBadgeTextSmall,
              { color: isApproved ? '#10B981' : '#EF4444' }
            ]}>
              {isApproved ? 'ONAYLANDI' : 'REDDEDİLDİ'}
            </Text>
          </View>
          <Image source={require('../../assets/images/Arrow.png')} style={[styles.arrow, { tintColor: colors.iconTint, marginTop: 8 }]} />
        </View>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Image source={require('../../assets/images/back.png')} style={[styles.backIcon, { tintColor: colors.iconTint }]} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textMain }]}>Onay Bekleyenler</Text>
        <Pressable onPress={() => setShowHistory(true)} style={styles.headerBtn}>
          <MaterialCommunityIcons name="history" size={24} color={colors.primary} />
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={pendingJobs}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          ListEmptyComponent={<Text style={[styles.emptyText, { color: colors.textSub }]}>Bekleyen ilan bulunamadı.</Text>}
          contentContainerStyle={{ padding: 16 }}
        />
      )}

      {/* History BottomSheet Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showHistory}
        onRequestClose={() => setShowHistory(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowHistory(false)} />
          <View style={[styles.bottomSheetContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <View style={[styles.dragHandle, { backgroundColor: colors.border }]} />
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.textMain }]}>İlan Geçmişi</Text>
              <Pressable onPress={() => setShowHistory(false)} style={styles.closeBtn}>
                <MaterialCommunityIcons name="close" size={24} color={colors.textSub} />
              </Pressable>
            </View>

            <View style={[styles.searchWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <MaterialCommunityIcons name="magnify" size={20} color={colors.textSub} style={styles.searchIcon} />
              <TextInput
                style={[styles.searchInput, { color: colors.textMain }]}
                placeholder="İlan, şirket veya yayınlayan..."
                placeholderTextColor={colors.textSub}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery('')}>
                  <MaterialCommunityIcons name="close-circle" size={18} color={colors.textSub} />
                </Pressable>
              )}
            </View>

            <View style={styles.filtersRow}>
              {[
                { label: 'Hepsi', value: 'all' },
                { label: '1 Hafta', value: 'week' },
                { label: '1 Ay', value: 'month' },
                { label: '1 Yıl', value: 'year' },
              ].map(f => (
                <Pressable
                  key={f.value}
                  onPress={() => setTimeFilter(f.value)}
                  style={[
                    styles.filterChip,
                    { backgroundColor: colors.background, borderColor: colors.border },
                    timeFilter === f.value && { backgroundColor: colors.primary, borderColor: colors.primary }
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: colors.textSub },
                      timeFilter === f.value && { color: 'white', fontWeight: 'bold' }
                    ]}
                  >
                    {f.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {historyLoading && historyJobs.length === 0 ? (
              <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 40 }} />
            ) : (
              <FlatList
                data={filteredHistoryJobs}
                keyExtractor={item => item.id}
                renderItem={renderHistoryItem}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <MaterialCommunityIcons name="text-box-search-outline" size={48} color={colors.textSub} style={{ opacity: 0.5 }} />
                    <Text style={[styles.emptyText, { color: colors.textSub }]}>Aramaya uygun ilan bulunamadı.</Text>
                  </View>
                }
                contentContainerStyle={{ paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingTop: 50, paddingBottom: 10 },
  backIcon: { width: 24, height: 24 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  headerBtn: { padding: 8, justifyContent: 'center', alignItems: 'center' },
  jobItem: { padding: 16, borderRadius: 15, marginBottom: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1 },
  jobInfo: { flex: 1 },
  jobTitle: { fontSize: 16, fontWeight: 'bold' },
  jobCompany: { fontSize: 14, marginTop: 4 },
  jobUser: { fontSize: 12, color: '#1D9BF0', marginTop: 4 },
  arrow: { width: 16, height: 16, opacity: 0.3 },
  emptyText: { textAlign: 'center', marginTop: 50 },

  // BottomSheet & History Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  bottomSheetContainer: {
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    maxHeight: '85%',
    minHeight: '55%',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
  dragHandle: {
    width: 40,
    height: 5,
    borderRadius: 2.5,
    alignSelf: 'center',
    marginBottom: 15,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeBtn: {
    padding: 4,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  filtersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  filterChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  historyItem: {
    padding: 16,
    borderRadius: 15,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  historyInfo: {
    flex: 1,
    marginRight: 8,
  },
  historyTitle: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  historyCompany: {
    fontSize: 13,
    marginTop: 2,
  },
  historyUser: {
    fontSize: 11,
    color: '#1D9BF0',
    marginTop: 2,
  },
  historyDate: {
    fontSize: 10,
    color: '#888',
    marginTop: 4,
  },
  historyRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  statusBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeTextSmall: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
});

export default AdminJobsList;
