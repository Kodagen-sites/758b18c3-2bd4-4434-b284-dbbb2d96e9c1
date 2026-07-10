import AdminShellSkeleton from "@/components/admin/admin-skeleton";

/**
 * Shown instantly on every /admin/* navigation while the server page
 * fetches. Pages mount their own AdminShell, so this skeleton draws the
 * whole shell shape (sidebar + header + content) to avoid a blank flash.
 */
export default function AdminLoading() {
  return <AdminShellSkeleton />;
}
