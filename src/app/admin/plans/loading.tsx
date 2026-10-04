import { PageLoading } from "@/components/PageLoading";

// No KPI row on the plans page — the skeleton has to match the real shape,
// not the shape of the busiest page in the app.
export default function Loading() {
  return <PageLoading cards={0} table />;
}
