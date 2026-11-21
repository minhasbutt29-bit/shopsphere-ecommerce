export function ProsePage({ title, updated, children }: { title: string; updated?: string; children: React.ReactNode }) {
  return (
    <article className="container max-w-3xl py-14">
      <h1 className="text-4xl">{title}</h1>
      {updated && <p className="mt-2 text-sm text-muted-foreground">Last updated {updated}</p>}
      <div className="mt-8 space-y-4 leading-relaxed text-muted-foreground [&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:text-foreground [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-foreground">{children}</div>
    </article>
  );
}
