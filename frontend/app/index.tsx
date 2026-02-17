import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';

export default function Index() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace('/(tabs)/venues');
      }
    }
  }, [user, loading]);

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loading}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.logo}>⚡</Text>
        <Text style={styles.title}>SMASHVILLE</Text>
        <Text style={styles.subtitle}>Nashville's Electric Dating Scene</Text>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={styles.buttonText}>LOGIN</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.buttonOutline]}
            onPress={() => router.push('/(auth)/signup')}
          >
            <Text style={[styles.buttonText, styles.buttonTextOutline]}>SIGN UP</Text>
          </TouchableOpacity>
        </View>
        
        <Text style={styles.tagline}>"Where your mom's approval is optional"</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logo: {
    fontSize: 80,
    marginBottom: 16,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#00E5FF',
    letterSpacing: 4,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 48,
    opacity: 0.8,
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
  },
  button: {
    backgroundColor: '#00E5FF',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#00E5FF',
  },
  buttonText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  buttonTextOutline: {
    color: '#00E5FF',
  },
  tagline: {
    marginTop: 32,
    color: '#FFFFFF',
    fontSize: 14,
    opacity: 0.6,
    fontStyle: 'italic',
  },
  loading: {
    color: '#00E5FF',
    fontSize: 18,
  },
});
