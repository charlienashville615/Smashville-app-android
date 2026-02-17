import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const GENDER_OPTIONS = ['Male', 'Female', 'Non-Binary', 'Other'];
const PREFERENCE_OPTIONS = ['Men', 'Women', 'Everyone', 'Other'];

export default function Signup() {
  const router = useRouter();
  const { signup } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [sexualPreference, setSexualPreference] = useState('');
  const [bio, setBio] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!email || !password || !displayName || !username) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    if (!agreedToTerms) {
      Alert.alert('Error', 'You must agree to the Terms of Service');
      return;
    }
    const ageNum = parseInt(age);
    if (age && (isNaN(ageNum) || ageNum < 18 || ageNum > 120)) {
      Alert.alert('Error', 'You must be 18 or older');
      return;
    }

    setLoading(true);
    try {
      await signup({
        email,
        password,
        displayName,
        username,
        age: ageNum || null,
        gender: gender.toLowerCase() || null,
        sexualPreference: sexualPreference.toLowerCase() || null,
        bio,
        photos: [],
        currentVibe: 'just vibing',
        agreedToTerms: true,
      });
      router.replace('/(tabs)/venues');
    } catch (error: any) {
      Alert.alert('Signup Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  if (showTerms) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.tosHeader}>
          <TouchableOpacity onPress={() => setShowTerms(false)}>
            <Ionicons name="arrow-back" size={28} color="#00E5FF" />
          </TouchableOpacity>
          <Text style={styles.tosTitle}>Terms of Service</Text>
        </View>
        <ScrollView style={styles.tosContent}>
          <Text style={styles.tosText}>
            {`SMASHVILLE TERMS OF SERVICE\n\nLast Updated: February 2026\n\n1. ACCEPTANCE OF TERMS\nBy creating an account or using Smashville, you agree to be bound by these Terms of Service.\n\n2. ELIGIBILITY\nYou must be at least 18 years old to use Smashville. By using the app, you represent that you are at least 18.\n\n3. ACCOUNT RESPONSIBILITY\nYou are responsible for maintaining the confidentiality of your account. You agree to provide accurate information.\n\n4. USER CONDUCT\nYou agree not to:\n- Harass, threaten, or abuse other users\n- Post false or misleading information\n- Use the app for illegal purposes\n- Create fake profiles or impersonate others\n- Send spam or unsolicited messages\n\n5. VENUE CHECK-INS\nCheck-ins require GPS verification. Falsifying your location is a violation of these terms.\n\n6. CONTENT\nYou retain ownership of content you post. By posting, you grant Smashville a license to display it within the app.\n\n7. PREMIUM SUBSCRIPTION\nPremium features are available for $14.99/month. Subscriptions auto-renew unless cancelled.\n\n8. SAFETY\nSmashville provides safety features including emergency contacts and alerts. These are tools to assist you but do not guarantee safety.\n\n9. PRIVACY\nYour privacy is important. We collect location data only for check-in verification. See our Privacy Policy for details.\n\n10. TERMINATION\nWe may terminate or suspend your account for violations of these terms.\n\n11. DISCLAIMER\nSmashville is provided "as is." We make no warranties about the reliability or safety of interactions.\n\n12. LIMITATION OF LIABILITY\nSmashville is not liable for any damages arising from use of the app or interactions with other users.\n\n13. CHANGES TO TERMS\nWe may update these terms. Continued use constitutes acceptance.\n\nContact: support@smashville.app`}
          </Text>
        </ScrollView>
        <TouchableOpacity
          style={styles.tosAcceptButton}
          onPress={() => { setAgreedToTerms(true); setShowTerms(false); }}
        >
          <Text style={styles.tosAcceptText}>I AGREE</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color="#00E5FF" />
        </TouchableOpacity>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            <Text style={styles.title}>JOIN{'\n'}SMASHVILLE</Text>
            <Text style={styles.subtitle}>Swipe right on Nashville</Text>

            <View style={styles.form}>
              <TextInput
                style={styles.input}
                placeholder="Display Name *"
                placeholderTextColor="#666"
                value={displayName}
                onChangeText={setDisplayName}
              />

              <TextInput
                style={styles.input}
                placeholder="Username *"
                placeholderTextColor="#666"
                value={username}
                onChangeText={(text) => setUsername(text.replace(/\s/g, '').toLowerCase())}
                autoCapitalize="none"
              />

              <TextInput
                style={styles.input}
                placeholder="Email *"
                placeholderTextColor="#666"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />

              <TextInput
                style={styles.input}
                placeholder="Password *"
                placeholderTextColor="#666"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />

              <TextInput
                style={styles.input}
                placeholder="Age (18+)"
                placeholderTextColor="#666"
                value={age}
                onChangeText={setAge}
                keyboardType="number-pad"
                maxLength={3}
              />

              <Text style={styles.label}>Gender</Text>
              <View style={styles.chipRow}>
                {GENDER_OPTIONS.map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[styles.chip, gender === g && styles.chipActive]}
                    onPress={() => setGender(gender === g ? '' : g)}
                  >
                    <Text style={[styles.chipText, gender === g && styles.chipTextActive]}>{g}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Interested In</Text>
              <View style={styles.chipRow}>
                {PREFERENCE_OPTIONS.map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.chip, sexualPreference === p && styles.chipActive]}
                    onPress={() => setSexualPreference(sexualPreference === p ? '' : p)}
                  >
                    <Text style={[styles.chipText, sexualPreference === p && styles.chipTextActive]}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Bio (optional)"
                placeholderTextColor="#666"
                value={bio}
                onChangeText={setBio}
                multiline
                numberOfLines={3}
              />

              {/* Terms of Service */}
              <TouchableOpacity style={styles.tosRow} onPress={() => setAgreedToTerms(!agreedToTerms)}>
                <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
                  {agreedToTerms && <Ionicons name="checkmark" size={16} color="#000" />}
                </View>
                <Text style={styles.tosLabel}>
                  I agree to the{' '}
                  <Text style={styles.tosLink} onPress={() => setShowTerms(true)}>Terms of Service</Text>
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, (loading || !agreedToTerms) && styles.buttonDisabled]}
                onPress={handleSignup}
                disabled={loading || !agreedToTerms}
              >
                <Text style={styles.buttonText}>{loading ? 'CREATING...' : 'SIGN UP'}</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                <Text style={styles.linkText}>Already have an account? <Text style={styles.linkBold}>Login</Text></Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 40 },
  backButton: { position: 'absolute', top: 10, left: 20, zIndex: 100, padding: 8 },
  content: { flex: 1, paddingHorizontal: 32, paddingTop: 60, paddingBottom: 40 },
  title: { fontSize: 36, fontWeight: 'bold', color: '#00E5FF', letterSpacing: 3, marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#FFFFFF', opacity: 0.7, marginBottom: 24 },
  form: { gap: 14 },
  label: { fontSize: 13, color: '#00E5FF', fontWeight: '600', marginTop: 4, marginBottom: -6 },
  input: { backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#333', borderRadius: 8, padding: 16, fontSize: 16, color: '#FFFFFF' },
  textArea: { height: 80, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#333', backgroundColor: '#1A1A1A' },
  chipActive: { borderColor: '#00E5FF', backgroundColor: 'rgba(0,229,255,0.15)' },
  chipText: { fontSize: 14, color: '#999' },
  chipTextActive: { color: '#00E5FF', fontWeight: '600' },
  tosRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#666', justifyContent: 'center', alignItems: 'center' },
  checkboxChecked: { backgroundColor: '#00E5FF', borderColor: '#00E5FF' },
  tosLabel: { flex: 1, fontSize: 14, color: '#999' },
  tosLink: { color: '#00E5FF', textDecorationLine: 'underline' },
  button: { backgroundColor: '#00E5FF', paddingVertical: 16, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: '#000000', fontSize: 18, fontWeight: 'bold', letterSpacing: 2 },
  linkText: { color: '#FFFFFF', opacity: 0.7, textAlign: 'center', marginTop: 16 },
  linkBold: { color: '#00E5FF', fontWeight: 'bold' },
  tosHeader: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 16, borderBottomWidth: 1, borderBottomColor: '#333' },
  tosTitle: { fontSize: 20, fontWeight: 'bold', color: '#00E5FF' },
  tosContent: { flex: 1, padding: 20 },
  tosText: { fontSize: 14, color: '#CCC', lineHeight: 22 },
  tosAcceptButton: { backgroundColor: '#00E5FF', margin: 20, paddingVertical: 16, borderRadius: 8, alignItems: 'center' },
  tosAcceptText: { color: '#000', fontSize: 18, fontWeight: 'bold', letterSpacing: 2 },
});
