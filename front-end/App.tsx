import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Platform,
} from 'react-native';


const WS_URL = 'wss://shopping-enlarged-stunning.ngrok-free.dev/ws';

interface LeadValue {
  leadgen_id?: string;
  form_id?: string;
  ad_id?: string;
  page_id?: string;
  created_time?: number;
}

interface LeadItem {
  id: string;
  receivedAt: string;
  objectType: string;
  field: string;
  lead: LeadValue;
  rawJson: string;
}

export default function App() {
  const [connected, setConnected] = useState(false);
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const wsRef = useRef<WebSocket | null>(null);

  const connectWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
    };

    ws.onmessage = (event) => {
      const now = new Date().toLocaleTimeString();
      let parsedLead: LeadValue = {};
      let objectType = 'page';
      let field = 'leadgen';
      let formattedJson = event.data;

      try {
        const data = JSON.parse(event.data);
        formattedJson = JSON.stringify(data, null, 2);
        objectType = data?.object || 'page';
        const change = data?.entry?.[0]?.changes?.[0];
        field = change?.field || 'leadgen';
        parsedLead = change?.value || {};
      } catch (e) {
        
      }

      const newItem: LeadItem = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        receivedAt: now,
        objectType,
        field,
        lead: parsedLead,
        rawJson: formattedJson,
      };

      setLeads((prev) => [newItem, ...prev]);
    };

    ws.onerror = () => {
      setConnected(false);
    };

    ws.onclose = () => {
      setConnected(false);
    };
  };

  useEffect(() => {
    connectWebSocket();
    return () => {
      wsRef.current?.close();
    };
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0b1120" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View>
            <Text style={styles.title}>Meta Lead Ads Live Feed</Text>
            <View style={styles.statusRow}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: connected ? '#10b981' : '#ef4444' },
                ]}
              />
              <Text
                style={[
                  styles.statusText,
                  { color: connected ? '#34d399' : '#f87171' },
                ]}
              >
                {connected
                  ? 'Connected & Listening for Meta Leads'
                  : 'Disconnected — Tap Reconnect'}
              </Text>
            </View>
          </View>

          <View style={styles.badgeContainer}>
            <Text style={styles.badgeCount}>{leads.length}</Text>
            <Text style={styles.badgeLabel}>LEADS</Text>
          </View>
        </View>

        {/* Action Bar */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionButton} onPress={connectWebSocket}>
            <Text style={styles.actionButtonText}>↻ Reconnect WS</Text>
          </TouchableOpacity>
          {leads.length > 0 && (
            <TouchableOpacity
              style={[styles.actionButton, styles.clearButton]}
              onPress={() => setLeads([])}
            >
              <Text style={styles.clearButtonText}>✕ Clear Feed</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Leads List */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
      >
        {leads.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>⚡</Text>
            <Text style={styles.emptyTitle}>Waiting for Webhook Events</Text>
            <Text style={styles.emptySub}>
              Fire a test lead from Meta or PowerShell to see real-time WebSocket updates here.
            </Text>
          </View>
        ) : (
          leads.map((item, index) => {
            const isExpanded = !!expandedIds[item.id];
            const createdDate = item.lead.created_time
              ? new Date(item.lead.created_time * 1000).toLocaleString()
              : 'N/A';

            return (
              <View key={item.id} style={styles.card}>
                {/* Card Header */}
                <View style={styles.cardHeader}>
                  <View style={styles.tagRow}>
                    <View style={styles.newBadge}>
                      <Text style={styles.newBadgeText}>
                        #{leads.length - index} • {item.field.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.objectTag}>obj: {item.objectType}</Text>
                  </View>
                  <Text style={styles.timestamp}>Received: {item.receivedAt}</Text>
                </View>

                {/* Primary Lead ID Highlight */}
                <View style={styles.highlightBox}>
                  <Text style={styles.highlightLabel}>LEADGEN ID</Text>
                  <Text style={styles.highlightValue}>
                    {item.lead.leadgen_id || 'Unknown'}
                  </Text>
                </View>

                {/* Metadata Grid */}
                <View style={styles.grid}>
                  <View style={styles.gridItem}>
                    <Text style={styles.gridLabel}>FORM ID</Text>
                    <Text style={styles.gridValue}>{item.lead.form_id || '—'}</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text style={styles.gridLabel}>AD ID</Text>
                    <Text style={styles.gridValue}>{item.lead.ad_id || '—'}</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text style={styles.gridLabel}>PAGE ID</Text>
                    <Text style={styles.gridValue}>{item.lead.page_id || '—'}</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text style={styles.gridLabel}>CREATED TIME</Text>
                    <Text style={styles.gridValue} numberOfLines={1}>
                      {createdDate}
                    </Text>
                  </View>
                </View>

                {/* Collapsible Raw JSON */}
                <TouchableOpacity
                  style={styles.rawToggle}
                  onPress={() => toggleExpand(item.id)}
                >
                  <Text style={styles.rawToggleText}>
                    {isExpanded ? '▼ Hide Raw Webhook JSON' : '▶ View Raw Webhook JSON'}
                  </Text>
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.codeBlock}>
                    <Text style={styles.codeText}>{item.rawJson}</Text>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1120',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 8 : 48,
  },
  header: {
    paddingHorizontal: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#f8fafc',
    letterSpacing: 0.3,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  badgeContainer: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  badgeCount: {
    color: '#38bdf8',
    fontSize: 18,
    fontWeight: '800',
  },
  badgeLabel: {
    color: '#94a3b8',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 10,
  },
  actionButton: {
    backgroundColor: '#1e293b',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  actionButtonText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
  },
  clearButton: {
    borderColor: '#7f1d1d',
    backgroundColor: '#450a0a',
  },
  clearButtonText: {
    color: '#fca5a5',
    fontSize: 12,
    fontWeight: '600',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 36,
  },
  emptyState: {
    marginTop: 80,
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  emptyIcon: {
    fontSize: 38,
    marginBottom: 12,
  },
  emptyTitle: {
    color: '#e2e8f0',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySub: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  newBadge: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  newBadgeText: {
    color: '#f0f9ff',
    fontSize: 11,
    fontWeight: '800',
  },
  objectTag: {
    color: '#94a3b8',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  timestamp: {
    color: '#94a3b8',
    fontSize: 12,
  },
  highlightBox: {
    backgroundColor: '#0f172a',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#38bdf8',
    marginBottom: 12,
  },
  highlightLabel: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  highlightValue: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
    marginBottom: 12,
  },
  gridItem: {
    width: '48%',
    backgroundColor: '#0f172a',
    padding: 10,
    borderRadius: 8,
  },
  gridLabel: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 3,
  },
  gridValue: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  rawToggle: {
    paddingVertical: 6,
  },
  rawToggleText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '600',
  },
  codeBlock: {
    marginTop: 8,
    backgroundColor: '#090d16',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  codeText: {
    color: '#a5f3fc',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});