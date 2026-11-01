import { PageLoading } from "@/components/page-loading";

export default function CustomerLoading() {
  return (
    <main className="flex-1 p-4">
      <PageLoading label="Loading your shipments…" />
    </main>
  );
}
