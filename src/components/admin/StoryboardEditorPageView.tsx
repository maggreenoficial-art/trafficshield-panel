"use client";

import { StoryboardEditor } from "@/components/admin/StoryboardEditor";

export function StoryboardEditorPageView({ id }: { id: string }) {
  return <StoryboardEditor id={id} />;
}
