"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { auditSpend, sanitizeAuditInput } from "@/src/lib/audit";
import { formatCurrency, formatUseCase } from "@/src/lib/format";
import { estimateListPrice, getTool, toolCatalog } from "@/src/lib/pricing";
import type { AuditInput, AuditResult, LeadPayload, ToolSelection, UseCase } from "@/src/lib/types";

type AuditResponse = {
  publicId: string;
  shareUrl: string;
  result: AuditResult;
  summary: string;
};

const storageKey = "credex-ai-spend-audit-input";

const defaultInput: AuditInput = {
  teamSize: 6,
  useCase: "coding",
  tools: [
    {
      id: "tool-1",
      toolId: "cursor",
      planId: "business",
      monthlySpend: 240,
      seats: 6,
    },
    {
      id: "tool-2",
      toolId: "github_copilot",
      planId: "business",
      monthlySpend: 114,
      seats: 6,
    },
  ],
};

export default function Home() {
  const [input, setInput] = useState<AuditInput>(() => {
    if (typeof window === "undefined") {
      return defaultInput;
    }

    const saved = window.localStorage.getItem(storageKey);
    if (!saved) {
      return defaultInput;
    }

    try {
      return sanitizeAuditInput(JSON.parse(saved) as AuditInput);
    } catch {
      return defaultInput;
    }
  });
  const [audit, setAudit] = useState<AuditResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [leadStatus, setLeadStatus] = useState("");

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(input));
  }, [input]);

  const preview = useMemo(() => auditSpend(input), [input]);

  async function runAudit(event: FormEvent) {
    event.preventDefault();
    setIsLoading(true);
    setError("");
    setLeadStatus("");

    const response = await fetch("/api/audits", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });

    const payload = (await response.json()) as AuditResponse & { error?: string };
    setIsLoading(false);

    if (!response.ok) {
      setError(payload.error || "The audit failed. Please check the inputs and try again.");
      return;
    }

    setAudit(payload);
  }

  async function captureLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!audit) return;
    setLeadStatus("Saving...");
    const form = new FormData(event.currentTarget);
    const payload: LeadPayload = {
      publicId: audit.publicId,
      email: String(form.get("email") || ""),
      companyName: String(form.get("companyName") || ""),
      role: String(form.get("role") || ""),
      teamSize: Number(form.get("teamSize") || input.teamSize),
      website: String(form.get("website") || ""),
    };

    const response = await fetch("/api/leads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    setLeadStatus(response.ok ? "Saved. The report email will send when email credentials are configured." : "Could not save lead yet.");
  }

  function updateTool(rowId: string, patch: Partial<ToolSelection>) {
    setInput((current) => ({
      ...current,
      tools: current.tools.map((tool) => {
        if (tool.id !== rowId) return tool;
        const next = { ...tool, ...patch };
        if (patch.toolId) {
          const firstPlan = getTool(patch.toolId)?.plans[0];
          next.planId = firstPlan?.id || next.planId;
          next.monthlySpend = estimateListPrice(next.toolId, next.planId, next.seats);
        }
        if (patch.planId || patch.seats) {
          const estimated = estimateListPrice(next.toolId, next.planId, next.seats);
          next.monthlySpend = estimated || next.monthlySpend;
        }
        return next;
      }),
    }));
  }

  function addTool() {
    setInput((current) => ({
      ...current,
      tools: [
        ...current.tools,
        {
          id: `tool-${Date.now()}`,
          toolId: "chatgpt",
          planId: "plus",
          monthlySpend: 20,
          seats: 1,
        },
      ],
    }));
  }

  function removeTool(rowId: string) {
    setInput((current) => ({
      ...current,
      tools: current.tools.length === 1 ? current.tools : current.tools.filter((tool) => tool.id !== rowId),
    }));
  }

  const activeResult = audit?.result ?? preview;
  const activeSummary = audit?.summary;

  return (
    <main className="page-shell">
      <header className="top-bar">
        <div className="top-bar-inner">
          <div className="brand">
            <span className="brand-mark">$</span>
            <span>AI Spend Audit</span>
          </div>
          <span className="status-pill">No login. Email after value.</span>
        </div>
      </header>

      <div className="main-grid">
        <section>
          <div className="intro-band">
            <p className="eyebrow">Credex lead-gen product concept</p>
            <h1>Find the wasted AI spend.</h1>
            <p className="lede">
              Enter the paid AI tools in a startup stack. The audit checks plan fit, duplicated assistants, API or enterprise spend that may qualify for discounted credits, and savings that are worth a Credex conversation.
            </p>
            <div className="metric-strip">
              <div className="metric">
                <span>Live preview savings</span>
                <strong>{formatCurrency(preview.totalMonthlySavings)}/mo</strong>
              </div>
              <div className="metric">
                <span>Current stack</span>
                <strong>{formatCurrency(preview.totalMonthlySpend)}/mo</strong>
              </div>
              <div className="metric">
                <span>Use case</span>
                <strong>{formatUseCase(input.useCase)}</strong>
              </div>
            </div>
          </div>

          <form className="panel form-stack" onSubmit={runAudit}>
            <h2>Spend Input</h2>
            <div className="field-grid">
              <label className="field">
                <span>Team size</span>
                <input
                  type="number"
                  min={1}
                  value={input.teamSize}
                  onChange={(event) => setInput({ ...input, teamSize: Number(event.target.value) })}
                />
              </label>
              <label className="field">
                <span>Primary use case</span>
                <select value={input.useCase} onChange={(event) => setInput({ ...input, useCase: event.target.value as UseCase })}>
                  <option value="coding">Coding</option>
                  <option value="writing">Writing</option>
                  <option value="data">Data</option>
                  <option value="research">Research</option>
                  <option value="mixed">Mixed</option>
                </select>
              </label>
            </div>

            {input.tools.map((tool) => {
              const catalogTool = getTool(tool.toolId);
              return (
                <div className="tool-row" key={tool.id}>
                  <label className="field">
                    <span>Tool</span>
                    <select value={tool.toolId} onChange={(event) => updateTool(tool.id, { toolId: event.target.value as ToolSelection["toolId"] })}>
                      {toolCatalog.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Plan</span>
                    <select value={tool.planId} onChange={(event) => updateTool(tool.id, { planId: event.target.value })}>
                      {catalogTool?.plans.map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Seats</span>
                    <input type="number" min={1} value={tool.seats} onChange={(event) => updateTool(tool.id, { seats: Number(event.target.value) })} />
                  </label>
                  <label className="field">
                    <span>Spend/mo</span>
                    <input type="number" min={0} step="0.01" value={tool.monthlySpend} onChange={(event) => updateTool(tool.id, { monthlySpend: Number(event.target.value) })} />
                  </label>
                  <button className="danger-button" type="button" onClick={() => removeTool(tool.id)}>
                    Remove
                  </button>
                </div>
              );
            })}

            <div className="button-row">
              <button className="secondary-button" type="button" onClick={addTool}>
                Add tool
              </button>
              <button className="primary-button" disabled={isLoading} type="submit">
                {isLoading ? "Auditing..." : "Run audit"}
              </button>
              {error ? <p className="small-copy">{error}</p> : null}
            </div>
          </form>
        </section>

        <aside className="result-stack">
          {!audit ? (
            <div className="result-panel empty-state">
              <div>
                <h2>Instant Audit Preview</h2>
                <p className="summary">
                  The preview updates locally while you edit. Run the audit to save a public URL and generate the personalized summary.
                </p>
              </div>
            </div>
          ) : null}

          <ReportPanel result={activeResult} summary={activeSummary} shareUrl={audit?.shareUrl} />

          {audit ? (
            <form className="capture-panel form-stack" onSubmit={captureLead}>
              <h2>Capture The Report</h2>
              {audit.result.credexEligible ? (
                <div className="credex-callout">
                  <h3>Credex opportunity detected</h3>
                  <p className="small-copy">This audit crosses the high-savings threshold. Capture the report and book a consultation to evaluate discounted AI credits.</p>
                  <a className="ghost-button" href={process.env.NEXT_PUBLIC_CREDEX_BOOKING_URL || "https://credex.rocks"} target="_blank" rel="noreferrer">
                    Book consultation
                  </a>
                </div>
              ) : (
                <p className="small-copy">Your savings are modest. Capture the report and get notified when new pricing changes or optimizations apply.</p>
              )}
              <div className="capture-grid">
                <label className="field">
                  <span>Email</span>
                  <input required name="email" type="email" placeholder="founder@company.com" />
                </label>
                <label className="field">
                  <span>Company</span>
                  <input name="companyName" placeholder="Company name" />
                </label>
                <label className="field">
                  <span>Role</span>
                  <input name="role" placeholder="Founder, CTO, Eng Manager" />
                </label>
                <label className="field">
                  <span>Team size</span>
                  <input name="teamSize" type="number" defaultValue={input.teamSize} />
                </label>
              </div>
              <input className="hidden-field" name="website" tabIndex={-1} autoComplete="off" />
              <div className="button-row">
                <button className="primary-button" type="submit">
                  Email my report
                </button>
                {leadStatus ? <p className="small-copy">{leadStatus}</p> : null}
              </div>
            </form>
          ) : null}
        </aside>
      </div>
    </main>
  );
}

function ReportPanel({ result, summary, shareUrl }: { result: AuditResult; summary?: string; shareUrl?: string }) {
  const maxSpend = Math.max(...result.recommendations.map((item) => item.currentMonthlySpend), 1);

  return (
    <div className="result-panel">
      <h2>{result.spendingWell ? "You are spending well" : "Audit Results"}</h2>
      <div className="savings-hero">
        <div className="savings-box">
          <span>Monthly savings</span>
          <strong>{formatCurrency(result.totalMonthlySavings)}</strong>
        </div>
        <div className="savings-box">
          <span>Annual savings</span>
          <strong>{formatCurrency(result.totalAnnualSavings)}</strong>
        </div>
      </div>
      <p className="summary">
        {summary ||
          (result.spendingWell
            ? "The current entries look efficient. Run the audit to save a shareable report and capture notification interest."
            : "Savings are visible in the live preview. Run the audit to save a public result URL and generate the final summary.")}
      </p>

      {shareUrl ? (
        <div className="share-box">
          <strong>Shareable result URL</strong>
          <code>{shareUrl}</code>
        </div>
      ) : null}

      <div className="result-stack">
        {result.recommendations.map((item) => (
          <article className={`recommendation ${item.severity}`} key={`${item.toolId}-${item.planId}`}>
            <div className="recommendation-header">
              <p className="recommendation-title">
                {item.toolName} - {item.planName}
              </p>
              <span className="savings-number">{formatCurrency(item.monthlySavings)}/mo</span>
            </div>
            <div className="spend-flow">
              <div className="bar-track" title="Current spend">
                <div className="bar-current" style={{ width: `${Math.max(4, (item.currentMonthlySpend / maxSpend) * 100)}%` }} />
              </div>
              <div className="bar-track" title="Recommended spend">
                <div className="bar-recommended" style={{ width: `${Math.max(4, (item.recommendedMonthlySpend / maxSpend) * 100)}%` }} />
              </div>
            </div>
            <h3>{item.action}</h3>
            <p className="small-copy">{item.reason}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
