import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  createVenue, createEvent, createAIUser, getAIUsers, getVenues, getEvents,
  getAllUsers, makeAdmin, banUser, blockUser, timeoutUser,
  getSupportTickets, getSettings, updateSettings,
} from '../utils/api';

type TabType = 'users' | 'venues' | 'events' | 'aiUsers' | 'support' | 'settings';

export default function AdminPanel() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('users');
  const [loading, setLoading] = useState(false);

  // Data lists
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [venues, setVenues] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [aiUsers, setAiUsers] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [supportEmail, setSupportEmail] = useState('');

  // Forms
  const [venueName, setVenueName] = useState('');
  const [venueType, setVenueType] = useState('bar');
  const [venueAddress, setVenueAddress] = useState('');
  const [aiEmail, setAiEmail] = useState('');
  const [aiDisplayName, setAiDisplayName] = useState('');
  const [timeoutHours, setTimeoutHours] = useState('24');

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      if (activeTab === 'users') {
        const res = await getAllUsers(user.id);
        setAllUsers(res.data);
      } else if (activeTab === 'venues') {
        const res = await getVenues();
        setVenues(res.data);
      } else if (activeTab === 'events') {
        const res = await getEvents();
        setEvents(res.data);
      } else if (activeTab === 'aiUsers') {
        const res = await getAIUsers();
        setAiUsers(res.data);
      } else if (activeTab === 'support') {
        const res = await getSupportTickets(user.id);
        setTickets(res.data);
      } else if (activeTab === 'settings') {
        const res = await getSettings();
        setSupportEmail(res.data?.supportEmail || '');
      }
    } catch (error: any) {
      console.error('Admin load error:', error?.response?.data?.detail || error);
    }
  }, [activeTab, user]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleAction = async (action: string, targetId: string, targetName: string) => {
    if (!user) return;
    const actions: { [key: string]: () => Promise<any> } = {
      'make-admin': () => makeAdmin(user.id, targetId),
      'ban': () => banUser(user.id, targetId, true),
      'unban': () => banUser(user.id, targetId, false),
      'block': () => blockUser(user.id, targetId, true),
      'unblock': () => blockUser(user.id, targetId, false),
      'timeout': () => timeoutUser(user.id, targetId, parseInt(timeoutHours) || 24),
    };

    Alert.alert('Confirm', `${action} ${targetName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm', onPress: async () => {
          try {
            await actions[action]();
            Alert.alert('Success', `${action} applied to ${targetName}`);
            loadData();
          } catch (error: any) {
            Alert.alert('Error', error?.response?.data?.detail || 'Action failed');
          }
        }
      }
    ]);
  };

  const handleCreateVenue = async () => {
    if (!venueName || !venueAddress) return Alert.alert('Error', 'Fill in name and address');
    setLoading(true);
    try {
      await createVenue({ name: venueName, type: venueType, address: venueAddress, city: 'Nashville', state: 'TN' });
      Alert.alert('Success', 'Venue created!');
      setVenueName(''); setVenueAddress('');
      loadData();
    } catch { Alert.alert('Error', 'Failed'); }
    finally { setLoading(false); }
  };

  const handleCreateAI = async () => {
    if (!aiEmail || !aiDisplayName) return Alert.alert('Error', 'Fill in email and name');
    setLoading(true);
    try {
      await createAIUser({ email: aiEmail, displayName: aiDisplayName });
      Alert.alert('Success', 'AI user created!');
      setAiEmail(''); setAiDisplayName('');
      loadData();
    } catch { Alert.alert('Error', 'Failed'); }
    finally { setLoading(false); }
  };

  const handleSaveSettings = async () => {
    if (!user) return;
    try {
      await updateSettings(user.id, supportEmail);
      Alert.alert('Success', 'Settings saved!');
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.detail || 'Failed');
    }
  };

  const TABS: { key: TabType; icon: string; label: string }[] = [
    { key: 'users', icon: 'people', label: 'Users' },
    { key: 'venues', icon: 'location', label: 'Venues' },
    { key: 'aiUsers', icon: 'sparkles', label: 'AI' },
    { key: 'support', icon: 'mail', label: 'Tickets' },
    { key: 'settings', icon: 'settings', label: 'Config' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#00E5FF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ADMIN PANEL</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar}>
        {TABS.map((tab) => (
          <TouchableOpacity key={tab.key} style={[styles.tab, activeTab === tab.key && styles.tabActive]} onPress={() => setActiveTab(tab.key)}>
            <Ionicons name={tab.icon as any} size={18} color={activeTab === tab.key ? '#00E5FF' : '#666'} />
            <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* ===== USERS TAB ===== */}
        {activeTab === 'users' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>All Users ({allUsers.length})</Text>
            <TextInput style={styles.input} placeholder="Timeout hours (default 24)" placeholderTextColor="#666" value={timeoutHours} onChangeText={setTimeoutHours} keyboardType="number-pad" />
            {allUsers.map((u: any) => (
              <View key={u.id} style={[styles.userCard, u.isBanned && styles.bannedCard]}>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{u.displayName} {u.isAI ? '🤖' : ''}</Text>
                  <Text style={styles.userEmail}>{u.email}</Text>
                  <View style={styles.badgeRow}>
                    {u.isAdmin && <View style={styles.badge}><Text style={styles.badgeText}>ADMIN</Text></View>}
                    {u.isPremium && <View style={[styles.badge, styles.premBadge]}><Text style={styles.badgeText}>PREMIUM</Text></View>}
                    {u.isBanned && <View style={[styles.badge, styles.banBadge]}><Text style={styles.badgeText}>BANNED</Text></View>}
                    {u.isBlocked && <View style={[styles.badge, styles.blockBadge]}><Text style={styles.badgeText}>BLOCKED</Text></View>}
                  </View>
                </View>
                {u.id !== user?.id && (
                  <View style={styles.actionRow}>
                    {!u.isAdmin && (
                      <TouchableOpacity style={styles.adminActionBtn} onPress={() => handleAction('make-admin', u.id, u.displayName)}>
                        <Text style={styles.adminActionText}>👑 Admin</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.adminActionBtn} onPress={() => handleAction(u.isBanned ? 'unban' : 'ban', u.id, u.displayName)}>
                      <Text style={[styles.adminActionText, { color: '#FF4458' }]}>{u.isBanned ? '✅ Unban' : '🚫 Ban'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.adminActionBtn} onPress={() => handleAction(u.isBlocked ? 'unblock' : 'block', u.id, u.displayName)}>
                      <Text style={[styles.adminActionText, { color: '#FF8C00' }]}>{u.isBlocked ? '✅ Unblock' : '🔒 Block'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.adminActionBtn} onPress={() => handleAction('timeout', u.id, u.displayName)}>
                      <Text style={[styles.adminActionText, { color: '#FFD700' }]}>⏳ Timeout</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* ===== VENUES TAB ===== */}
        {activeTab === 'venues' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Create Venue</Text>
            <TextInput style={styles.input} placeholder="Venue Name" placeholderTextColor="#666" value={venueName} onChangeText={setVenueName} />
            <View style={styles.chipRow}>
              {['bar', 'club', 'venue', 'restaurant'].map((t) => (
                <TouchableOpacity key={t} style={[styles.chip, venueType === t && styles.chipActive]} onPress={() => setVenueType(t)}>
                  <Text style={[styles.chipText, venueType === t && styles.chipTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={styles.input} placeholder="Address" placeholderTextColor="#666" value={venueAddress} onChangeText={setVenueAddress} />
            <TouchableOpacity style={styles.submitBtn} onPress={handleCreateVenue} disabled={loading}>
              <Text style={styles.submitBtnText}>{loading ? 'CREATING...' : 'CREATE VENUE'}</Text>
            </TouchableOpacity>
            <Text style={styles.listTitle}>Existing ({venues.length})</Text>
            {venues.map((v: any) => (
              <View key={v.id} style={styles.listCard}>
                <Text style={styles.listCardTitle}>{v.name}</Text>
                <Text style={styles.listCardSub}>{v.type} • {v.address}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ===== AI USERS TAB ===== */}
        {activeTab === 'aiUsers' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Create AI User</Text>
            <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#666" value={aiEmail} onChangeText={setAiEmail} autoCapitalize="none" />
            <TextInput style={styles.input} placeholder="Display Name" placeholderTextColor="#666" value={aiDisplayName} onChangeText={setAiDisplayName} />
            <TouchableOpacity style={styles.submitBtn} onPress={handleCreateAI} disabled={loading}>
              <Text style={styles.submitBtnText}>{loading ? 'CREATING...' : 'CREATE AI USER'}</Text>
            </TouchableOpacity>
            <Text style={styles.listTitle}>AI Users ({aiUsers.length})</Text>
            {aiUsers.map((u: any) => (
              <View key={u.id} style={styles.listCard}>
                <Text style={styles.listCardTitle}>{u.displayName} 🤖</Text>
                <Text style={styles.listCardSub}>{u.email}</Text>
                {u.personalityText && <Text style={styles.aiQuote}>"{u.personalityText}"</Text>}
              </View>
            ))}
          </View>
        )}

        {/* ===== SUPPORT TICKETS TAB ===== */}
        {activeTab === 'support' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Support Tickets ({tickets.length})</Text>
            {tickets.length === 0 && <Text style={styles.emptyText}>No tickets yet</Text>}
            {tickets.map((t: any) => (
              <View key={t.id} style={styles.listCard}>
                <View style={styles.ticketHeader}>
                  <Text style={styles.listCardTitle}>{t.subject}</Text>
                  <View style={[styles.badge, t.status === 'open' ? styles.openBadge : styles.closedBadge]}>
                    <Text style={styles.badgeText}>{t.status?.toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={styles.listCardSub}>{t.email}</Text>
                <Text style={styles.ticketMsg}>{t.message}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ===== SETTINGS TAB ===== */}
        {activeTab === 'settings' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>App Settings</Text>
            <Text style={styles.fieldLabel}>Support Email</Text>
            <TextInput style={styles.input} placeholder="support@smashville.app" placeholderTextColor="#666" value={supportEmail} onChangeText={setSupportEmail} autoCapitalize="none" keyboardType="email-address" />
            <TouchableOpacity style={styles.submitBtn} onPress={handleSaveSettings}>
              <Text style={styles.submitBtnText}>SAVE SETTINGS</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#00E5FF' },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#00E5FF', letterSpacing: 2 },
  tabBar: { maxHeight: 50, borderBottomWidth: 1, borderBottomColor: '#333' },
  tab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 6 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#00E5FF' },
  tabLabel: { fontSize: 13, color: '#666', fontWeight: '600' },
  tabLabelActive: { color: '#00E5FF' },
  body: { flex: 1 },
  section: { padding: 16 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFF', marginBottom: 16 },
  fieldLabel: { fontSize: 13, color: '#00E5FF', fontWeight: '600', marginBottom: 6 },
  input: { backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#333', borderRadius: 8, padding: 14, fontSize: 16, color: '#FFF', marginBottom: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#333', backgroundColor: '#1A1A1A' },
  chipActive: { borderColor: '#00E5FF', backgroundColor: 'rgba(0,229,255,0.15)' },
  chipText: { fontSize: 14, color: '#999', textTransform: 'capitalize' },
  chipTextActive: { color: '#00E5FF', fontWeight: '600' },
  submitBtn: { backgroundColor: '#00E5FF', paddingVertical: 16, borderRadius: 8, alignItems: 'center', marginBottom: 20 },
  submitBtnText: { color: '#000', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },
  listTitle: { fontSize: 16, fontWeight: 'bold', color: '#00E5FF', marginBottom: 12, marginTop: 8 },
  listCard: { backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#333', borderRadius: 10, padding: 14, marginBottom: 10 },
  listCardTitle: { fontSize: 16, fontWeight: 'bold', color: '#FFF' },
  listCardSub: { fontSize: 13, color: '#999', marginTop: 2 },
  aiQuote: { fontSize: 13, color: '#00E5FF', fontStyle: 'italic', marginTop: 6 },
  emptyText: { color: '#666', fontSize: 16, textAlign: 'center', paddingVertical: 32 },

  // User Card
  userCard: { backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#333', borderRadius: 10, padding: 14, marginBottom: 10 },
  bannedCard: { borderColor: '#FF4458', backgroundColor: 'rgba(255,68,88,0.05)' },
  userInfo: { marginBottom: 8 },
  userName: { fontSize: 16, fontWeight: 'bold', color: '#FFF' },
  userEmail: { fontSize: 13, color: '#999', marginTop: 2 },
  badgeRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, backgroundColor: 'rgba(0,229,255,0.15)' },
  badgeText: { fontSize: 10, fontWeight: 'bold', color: '#00E5FF' },
  premBadge: { backgroundColor: 'rgba(255,215,0,0.15)' },
  banBadge: { backgroundColor: 'rgba(255,68,88,0.2)' },
  blockBadge: { backgroundColor: 'rgba(255,140,0,0.2)' },
  openBadge: { backgroundColor: 'rgba(0,255,100,0.15)' },
  closedBadge: { backgroundColor: 'rgba(150,150,150,0.15)' },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  adminActionBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#333', backgroundColor: '#0A0A0A' },
  adminActionText: { fontSize: 12, fontWeight: '600', color: '#00E5FF' },

  // Tickets
  ticketHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ticketMsg: { fontSize: 14, color: '#CCC', marginTop: 8, lineHeight: 20 },
});
