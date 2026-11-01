import { PageLoading } from "@/components/page-loading";

export default function TrackLoading() {
  return (
    <main className="marketing min-h-dvh bg-bg px-5 py-16">
      <div className="mx-auto max-w-3xl">
        <PageLoading label="Loading shipment…" />
      </div>
    </main>
  );
}
