import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <h1 className="text-2xl font-bold mb-2">404</h1>
      <p className="mb-6">Page not found.</p>
      <Link href="/"><Button>Dashboard</Button></Link>
    </div>
  );
}
