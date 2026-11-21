import Link from "next/link";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Payment cancelled", robots: { index: false } };

export default function CancelPage({ searchParams }: { searchParams: { order?: string } }) {
  return (
    <div className="container max-w-xl py-24 text-center">
      <XCircle className="mx-auto h-14 w-14 text-destructive" aria-hidden />
      <h1 className="mt-6 text-4xl">Payment not completed</h1>
      <p className="mt-3 text-muted-foreground">{searchParams.order ? `Order ${searchParams.order} is awaiting payment.` : ""} Unpaid orders are released automatically, and your items return to stock. You can try again from your cart.</p>
      <div className="mt-10 flex justify-center gap-3">
        <Button asChild><Link href="/cart">Back to cart</Link></Button>
        <Button asChild variant="outline"><Link href="/account/orders">My orders</Link></Button>
      </div>
    </div>
  );
}
