import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, TextInputProps } from 'react-native';
import { styles } from './TextField.styles';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../core/theme/theme';

interface Props extends Omit<TextInputProps, 'style'> {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  error?: string | null;
  secure?: boolean;
}

export function TextField({ label, icon, error, secure, ...inputProps }: Props) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(!!secure);

  const borderColor = error ? theme.danger : focused ? theme.primary : theme.border;

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: theme.textMuted }]}>{label}</Text>
      <View
        style={[
          styles.field,
          { borderColor, backgroundColor: theme.surface, borderWidth: focused || error ? 1.6 : 1 },
        ]}
      >
        <Ionicons name={icon} size={19} color={error ? theme.danger : focused ? theme.primary : theme.textFaint} />
        <TextInput
          {...inputProps}
          secureTextEntry={hidden}
          onFocus={(e) => {
            setFocused(true);
            inputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            inputProps.onBlur?.(e);
          }}
          placeholderTextColor={theme.textFaint}
          style={[styles.input, { color: theme.text }]}
        />
        {secure ? (
          <Pressable
            onPress={() => setHidden((value) => !value)}
            hitSlop={10}
            accessibilityLabel={'Afficher ou masquer le mot de passe'}
          >
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={19} color={theme.textFaint} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <View style={styles.errorRow}>
          <Ionicons name={'alert-circle'} size={13} color={theme.danger} />
          <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

