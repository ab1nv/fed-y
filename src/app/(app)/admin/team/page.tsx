import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { Card, PageHeader, cx } from "@/components/ui";
import { AddTeamUserForm, RemoveUserButton } from "@/components/team-forms";

export const metadata = { title: "Team — FedY" };

const ROLE_CLS: Record<string, string> = {
  ADMIN: "bg-purple-500/12 text-purple-700 dark:text-purple-400",
  DISPATCHER: "bg-sky-500/12 text-sky-700 dark:text-sky-400",
  DRIVER: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400",
};

export default async function TeamPage() {
  await requireSession(["ADMIN"]);
  const users = await db.user.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <>
      <PageHeader title="Team & roles" sub="Provision accounts. Role controls the entire navigation surface." />
      <Card className="mb-4 p-5">
        <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Add member</h2>
        <AddTeamUserForm />
      </Card>
      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-[11px] uppercase tracking-[0.12em] text-muted">
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Username</th>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">Role</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3 font-medium">{u.name}</td>
                <td className="px-4 py-3 font-mono text-[13px]">{u.username}</td>
                <td className="px-4 py-3 text-muted">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={cx("rounded-full px-2.5 py-0.5 text-xs font-medium", ROLE_CLS[u.role])}>{u.role.toLowerCase()}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  {u.username !== "admin" && <RemoveUserButton id={u.id} name={u.name} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
