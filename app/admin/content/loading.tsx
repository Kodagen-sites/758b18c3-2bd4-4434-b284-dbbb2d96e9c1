import { ContentSkeleton } from "@/components/admin/admin-skeleton";

/**
 * Content section renders inside the section layout's AdminShell, so this
 * skeleton only fills the content area while a content page fetches.
 */
export default function ContentLoading() {
  return <ContentSkeleton />;
}
