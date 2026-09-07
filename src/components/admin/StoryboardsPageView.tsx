"use client";

import { AdminPageTitle } from "@/components/admin/AdminMobileUI";
import { StoryboardManager } from "@/components/admin/StoryboardManager";

export function StoryboardsPageView() {
  return (
    <div className="space-y-6 sm:space-y-8">
      <AdminPageTitle
        title="Storyboards"
        subtitle="Transforme suas ideias em cenas prontas para produzir"
      />
      <StoryboardManager />
    </div>
  );
}
