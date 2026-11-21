import { db } from "@/lib/db";
import { requireUser } from "@/lib/authz";
import { AddressManager } from "@/components/account/address-manager";

export const metadata = { title: "My addresses" };
export const dynamic = "force-dynamic";

export default async function AddressesPage() {
  const user = await requireUser();
  const addresses = await db.address.findMany({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] });
  return (
    <div>
      <h1 className="text-3xl">My addresses</h1>
      <AddressManager addresses={addresses.map(({ id, label, fullName, phone, line1, line2, city, state, postalCode, country, isDefault }) => ({ id, label, fullName, phone, line1, line2, city, state, postalCode, country, isDefault }))} />
    </div>
  );
}
