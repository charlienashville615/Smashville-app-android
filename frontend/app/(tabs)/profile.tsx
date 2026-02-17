import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, Image } from 'react-native';
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { updateUser, regenerateAI } from '../../utils/api';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

const VIBE_OPTIONS = ['just vibing', 'linking', 'I came to get down', 'looking for drinks', 'here to dance'];

export default function Profile() {
  const router = useRouter();
  const { user, logout, updateUserData } = useAuth();
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [currentVibe, setCurrentVibe] = useState(user?.currentVibe || 'just vibing');
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
        Alert.alert('Success', 'Photo updated!');
      } catch (error) {
        Alert.alert('Error', 'Failed to update photo');
      }
    }
  };

  const handleSave = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      await updateUser(user.id, {
        displayName,
        bio,
        currentVibe,
      });
      updateUserData({ displayName, bio, currentVibe });
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
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', onPress: async () => {
          await logout();
          router.replace('/');
        }},
      ]
    );
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loading}>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.title}>👤 PROFILE</Text>
          {user.isPremium && (
            <View style={styles.premiumBadge}>
              <Ionicons name="star" size={20} color="#FFD700" />
              <Text style={styles.premiumText}>PREMIUM</Text>
            </View>
          )}
        </View>

        {/* Cover Photo */}
        <TouchableOpacity 
          style={styles.coverPhotoContainer}
          onPress={() => handleImagePick('cover')}
        >
          {user.coverPhoto ? (
            <Image source={{ uri: user.coverPhoto }} style={styles.coverPhoto} />
          ) : (
            <View style={[styles.coverPhoto, styles.coverPhotoPlaceholder]}>
              <Ionicons name="image-outline" size={48} color="#666" />
              <Text style={styles.placeholderText}>Add Cover Photo</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.content}>
          {editing ? (
            <View style={styles.form}>
              <Text style={styles.label}>Display Name</Text>
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Your name"
                placeholderTextColor="#666"
              />

              <Text style={styles.label}>Bio</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={bio}
                onChangeText={setBio}
                placeholder="Tell us about yourself"
                placeholderTextColor="#666"
                multiline
                numberOfLines={3}
              />

              <Text style={styles.label}>Current Vibe</Text>
              <View style={styles.vibeOptions}>
                {VIBE_OPTIONS.map((vibe) => (
                  <TouchableOpacity
                    key={vibe}
                    style={[
                      styles.vibeOption,
                      currentVibe === vibe && styles.vibeOptionActive,
                    ]}
                    onPress={() => setCurrentVibe(vibe)}
                  >
                    <Text style={[
                      styles.vibeOptionText,
                      currentVibe === vibe && styles.vibeOptionTextActive,
                    ]}>
                      {vibe}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.button, styles.buttonSecondary]}
                  onPress={() => setEditing(false)}
                >
                  <Text style={styles.buttonTextSecondary}>CANCEL</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.button}
                  onPress={handleSave}
                  disabled={loading}
                >
                  <Text style={styles.buttonText}>{loading ? 'SAVING...' : 'SAVE'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View>
              <View style={styles.infoSection}>
                <Text style={styles.name}>{user.displayName}</Text>
                <Text style={styles.email}>{user.email}</Text>
                {user.currentVibe && (
                  <View style={styles.vibeContainer}>
                    <Ionicons name="musical-notes" size={16} color="#00E5FF" />
                    <Text style={styles.vibe}>{user.currentVibe}</Text>
                  </View>
                )}
              </View>

              {user.personalityText && (
                <View style={styles.aiSection}>
                  <Text style={styles.sectionTitle}>AI Personality</Text>
                  <Text style={styles.aiText}>"{user.personalityText}"</Text>
                </View>
              )}

              {user.makeItCountText && (
                <View style={styles.aiSection}>
                  <Text style={styles.sectionTitle}>Make It Count</Text>
                  <Text style={styles.aiText}>{user.makeItCountText}</Text>
                </View>
              )}

              {user.bio && (
                <View style={styles.bioSection}>
                  <Text style={styles.sectionTitle}>Bio</Text>
                  <Text style={styles.bioText}>{user.bio}</Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => setEditing(true)}
              >
                <Ionicons name="create-outline" size={24} color="#00E5FF" />
                <Text style={styles.actionButtonText}>Edit Profile</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleImagePick('photo')}
              >
                <Ionicons name="image-outline" size={24} color="#00E5FF" />
                <Text style={styles.actionButtonText}>Add Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleRegenerateAI}
              >
                <Ionicons name="refresh-outline" size={24} color="#00E5FF" />
                <Text style={styles.actionButtonText}>Regenerate AI Texts</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.adminButton]}
                onPress={() => router.push('/admin')}
              >
                <Ionicons name="shield-outline" size={24} color="#FFD700" />
                <Text style={[styles.actionButtonText, styles.adminButtonText]}>Admin Panel</Text>
              </TouchableOpacity>

              {!user.isPremium && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.premiumButton]}
                >
                  <Ionicons name="star" size={24} color="#FFD700" />
                  <Text style={[styles.actionButtonText, styles.premiumButtonText]}>Upgrade to Premium</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.actionButton, styles.logoutButton]}
                onPress={handleLogout}
              >
                <Ionicons name="log-out-outline" size={24} color="#FF4458" />
                <Text style={[styles.actionButtonText, styles.logoutText]}>Logout</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#00E5FF',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#00E5FF',
    letterSpacing: 2,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  premiumText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: 'bold',
  },
  coverPhotoContainer: {
    width: '100%',
  },
  coverPhoto: {
    width: '100%',
    height: 200,
    backgroundColor: '#0A0A0A',
  },
  coverPhotoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#666',
    fontSize: 14,
    marginTop: 8,
  },
  content: {
    padding: 20,
  },
  infoSection: {
    marginBottom: 24,
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  email: {
    fontSize: 16,
    color: '#999',
    marginBottom: 12,
  },
  vibeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  vibe: {
    fontSize: 16,
    color: '#00E5FF',
    fontWeight: '600',
  },
  aiSection: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#00E5FF',
  },
  sectionTitle: {
    fontSize: 12,
    color: '#00E5FF',
    fontWeight: 'bold',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  aiText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontStyle: 'italic',
    lineHeight: 22,
  },
  bioSection: {
    marginBottom: 24,
  },
  bioText: {
    fontSize: 15,
    color: '#CCCCCC',
    lineHeight: 22,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
    gap: 12,
  },
  actionButtonText: {
    fontSize: 16,
    color: '#00E5FF',
    fontWeight: '600',
  },
  premiumButton: {
    borderColor: '#FFD700',
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
  },
  premiumButtonText: {
    color: '#FFD700',
  },
  adminButton: {
    borderColor: '#FFD700',
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
  },
  adminButtonText: {
    color: '#FFD700',
  },
  logoutButton: {
    borderColor: '#FF4458',
  },
  logoutText: {
    color: '#FF4458',
  },
  form: {
    gap: 16,
  },
  label: {
    fontSize: 14,
    color: '#00E5FF',
    fontWeight: '600',
    marginBottom: -8,
  },
  input: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#FFFFFF',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  vibeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  vibeOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333',
    backgroundColor: '#1A1A1A',
  },
  vibeOptionActive: {
    borderColor: '#00E5FF',
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
  },
  vibeOptionText: {
    fontSize: 14,
    color: '#999',
  },
  vibeOptionTextActive: {
    color: '#00E5FF',
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    backgroundColor: '#00E5FF',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#00E5FF',
  },
  buttonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  buttonTextSecondary: {
    color: '#00E5FF',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  loading: {
    flex: 1,
    textAlign: 'center',
    textAlignVertical: 'center',
    color: '#00E5FF',
    fontSize: 16,
  },
});
