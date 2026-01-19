import { Metadata } from "next";
import Link from "next/link";
import { Home, Search, Phone } from "lucide-react";

export const metadata: Metadata = {
  title: "Page Not Found",
  description: "The page you're looking for doesn't exist or has been moved.",
};

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <div className="text-center">
        <div className="mb-4 text-8xl font-bold text-primary/20">404</div>

        <h1 className="mb-2 text-2xl font-bold text-foreground">
          Page Not Found
        </h1>

        <p className="mb-8 max-w-md text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
          Let&apos;s get you back on track.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Home className="h-4 w-4" />
            Go home
          </Link>

          <Link
            href="/quote"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          >
            <Search className="h-4 w-4" />
            Get a quote
          </Link>
        </div>

        <div className="mt-8 rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">
            Need immediate help?{" "}
            <Link
              href="tel:+18885330302"
              className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
            >
              <Phone className="h-3 w-3" />
              (888) 533-0302
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
