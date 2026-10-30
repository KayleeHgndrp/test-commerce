import { BlogIndex, blogIndexMetadata } from "@/components/BlogIndex";

export async function generateMetadata({ params }: PageProps<"/[locale]/blog">) {
  return blogIndexMetadata((await params).locale, 1);
}

export default async function Blog({ params }: PageProps<"/[locale]/blog">) {
  return <BlogIndex locale={(await params).locale} page={1} />;
}
