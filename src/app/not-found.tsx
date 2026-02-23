import Link from "next/link";

// Force dynamic rendering to avoid useSearchParams issues during static generation
export const dynamic = "force-dynamic";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-muted-foreground">
      <h1 className="text-4xl font-bold text-foreground">404</h1>
      <p className="text-sm">Page not found</p>
      <Link
        href="/"
        className="rounded-lg border border-foreground/10 bg-muted/50 px-4 py-2 text-sm text-foreground/80 transition-colors hover:bg-muted/80"
      >
        Return to Dashboard
      </Link>
    </div>
  );
}
