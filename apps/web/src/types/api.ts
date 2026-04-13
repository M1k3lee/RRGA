export interface SearchResult {
  id: string;
  node_type: string;
  label: string;
  score: number;
  current_status?: string | null;
  source_of_truth?: string | null;
  matched_on: string[];
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
}

export interface GraphNode {
  id: string;
  node_type: string;
  label: string;
  status?: string | null;
  meta: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  edge_type: string;
  confidence: number;
  inferred: boolean;
}

export interface GraphResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface SourceStatus {
  slug: string;
  name: string;
  source_type: string;
  enabled: boolean;
  last_artifact_at?: string | null;
  last_run_status?: string | null;
  artifact_count: number;
}

export interface TimelineEvent {
  id: string;
  event_type: string;
  summary: string;
  first_seen_at: string;
  last_seen_at: string;
  diff: Record<string, unknown>;
}

export interface EvidenceItem {
  id: string;
  artifact_id?: string | null;
  source: string;
  source_name?: string;
  source_type?: string;
  evidence_type: string;
  uri?: string | null;
  field_path?: string | null;
  snippet?: string | null;
  captured_at?: string | null;
  artifact_fetched_at?: string | null;
  artifact_published_at?: string | null;
}

export interface EntityProfile {
  id: string;
  canonical_name: string;
  aliases: string[];
  entity_type: string;
  first_seen_at?: string | null;
  last_seen_at?: string | null;
  jurisdictions: Array<{
    code: string;
    name: string;
    role: string;
    is_primary: boolean;
  }>;
  current_regulatory_status?: string | null;
  historical_status_changes: TimelineEvent[];
  linked_domains: GraphNode[];
  linked_contracts: GraphNode[];
  linked_wallets: GraphNode[];
  linked_whitepapers: GraphNode[];
  linked_sanctions: Array<GraphNode | null>;
  linked_warnings: Array<GraphNode | null>;
  register_records: Array<GraphNode | null>;
  evidence: EvidenceItem[];
  confidence_notes: Array<{
    edge_type: string;
    confidence: number;
    is_inferred: boolean;
    reasons: string[];
  }>;
  source_provenance: string[];
  summary?: string | null;
  meta: Record<string, unknown>;
}

export interface ContractProfile {
  id: string;
  chain: string;
  address: string;
  token_name?: string | null;
  token_symbol?: string | null;
  is_verified?: boolean | null;
  explorer_url?: string | null;
  meta: Record<string, unknown>;
  related_nodes: GraphNode[];
}

export interface DomainProfile {
  id: string;
  hostname: string;
  canonical_url?: string | null;
  title?: string | null;
  meta: Record<string, unknown>;
  linked_entities: GraphNode[];
}

export interface WalletProfile {
  id: string;
  chain: string;
  address: string;
  label?: string | null;
  meta: Record<string, unknown>;
  related_nodes: GraphNode[];
}

export interface JurisdictionProfile {
  code: string;
  name: string;
  meta: Record<string, unknown>;
  entities: Array<{
    id: string;
    canonical_name: string;
    entity_type: string;
    status?: string | null;
    role: string;
  }>;
}

export interface AlertEvent {
  id: string;
  title: string;
  status: string;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface Watchlist {
  id: string;
  label?: string | null;
  target_type: string;
  target_value: string;
  filters: Record<string, unknown>;
}
