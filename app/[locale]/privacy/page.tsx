import { LegalPage, legalMetadata } from "@/components/LegalPage";

export function generateMetadata({ params }: PageProps<"/[locale]/privacy">) {
  return legalMetadata(params, "privacy");
}

export default function Privacy({ params }: PageProps<"/[locale]/privacy">) {
  return <LegalPage params={params} kind="privacy" />;
}
