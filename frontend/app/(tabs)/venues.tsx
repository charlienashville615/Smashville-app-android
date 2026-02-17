import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { getVenues, checkIn as apiCheckIn, getUserCheckin } from '../../utils/api';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Venues() {
  const router = useRouter();
  const { user } = useAuth();
  const [venues, setVenues] = useState([]);
  const [checkedInVenue, setCheckedInVenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [venuesRes, checkinRes] = await Promise.all([
        getVenues(),
        user ? getUserCheckin(user.id) : Promise.resolve({ data: null }),
      ]);
      setVenues(venuesRes.data);
      setCheckedInVenue(checkinRes.data?.venueId || null);
    } catch (error) {
      console.error('Error loading venues:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCheckIn = async (venueId: string) => {
    if (!user) return;
    
    try {
      await apiCheckIn({
        userId: user.id,
        venueId,
      });
      setCheckedInVenue(venueId);
    } catch (error) {
      console.error('Error checking in:', error);
    }
  };

  const renderVenue = ({ item }: any) => {
    const isCheckedIn = checkedInVenue === item.id;
    
    return (
      <TouchableOpacity 
        style={[styles.venueCard, isCheckedIn && styles.venueCardActive]}
        onPress={() => router.push(`/venue/${item.id}`)}
      >
        <View style={styles.venueHeader}>
          <View style={styles.venueInfo}>
            <Text style={styles.venueName}>{item.name}</Text>
            <Text style={styles.venueType}>{item.type.toUpperCase()}</Text>
          </View>
          {isCheckedIn && (
            <View style={styles.checkedInBadge}>
              <Ionicons name="checkmark-circle" size={24} color="#00E5FF" />
            </View>
          )}
        </View>
        
        <Text style={styles.venueAddress}>{item.address}</Text>
        
        <TouchableOpacity
          style={[styles.checkInButton, isCheckedIn && styles.checkInButtonActive]}
          onPress={(e) => {
            e.stopPropagation();
            handleCheckIn(item.id);
          }}
        >
          <Text style={styles.checkInButtonText}>
            {isCheckedIn ? 'CHECKED IN' : 'CHECK IN'}
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loading}>Loading venues...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>⚡ SMASHVILLE</Text>
        <Text style={styles.subtitle}>Nashville's Hottest Spots</Text>
      </View>

      {venues.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🤷</Text>
          <Text style={styles.emptyText}>No venues yet.</Text>
          <Text style={styles.emptySubtext}>Your mom's basement doesn't count.</Text>
        </View>
      ) : (
        <FlatList
          data={venues}
          renderItem={renderVenue}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadData();
              }}
              tintColor="#00E5FF"
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
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
  subtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.7,
    marginTop: 4,
  },
  list: {
    padding: 16,
    gap: 16,
  },
  venueCard: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    padding: 16,
  },
  venueCardActive: {
    borderColor: '#00E5FF',
    borderWidth: 2,
  },
  venueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  venueInfo: {
    flex: 1,
  },
  venueName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  venueType: {
    fontSize: 12,
    color: '#00E5FF',
    fontWeight: '600',
    letterSpacing: 1,
  },
  venueAddress: {
    fontSize: 14,
    color: '#999',
    marginBottom: 12,
  },
  checkedInBadge: {
    marginLeft: 8,
  },
  checkInButton: {
    backgroundColor: '#00E5FF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  checkInButtonActive: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#00E5FF',
  },
  checkInButtonText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
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
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  loading: {
    flex: 1,
    textAlign: 'center',
    textAlignVertical: 'center',
    color: '#00E5FF',
    fontSize: 16,
  },
});
