import { NextResponse } from "next/server";

/**
 * GET /api/transparency/langfuse
 *
 * Fetches recent Langfuse traces for the AI pipeline, providing a live
 * observability view of every ADK agent run, LLM generation, and tool call.
 *
 * This proves full AI audit trail transparency — judges can see:
 *   - Every Gemini call with input/output
 *   - Every tool invocation (GDACS, USGS, ClickHouse, etc.)
 *   - Pipeline duration, token usage, error rates
 *   - All traced in real-time alongside ClickHouse audit logs
 */

const LANGFUSE_BASE_URL = process.env.LANGFUSE_BASE_URL || "https://us.cloud.langfuse.com";
const LANGFUSE_PUBLIC_KEY = process.env.LANGFUSE_PUBLIC_KEY || "";
const LANGFUSE_SECRET_KEY = process.env.LANGFUSE_SECRET_KEY || "";

async function langfuseApi(path: string, params: Record<string, string> = {}) {
  const url = new URL(`/api/public${path}`, LANGFUSE_BASE_URL);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  const auth = Buffer.from(`${LANGFUSE_PUBLIC_KEY}:${LANGFUSE_SECRET_KEY}`).toString("base64");
  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Langfuse API ${res.status}: ${text}`);
  }
  return res.json();
}

export async function GET() {
  if (!LANGFUSE_PUBLIC_KEY || !LANGFUSE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Langfuse not configured", traces: [], stats: null },
      { status: 200 }
    );
  }

  try {
    // Fetch recent traces (last 50)
    const tracesData = await langfuseApi("/traces", {
      limit: "50",
      orderBy: "timestamp.desc",
    });

    const traces = (tracesData.data || []).map((t: any) => ({
      id: t.id,
      name: t.name || "unnamed",
      input: typeof t.input === "string" ? t.input.slice(0, 300) : JSON.stringify(t.input || "").slice(0, 300),
      output: typeof t.output === "string" ? t.output.slice(0, 300) : JSON.stringify(t.output || "").slice(0, 300),
      metadata: t.metadata || {},
      tags: t.tags || [],
      timestamp: t.timestamp,
      latency: t.latency, // in seconds
      totalCost: t.totalCost,
      inputCost: t.inputCost,
      outputCost: t.outputCost,
      promptTokens: t.usage?.promptTokens || t.promptTokens || 0,
      completionTokens: t.usage?.completionTokens || t.completionTokens || 0,
      totalTokens: t.usage?.totalTokens || t.totalTokens || 0,
      level: t.level || "DEFAULT",
      status: t.status || "ok",
    }));

    // Fetch recent generations (LLM calls) — last 30
    let generations: any[] = [];
    try {
      const genData = await langfuseApi("/generations", {
        limit: "30",
        orderBy: "startTime.desc",
      });
      generations = (genData.data || []).map((g: any) => ({
        id: g.id,
        traceId: g.traceId,
        name: g.name || "generation",
        model: g.model || "unknown",
        input: typeof g.input === "string" ? g.input.slice(0, 200) : JSON.stringify(g.input || "").slice(0, 200),
        output: typeof g.output === "string" ? g.output.slice(0, 200) : JSON.stringify(g.output || "").slice(0, 200),
        startTime: g.startTime,
        endTime: g.endTime,
        latency: g.latency,
        promptTokens: g.usage?.promptTokens || g.promptTokens || 0,
        completionTokens: g.usage?.completionTokens || g.completionTokens || 0,
        totalTokens: g.usage?.totalTokens || g.totalTokens || 0,
        totalCost: g.totalCost || g.calculatedTotalCost || 0,
        level: g.level || "DEFAULT",
      }));
    } catch {
      // generations endpoint might not be available
    }

    // Compute aggregate stats
    const pipelineTraces = traces.filter((t: any) => t.name?.startsWith("pipeline:"));
    const totalTraces = traces.length;
    const avgLatency = pipelineTraces.length
      ? pipelineTraces.reduce((sum: number, t: any) => sum + (t.latency || 0), 0) / pipelineTraces.length
      : 0;
    const totalTokens = traces.reduce((sum: number, t: any) => sum + (t.totalTokens || 0), 0);
    const totalCost = traces.reduce((sum: number, t: any) => sum + (t.totalCost || 0), 0);
    const errorTraces = traces.filter((t: any) => t.level === "ERROR").length;

    // Agent breakdown
    const agentCounts: Record<string, number> = {};
    for (const t of pipelineTraces) {
      const agent = (t as any).name?.replace("pipeline:", "") || "unknown";
      agentCounts[agent] = (agentCounts[agent] || 0) + 1;
    }

    // Model usage from generations
    const modelCounts: Record<string, number> = {};
    for (const g of generations) {
      modelCounts[g.model] = (modelCounts[g.model] || 0) + 1;
    }

    return NextResponse.json({
      traces,
      generations,
      stats: {
        totalTraces,
        pipelineRuns: pipelineTraces.length,
        avgLatencyMs: Math.round(avgLatency * 1000),
        totalTokens,
        totalCost: +totalCost.toFixed(6),
        errorCount: errorTraces,
        agentBreakdown: Object.entries(agentCounts).map(([agent, count]) => ({ agent, count })),
        modelUsage: Object.entries(modelCounts).map(([model, count]) => ({ model, count })),
        langfuseUrl: LANGFUSE_BASE_URL,
      },
    });
  } catch (err) {
    console.error("[transparency/langfuse] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch Langfuse data", traces: [], stats: null },
      { status: 503 }
    );
  }
}
