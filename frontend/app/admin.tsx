import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, FlatList, Switch } from 'react-native';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { createVenue, createEvent, createAIUser, getAIUsers, getVenues, getEvents } from '../utils/api';

type TabType = 'venues' | 'events' | 'aiUsers';

export default function AdminPanel() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('venues');
  
  // Venue form
  const [venueName, setVenueName] = useState('');
  const [venueType, setVenueType] = useState('bar');
  const [venueAddress, setVenueAddress] = useState('');
  const [venueDescription, setVenueDescription] = useState('');
  
  // Event form
  const [eventName, setEventName] = useState('');
  const [eventVenueId, setEventVenueId] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventType, setEventType] = useState('live music');
  const [eventDate, setEventDate] = useState('');
  
  // AI User form
  const [aiEmail, setAiEmail] = useState('');
  const [aiDisplayName, setAiDisplayName] = useState('');
  const [aiBio, setAiBio] = useState('');
  
  // Lists
  const [venues, setVenues] = useState([]);
  const [events, setEvents] = useState([]);
  const [aiUsers, setAiUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      if (activeTab === 'venues') {
        const res = await getVenues();
        setVenues(res.data);
      } else if (activeTab === 'events') {
        const res = await getEvents();
        setEvents(res.data);
      } else if (activeTab === 'aiUsers') {
        const res = await getAIUsers();
        setAiUsers(res.data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleCreateVenue = async () => {
    if (!venueName || !venueAddress) {
      Alert.alert('Error', 'Please fill in venue name and address');
      return;
    }

    setLoading(true);
    try {
      await createVenue({
        name: venueName,
        type: venueType,
        address: venueAddress,
        description: venueDescription,
        city: 'Nashville',
        state: 'TN',
        closingTime: '02:00',
      });
      Alert.alert('Success', 'Venue created!');
      setVenueName('');
      setVenueAddress('');
      setVenueDescription('');
      loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to create venue');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async () => {
    if (!eventName || !eventVenueId || !eventDate) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      await createEvent({
        venueId: eventVenueId,
        name: eventName,
        description: eventDescription,
        eventDate: new Date(eventDate).toISOString(),
        eventType,
      });
      Alert.alert('Success', 'Event created!');
      setEventName('');
      setEventDescription('');
      setEventVenueId('');
      setEventDate('');
      loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAIUser = async () => {
    if (!aiEmail || !aiDisplayName) {
      Alert.alert('Error', 'Please fill in email and display name');
      return;
    }

    setLoading(true);
    try {
      await createAIUser({
        email: aiEmail,
        displayName: aiDisplayName,
        bio: aiBio,
      });
      Alert.alert('Success', 'AI user created with generated personality!');
      setAiEmail('');
      setAiDisplayName('');
      setAiBio('');
      loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to create AI user');
    } finally {
      setLoading(false);
    }
  };

  const renderVenueForm = () => (
    <View style={styles.form}>
      <Text style={styles.formTitle}>Create New Venue</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Venue Name"
        placeholderTextColor="#666"
        value={venueName}
        onChangeText={setVenueName}
      />

      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.typeButton, venueType === 'bar' && styles.typeButtonActive]}
          onPress={() => setVenueType('bar')}
        >
          <Text style={[styles.typeButtonText, venueType === 'bar' && styles.typeButtonTextActive]}>Bar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.typeButton, venueType === 'club' && styles.typeButtonActive]}
          onPress={() => setVenueType('club')}
        >
          <Text style={[styles.typeButtonText, venueType === 'club' && styles.typeButtonTextActive]}>Club</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.typeButton, venueType === 'venue' && styles.typeButtonActive]}
          onPress={() => setVenueType('venue')}
        >
          <Text style={[styles.typeButtonText, venueType === 'venue' && styles.typeButtonTextActive]}>Venue</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Address"
        placeholderTextColor="#666"
        value={venueAddress}
        onChangeText={setVenueAddress}
      />

      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Description"
        placeholderTextColor="#666"
        value={venueDescription}
        onChangeText={setVenueDescription}
        multiline
        numberOfLines={3}
      />

      <TouchableOpacity
        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
        onPress={handleCreateVenue}
        disabled={loading}
      >
        <Text style={styles.submitButtonText}>{loading ? 'CREATING...' : 'CREATE VENUE'}</Text>
      </TouchableOpacity>

      <View style={styles.list}>
        <Text style={styles.listTitle}>Existing Venues ({venues.length})</Text>
        {venues.slice(0, 5).map((venue: any) => (
          <View key={venue.id} style={styles.listItem}>
            <Text style={styles.listItemTitle}>{venue.name}</Text>
            <Text style={styles.listItemSubtitle}>{venue.type} • {venue.address}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderEventForm = () => (
    <View style={styles.form}>
      <Text style={styles.formTitle}>Create New Event</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Event Name"
        placeholderTextColor="#666"
        value={eventName}
        onChangeText={setEventName}
      />

      <TextInput
        style={styles.input}
        placeholder="Venue ID"
        placeholderTextColor="#666"
        value={eventVenueId}
        onChangeText={setEventVenueId}
      />

      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.typeButton, eventType === 'live music' && styles.typeButtonActive]}
          onPress={() => setEventType('live music')}
        >
          <Text style={[styles.typeButtonText, eventType === 'live music' && styles.typeButtonTextActive]}>Live Music</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.typeButton, eventType === 'party' && styles.typeButtonActive]}
          onPress={() => setEventType('party')}
        >
          <Text style={[styles.typeButtonText, eventType === 'party' && styles.typeButtonTextActive]}>Party</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.typeButton, eventType === 'special' && styles.typeButtonActive]}
          onPress={() => setEventType('special')}
        >
          <Text style={[styles.typeButtonText, eventType === 'special' && styles.typeButtonTextActive]}>Special</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Event Date (YYYY-MM-DD HH:MM)"
        placeholderTextColor="#666"
        value={eventDate}
        onChangeText={setEventDate}
      />

      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Description"
        placeholderTextColor="#666"
        value={eventDescription}
        onChangeText={setEventDescription}
        multiline
        numberOfLines={3}
      />

      <TouchableOpacity
        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
        onPress={handleCreateEvent}
        disabled={loading}
      >
        <Text style={styles.submitButtonText}>{loading ? 'CREATING...' : 'CREATE EVENT'}</Text>
      </TouchableOpacity>

      <View style={styles.list}>
        <Text style={styles.listTitle}>Existing Events ({events.length})</Text>
        {events.slice(0, 5).map((event: any) => (
          <View key={event.id} style={styles.listItem}>
            <Text style={styles.listItemTitle}>{event.name}</Text>
            <Text style={styles.listItemSubtitle}>{event.eventType} • {new Date(event.eventDate).toLocaleDateString()}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderAIUserForm = () => (
    <View style={styles.form}>
      <Text style={styles.formTitle}>Create AI Test User</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#666"
        value={aiEmail}
        onChangeText={setAiEmail}
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="Display Name"
        placeholderTextColor="#666"
        value={aiDisplayName}
        onChangeText={setAiDisplayName}
      />

      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Bio (optional)"
        placeholderTextColor="#666"
        value={aiBio}
        onChangeText={setAiBio}
        multiline
        numberOfLines={3}
      />

      <TouchableOpacity
        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
        onPress={handleCreateAIUser}
        disabled={loading}
      >
        <Text style={styles.submitButtonText}>{loading ? 'CREATING...' : 'CREATE AI USER'}</Text>
      </TouchableOpacity>

      <View style={styles.list}>
        <Text style={styles.listTitle}>AI Users ({aiUsers.length})</Text>
        {aiUsers.map((user: any) => (
          <View key={user.id} style={styles.listItem}>
            <View style={styles.listItemHeader}>
              <Text style={styles.listItemTitle}>{user.displayName}</Text>
              {user.isPremium && <Ionicons name="star" size={16} color="#FFD700" />}
            </View>
            <Text style={styles.listItemSubtitle}>{user.email}</Text>
            <Text style={styles.aiPersonality}>"{user.personalityText}"</Text>
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#00E5FF" />
        </TouchableOpacity>
        <Text style={styles.title}>⚡ ADMIN PANEL</Text>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'venues' && styles.tabActive]}
          onPress={() => setActiveTab('venues')}
        >
          <Ionicons name="location" size={20} color={activeTab === 'venues' ? '#00E5FF' : '#666'} />
          <Text style={[styles.tabText, activeTab === 'venues' && styles.tabTextActive]}>Venues</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'events' && styles.tabActive]}
          onPress={() => setActiveTab('events')}
        >
          <Ionicons name="calendar" size={20} color={activeTab === 'events' ? '#00E5FF' : '#666'} />
          <Text style={[styles.tabText, activeTab === 'events' && styles.tabTextActive]}>Events</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'aiUsers' && styles.tabActive]}
          onPress={() => setActiveTab('aiUsers')}
        >
          <Ionicons name="people" size={20} color={activeTab === 'aiUsers' ? '#00E5FF' : '#666'} />
          <Text style={[styles.tabText, activeTab === 'aiUsers' && styles.tabTextActive]}>AI Users</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {activeTab === 'venues' && renderVenueForm()}
        {activeTab === 'events' && renderEventForm()}
        {activeTab === 'aiUsers' && renderAIUserForm()}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#00E5FF',
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00E5FF',
    letterSpacing: 2,
  },
  headerRight: {
    width: 32,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#00E5FF',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#00E5FF',
  },
  content: {
    flex: 1,
  },
  form: {
    padding: 20,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
  },
  typeButtonActive: {
    borderColor: '#00E5FF',
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
  },
  typeButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  typeButtonTextActive: {
    color: '#00E5FF',
  },
  submitButton: {
    backgroundColor: '#00E5FF',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 24,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  list: {
    marginTop: 20,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00E5FF',
    marginBottom: 12,
  },
  listItem: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  listItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  listItemSubtitle: {
    fontSize: 14,
    color: '#999',
  },
  aiPersonality: {
    fontSize: 13,
    color: '#00E5FF',
    fontStyle: 'italic',
    marginTop: 8,
  },
});