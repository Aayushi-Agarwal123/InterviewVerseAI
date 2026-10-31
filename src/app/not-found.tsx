import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="max-w-xl">
      <p className="text-xs font-medium tracking-[0.18em] text-copper uppercase">
        Missing
      </p>
      <h1 className="mt-2 text-4xl tracking-tight">That page is not in the studio.</h1>
      <p className="mt-3 text-muted-foreground">
        The round you want is either on another device, or the address is wrong.
      </p>
      <Button className="mt-6 h-10" nativeButton={false} render={<Link href="/" />}>
        Back to the studio
      </Button>
    </div>
  );
}
