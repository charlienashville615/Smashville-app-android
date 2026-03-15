import axios from 'axios';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001';

export const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});
api.interceptors.request.use(async (config) => {
  const userData = await AsyncStorage.getItem('user');
  if (userData) {
    const { token } = JSON.parse(userData);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});
// -------------------------------

// Auth
export const signup = (data: any) => api.post('/auth/signup', data);
export const login = (email: string, password: string) => api.post('/auth/login', { email, password });

// Users
export const getUser = (userId: string) => api.get(`/users/${userId}`);
export const updateUser = (userId: string, updates: any) => api.put(`/users/${userId}`, updates);
export const regenerateAI = (userId: string) => api.post(`/users/${userId}/regenerate-ai`);

// Venues
export const getVenues = (city = 'Nashville') => api.get('/venues', { params: { city } });
export const getVenue = (venueId: string) => api.get(`/venues/${venueId}`);
export const createVenue = (data: any) => api.post('/venues', data);

// Check-ins
export const checkIn = (data: any) => api.post('/checkins', data);
export const getUserCheckin = (userId: string) => api.get(`/checkins/user/${userId}`);
export const getVenueCheckins = (venueId: string, userId?: string) => api.get(`/checkins/venue/${venueId}`, { params: userId ? { user_id: userId } : {} });
export const checkout = (checkinId: string) => api.delete(`/checkins/${checkinId}`);

// Swipes & Matches
export const swipe = (data: any) => api.post('/swipes', data);
export const getUserMatches = (userId: string) => api.get(`/matches/user/${userId}`);

// Messages
export const sendMessage = (data: any) => api.post('/messages', data);
export const getMatchMessages = (matchId: string) => api.get(`/messages/match/${matchId}`);

// Events
export const getEvents = () => api.get('/events');
export const createEvent = (data: any) => api.post('/events', data);
export const createRSVP = (data: any) => api.post('/rsvps', data);
export const getUserRSVPs = (userId: string) => api.get(`/rsvps/user/${userId}`);

// Gifts
export const getGifts = () => api.get('/gifts');
export const sendGift = (data: any) => api.post('/gifts/send', data);

// Admin
export const createAIUser = (data: any) => api.post('/admin/ai-user', data);
export const getAIUsers = () => api.get('/admin/ai-users');
export const getAllUsers = (adminId: string) => api.get('/admin/all-users', { params: { admin_id: adminId } });
export const makeAdmin = (adminId: string, targetUserId: string) => api.post('/admin/make-admin', { admin_id: adminId, target_user_id: targetUserId });
export const banUser = (adminId: string, targetUserId: string, ban: boolean) => api.post('/admin/ban-user', { admin_id: adminId, target_user_id: targetUserId, ban });
export const blockUser = (adminId: string, targetUserId: string, block: boolean) => api.post('/admin/block-user', { admin_id: adminId, target_user_id: targetUserId, block });
export const timeoutUser = (adminId: string, targetUserId: string, hours: number) => api.post('/admin/timeout-user', { admin_id: adminId, target_user_id: targetUserId, hours });

// Support & Settings
export const createSupportTicket = (data: any) => api.post('/support/ticket', data);
export const getSupportTickets = (adminId: string) => api.get('/support/tickets', { params: { admin_id: adminId } });
export const getSettings = () => api.get('/settings');
export const updateSettings = (adminId: string, supportEmail: string) => api.put('/settings', { admin_id: adminId, supportEmail });

// Flirts
export const sendFlirt = (data: any) => api.post('/flirts', data);
export const getUserFlirts = (userId: string) => api.get(`/flirts/user/${userId}`);

// Emergency Contacts
export const createEmergencyContact = (data: any) => api.post('/emergency-contacts', data);
export const getUserEmergencyContacts = (userId: string) => api.get(`/emergency-contacts/user/${userId}`);
export const updateEmergencyContact = (contactId: string, updates: any) => api.put(`/emergency-contacts/${contactId}`, updates);
export const deleteEmergencyContact = (contactId: string) => api.delete(`/emergency-contacts/${contactId}`);

// Emergency Alerts
export const activateEmergencyAlert = (data: any) => api.post('/emergency-alert/activate', data);
export const updateEmergencyLocation = (data: any) => api.post('/emergency-alert/update-location', data);
export const deactivateEmergencyAlert = (data: any) => api.post('/emergency-alert/deactivate', data);
export const getActiveAlert = (userId: string) => api.get(`/emergency-alert/active/${userId}`);

// Emergency PIN
export const setEmergencyPin = (userId: string, pin: string) => api.post(`/users/${userId}/emergency-pin`, { pin });
