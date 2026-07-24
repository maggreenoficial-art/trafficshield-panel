"use client";

import { CampaignManager } from "@/components/admin/CampaignManager";
import { AdminPageTitle } from "@/components/admin/AdminMobileUI";

export function CampaignsPageView() {
  return (
    <div className="space-y-6 sm:space-y-8">
      <AdminPageTitle
        title="Campanhas"
        subtitle="Cloaker, links de anúncio e estatísticas"
      />
      <CampaignManager />
    </div>
  );
}
