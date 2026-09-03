import React from 'react';
import { View, Text, Pressable, FlatList, Modal } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { spacing } from '../core/theme/theme';
import { styles } from './OutlineSheet.styles';

/** Une ligne du sommaire (page + libellé dérivé du premier titre). */
export interface OutlineEntry {
  number: number;
  label: string;
}

/**
 * Sommaire du document (mode blocs) : bottom-sheet modal listant les pages,
 * avec marque de lecture et surbrillance de la page courante.
 */
export interface OutlineSheetProps {
  visible: boolean;
  entries: OutlineEntry[];
  currentPage: number;
  pagesRead: number[];
  accent: string;
  maxHeight: number;
  onSelect: (page: number) => void;
  onClose: () => void;
}

export function OutlineSheet({
  visible,
  entries,
  currentPage,
  pagesRead,
  accent,
  maxHeight,
  onSelect,
  onClose,
}: OutlineSheetProps) {
  return (
    <Modal visible={visible} animationType={'slide'} transparent onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose} />
      <View style={[styles.sheet, { maxHeight }]}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>Sommaire</Text>
        <FlatList
          data={entries}
          keyExtractor={(item) => `outline-${item.number}`}
          contentContainerStyle={{ paddingBottom: spacing.xl }}
          renderItem={({ item }) => {
            const readMark = pagesRead.includes(item.number);
            return (
              <Pressable
                onPress={() => onSelect(item.number)}
                style={({ pressed }) => [styles.outlineRow, { opacity: pressed ? 0.7 : 1 }]}
              >
                <View
                  style={[
                    styles.outlineNum,
                    { backgroundColor: item.number === currentPage ? accent : 'rgba(255,255,255,0.08)' },
                  ]}
                >
                  <Text style={styles.outlineNumText}>{item.number}</Text>
                </View>
                <Text style={styles.outlineLabel} numberOfLines={1}>
                  {item.label}
                </Text>
                {readMark ? <Ionicons name={'checkmark-circle'} size={16} color={'#34D399'} /> : null}
              </Pressable>
            );
          }}
        />
      </View>
    </Modal>
  );
}
