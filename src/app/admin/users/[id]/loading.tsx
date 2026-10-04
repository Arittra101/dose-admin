import { PageLoading } from "@/components/PageLoading";

// A detail route: no KPI row, four record panels in a two-column grid.
export default function Loading() {
  return <PageLoading cards={0} panels={4} />;
}
