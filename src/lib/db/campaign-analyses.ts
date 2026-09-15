import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import type { AdsEngagementRow } from "@/lib/ads-analysis/parse-ads-export";
import type { TripleEngagementAnalysis } from "@/lib/ads-analysis/analyze-engagement";

export type CampaignAnalysisRecord = {
  id: string;
  tenantId: string;
  title: string;
  campaignFileName: string | null;
  adsetFileName: string | null;
  adFileName: string | null;
  campaignRows: AdsEngagementRow[];
  adsetRows: AdsEngagementRow[];
  adRows: AdsEngagementRow[];
  result: TripleEngagementAnalysis;
  createdAt: string;
};

type Row = {
  id: string;
  tenant_id: string;
  title: string;
  campaign_file_name: string | null;
  adset_file_name: string | null;
  ad_file_name: string | null;
  campaign_rows: unknown;
  adset_rows: unknown;
  ad_rows: unknown;
  result: unknown;
  created_at: string;
};

function mapRecord(row: Row): CampaignAnalysisRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    title: row.title,
    campaignFileName: row.campaign_file_name,
    adsetFileName: row.adset_file_name,
    adFileName: row.ad_file_name,
    campaignRows: (row.campaign_rows as AdsEngagementRow[]) ?? [],
    adsetRows: (row.adset_rows as AdsEngagementRow[]) ?? [],
    adRows: (row.ad_rows as AdsEngagementRow[]) ?? [],
    result: row.result as TripleEngagementAnalysis,
    createdAt: row.created_at,
  };
}

export async function listCampaignAnalyses(
  tenantId: string
): Promise<Pick<CampaignAnalysisRecord, "id" | "title" | "createdAt" | "campaignFileName" | "adsetFileName" | "adFileName">[]> {
  if (!hasAdminClient()) return [];
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("campaign_analyses")
    .select(
      "id, title, created_at, campaign_file_name, adset_file_name, ad_file_name"
    )
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(40);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id as string,
    title: row.title as string,
    createdAt: row.created_at as string,
    campaignFileName: (row.campaign_file_name as string | null) ?? null,
    adsetFileName: (row.adset_file_name as string | null) ?? null,
    adFileName: (row.ad_file_name as string | null) ?? null,
  }));
}

export async function getCampaignAnalysis(
  tenantId: string,
  id: string
): Promise<CampaignAnalysisRecord | null> {
  if (!hasAdminClient()) return null;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("campaign_analyses")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapRecord(data as Row);
}

export async function saveCampaignAnalysis(
  tenantId: string,
  createdBy: string,
  input: {
    title?: string;
    campaignFileName: string;
    adsetFileName: string;
    adFileName: string;
    campaignRows: AdsEngagementRow[];
    adsetRows: AdsEngagementRow[];
    adRows: AdsEngagementRow[];
    result: TripleEngagementAnalysis;
  }
): Promise<CampaignAnalysisRecord> {
  if (!hasAdminClient()) {
    throw new Error("Supabase admin não configurado.");
  }
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("campaign_analyses")
    .insert({
      tenant_id: tenantId,
      created_by: createdBy,
      title: input.title?.trim() || `Análise ${new Date().toLocaleString("pt-BR")}`,
      campaign_file_name: input.campaignFileName,
      adset_file_name: input.adsetFileName,
      ad_file_name: input.adFileName,
      campaign_rows: input.campaignRows,
      adset_rows: input.adsetRows,
      ad_rows: input.adRows,
      result: input.result,
    })
    .select("*")
    .single();
  if (error) throw error;
  return mapRecord(data as Row);
}

export async function patchCampaignAnalysisResult(
  tenantId: string,
  id: string,
  result: TripleEngagementAnalysis
): Promise<void> {
  if (!hasAdminClient()) return;
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("campaign_analyses")
    .update({ result })
    .eq("tenant_id", tenantId)
    .eq("id", id);
  if (error) throw error;
}
