import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Linking, Modal, Animated, Platform } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import Svg, { Circle, Text as SvgText, TSpan, Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import {
  getUserEmergencyContacts,
  createEmergencyContact,
  updateEmergencyContact,
  deleteEmergencyContact,
  activateEmergencyAlert,
  updateEmergencyLocation,
  deactivateEmergencyAlert,
  getActiveAlert,
  setEmergencyPin,
} from '../../utils/api';

export default function SafetyCenter() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [activeAlert, setActiveAlert] = useState(null);
  const [showAddContact, setShowAddContact] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  
  // Form states
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactRelationship, setContactRelationship] = useState('');
  const [pin, setPin] = useState('');
  const [deactivatePin, setDeactivatePin] = useState('');
  
  // Animation
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [locationUpdateInterval, setLocationUpdateInterval] = useState(null);

  useEffect(() => {
    loadContacts();
    checkActiveAlert();
    
    // Pulsing animation for emergency button
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const loadContacts = async () => {
    if (!user) return;
    try {
      const response = await getUserEmergencyContacts(user.id);
      setContacts(response.data);
    } catch (error) {
      console.error('Error loading contacts:', error);
    }
  };

  const checkActiveAlert = async () => {
    if (!user) return;
    try {
      const response = await getActiveAlert(user.id);
      if (response.data) {
        setActiveAlert(response.data);
        // Start location updates if alert is active
        startLocationUpdates(response.data.id);
      }
    } catch (error) {
      console.error('Error checking alert:', error);
    }
  };

  const handleAddContact = async () => {
    if (!contactName || !contactPhone) {
      Alert.alert('Error', 'Please enter name and phone number');
      return;
    }

    try {
      await createEmergencyContact({
        userId: user.id,
        name: contactName,
        phoneNumber: contactPhone,
        relationship: contactRelationship,
      });
      Alert.alert('Success', 'Emergency contact added');
      setContactName('');
      setContactPhone('');
      setContactRelationship('');
      setShowAddContact(false);
      loadContacts();
    } catch (error) {
      Alert.alert('Error', 'Failed to add contact');
    }
  };

  const handleDeleteContact = (contactId: string, name: string) => {
    Alert.alert(
      'Delete Contact',
      `Remove ${name} from emergency contacts?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEmergencyContact(contactId);
              loadContacts();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete contact');
            }
          },
        },
      ]
    );
  };

  const handleSetPin = async () => {
    if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      Alert.alert('Error', 'PIN must be exactly 4 digits');
      return;
    }

    try {
      await setEmergencyPin(user.id, pin);
      Alert.alert('Success', 'Emergency PIN set successfully');
      setPin('');
      setShowPinModal(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to set PIN');
    }
  };

  const startLocationUpdates = (alertId: string) => {
    // Clear any existing interval
    if (locationUpdateInterval) {
      clearInterval(locationUpdateInterval);
    }

    // Update location every 5 minutes
    const interval = setInterval(async () => {
      try {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        
        await updateEmergencyLocation({
          alertId,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        
        console.log('Location updated:', location.coords);
      } catch (error) {
        console.error('Error updating location:', error);
      }
    }, 5 * 60 * 1000); // 5 minutes

    setLocationUpdateInterval(interval);
  };

  const handleActivateEmergency = async () => {
    if (contacts.length === 0) {
      Alert.alert(
        'No Emergency Contacts',
        'Please add emergency contacts before activating alert.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (!user.emergencyPin) {
      Alert.alert(
        'No Security PIN',
        'Please set a security PIN before activating alert.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Set PIN', onPress: () => setShowPinModal(true) },
        ]
      );
      return;
    }

    Alert.alert(
      '🚨 EMERGENCY ALERT',
      'Activate emergency alert? Your location will be shared with all emergency contacts and updated every 5 minutes.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'ACTIVATE',
          style: 'destructive',
          onPress: async () => {
            try {
              // Request location permission
              const { status } = await Location.requestForegroundPermissionsAsync();
              if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Location access is required for emergency alerts');
                return;
              }

              // Get current location
              const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
              });

              // Activate alert
              const response = await activateEmergencyAlert({
                userId: user.id,
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
              });

              setActiveAlert(response.data);
              startLocationUpdates(response.data.id);

              Alert.alert(
                'ALERT ACTIVATED',
                `Emergency contacts have been notified.\n\nLocation: ${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}`,
                [{ text: 'OK' }]
              );
            } catch (error) {
              console.error('Error activating alert:', error);
              Alert.alert('Error', 'Failed to activate emergency alert');
            }
          },
        },
      ]
    );
  };

  const handleDeactivate = async () => {
    if (!deactivatePin || deactivatePin.length !== 4) {
      Alert.alert('Error', 'Please enter your 4-digit PIN');
      return;
    }

    try {
      await deactivateEmergencyAlert({
        alertId: activeAlert.id,
        userId: user.id,
        pin: deactivatePin,
      });

      // Clear location updates
      if (locationUpdateInterval) {
        clearInterval(locationUpdateInterval);
        setLocationUpdateInterval(null);
      }

      setActiveAlert(null);
      setDeactivatePin('');
      setShowDeactivateModal(false);
      Alert.alert('Alert Deactivated', 'Emergency alert has been deactivated');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to deactivate alert');
    }
  };

  const openUber = () => {
    Linking.openURL('uber://').catch(() => {
      Linking.openURL('https://m.uber.com/');
    });
  };

  const openLyft = () => {
    Linking.openURL('lyft://').catch(() => {
      Linking.openURL('https://www.lyft.com/');
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>🛡️ SAFETY CENTER</Text>
        {activeAlert && (
          <View style={styles.activeAlertBadge}>
            <Text style={styles.activeAlertText}>ALERT ACTIVE</Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Ride Share Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Get Home Safely</Text>
          <View style={styles.rideShareButtons}>
            <TouchableOpacity style={styles.rideButton} onPress={openUber}>
              <Text style={styles.rideButtonText}>🚗 UBER</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.rideButton} onPress={openLyft}>
              <Text style={styles.rideButtonText}>🚙 LYFT</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Emergency Button */}
        <View style={styles.emergencySection}>
          {activeAlert ? (
            <TouchableOpacity
              style={styles.deactivateButton}
              onPress={() => setShowDeactivateModal(true)}
            >
              <Text style={styles.deactivateButtonText}>DEACTIVATE ALERT</Text>
              <Text style={styles.deactivateSubtext}>Enter PIN to deactivate</Text>
            </TouchableOpacity>
          ) : (
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <TouchableOpacity
                style={styles.emergencyButton}
                onPress={handleActivateEmergency}
                activeOpacity={0.8}
              >
                <Svg height="200" width="200" viewBox="0 0 200 200">
                  <Defs>
                    <LinearGradient id="redGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <Stop offset="0%" stopColor="#FF0000" stopOpacity="1" />
                      <Stop offset="100%" stopColor="#CC0000" stopOpacity="1" />
                    </LinearGradient>
                  </Defs>
                  
                  {/* Main circle */}
                  <Circle
                    cx="100"
                    cy="100"
                    r="85"
                    fill="url(#redGrad)"
                    stroke="#FFFFFF"
                    strokeWidth="3"
                  />
                  
                  {/* Circular text */}
                  <Path
                    id="circlePath"
                    d="M 100, 100 m -75, 0 a 75,75 0 1,1 150,0 a 75,75 0 1,1 -150,0"
                    fill="none"
                  />
                  <SvgText fill="#FFFFFF" fontSize="18" fontWeight="bold">
                    <TSpan>
                      <TSpan href="#circlePath" startOffset="0%">
                        EMERGENCY • EMERGENCY • 
                      </TSpan>
                    </TSpan>
                  </SvgText>
                  
                  {/* Center icon */}
                  <SvgText
                    x="100"
                    y="110"
                    textAnchor="middle"
                    fontSize="48"
                    fill="#FFFFFF"
                  >
                    ⚠️
                  </SvgText>
                </Svg>
              </TouchableOpacity>
            </Animated.View>
          )}
          <Text style={styles.emergencyHint}>
            {activeAlert
              ? 'Location is being tracked and shared with emergency contacts'
              : 'Tap to activate emergency alert'}
          </Text>
        </View>

        {/* Emergency PIN Setup */}
        {!user?.emergencyPin && (
          <TouchableOpacity
            style={styles.setupPinButton}
            onPress={() => setShowPinModal(true)}
          >
            <Ionicons name="lock-closed" size={24} color="#FFD700" />
            <Text style={styles.setupPinText}>Set Security PIN</Text>
          </TouchableOpacity>
        )}

        {/* Emergency Contacts */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Emergency Contacts</Text>
            <TouchableOpacity onPress={() => setShowAddContact(true)}>
              <Ionicons name="add-circle" size={28} color="#00E5FF" />
            </TouchableOpacity>
          </View>

          {contacts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No emergency contacts added</Text>
              <Text style={styles.emptySubtext}>Add trusted contacts who will be notified during emergencies</Text>
            </View>
          ) : (
            contacts.map((contact: any) => (
              <View key={contact.id} style={styles.contactCard}>
                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>{contact.name}</Text>
                  <Text style={styles.contactPhone}>{contact.phoneNumber}</Text>
                  {contact.relationship && (
                    <Text style={styles.contactRelationship}>{contact.relationship}</Text>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => handleDeleteContact(contact.id, contact.name)}
                >
                  <Ionicons name="trash-outline" size={24} color="#FF4458" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Add Contact Modal */}
      <Modal
        visible={showAddContact}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddContact(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Emergency Contact</Text>
              <TouchableOpacity onPress={() => setShowAddContact(false)}>
                <Ionicons name="close" size={28} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Name"
              placeholderTextColor="#666"
              value={contactName}
              onChangeText={setContactName}
            />

            <TextInput
              style={styles.input}
              placeholder="Phone Number"
              placeholderTextColor="#666"
              value={contactPhone}
              onChangeText={setContactPhone}
              keyboardType="phone-pad"
            />

            <TextInput
              style={styles.input}
              placeholder="Relationship (optional)"
              placeholderTextColor="#666"
              value={contactRelationship}
              onChangeText={setContactRelationship}
            />

            <TouchableOpacity style={styles.modalButton} onPress={handleAddContact}>
              <Text style={styles.modalButtonText}>ADD CONTACT</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* PIN Setup Modal */}
      <Modal
        visible={showPinModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPinModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Set Security PIN</Text>
              <TouchableOpacity onPress={() => setShowPinModal(false)}>
                <Ionicons name="close" size={28} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <Text style={styles.pinInfo}>
              Create a 4-digit PIN to deactivate emergency alerts. Keep this secure!
            </Text>

            <TextInput
              style={styles.input}
              placeholder="4-Digit PIN"
              placeholderTextColor="#666"
              value={pin}
              onChangeText={setPin}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
            />

            <TouchableOpacity style={styles.modalButton} onPress={handleSetPin}>
              <Text style={styles.modalButtonText}>SET PIN</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Deactivate Alert Modal */}
      <Modal
        visible={showDeactivateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDeactivateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Deactivate Alert</Text>
              <TouchableOpacity onPress={() => setShowDeactivateModal(false)}>
                <Ionicons name="close" size={28} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <Text style={styles.pinInfo}>Enter your 4-digit security PIN to deactivate the emergency alert</Text>

            <TextInput
              style={styles.input}
              placeholder="Enter PIN"
              placeholderTextColor="#666"
              value={deactivatePin}
              onChangeText={setDeactivatePin}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
            />

            <TouchableOpacity style={[styles.modalButton, styles.dangerButton]} onPress={handleDeactivate}>
              <Text style={styles.modalButtonText}>DEACTIVATE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  activeAlertBadge: {
    backgroundColor: '#FF0000',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  activeAlertText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  rideShareButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  rideButton: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderWidth: 2,
    borderColor: '#00E5FF',
    borderRadius: 12,
    paddingVertical: 20,
    alignItems: 'center',
  },
  rideButtonText: {
    color: '#00E5FF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  emergencySection: {
    alignItems: 'center',
    marginVertical: 32,
  },
  emergencyButton: {
    shadowColor: '#FF0000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
  },
  emergencyHint: {
    color: '#999',
    fontSize: 14,
    marginTop: 16,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  deactivateButton: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 32,
    paddingVertical: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  deactivateButtonText: {
    color: '#000000',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  deactivateSubtext: {
    color: '#000000',
    fontSize: 12,
    marginTop: 4,
  },
  setupPinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderWidth: 2,
    borderColor: '#FFD700',
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 24,
    gap: 12,
  },
  setupPinText: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
  },
  contactCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  contactPhone: {
    fontSize: 16,
    color: '#00E5FF',
    marginBottom: 2,
  },
  contactRelationship: {
    fontSize: 14,
    color: '#999',
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00E5FF',
  },
  input: {
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 16,
  },
  modalButton: {
    backgroundColor: '#00E5FF',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  dangerButton: {
    backgroundColor: '#FF4458',
  },
  modalButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  pinInfo: {
    color: '#999',
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
});
