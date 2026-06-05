import { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Mode = 'signin' | 'signup';

export default function AuthScreen() {
  const theme = useTheme();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setError(null);
    setSubmitting(true);

    const { error: authError } = mode === 'signup'
      ? await signUp(trimmedEmail, password)
      : await signIn(trimmedEmail, password);

    if (authError) {
      setError(authError);
      setSubmitting(false);
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setError('Could not start session. Please try again.');
      setSubmitting(false);
      return;
    }

    const { data: userRow } = await supabase
      .from('users')
      .select('id')
      .eq('id', session.user.id)
      .maybeSingle();

    setSubmitting(false);
    router.replace(userRow ? '/(tabs)' : '/(auth)/onboarding/age');
  }

  function toggleMode() {
    setMode(m => (m === 'signin' ? 'signup' : 'signin'));
    setError(null);
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          style={styles.inner}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.header}>
            <ThemedText type="title" style={styles.appName}>The Debate</ThemedText>
            <ThemedText type="default" themeColor="textSecondary" style={styles.tagline}>
              No name. No photo. Just your opinion.
            </ThemedText>
          </View>

          <View style={styles.form}>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.backgroundElement,
                  color: theme.text,
                  borderColor: theme.backgroundSelected,
                },
              ]}
              placeholder="Email"
              placeholderTextColor={theme.textSecondary}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              returnKeyType="next"
              editable={!submitting}
            />
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.backgroundElement,
                  color: theme.text,
                  borderColor: theme.backgroundSelected,
                },
              ]}
              placeholder="Password"
              placeholderTextColor={theme.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              editable={!submitting}
            />

            {error ? (
              <ThemedText type="small" style={styles.error}>
                {error}
              </ThemedText>
            ) : null}

            <TouchableOpacity
              style={[styles.button, submitting && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={styles.buttonText}>
                  {mode === 'signup' ? 'Create Account' : 'Sign In'}
                </ThemedText>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={toggleMode} activeOpacity={0.7}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.toggle}>
              {mode === 'signin'
                ? "Don't have an account? Sign up"
                : 'Already have an account? Sign in'}
            </ThemedText>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  inner: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    justifyContent: 'center',
    gap: Spacing.five,
  },
  header: { alignItems: 'center', gap: Spacing.two },
  appName: { textAlign: 'center' },
  tagline: { textAlign: 'center' },
  form: { gap: Spacing.three },
  input: {
    height: 52,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
    borderWidth: 1,
  },
  error: { color: '#FF453A', textAlign: 'center' },
  button: {
    height: 52,
    borderRadius: 12,
    backgroundColor: '#208AEF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.one,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  toggle: { textAlign: 'center' },
});
