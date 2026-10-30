import { LegalPage, legalMetadata } from "@/components/LegalPage";

export function generateMetadata({ params }: PageProps<"/[locale]/refund">) {
  return legalMetadata(params, "refund");
}

export default function Refund({ params }: PageProps<"/[locale]/refund">) {
  return <LegalPage params={params} kind="refund" />;
}
