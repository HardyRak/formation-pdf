import React from 'react';
import { View, TextInput, StyleSheet, Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme, radius } from '../core/theme/theme';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChange, placeholder = 'Rechercher une formation…' }: Props) {
  const theme = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Ionicons name={'search'} size={18} color={theme.textFaint} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={theme.textFaint}
        style={[styles.input, { color: theme.text }]}
        returnKeyType={'search'}
        autoCorrect={false}
      />
      {value.length > 0 ? (
        <Pressable onPress={() => onChange('')} hitSlop={10} accessibilityLabel={'Effacer la recherche'}>
          <Ionicons name={'close-circle'} size={18} color={theme.textFaint} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    height: 46,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  input: { flex: 1, fontSize: 15, paddingVertical: 0 },
});
