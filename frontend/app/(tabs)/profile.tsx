import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, Image, FlatList } from 'react-native';
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { updateUser, regenerateAI } from '../../utils/api';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

const VIBE_CHECK_OPTIONS = [
  { label: 'Down to Smash', emoji: '🔥' },
  { label: 'Feeling Flirty', emoji: '😏' },
  { label: 'Just Vibing', emoji: '🎵' },
  { label: 'Looking for Love', emoji: '💕' },
  { label: 'Here for Drinks', emoji: '🍹' },
  { label: 'Let\'s Dance', emoji: '💃' },
];

const GENDER_OPTIONS = ['Male', 'Female', 'Non-Binary', 'Other'];
const PREFERENCE_OPTIONS = ['Men', 'Women', 'Everyone', 'Other'];

export default function Profile() {
  const router = useRouter();
  const { user, logout, updateUserData } = useAuth();
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [age, setAge] = useState(user?.age?.toString() || '');
  const [gender, setGender] = useState(user?.gender || '');
  const [sexualPreference, setSexualPreference] = useState(user?.sexualPreference || '');
  const [vibeCheck, setVibeCheck] = useState(user?.vibeCheck || user?.currentVibe || 'Just Vibing');
  const [statusMessage, setStatusMessage] = useState(user?.statusMessage || '');
  const [loading, setLoading] = useState(false);

  const handleImagePick = async (type: 'photo' | 'cover') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: type === 'cover' ? [16, 9] : [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64 && user) {
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      try {
        if (type === 'cover') {
          await updateUser(user.id, { coverPhoto: base64Image });
          updateUserData({ coverPhoto: base64Image });
        } else {
          const photos = [...(user.photos || []), base64Image];
          await updateUser(user.id, { photos });
          updateUserData({ photos });
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to update photo');
      }
    }
  };

  const handleDeletePhoto = async (index: number) => {
    if (!user) return;
    const photos = [...(user.photos || [])];
    photos.splice(index, 1);
    try {
      await updateUser(user.id, { photos });
      updateUserData({ photos });
    } catch (error) {
      Alert.alert('Error', 'Failed to delete photo');
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const ageNum = parseInt(age) || null;
      const updates: any = {
        displayName,
        username,
        bio,
        age: ageNum,
        gender: gender.toLowerCase() || null,
        sexualPreference: sexualPreference.toLowerCase() || null,
        vibeCheck,
        currentVibe: vibeCheck,
        statusMessage,
      };
      await updateUser(user.id, updates);
      updateUserData(updates);
      setEditing(false);
      Alert.alert('Success', 'Profile updated!');
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateAI = async () => {
    if (!user) return;
    try {
      const response = await regenerateAI(user.id);
      updateUserData({
        personalityText: response.data.personalityText,
        makeItCountText: response.data.makeItCountText,
      });
      Alert.alert('Success', 'AI texts regenerated!');
    } catch (error) {
      Alert.alert('Error', 'Failed to regenerate AI texts');
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', onPress: async () => { await logout(); router.replace('/'); } },
    ]);
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>PROFILE</Text>
          {user.isPremium && (
            <View style={styles.premiumBadge}>
              <Ionicons name="star" size={16} color="#FFD700" />
              <Text style={styles.premiumText}>PREMIUM</Text>
            </View>
          )}
        </View>

        {/* Cover Photo */}
        <TouchableOpacity style={styles.coverContainer} onPress={() => handleImagePick('cover')}>
          {user.coverPhoto ? (
            <Image source={{ uri: user.coverPhoto }} style={styles.coverPhoto} />
          ) : (
            <View style={[styles.coverPhoto, styles.coverPlaceholder]}>
              <Ionicons name="camera-outline" size={40} color="#666" />
              <Text style={styles.placeholderText}>Add Cover Photo</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.content}>
          {/* Photo Gallery */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PHOTOS</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
              {(user.photos || []).map((photo: string, i: number) => (
                <TouchableOpacity key={i} style={styles.photoThumb} onLongPress={() => handleDeletePhoto(i)}>
                  <Image source={{ uri: photo }} style={styles.photoImage} />
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.addPhotoBtn} onPress={() => handleImagePick('photo')}>
                <Ionicons name="add" size={32} color="#00E5FF" />
              </TouchableOpacity>
            </ScrollView>
          </View>

          {editing ? (
            /* ===== EDIT MODE ===== */
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Display Name</Text>
              <TextInput style={styles.input} value={displayName} onChangeText={setDisplayName} placeholderTextColor="#666" />

              <Text style={styles.formLabel}>Username</Text>
              <TextInput style={styles.input} value={username} onChangeText={(t) => setUsername(t.replace(/\s/g, '').toLowerCase())} placeholderTextColor="#666" autoCapitalize="none" />

              <Text style={styles.formLabel}>Age</Text>
              <TextInput style={styles.input} value={age} onChangeText={setAge} placeholderTextColor="#666" keyboardType="number-pad" maxLength={3} />

              <Text style={styles.formLabel}>Gender</Text>
              <View style={styles.chipRow}>
                {GENDER_OPTIONS.map((g) => (
                  <TouchableOpacity key={g} style={[styles.chip, gender.toLowerCase() === g.toLowerCase() && styles.chipActive]} onPress={() => setGender(g)}>
                    <Text style={[styles.chipText, gender.toLowerCase() === g.toLowerCase() && styles.chipTextActive]}>{g}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.formLabel}>Interested In</Text>
              <View style={styles.chipRow}>
                {PREFERENCE_OPTIONS.map((p) => (
                  <TouchableOpacity key={p} style={[styles.chip, sexualPreference.toLowerCase() === p.toLowerCase() && styles.chipActive]} onPress={() => setSexualPreference(p)}>
                    <Text style={[styles.chipText, sexualPreference.toLowerCase() === p.toLowerCase() && styles.chipTextActive]}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.formLabel}>Bio</Text>
              <TextInput style={[styles.input, styles.textArea]} value={bio} onChangeText={setBio} multiline numberOfLines={3} placeholderTextColor="#666" />

              <Text style={styles.formLabel}>Status Message</Text>
              <TextInput style={styles.input} value={statusMessage} onChangeText={setStatusMessage} placeholder="What's on your mind?" placeholderTextColor="#666" />

              <Text style={styles.formLabel}>Vibe Check</Text>
              <View style={styles.chipRow}>
                {VIBE_CHECK_OPTIONS.map((v) => (
                  <TouchableOpacity key={v.label} style={[styles.vibeChip, vibeCheck === v.label && styles.vibeChipActive]} onPress={() => setVibeCheck(v.label)}>
                    <Text style={styles.vibeEmoji}>{v.emoji}</Text>
                    <Text style={[styles.vibeChipText, vibeCheck === v.label && styles.vibeChipTextActive]}>{v.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.buttonRow}>
                <TouchableOpacity style={[styles.btn, styles.btnOutline]} onPress={() => setEditing(false)}>
                  <Text style={styles.btnOutlineText}>CANCEL</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btn} onPress={handleSave} disabled={loading}>
                  <Text style={styles.btnText}>{loading ? 'SAVING...' : 'SAVE'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* ===== VIEW MODE ===== */
            <View>
              {/* User Info */}
              <View style={styles.infoCard}>
                <Text style={styles.nameText}>{user.displayName}</Text>
                {user.username ? <Text style={styles.usernameText}>@{user.username}</Text> : null}
                <View style={styles.detailRow}>
                  {user.age ? <Text style={styles.detailText}>{user.age} yrs</Text> : null}
                  {user.gender ? <Text style={styles.detailText}>{user.gender}</Text> : null}
                  {user.sexualPreference ? <Text style={styles.detailText}>Into {user.sexualPreference}</Text> : null}
                </View>
              </View>

              {/* Vibe Check */}
              <View style={styles.vibeCard}>
                <Text style={styles.vibeCardLabel}>VIBE CHECK</Text>
                <Text style={styles.vibeCardValue}>
                  {VIBE_CHECK_OPTIONS.find((v) => v.label === (user.vibeCheck || user.currentVibe))?.emoji || '🎵'}{' '}
                  {user.vibeCheck || user.currentVibe || 'Just Vibing'}
                </Text>
              </View>

              {/* Status */}
              {user.statusMessage ? (
                <View style={styles.statusCard}>
                  <Text style={styles.statusLabel}>STATUS</Text>
                  <Text style={styles.statusText}>{user.statusMessage}</Text>
                </View>
              ) : null}

              {/* AI Personality */}
              {user.personalityText ? (
                <View style={styles.aiCard}>
                  <Text style={styles.aiLabel}>AI PERSONALITY</Text>
                  <Text style={styles.aiText}>"{user.personalityText}"</Text>
                </View>
              ) : null}

              {user.makeItCountText ? (
                <View style={styles.aiCard}>
                  <Text style={styles.aiLabel}>MAKE IT COUNT</Text>
                  <Text style={styles.aiText}>{user.makeItCountText}</Text>
                </View>
              ) : null}

              {user.bio ? (
                <View style={styles.bioCard}>
                  <Text style={styles.aiLabel}>BIO</Text>
                  <Text style={styles.bioText}>{user.bio}</Text>
                </View>
              ) : null}

              {/* Action Buttons */}
              <TouchableOpacity style={styles.actionBtn} onPress={() => setEditing(true)}>
                <Ionicons name="create-outline" size={22} color="#00E5FF" />
                <Text style={styles.actionBtnText}>Edit Profile</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionBtn} onPress={handleRegenerateAI}>
                <Ionicons name="refresh-outline" size={22} color="#00E5FF" />
                <Text style={styles.actionBtnText}>Regenerate AI Texts</Text>
              </TouchableOpacity>

              {user.isAdmin && (
                <TouchableOpacity style={[styles.actionBtn, styles.adminBtn]} onPress={() => router.push('/admin')}>
                  <Ionicons name="shield-outline" size={22} color="#FFD700" />
                  <Text style={[styles.actionBtnText, { color: '#FFD700' }]}>Admin Panel</Text>
                </TouchableOpacity>
              )}

              {!user.isPremium && (
                <TouchableOpacity style={[styles.actionBtn, styles.premiumBtn]}>
                  <Ionicons name="star" size={22} color="#FFD700" />
                  <Text style={[styles.actionBtnText, { color: '#FFD700' }]}>Upgrade to Premium - $14.99/mo</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={[styles.actionBtn, styles.logoutBtn]} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={22} color="#FF4458" />
                <Text style={[styles.actionBtnText, { color: '#FF4458' }]}>Logout</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loadingText: { flex: 1, textAlign: 'center', textAlignVertical: 'center', color: '#00E5FF', fontSize: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#00E5FF' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#00E5FF', letterSpacing: 2 },
  premiumBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,215,0,0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, gap: 6 },
  premiumText: { color: '#FFD700', fontSize: 12, fontWeight: 'bold' },
  coverContainer: { width: '100%' },
  coverPhoto: { width: '100%', height: 180, backgroundColor: '#0A0A0A' },
  coverPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  placeholderText: { color: '#666', fontSize: 14, marginTop: 8 },
  content: { padding: 16 },

  // Photos
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 12, color: '#00E5FF', fontWeight: 'bold', letterSpacing: 1, marginBottom: 10 },
  photoRow: { gap: 10 },
  photoThumb: { width: 80, height: 80, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#333' },
  photoImage: { width: '100%', height: '100%' },
  addPhotoBtn: { width: 80, height: 80, borderRadius: 12, borderWidth: 2, borderColor: '#333', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },

  // Info Card
  infoCard: { marginBottom: 16 },
  nameText: { fontSize: 26, fontWeight: 'bold', color: '#FFF' },
  usernameText: { fontSize: 16, color: '#00E5FF', marginTop: 2 },
  detailRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  detailText: { fontSize: 14, color: '#999', textTransform: 'capitalize' },

  // Vibe Check
  vibeCard: { backgroundColor: '#1A1A1A', borderRadius: 12, padding: 16, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#00E5FF' },
  vibeCardLabel: { fontSize: 11, color: '#00E5FF', fontWeight: 'bold', letterSpacing: 1, marginBottom: 6 },
  vibeCardValue: { fontSize: 20, color: '#FFF', fontWeight: '700' },

  // Status
  statusCard: { backgroundColor: '#1A1A1A', borderRadius: 12, padding: 16, marginBottom: 12 },
  statusLabel: { fontSize: 11, color: '#00E5FF', fontWeight: 'bold', letterSpacing: 1, marginBottom: 6 },
  statusText: { fontSize: 16, color: '#FFF', fontStyle: 'italic' },

  // AI
  aiCard: { backgroundColor: '#1A1A1A', borderRadius: 12, padding: 16, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#00E5FF' },
  aiLabel: { fontSize: 11, color: '#00E5FF', fontWeight: 'bold', letterSpacing: 1, marginBottom: 6 },
  aiText: { fontSize: 15, color: '#FFF', fontStyle: 'italic', lineHeight: 22 },
  bioCard: { marginBottom: 16 },
  bioText: { fontSize: 15, color: '#CCC', lineHeight: 22 },

  // Action Buttons
  actionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A', padding: 16, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#333', gap: 12 },
  actionBtnText: { fontSize: 16, color: '#00E5FF', fontWeight: '600' },
  adminBtn: { borderColor: '#FFD700', backgroundColor: 'rgba(255,215,0,0.05)' },
  premiumBtn: { borderColor: '#FFD700', backgroundColor: 'rgba(255,215,0,0.05)' },
  logoutBtn: { borderColor: '#FF4458' },

  // Edit Form
  formSection: { gap: 12 },
  formLabel: { fontSize: 13, color: '#00E5FF', fontWeight: '600', marginTop: 4 },
  input: { backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#333', borderRadius: 8, padding: 14, fontSize: 16, color: '#FFF' },
  textArea: { height: 90, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#333', backgroundColor: '#1A1A1A' },
  chipActive: { borderColor: '#00E5FF', backgroundColor: 'rgba(0,229,255,0.15)' },
  chipText: { fontSize: 14, color: '#999' },
  chipTextActive: { color: '#00E5FF', fontWeight: '600' },
  vibeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#333', backgroundColor: '#1A1A1A' },
  vibeChipActive: { borderColor: '#00E5FF', backgroundColor: 'rgba(0,229,255,0.15)' },
  vibeEmoji: { fontSize: 16 },
  vibeChipText: { fontSize: 13, color: '#999' },
  vibeChipTextActive: { color: '#00E5FF', fontWeight: '600' },
  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  btn: { flex: 1, backgroundColor: '#00E5FF', paddingVertical: 16, borderRadius: 8, alignItems: 'center' },
  btnOutline: { backgroundColor: 'transparent', borderWidth: 2, borderColor: '#00E5FF' },
  btnText: { color: '#000', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },
  btnOutlineText: { color: '#00E5FF', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },
});
