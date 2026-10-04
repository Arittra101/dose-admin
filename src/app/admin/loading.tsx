import { PageLoading } from "@/components/PageLoading";

export default function Loading() {
  // Four KPI tiles up top, then two cards plus a strip below — the table
  // skeleton covers the strip and the cards' table area simultaneously.
  return <PageLoading cards={4} table />;
}