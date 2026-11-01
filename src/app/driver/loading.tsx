import { PageLoading } from "@/components/page-loading";

export default function DriverLoading() {
  return (
    <main className="flex-1 p-4">
      <PageLoading label="Loading your stops…" />
    </main>
  );
}
