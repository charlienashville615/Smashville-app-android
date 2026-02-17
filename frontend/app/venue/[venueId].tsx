import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { useState, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { getVenue, getVenueCheckins } from '../../utils/api';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function VenueDetail() {
  const { venueId } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const [venue, setVenue] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [venueRes, usersRes] = await Promise.all([
        getVenue(venueId as string),
        getVenueCheckins(venueId as string),
      ]);
      
      setVenue(venueRes.data);
      setUsers(usersRes.data);
    } catch (error) {
      console.error('Error loading venue:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderUser = ({ item }: any) => {
    return (
      <View style={styles.userCard}>
        {item.photos?.[0] ? (
          <Image source={{ uri: item.photos[0] }} style={styles.userAvatar} />
        ) : (
          <View style={[styles.userAvatar, styles.userAvatarPlaceholder]}>
            <Ionicons name="person" size={24} color="#666" />
          </View>
        )}
        
        <View style={styles.userInfo}>
          <View style={styles.userNameRow}>
            <Text style={styles.userName}>{item.displayName}</Text>
            {item.isPremium && (
              <Ionicons name="star" size={14} color="#FFD700" />
            )}
          </View>
          {item.currentVibe && (
            <Text style={styles.userVibe}>🎵 {item.currentVibe}</Text>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loading}>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#00E5FF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Venue Details</Text>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.venueHeader}>
        <Text style={styles.venueName}>{venue?.name}</Text>
        <Text style={styles.venueType}>{venue?.type.toUpperCase()}</Text>
        <Text style={styles.venueAddress}>{venue?.address}</Text>
      </View>

      <View style={styles.usersSection}>
        <View style={styles.usersSectionHeader}>
          <Ionicons name="people" size={24} color="#00E5FF" />
          <Text style={styles.usersSectionTitle}>People Here ({users.length})</Text>
        </View>

        {users.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>👻</Text>
            <Text style={styles.emptyText}>Nobody here yet</Text>
            <Text style={styles.emptySubtext}>Be the first to check in!</Text>
          </View>
        ) : (
          <FlatList
            data={users}
            renderItem={renderUser}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.usersList}
          />
        )}
      </View>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#00E5FF',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerRight: {
    width: 32,
  },
  venueHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  venueName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  venueType: {
    fontSize: 12,
    color: '#00E5FF',
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 8,
  },
  venueAddress: {
    fontSize: 14,
    color: '#999',
  },
  usersSection: {
    flex: 1,
  },
  usersSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 20,
  },
  usersSectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#00E5FF',
  },
  usersList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    padding: 16,
  },
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 16,
    backgroundColor: '#0A0A0A',
  },
  userAvatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  userVibe: {
    fontSize: 14,
    color: '#00E5FF',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  loading: {
    flex: 1,
    textAlign: 'center',
    textAlignVertical: 'center',
    color: '#00E5FF',
    fontSize: 16,
  },
});
