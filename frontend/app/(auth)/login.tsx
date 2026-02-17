import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Login() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      router.replace('/(tabs)/venues');
    } catch (error: any) {
      Alert.alert('Login Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView 
        style={styles.keyboardView} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color="#00E5FF" />
        </TouchableOpacity>

        <View style={styles.content}>
          <Text style={styles.title}>WELCOME BACK</Text>
          <Text style={styles.subtitle}>Ready to make questionable decisions?</Text>

          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#666"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#666"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <TouchableOpacity 
              style={[styles.button, loading && styles.buttonDisabled]} 
              onPress={handleLogin}
              disabled={loading}
            >
              <Text style={styles.buttonText}>{loading ? 'LOGGING IN...' : 'LOGIN'}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
              <Text style={styles.linkText}>Don't have an account? <Text style={styles.linkBold}>Sign Up</Text></Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  keyboardView: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    top: 10,
    left: 20,
    zIndex: 100,
    padding: 8,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 60,
  },
  title: {
    fontSize: 36,
    fontFamily: 'Carrington',
    color: '#00E5FF',
    letterSpacing: 3,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.7,
    marginBottom: 40,
  },
  form: {
    gap: 16,
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
  button: {
    backgroundColor: '#00E5FF',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  linkText: {
    color: '#FFFFFF',
    opacity: 0.7,
    textAlign: 'center',
    marginTop: 16,
  },
  linkBold: {
    color: '#00E5FF',
    fontWeight: 'bold',
  },
});
