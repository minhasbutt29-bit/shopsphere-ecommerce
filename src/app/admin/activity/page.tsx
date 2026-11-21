import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/authz";
import { Card } from "@/components/ui/misc";
import { AdminCreateForm } from "@/components/admin/admin-create-form";

export const metadata = { title: "Activity log" };

export default async function AdminActivity() {
  await requireAdmin();
  const [logs, admins] = await Promise.all([
    db.adminActivityLog.findMany({ orderBy: { createdAt: "desc" }, take: 150, include: { actor: { select: { email: true } } } }),
    db.user.findMany({ where: { role: "ADMIN" }, select: { id: true, email: true, name: true, createdAt: true } }),
  ]);
  return (
    <div className="space-y-8">
      <h1 className="text-3xl">Activity log</h1>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm"><thead className="bg-muted text-left"><tr><th className="p-3">When</th><th className="p-3">Admin</th><th className="p-3">Action</th><th className="p-3">Entity</th></tr></thead>
          <tbody className="divide-y">{logs.map((l) => <tr key={l.id}><td className="p-3 whitespace-nowrap">{l.createdAt.toLocaleString("en-US")}</td><td className="p-3">{l.actor?.email ?? "system"}</td><td className="p-3 font-mono text-xs">{l.action}</td><td className="p-3 text-muted-foreground">{l.entity}{l.entityId ? ` · ${l.entityId.slice(0, 8)}` : ""}</td></tr>)}
            {logs.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No activity recorded yet.</td></tr>}</tbody></table>
      </Card>
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-5"><h2 className="mb-3 text-lg">Administrators</h2><ul className="space-y-1 text-sm">{admins.map((a) => <li key={a.id}>{a.name ?? "–"} · <span className="text-muted-foreground">{a.email}</span></li>)}</ul></Card>
        <Card className="p-5"><h2 className="mb-3 text-lg">Add administrator</h2><AdminCreateForm /></Card>
      </div>
    </div>
  );
}
