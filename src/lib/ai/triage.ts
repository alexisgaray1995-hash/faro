// Self-hosted AI triage (Golden Rule #3: AI only SUGGESTS, a human verifies).
// Talks to a local Ollama instance — zero API cost, no data leaves your box.
// If Ollama is unreachable or returns junk, every function returns null and the
// UI simply hides the suggestion (Golden Rule #6: degrade gracefully).
import {
  NEED_CATEGORIES,
  URGENCIES,
  type NeedCategory,
  type Urgency,
} from "@/lib/domain";

export type Triage = {
  category: NeedCategory;
  urgency: Urgency;
  rationale: string;
};

const CATS = NEED_CATEGORIES.map((c) => c.value);
const URGS = URGENCIES.map((u) => u.value);

const prompt = (text: string) =>
  `Eres un asistente de triage para una respuesta a un terremoto en Venezuela. ` +
  `Clasifica este pedido de ayuda ciudadano. Responde SOLO con un objeto JSON ` +
  `con estas claves exactas: "category" (uno de: ${CATS.join(", ")}), ` +
  `"urgency" (uno de: ${URGS.join(", ")}), "rationale" (una frase corta en ` +
  `español explicando por qué). Pedido: """${text}"""`;

// Pure validator — exported so the parsing logic is testable without a network.
// A model can return anything; we only trust values that match our enums.
export function parseTriage(raw: unknown): Triage | null {
  if (typeof raw !== "string") return null;
  let obj: unknown;
  try {
    obj = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!obj || typeof obj !== "object") return null;
  const { category, urgency, rationale } = obj as Record<string, unknown>;
  if (!CATS.includes(category as NeedCategory)) return null;
  if (!URGS.includes(urgency as Urgency)) return null;
  return {
    category: category as NeedCategory,
    urgency: urgency as Urgency,
    rationale: typeof rationale === "string" ? rationale.slice(0, 200) : "",
  };
}

export async function triage(text: string): Promise<Triage | null> {
  const base = process.env.OLLAMA_URL ?? "http://localhost:11434";
  const model = process.env.OLLAMA_MODEL ?? "qwen2.5:7b";
  try {
    const res = await fetch(`${base}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt: prompt(text),
        stream: false,
        format: "json", // Ollama constrains output to valid JSON
        options: { temperature: 0 },
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { response?: unknown };
    return parseTriage(body.response);
  } catch {
    return null; // offline, no model pulled, timeout, bad JSON — all non-fatal
  }
}

// ponytail: cap at 12 needs × 8s timeout so a slow or down Ollama can never
// stall the coordinator dashboard. If the open-needs list routinely exceeds
// this, move triage to a background job that writes suggestions to a column.
export async function triageNeeds(
  needs: { id: string; description: string | null }[],
): Promise<Map<string, Triage>> {
  const targets = needs.filter((n) => n.description?.trim()).slice(0, 12);
  const out = new Map<string, Triage>();
  await Promise.all(
    targets.map(async (n) => {
      const t = await triage(n.description!.trim());
      if (t) out.set(n.id, t);
    }),
  );
  return out;
}
