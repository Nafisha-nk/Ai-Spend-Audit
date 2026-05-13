import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatCurrency, formatUseCase } from "@/src/lib/format";
import { getPublicAudit } from "@/src/lib/storage";

type Params = Promise<{ id: string }> | { id: string };

async function resolveParams(params: Params) {
  return await params;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await resolveParams(params);
  const report = await getPublicAudit(id);

  if (!report) {
    return {
      title: "AI Spend Audit report not found",
    };
  }

  const title = `${formatCurrency(report.result.totalMonthlySavings)}/mo AI savings audit`;
  const description = `${report.teamSize}-person ${report.useCase} team: ${formatCurrency(report.result.totalAnnualSavings)} likely annual savings.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      url: `/a/${id}`,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function PublicAuditPage({ params }: { params: Params }) {
  const { id } = await resolveParams(params);
  const report = await getPublicAudit(id);

  if (!report) {
    notFound();
  }

  return (
    <main className="page-shell">
      <header className="top-bar">
        <div className="top-bar-inner">
          <Link className="brand" href="/">
            <span className="brand-mark">$</span>
            <span>AI Spend Audit</span>
          </Link>
          <span className="status-pill">Public report</span>
        </div>
      </header>

      <section className="public-main">
        <div className="public-report">
          <p className="eyebrow">Shareable audit</p>
          <h1>{formatCurrency(report.result.totalMonthlySavings)}/mo in likely AI savings</h1>
          <div className="public-meta">
            <span>{report.teamSize} people</span>
            <span>{formatUseCase(report.useCase)} use case</span>
            <span>{formatCurrency(report.result.totalAnnualSavings)}/yr</span>
            <span>{new Date(report.createdAt).toLocaleDateString("en-US")}</span>
          </div>
          <p className="lede">{report.summary}</p>

          <div className="savings-hero">
            <div className="savings-box">
              <span>Current spend</span>
              <strong>{formatCurrency(report.result.totalMonthlySpend)}</strong>
            </div>
            <div className="savings-box">
              <span>Recommended spend</span>
              <strong>{formatCurrency(report.result.totalRecommendedMonthlySpend)}</strong>
            </div>
          </div>

          <div className="result-stack">
            {report.result.recommendations.map((item) => (
              <article className={`recommendation ${item.severity}`} key={`${item.toolId}-${item.planId}`}>
                <div className="recommendation-header">
                  <p className="recommendation-title">
                    {item.toolName} - {item.planName}
                  </p>
                  <span className="savings-number">{formatCurrency(item.monthlySavings)}/mo</span>
                </div>
                <h3>{item.action}</h3>
                <p className="small-copy">{item.reason}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
