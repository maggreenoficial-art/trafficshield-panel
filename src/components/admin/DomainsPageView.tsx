"use client";

import { DomainManager } from "@/components/admin/DomainManager";
import { AdminPageTitle } from "@/components/admin/AdminMobileUI";

export function DomainsPageView() {
  return (
    <div className="space-y-6 sm:space-y-8">
      <AdminPageTitle
        title="Domínios"
        subtitle="Subdomínios de campanha e validação DNS"
      />
      <DomainManager />
    </div>
  );
}
