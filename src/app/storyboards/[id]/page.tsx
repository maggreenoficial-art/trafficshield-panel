import { StoryboardEditorPageView } from "@/components/admin/StoryboardEditorPageView";

export const metadata = {
  title: "Editor Storyboard",
};

type Props = { params: Promise<{ id: string }> };

export default async function StoryboardEditorPage({ params }: Props) {
  const { id } = await params;
  return <StoryboardEditorPageView id={id} />;
}
