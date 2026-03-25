import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * Error Boundary — catches JS errors in child tree and shows a fallback UI.
 */
export class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info?.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={s.container}>
          <Ionicons name="alert-circle-outline" size={56} color="#c8a15a" />
          <Text style={s.title}>Bir hata oluştu / Error occurred</Text>
          <Text style={s.message}>Beklenmedik bir sorun oluştu / An unexpected issue occurred</Text>
          <Pressable style={s.btn} onPress={this.handleRetry}>
            <Text style={s.btnText}>Tekrar Dene / Retry</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#061e1a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  title: {
    color: '#f0ead2',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 8,
  },
  message: {
    color: '#a6b59b',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  btn: {
    marginTop: 16,
    backgroundColor: 'rgba(200, 161, 90, 0.15)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(200, 161, 90, 0.3)',
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  btnText: {
    color: '#c8a15a',
    fontSize: 15,
    fontWeight: '600',
  },
});
