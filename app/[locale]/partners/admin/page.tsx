import type { Metadata } from "next";
import { PartnerAdmin } from "@/components/PartnerAdmin";

export const metadata: Metadata = { title: "Partnerbeheer", robots: { index: false, follow: false } };

// Owner-only overview; the data behind it needs ADMIN_TOKEN.
export default function PartnerAdminPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-12">
      <PartnerAdmin />
    </div>
  );
}
