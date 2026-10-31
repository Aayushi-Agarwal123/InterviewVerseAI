export function PageIntro({
  kicker,
  title,
  lede,
}: {
  kicker: string;
  title: string;
  lede: string;
}) {
  return (
    <header className="max-w-2xl">
      <p className="text-xs font-medium tracking-[0.18em] text-copper uppercase">
        {kicker}
      </p>
      <h1 className="mt-2 text-4xl leading-[1.05] tracking-tight text-balance md:text-5xl">
        {title}
      </h1>
      <p className="mt-4 text-base leading-7 text-muted-foreground">{lede}</p>
    </header>
  );
}
