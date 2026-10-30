import { LegalPage, legalMetadata } from "@/components/LegalPage";

export function generateMetadata({ params }: PageProps<"/[locale]/cookies">) {
  return legalMetadata(params, "cookies");
}

export default function Cookies({ params }: PageProps<"/[locale]/cookies">) {
  return <LegalPage params={params} kind="cookies" />;
}
