import axios from 'axios';
import Constants from 'expo-constants';

const API_BASE_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001';

export const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

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
export const getVenueCheckins = (venueId: string) => api.get(`/checkins/venue/${venueId}`);
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
