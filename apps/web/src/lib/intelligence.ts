import type { EntityProfile, GraphResponse, SearchResult } from "@/types/api";

type SummaryTone = "clear" | "watch" | "critical" | "limited";

export function toneClasses(tone: SummaryTone) {
  switch (tone) {
    case "clear":
      return "border-emerald-400/30 bg-emerald-500/10 text-emerald-100";
    case "watch":
      return "border-amber-400/30 bg-amber-500/10 text-amber-100";
    case "critical":
      return "border-red-400/30 bg-red-500/10 text-red-100";
    default:
      return "border-white/10 bg-white/5 text-white/80";
  }
}

export function getConfidenceLabel(result: SearchResult, entity?: EntityProfile | null) {
  if (result.matched_on.includes("address_lookup") || result.matched_on.includes("exact_text_match")) {
    return "High confidence";
  }
  if (entity?.confidence_notes.length) {
    const average =
      entity.confidence_notes.reduce((total, note) => total + note.confidence, 0) /
      entity.confidence_notes.length;
    if (average >= 0.85) return "High confidence";
    if (average >= 0.65) return "Moderate confidence";
    return "Low confidence";
  }
  if (result.matched_on.includes("alias")) {
    return "Moderate confidence";
  }
  return "Source-backed";
}

export function getInvestigationSignals(result: SearchResult, entity?: EntityProfile | null, graph?: GraphResponse | null) {
  const sanctionsCount =
    entity?.linked_sanctions.filter(Boolean).length ??
    graph?.nodes.filter((node) => node.node_type === "sanctions_entry").length ??
    0;
  const warningCount =
    entity?.linked_warnings.filter(Boolean).length ??
    graph?.nodes.filter((node) => node.node_type === "warning_notice").length ??
    0;
  const registerCount =
    entity?.register_records.filter(Boolean).length ??
    graph?.nodes.filter((node) => node.node_type === "register_record").length ??
    0;

  if (sanctionsCount > 0) {
    return {
      tone: "critical" as const,
      title: "Sanctions-related record present",
      body: "At least one linked sanctions record is attached to this result. Review the source evidence before relying on it.",
    };
  }

  if (warningCount > 0) {
    return {
      tone: "watch" as const,
      title: "Warning signal present",
      body: "A warning, notice, or other negative signal is connected to this result. Open the evidence panel to inspect the source.",
    };
  }

  if (result.current_status === "authorized" || registerCount > 0) {
    return {
      tone: "clear" as const,
      title: "Appears in source-backed regulatory coverage",
      body: "Official register coverage is present for this result. Use the timeline and evidence views to inspect the exact record state.",
    };
  }

  if (result.source_of_truth === "coingecko" || result.current_status === "market_metadata") {
    return {
      tone: "limited" as const,
      title: "Metadata present, official coverage limited",
      body: "This result is present through enrichment data, but no official register or warning signal is currently attached in the loaded evidence.",
    };
  }

  return {
    tone: "limited" as const,
    title: "Limited source coverage",
    body: "The platform found a source-backed match, but coverage is still narrow. Use linked evidence and connected entities to expand the investigation.",
  };
}
