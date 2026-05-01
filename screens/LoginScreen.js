import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Alert,
  KeyboardAvoidingView, Platform, ScrollView,
  ActivityIndicator, StyleSheet, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { C, S, R } from '../theme';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing Fields', 'Please enter email and password');
      return;
    }
    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      navigation.replace('HomeRouter');
    } catch (error) {
      const msgs = {
        'auth/user-not-found': 'No account found with this email',
        'auth/wrong-password': 'Incorrect password',
        'auth/invalid-email': 'Invalid email format',
        'auth/user-disabled': 'This account has been disabled',
        'auth/invalid-credential': 'Invalid email or password',
      };
      Alert.alert('Login Failed', msgs[error.code] || error.message);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (field) => [
    styles.input,
    focusedField === field && styles.inputFocused,
  ];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={styles.logoArea}>
          <View style={styles.logoBox}>
            <Text style={styles.logoHid}>Hid</Text>
            <Text style={styles.logoG}>G</Text>
          </View>
          <Text style={styles.tagline}>Scrap Smart • Recycle Better</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome back</Text>
          <Text style={styles.cardSub}>Sign in to your account</Text>

          {/* Email */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email address</Text>
            <View style={[styles.inputWrap, focusedField === 'email' && styles.inputWrapFocused]}>
              <Ionicons name="mail-outline" size={18} color={focusedField === 'email' ? C.primary : C.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.inputInner}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="hello@example.com"
                placeholderTextColor={C.textMuted}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={[styles.inputWrap, focusedField === 'password' && styles.inputWrapFocused]}>
              <Ionicons name="lock-closed-outline" size={18} color={focusedField === 'password' ? C.primary : C.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.inputInner}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                placeholder="••••••••"
                placeholderTextColor={C.textMuted}
                autoCapitalize="none"
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={C.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.forgotBtn} onPress={() => Alert.alert('Coming Soon', 'Password reset coming soon.')}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.btnText}>Sign In</Text>
            }
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Register */}
          <TouchableOpacity
            style={styles.outlineBtn}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.outlineBtnText}>Create an Account</Text>
          </TouchableOpacity>

          {/* Debug Account Button */}
          <TouchableOpacity
            style={styles.debugBtn}
            onPress={() => navigation.navigate('AccountDebugScreen')}
          >
            <Ionicons name="bug-outline" size={16} color="#6b7280" />
            <Text style={styles.debugBtnText}>Check Account Type</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>♻️ Convert your waste to value</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },

  logoArea: { alignItems: 'center', marginBottom: 36 },
  logoBox: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  logoHid: { fontSize: 52, fontWeight: '900', color: C.textPrimary, letterSpacing: -1 },
  logoG: { fontSize: 52, fontWeight: '900', color: C.primary, letterSpacing: -1, marginLeft: -4 },
  tagline: { fontSize: 14, color: C.textMuted, fontWeight: '500' },

  card: {
    backgroundColor: C.surface, borderRadius: R.xxl,
    padding: 24, borderWidth: 1, borderColor: C.border, ...S.cardMd,
  },
  cardTitle: { fontSize: 22, fontWeight: '800', color: C.textPrimary, marginBottom: 4 },
  cardSub: { fontSize: 14, color: C.textSecondary, marginBottom: 24 },

  fieldGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: C.textSecondary, marginBottom: 6 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surfaceAlt, borderRadius: R.md,
    borderWidth: 1.5, borderColor: C.border, paddingHorizontal: 12,
  },
  inputWrapFocused: { borderColor: C.primary, backgroundColor: C.primaryLight },
  inputIcon: { marginRight: 8 },
  inputInner: { flex: 1, fontSize: 15, color: C.textPrimary, paddingVertical: 13 },
  eyeBtn: { padding: 4 },

  forgotBtn: { alignSelf: 'flex-end', marginBottom: 20 },
  forgotText: { fontSize: 13, color: C.primary, fontWeight: '600' },

  btn: {
    backgroundColor: C.primary, borderRadius: R.lg,
    paddingVertical: 15, alignItems: 'center', ...S.btn,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: C.border },
  dividerText: { color: C.textMuted, fontSize: 13, marginHorizontal: 12 },

  outlineBtn: {
    borderRadius: R.lg, paddingVertical: 14, alignItems: 'center',
    borderWidth: 1.5, borderColor: C.primary,
  },
  outlineBtnText: { color: C.primary, fontSize: 15, fontWeight: '700' },

  debugBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: 12, paddingVertical: 10,
  },
  debugBtnText: { color: '#6b7280', fontSize: 13, fontWeight: '600' },

  footer: { textAlign: 'center', color: C.textMuted, fontSize: 13, marginTop: 28 },
});
