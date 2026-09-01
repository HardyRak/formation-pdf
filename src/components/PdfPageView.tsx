import React, { memo } from 'react';
import { View, Text } from 'react-native';
import { styles } from './PdfPageView.styles';
import type { PdfPage } from '../core/models';

interface Props {
  page: PdfPage;
  width: number;
  height: number;
  accent: string;
  documentTitle: string;
  totalPages: number;
}

const BASE_WIDTH = 420;

function PdfPageViewComponent({ page, width, height, accent, documentTitle, totalPages }: Props) {
  const s = width / BASE_WIDTH;
  const pad = 30 * s;

  return (
    <View style={[styles.paper, { width, height, padding: pad, borderRadius: 4 * s }]}>
      <View style={{ flex: 1, gap: 11 * s }}>
        {page.blocks.map((block, index) => {
          switch (block.type) {
            case 'h1':
              return (
                <Text key={index} style={[styles.h1, { fontSize: 27 * s, lineHeight: 33 * s }]}>
                  {block.text}
                </Text>
              );
            case 'h2':
              return (
                <Text key={index} style={[styles.h2, { fontSize: 19 * s, lineHeight: 25 * s, color: accent }]}>
                  {block.text}
                </Text>
              );
            case 'p':
              return (
                <Text key={index} style={[styles.p, { fontSize: 12.4 * s, lineHeight: 19 * s }]}>
                  {block.text}
                </Text>
              );
            case 'bullets':
              return (
                <View key={index} style={{ gap: 7 * s, marginTop: 2 * s }}>
                  {block.items.map((item, i) => (
                    <View key={i} style={{ flexDirection: 'row', gap: 8 * s }}>
                      <View
                        style={{
                          width: 5 * s,
                          height: 5 * s,
                          borderRadius: 3 * s,
                          backgroundColor: accent,
                          marginTop: 7 * s,
                        }}
                      />
                      <Text style={[styles.p, { fontSize: 12.2 * s, lineHeight: 18.5 * s, flex: 1 }]}>{item}</Text>
                    </View>
                  ))}
                </View>
              );
            case 'callout':
              return (
                <View
                  key={index}
                  style={{
                    backgroundColor: accent + '12',
                    borderLeftWidth: 3 * s,
                    borderLeftColor: accent,
                    padding: 11 * s,
                    borderRadius: 5 * s,
                  }}
                >
                  <Text style={{ fontSize: 11.6 * s, lineHeight: 17.5 * s, color: '#2C3145', fontStyle: 'italic' }}>
                    {block.text}
                  </Text>
                </View>
              );
            case 'quote':
              return (
                <Text
                  key={index}
                  style={{ fontSize: 12 * s, lineHeight: 18 * s, color: '#6A7089', fontStyle: 'italic' }}
                >
                  {block.text}
                </Text>
              );
            case 'divider':
            default:
              return <View key={index} style={{ height: 1, backgroundColor: '#E3E5EE', marginVertical: 3 * s }} />;
          }
        })}
      </View>

      <View style={[styles.footer, { paddingTop: 9 * s, borderTopWidth: 1 }]}>
        <Text style={{ fontSize: 8.6 * s, color: '#9AA0B8' }} numberOfLines={1}>
          {documentTitle}
        </Text>
        <Text style={{ fontSize: 8.6 * s, color: '#9AA0B8' }}>
          {page.number} / {totalPages}
        </Text>
      </View>
    </View>
  );
}


export const PdfPageView = memo(PdfPageViewComponent);
