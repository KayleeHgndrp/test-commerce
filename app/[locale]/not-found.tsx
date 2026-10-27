import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto mt-24 max-w-md px-4 text-center">
      <h1 className="text-5xl font-bold">404</h1>
      <p className="mt-4 text-muted">Page not found.</p>
      <Link href="/" className="mt-8 inline-flex rounded-lg bg-accent px-6 py-3 font-semibold text-white">
        Home
      </Link>
    </div>
  );
}
