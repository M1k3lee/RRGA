"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from "d3-force";

import type { GraphEdge, GraphNode, GraphResponse } from "@/types/api";

type Transform = { x: number; y: number; scale: number };
type PointerState =
  | { type: "idle" }
  | { type: "pan"; originX: number; originY: number; start: Transform }
  | { type: "lasso"; startX: number; startY: number; endX: number; endY: number };

type SimNode = GraphNode &
  SimulationNodeDatum & {
    radius: number;
    color: string;
  };

type SimLink = GraphEdge &
  SimulationLinkDatum<SimNode> & {
    source: SimNode | string;
    target: SimNode | string;
  };

const nodePalette: Record<string, string> = {
  legal_entity: "#9AE6FF",
  regulator: "#4FD1C5",
  register_record: "#F7B267",
  whitepaper: "#A5B4FC",
  sanctions_entry: "#FF6B6B",
  warning_notice: "#FFB84D",
  domain: "#89F0FF",
  token_contract: "#6EE7B7",
  wallet_address: "#FDE68A",
  brand: "#C4B5FD",
  contract: "#6EE7B7",
  wallet: "#FDE68A",
  jurisdiction: "#60A5FA",
};

function radiusFor(node: GraphNode) {
  if (node.node_type === "register_record" || node.node_type === "sanctions_entry") return 12;
  if (node.node_type === "regulator") return 18;
  return 14;
}

export function RegulatoryGraph({
  graph,
  hiddenTypes = [],
  selectedIds = [],
  onSelectionChange,
}: {
  graph: GraphResponse;
  hiddenTypes?: string[];
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const nodesRef = useRef<SimNode[]>([]);
  const linksRef = useRef<SimLink[]>([]);
  const transformRef = useRef<Transform>({ x: 0, y: 0, scale: 1 });
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [pointerState, setPointerState] = useState<PointerState>({ type: "idle" });

  const filteredGraph = useMemo(() => {
    const hidden = new Set(hiddenTypes);
    const nodes = graph.nodes.filter((node) => !hidden.has(node.node_type));
    const nodeIds = new Set(nodes.map((node) => node.id));
    const edges = graph.edges.filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target));
    return { nodes, edges };
  }, [graph, hiddenTypes]);

  useEffect(() => {
    const simNodes: SimNode[] = filteredGraph.nodes.map((node) => ({
      ...node,
      radius: radiusFor(node),
      color: nodePalette[node.node_type] ?? "#94A3B8",
    }));
    const nodeMap = new Map(simNodes.map((node) => [node.id, node]));
    const simLinks: SimLink[] = filteredGraph.edges
      .map((edge) => ({
        ...edge,
        source: nodeMap.get(edge.source) ?? edge.source,
        target: nodeMap.get(edge.target) ?? edge.target,
      }))
      .filter((edge): edge is SimLink => typeof edge.source !== "string" && typeof edge.target !== "string");

    nodesRef.current = simNodes;
    linksRef.current = simLinks;

    const simulation = forceSimulation(simNodes)
      .force("charge", forceManyBody().strength(-240))
      .force(
        "link",
        forceLink<SimNode, SimLink>(simLinks)
          .id((node) => (node as SimNode).id)
          .distance((link) => (link.edge_type === "listed_in" ? 86 : 132)),
      )
      .force("collide", forceCollide<SimNode>().radius((node) => node.radius + 10))
      .force("center", forceCenter(0, 0))
      .alpha(1);

    return () => {
      simulation.stop();
    };
  }, [filteredGraph]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
      if (transformRef.current.x === 0 && transformRef.current.y === 0) {
        transformRef.current = { x: rect.width / 2, y: rect.height / 2, scale: 1 };
      }
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    let frame = 0;
    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
      ctx.fillStyle = "rgba(5, 10, 14, 0.88)";
      ctx.fillRect(0, 0, rect.width, rect.height);

      const { x, y, scale } = transformRef.current;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scale, scale);

      for (let i = 1; i <= 3; i += 1) {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(148, 163, 184, ${0.05 - i * 0.01})`;
        ctx.lineWidth = 1 / scale;
        ctx.arc(0, 0, 160 * i, 0, Math.PI * 2);
        ctx.stroke();
      }

      for (const link of linksRef.current) {
        const source = link.source as SimNode;
        const target = link.target as SimNode;
        ctx.beginPath();
        ctx.moveTo(source.x ?? 0, source.y ?? 0);
        ctx.lineTo(target.x ?? 0, target.y ?? 0);
        const emphasized = selectedIds.includes(source.id) || selectedIds.includes(target.id);
        ctx.strokeStyle = emphasized ? "rgba(154,230,255,0.52)" : "rgba(118,143,162,0.22)";
        ctx.lineWidth = emphasized ? 2 / scale : 1 / scale;
        ctx.stroke();
      }

      for (const node of nodesRef.current) {
        const selected = selectedIds.includes(node.id);
        const hovered = hoveredId === node.id;
        const radius = node.radius * (selected || hovered ? 1.22 : 1);
        ctx.beginPath();
        ctx.fillStyle = `${node.color}${selected ? "ee" : hovered ? "dd" : "aa"}`;
        ctx.shadowColor = node.color;
        ctx.shadowBlur = selected ? 26 : 14;
        ctx.arc(node.x ?? 0, node.y ?? 0, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.beginPath();
        ctx.strokeStyle = selected ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.15)";
        ctx.lineWidth = selected ? 2.2 / scale : 1 / scale;
        ctx.arc(node.x ?? 0, node.y ?? 0, radius + 4, 0, Math.PI * 2);
        ctx.stroke();

        if (selected || hovered) {
          ctx.fillStyle = "rgba(240, 249, 255, 0.95)";
          ctx.font = `${12 / scale}px ui-sans-serif, system-ui`;
          ctx.fillText(node.label, (node.x ?? 0) + radius + 8, (node.y ?? 0) - 8);
        }
      }

      ctx.restore();

      if (pointerState.type === "lasso") {
        const width = pointerState.endX - pointerState.startX;
        const height = pointerState.endY - pointerState.startY;
        ctx.strokeStyle = "rgba(154,230,255,0.8)";
        ctx.fillStyle = "rgba(154,230,255,0.08)";
        ctx.lineWidth = 1.5;
        ctx.fillRect(pointerState.startX, pointerState.startY, width, height);
        ctx.strokeRect(pointerState.startX, pointerState.startY, width, height);
      }

      frame = window.requestAnimationFrame(draw);
    };

    frame = window.requestAnimationFrame(draw);
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
    };
  }, [filteredGraph, hoveredId, pointerState, selectedIds]);

  function screenToGraph(clientX: number, clientY: number) {
    const rect = canvasRef.current?.getBoundingClientRect();
    const transform = transformRef.current;
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (clientX - rect.left - transform.x) / transform.scale,
      y: (clientY - rect.top - transform.y) / transform.scale,
    };
  }

  function hitTest(clientX: number, clientY: number) {
    const point = screenToGraph(clientX, clientY);
    return nodesRef.current.find((node) => {
      const dx = (node.x ?? 0) - point.x;
      const dy = (node.y ?? 0) - point.y;
      return Math.sqrt(dx * dx + dy * dy) <= node.radius + 6;
    });
  }

  return (
    <div className="relative h-[640px] overflow-hidden rounded-[28px] border border-white/10 bg-[#050b10]">
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-5 py-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-white/40">Regulatory Graph Explorer</p>
          <p className="mt-1 text-sm text-white/65">Wheel to zoom, drag to pan, shift-drag to lasso-select.</p>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
          {filteredGraph.nodes.length} nodes / {filteredGraph.edges.length} edges
        </div>
      </div>
      <canvas
        ref={canvasRef}
        className="h-full w-full"
        onWheel={(event) => {
          event.preventDefault();
          const rect = canvasRef.current?.getBoundingClientRect();
          if (!rect) return;
          const { x, y, scale } = transformRef.current;
          const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
          const pointerX = event.clientX - rect.left;
          const pointerY = event.clientY - rect.top;
          transformRef.current = {
            scale: Math.min(2.8, Math.max(0.45, scale * zoomFactor)),
            x: pointerX - ((pointerX - x) / scale) * Math.min(2.8, Math.max(0.45, scale * zoomFactor)),
            y: pointerY - ((pointerY - y) / scale) * Math.min(2.8, Math.max(0.45, scale * zoomFactor)),
          };
        }}
        onMouseMove={(event) => {
          if (pointerState.type === "pan") {
            transformRef.current = {
              ...pointerState.start,
              x: pointerState.start.x + (event.clientX - pointerState.originX),
              y: pointerState.start.y + (event.clientY - pointerState.originY),
            };
            return;
          }
          if (pointerState.type === "lasso") {
            setPointerState({ ...pointerState, endX: event.nativeEvent.offsetX, endY: event.nativeEvent.offsetY });
            return;
          }
          const node = hitTest(event.clientX, event.clientY);
          setHoveredId(node?.id ?? null);
        }}
        onMouseDown={(event) => {
          if (event.shiftKey) {
            setPointerState({
              type: "lasso",
              startX: event.nativeEvent.offsetX,
              startY: event.nativeEvent.offsetY,
              endX: event.nativeEvent.offsetX,
              endY: event.nativeEvent.offsetY,
            });
            return;
          }

          const node = hitTest(event.clientX, event.clientY);
          if (node) {
            onSelectionChange?.([node.id]);
            return;
          }
          setPointerState({
            type: "pan",
            originX: event.clientX,
            originY: event.clientY,
            start: transformRef.current,
          });
        }}
        onMouseUp={() => {
          if (pointerState.type === "lasso") {
            const rect = canvasRef.current?.getBoundingClientRect();
            if (rect) {
              const minX = Math.min(pointerState.startX, pointerState.endX);
              const maxX = Math.max(pointerState.startX, pointerState.endX);
              const minY = Math.min(pointerState.startY, pointerState.endY);
              const maxY = Math.max(pointerState.startY, pointerState.endY);
              const selected = nodesRef.current
                .filter((node) => {
                  const screenX = (node.x ?? 0) * transformRef.current.scale + transformRef.current.x;
                  const screenY = (node.y ?? 0) * transformRef.current.scale + transformRef.current.y;
                  return screenX >= minX && screenX <= maxX && screenY >= minY && screenY <= maxY;
                })
                .map((node) => node.id);
              onSelectionChange?.(selected);
            }
          }
          setPointerState({ type: "idle" });
        }}
        onMouseLeave={() => {
          setHoveredId(null);
          setPointerState({ type: "idle" });
        }}
      />
      {!filteredGraph.nodes.length ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="max-w-md rounded-[28px] border border-white/10 bg-black/40 px-6 py-5 text-center backdrop-blur-xl">
            <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">Source Unavailable</p>
            <p className="mt-3 text-sm leading-7 text-white/70">
              No real graph neighborhood is loaded yet. Search for an ingested entity or trigger source ingestion to
              render evidence-backed nodes.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
