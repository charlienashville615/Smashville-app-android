import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getEvents, createRSVP, getUserRSVPs } from '../../utils/api';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Events() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [rsvpedEvents, setRsvpedEvents] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!user) return;
    
    try {
      const [eventsRes, rsvpsRes] = await Promise.all([
        getEvents(),
        getUserRSVPs(user.id),
      ]);
      
      setEvents(eventsRes.data);
      setRsvpedEvents(rsvpsRes.data.map((r: any) => r.eventId));
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRSVP = async (eventId: string) => {
    if (!user) return;
    
    try {
      await createRSVP({ userId: user.id, eventId });
      setRsvpedEvents([...rsvpedEvents, eventId]);
      Alert.alert('Success', 'RSVP confirmed!');
    } catch (error) {
      console.error('Error creating RSVP:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const renderEvent = ({ item }: any) => {
    const hasRSVPed = rsvpedEvents.includes(item.id);
    
    return (
      <View style={styles.eventCard}>
        <View style={styles.eventHeader}>
          <View style={styles.eventBadge}>
            <Ionicons name="musical-notes" size={20} color="#00E5FF" />
          </View>
          <View style={styles.eventInfo}>
            <Text style={styles.eventName}>{item.name}</Text>
            <Text style={styles.eventType}>{item.eventType.toUpperCase()}</Text>
          </View>
        </View>
        
        <Text style={styles.eventDescription}>{item.description}</Text>
        
        <View style={styles.eventFooter}>
          <View style={styles.dateContainer}>
            <Ionicons name="calendar-outline" size={16} color="#00E5FF" />
            <Text style={styles.eventDate}>{formatDate(item.eventDate)}</Text>
          </View>
          
          <TouchableOpacity
            style={[styles.rsvpButton, hasRSVPed && styles.rsvpButtonActive]}
            onPress={() => !hasRSVPed && handleRSVP(item.id)}
            disabled={hasRSVPed}
          >
            <Text style={styles.rsvpButtonText}>
              {hasRSVPed ? 'RSVP\'D' : 'RSVP'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loading}>Loading events...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>🎉 EVENTS</Text>
        <Text style={styles.subtitle}>What's happening in Nashville</Text>
      </View>

      {events.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🎸</Text>
          <Text style={styles.emptyText}>No events yet</Text>
          <Text style={styles.emptySubtext}>Check back soon for hot Nashville events!</Text>
        </View>
      ) : (
        <FlatList
          data={events}
          renderItem={renderEvent}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
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
  eventCard: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    padding: 16,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  eventBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventInfo: {
    flex: 1,
  },
  eventName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  eventType: {
    fontSize: 11,
    color: '#00E5FF',
    fontWeight: '600',
    letterSpacing: 1,
  },
  eventDescription: {
    fontSize: 14,
    color: '#CCCCCC',
    marginBottom: 16,
    lineHeight: 20,
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eventDate: {
    fontSize: 14,
    color: '#00E5FF',
  },
  rsvpButton: {
    backgroundColor: '#00E5FF',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 6,
  },
  rsvpButtonActive: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#00E5FF',
  },
  rsvpButtonText: {
    color: '#000000',
    fontSize: 12,
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
});
