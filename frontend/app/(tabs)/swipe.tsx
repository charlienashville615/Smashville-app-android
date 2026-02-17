import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Image, ScrollView, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getUserCheckin, getVenueCheckins, swipe as apiSwipe, getGifts, sendGift as apiSendGift } from '../../utils/api';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function Swipe() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [checkedInVenue, setCheckedInVenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showGifts, setShowGifts] = useState(false);
  const [gifts, setGifts] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!user) return;
    
    try {
      // Get user's check-in
      const checkinRes = await getUserCheckin(user.id);
      
      if (!checkinRes.data) {
        setLoading(false);
        return;
      }

      setCheckedInVenue(checkinRes.data.venueId);
      
      // Get users at the same venue
      const usersRes = await getVenueCheckins(checkinRes.data.venueId);
      const filteredUsers = usersRes.data.filter((u: any) => u.id !== user.id);
      setUsers(filteredUsers);

      // Load gifts
      const giftsRes = await getGifts();
      setGifts(giftsRes.data);
    } catch (error) {
      console.error('Error loading swipe data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSwipe = async (direction: 'left' | 'right') => {
    if (!user || !checkedInVenue || currentIndex >= users.length) return;

    const targetUser = users[currentIndex];
    
    try {
      const result = await apiSwipe({
        userId: user.id,
        targetUserId: targetUser.id,
        venueId: checkedInVenue,
        direction,
      });

      if (result.data.match) {
        Alert.alert('🔥 It\'s a Match!', `You matched with ${targetUser.displayName}!`);
      }

      setCurrentIndex(currentIndex + 1);
    } catch (error) {
      console.error('Error swiping:', error);
    }
  };

  const handleSendGift = async (giftId: string) => {
    if (!user || currentIndex >= users.length) return;

    try {
      await apiSendGift({
        fromUserId: user.id,
        toUserId: users[currentIndex].id,
        giftId,
      });
      Alert.alert('Gift Sent!', 'Your gift was sent successfully');
      setShowGifts(false);
    } catch (error) {
      console.error('Error sending gift:', error);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loading}>Loading...</Text>
      </SafeAreaView>
    );
  }

  if (!checkedInVenue) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📍</Text>
          <Text style={styles.emptyText}>Not checked in</Text>
          <Text style={styles.emptySubtext}>Check in to a venue to start swiping!</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (currentIndex >= users.length) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🤷</Text>
          <Text style={styles.emptyText}>No more users</Text>
          <Text style={styles.emptySubtext}>Looks like you've seen everyone. Try another venue!</Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentUser = users[currentIndex];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>⚡ SWIPE</Text>
        <Text style={styles.counter}>{currentIndex + 1} / {users.length}</Text>
      </View>

      <ScrollView style={styles.cardContainer}>
        <View style={styles.card}>
          {/* Cover Photo */}
          {currentUser.coverPhoto ? (
            <Image 
              source={{ uri: currentUser.coverPhoto }} 
              style={styles.coverPhoto}
            />
          ) : (
            <View style={[styles.coverPhoto, styles.coverPhotoPlaceholder]}>
              <Text style={styles.placeholderText}>No Cover Photo</Text>
            </View>
          )}

          {/* Profile Info */}
          <View style={styles.profileInfo}>
            <View style={styles.nameSection}>
              <Text style={styles.name}>{currentUser.displayName}</Text>
              {currentUser.isPremium && (
                <View style={styles.premiumBadge}>
                  <Ionicons name="star" size={16} color="#FFD700" />
                </View>
              )}
            </View>

            {currentUser.currentVibe && (
              <View style={styles.vibeContainer}>
                <Ionicons name="musical-notes" size={16} color="#00E5FF" />
                <Text style={styles.vibe}>{currentUser.currentVibe}</Text>
              </View>
            )}

            {currentUser.personalityText && (
              <Text style={styles.personalityText}>"{currentUser.personalityText}"</Text>
            )}

            {currentUser.bio && (
              <Text style={styles.bio}>{currentUser.bio}</Text>
            )}

            {currentUser.makeItCountText && (
              <Text style={styles.makeItCount}>💭 {currentUser.makeItCountText}</Text>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.passButton]}
          onPress={() => handleSwipe('left')}
        >
          <Ionicons name="close" size={40} color="#FF4458" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionButton, styles.giftButton]}
          onPress={() => setShowGifts(true)}
        >
          <Ionicons name="gift" size={32} color="#00E5FF" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionButton, styles.likeButton]}
          onPress={() => handleSwipe('right')}
        >
          <Ionicons name="heart" size={40} color="#00E5FF" />
        </TouchableOpacity>
      </View>

      {/* Gift Modal */}
      {showGifts && (
        <View style={styles.giftModal}>
          <View style={styles.giftModalContent}>
            <View style={styles.giftModalHeader}>
              <Text style={styles.giftModalTitle}>Send a Gift</Text>
              <TouchableOpacity onPress={() => setShowGifts(false)}>
                <Ionicons name="close" size={28} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            
            <ScrollView horizontal contentContainerStyle={styles.giftList}>
              {gifts.map((gift: any) => (
                <TouchableOpacity
                  key={gift.id}
                  style={styles.giftItem}
                  onPress={() => handleSendGift(gift.id)}
                >
                  <Text style={styles.giftEmoji}>{gift.emoji}</Text>
                  <Text style={styles.giftName}>{gift.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#00E5FF',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#00E5FF',
    letterSpacing: 2,
  },
  counter: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.7,
  },
  cardContainer: {
    flex: 1,
  },
  card: {
    margin: 16,
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333',
  },
  coverPhoto: {
    width: '100%',
    height: 300,
    backgroundColor: '#0A0A0A',
  },
  coverPhotoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#666',
    fontSize: 16,
  },
  profileInfo: {
    padding: 20,
  },
  nameSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  premiumBadge: {
    marginLeft: 8,
    backgroundColor: '#FFD700',
    borderRadius: 12,
    padding: 4,
  },
  vibeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  vibe: {
    fontSize: 16,
    color: '#00E5FF',
    fontWeight: '600',
  },
  personalityText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontStyle: 'italic',
    marginBottom: 12,
    opacity: 0.9,
  },
  bio: {
    fontSize: 15,
    color: '#CCCCCC',
    lineHeight: 22,
    marginBottom: 12,
  },
  makeItCount: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 32,
    gap: 24,
  },
  actionButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  passButton: {
    borderColor: '#FF4458',
    backgroundColor: 'rgba(255, 68, 88, 0.1)',
  },
  giftButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderColor: '#00E5FF',
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
  },
  likeButton: {
    borderColor: '#00E5FF',
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
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
    fontSize: 20,
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
  giftModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  giftModalContent: {
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  giftModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  giftModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00E5FF',
  },
  giftList: {
    paddingHorizontal: 20,
    gap: 16,
  },
  giftItem: {
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
    width: 100,
  },
  giftEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  giftName: {
    fontSize: 12,
    color: '#FFFFFF',
    textAlign: 'center',
  },
});
