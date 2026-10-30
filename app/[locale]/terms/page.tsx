import { LegalPage, legalMetadata } from "@/components/LegalPage";

export function generateMetadata({ params }: PageProps<"/[locale]/terms">) {
  return legalMetadata(params, "terms");
}

export default function Terms({ params }: PageProps<"/[locale]/terms">) {
  return <LegalPage params={params} kind="terms" />;
}
