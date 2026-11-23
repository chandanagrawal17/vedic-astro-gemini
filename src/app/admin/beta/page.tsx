import Link from "next/link";
import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
import { ArrowLeft, BarChart3, ShieldCheck } from "lucide-react";
import { SolarShell } from "@/components/ui/SolarShell";
import { ObsidianCard } from "@/components/ui/ObsidianCard";
import {
  fetchBetaDashboardMetrics,
  verifyAdminBetaAccess,
} from "@/lib/admin/betaMetrics";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminBetaPage() {
  const headerList = await headers();
  const cookieStore = await cookies();
  const devHeaderEmail =
    headerList.get("x-admin-email") ||
    cookieStore.get("pb_admin_email")?.value ||
    null;

  let authUserEmail: string | null = null;
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    authUserEmail = data.user?.email ?? null;
  } catch {
    // Unauthenticated
  }

  const access = verifyAdminBetaAccess({
    authUserEmail,
    devHeaderEmail,
  });

  if (!access.authorized) {
    notFound();
  }

  const metrics = await fetchBetaDashboardMetrics();

  return (
    <SolarShell showDisclaimer={false}>
      <div className="flex-1 px-5 pt-6 pb-12 space-y-5">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[13px] text-[#B8A99E] hover:text-[#FDF6EE] transition"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Home</span>
          </Link>

          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#4ADE80]/30 bg-[#4ADE80]/10 px-3 py-1 text-[11px] font-semibold text-[#4ADE80]">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Admin Beta</span>
          </span>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#F5A65B]">
            Private Telemetry · {access.adminEmail}
          </p>
          <h1 className="mt-1 font-serif text-[30px] leading-tight text-[#FDF6EE]">
            Zero-Cost Beta Funnel
          </h1>
        </div>

        {/* Top KPI Grid */}
        <div className="grid grid-cols-2 gap-3">
          <ObsidianCard className="p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#F5A65B]">
              Unique Users
            </p>
            <div className="mt-1.5 font-serif text-[32px] leading-none text-[#FDF6EE]">
              {metrics.totalUniqueUsers}
            </div>
            <p className="mt-1.5 text-[11px] text-[#8E7F75]">
              {metrics.totalCharts} natal charts cached
            </p>
          </ObsidianCard>

          <ObsidianCard className="p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#F5A65B]">
              Onboarding &rarr; Proof
            </p>
            <div className="mt-1.5 font-serif text-[32px] leading-none text-[#FDF6EE]">
              {metrics.onboardingToProofPct}%
            </div>
            <p className="mt-1.5 text-[11px] text-[#8E7F75]">
              {metrics.proofViewedCount} proofs / {metrics.onboardingStartedCount || metrics.chartsCalculatedCount} starts
            </p>
          </ObsidianCard>

          <ObsidianCard warmTint className="p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#FF6B2B]">
              Willingness-to-Pay
            </p>
            <div className="mt-1.5 font-serif text-[32px] leading-none text-[#FDF6EE]">
              {metrics.willingnessToPay.ratePct}%
            </div>
            <p className="mt-1.5 text-[11px] text-[#B8A99E]">
              {metrics.willingnessToPay.paywallCtaClicked} CTA taps &divide;{" "}
              {metrics.willingnessToPay.proofViewed} proofs
            </p>
          </ObsidianCard>

          <ObsidianCard className="p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#4ADE80]">
              Beta Unlocks
            </p>
            <div className="mt-1.5 font-serif text-[32px] leading-none text-[#FDF6EE]">
              {metrics.engagement.betaUnlocks}
            </div>
            <p className="mt-1.5 text-[11px] text-[#8E7F75]">
              {metrics.engagement.bragCardShares} shares ·{" "}
              {metrics.engagement.birthTimeUpgrades} time upgrades
            </p>
          </ObsidianCard>
        </div>

        {/* Accuracy Ratings Card */}
        <ObsidianCard>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#F5A65B]">
              Hard Reset Accuracy Ratings
            </span>
            <span className="text-[11px] text-[#8E7F75]">
              {metrics.accuracy.total} total votes
            </span>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl border border-[#4ADE80]/25 bg-[#120C09]/80 p-3">
              <div className="font-serif text-[24px] text-[#4ADE80]">
                {metrics.accuracy.scarilyAccuratePct}%
              </div>
              <div className="mt-0.5 text-[11px] font-medium text-[#FDF6EE]">
                Scarily Accurate
              </div>
              <div className="text-[10px] text-[#8E7F75]">
                {metrics.accuracy.scarilyAccurate}
              </div>
            </div>

            <div className="rounded-xl border border-[#F5A65B]/25 bg-[#120C09]/80 p-3">
              <div className="font-serif text-[24px] text-[#F5A65B]">
                {metrics.accuracy.closePct}%
              </div>
              <div className="mt-0.5 text-[11px] font-medium text-[#FDF6EE]">
                Close
              </div>
              <div className="text-[10px] text-[#8E7F75]">
                {metrics.accuracy.close}
              </div>
            </div>

            <div className="rounded-xl border border-[#F87171]/25 bg-[#120C09]/80 p-3">
              <div className="font-serif text-[24px] text-[#F87171]">
                {metrics.accuracy.offPct}%
              </div>
              <div className="mt-0.5 text-[11px] font-medium text-[#FDF6EE]">
                Off
              </div>
              <div className="text-[10px] text-[#8E7F75]">
                {metrics.accuracy.off}
              </div>
            </div>
          </div>
        </ObsidianCard>

        {/* Conversion Breakdown Table by entry_hook */}
        <ObsidianCard>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-[#F5A65B]" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#F5A65B]">
              Conversion by Entry Hook
            </span>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-[12px]">
              <thead>
                <tr className="border-b border-[#F5A65B]/15 text-[10px] uppercase tracking-wider text-[#8E7F75]">
                  <th className="pb-2 pr-2">Hook</th>
                  <th className="pb-2 px-1.5 text-right">Land</th>
                  <th className="pb-2 px-1.5 text-right">Proof</th>
                  <th className="pb-2 px-1.5 text-right">CTA</th>
                  <th className="pb-2 px-1.5 text-right">WTP</th>
                  <th className="pb-2 pl-1.5 text-right">Beta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5A65B]/10">
                {metrics.byEntryHook.map((row) => (
                  <tr key={row.entryHook} className="text-[#D9CEC5]">
                    <td className="py-2.5 pr-2 font-medium text-[#FDF6EE]">
                      {row.entryHook}
                    </td>
                    <td className="py-2.5 px-1.5 text-right">
                      {row.landingViews}
                    </td>
                    <td className="py-2.5 px-1.5 text-right">
                      {row.proofViewed}
                    </td>
                    <td className="py-2.5 px-1.5 text-right">
                      {row.paywallCtaClicked}
                    </td>
                    <td className="py-2.5 px-1.5 text-right text-[#F5A65B]">
                      {row.wtpPct}%
                    </td>
                    <td className="py-2.5 pl-1.5 text-right text-[#4ADE80]">
                      {row.betaUnlocks}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ObsidianCard>
      </div>
    </SolarShell>
  );
}
