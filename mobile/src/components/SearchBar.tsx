import React from 'react';
import { View, TextInput, Pressable } from 'react-native';
import { styles } from './SearchBar.styles';
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

