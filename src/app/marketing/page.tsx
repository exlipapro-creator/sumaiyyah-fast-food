import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import AppShell from "@/components/AppShell";
import MarketingClient from "./MarketingClient";

export const dynamic = "force-dynamic";

export default async function MarketingPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "manager") redirect("/forbidden");

  return (
    <AppShell user={session}>
      <MarketingClient />
    </AppShell>
  );
}
