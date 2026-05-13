import fs from "node:fs/promises";
import path from "node:path";
import type { AuditInput, AuditResult, LeadPayload, PublicAuditReport } from "./types";

type AuditRecord = {
  public_id: string;
  input: AuditInput;
  result: AuditResult;
  public_report: PublicAuditReport;
  summary: string;
  created_at: string;
};

type LeadRecord = {
  public_id: string;
  email: string;
  company_name: string | null;
  role: string | null;
  team_size: number | null;
  savings_monthly: number | null;
  high_savings: boolean;
  created_at: string;
};

const localDataDir = path.join(process.cwd(), "data");
const localAuditPath = path.join(localDataDir, "audits.json");
const localLeadPath = path.join(localDataDir, "leads.json");

export function hasSupabase() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function saveAudit(record: AuditRecord) {
  if (hasSupabase()) {
    await supabaseRequest("audits", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(record),
    });
    return;
  }

  const records = await readLocalJson<AuditRecord[]>(localAuditPath, []);
  records.push(record);
  await writeLocalJson(localAuditPath, records);
}

export async function getPublicAudit(publicId: string): Promise<PublicAuditReport | null> {
  if (hasSupabase()) {
    const rows = await supabaseRequest<AuditRecord[]>(
      `audits?public_id=eq.${encodeURIComponent(publicId)}&select=public_id,public_report,summary,created_at&limit=1`,
      { method: "GET" }
    );
    return rows[0]?.public_report ?? null;
  }

  const records = await readLocalJson<AuditRecord[]>(localAuditPath, []);
  return records.find((record) => record.public_id === publicId)?.public_report ?? null;
}

export async function saveLead(payload: LeadPayload, result?: AuditResult) {
  const record: LeadRecord = {
    public_id: payload.publicId,
    email: payload.email,
    company_name: payload.companyName || null,
    role: payload.role || null,
    team_size: payload.teamSize || null,
    savings_monthly: result?.totalMonthlySavings ?? null,
    high_savings: Boolean(result && result.totalMonthlySavings > 500),
    created_at: new Date().toISOString(),
  };

  if (hasSupabase()) {
    await supabaseRequest("leads", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(record),
    });
    return;
  }

  const records = await readLocalJson<LeadRecord[]>(localLeadPath, []);
  records.push(record);
  await writeLocalJson(localLeadPath, records);
}

async function supabaseRequest<T = unknown>(resource: string, init: RequestInit): Promise<T> {
  const baseUrl = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!baseUrl || !key) {
    throw new Error("Supabase is not configured.");
  }

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/rest/v1/${resource}`, {
    ...init,
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Supabase request failed: ${response.status} ${detail}`);
  }

  if (response.status === 204 || response.headers.get("content-length") === "0") {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function readLocalJson<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeLocalJson(filePath: string, payload: unknown) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}
