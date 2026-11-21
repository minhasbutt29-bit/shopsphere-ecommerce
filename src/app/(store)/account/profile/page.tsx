import { db } from "@/lib/db";
import { requireUser } from "@/lib/authz";
import { ProfileForm } from "@/components/account/profile-form";

export const metadata = { title: "My profile" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await requireUser();
  const p = await db.user.findUniqueOrThrow({ where: { id: user.id }, select: { name: true, email: true, phone: true, newsletter: true } });
  return (
    <div className="max-w-lg">
      <h1 className="text-3xl">My profile</h1>
      <ProfileForm name={p.name ?? ""} email={p.email} phone={p.phone ?? ""} newsletter={p.newsletter} />
    </div>
  );
}
