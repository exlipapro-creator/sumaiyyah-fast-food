import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import getDb from "@/lib/db";
import AppShell from "@/components/AppShell";
import UsersClient from "./UsersClient";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "manager") redirect("/forbidden");

  const db = getDb();
  const users = db.prepare("SELECT id, email, name, role, active, created_at FROM users ORDER BY id ASC").all() as {
    id: number; email: string; name: string; role: string; active: number; created_at: string;
  }[];

  return (
    <AppShell user={session}>
      <UsersClient initialUsers={users} currentUserId={session.id} />
    </AppShell>
  );
}
