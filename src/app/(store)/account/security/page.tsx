import { PasswordForm } from "@/components/account/password-form";

export const metadata = { title: "Account security" };

export default function SecurityPage() {
  return (
    <div className="max-w-lg">
      <h1 className="text-3xl">Account security</h1>
      <p className="mt-2 text-sm text-muted-foreground">Choose a strong password you don't use elsewhere.</p>
      <PasswordForm />
    </div>
  );
}
