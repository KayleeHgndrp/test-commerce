import Image from "next/image";
import Link from "next/link";
import { formatPostDate, postPath, type BlogPost } from "@/lib/blog";
import type { Locale } from "@/lib/i18n/locales";
import { fmt } from "@/lib/i18n/messages";

export function BlogCover({ post, priority, sizes }: { post: BlogPost; priority?: boolean; sizes: string }) {
  if (!post.image) {
    // No cover image: a branded placeholder in the logo's style.
    return (
      <div aria-hidden className="absolute inset-0 grid place-items-center bg-accent-soft">
        <span className="grid grid-cols-2 gap-2">
          <span className="h-8 w-8 rounded-lg bg-accent" />
          <span className="h-8 w-8 rounded-lg bg-accent/25" />
          <span className="h-8 w-8 rounded-lg bg-accent/45" />
          <span className="h-8 w-8 rounded-lg bg-accent/70" />
        </span>
      </div>
    );
  }
  return (
    <Image
      src={post.image}
      alt={post.imageAlt ?? ""}
      fill
      priority={priority}
      sizes={sizes}
      unoptimized={/^https?:\/\//.test(post.image)}
      className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
    />
  );
}

export function BlogCard({ post, readTime }: { post: BlogPost; readTime: string }) {
  const meta = [post.category, formatPostDate(post.date, post.locale as Locale), fmt(readTime, { count: post.readMinutes })].filter(Boolean);
  return (
    <Link
      href={postPath(post)}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface transition hover:border-accent/50 hover:shadow-xl hover:shadow-black/5"
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <BlogCover post={post} sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" />
      </div>
      <div className="flex flex-1 flex-col p-6">
        <p className="text-xs font-medium text-muted">{meta.join(" · ")}</p>
        <h3 className="mt-2 text-lg font-bold leading-snug transition group-hover:text-accent">{post.title}</h3>
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted">{post.description}</p>
      </div>
    </Link>
  );
}
