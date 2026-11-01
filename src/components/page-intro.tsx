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
      <p className="text-[11px] font-semibold tracking-[0.18em] text-sage uppercase">{kicker}</p>
      <h1 className="mt-2 font-heading text-4xl leading-[1.08] tracking-tight text-balance text-foreground md:text-[2.75rem]">
        {title}
      </h1>
      <p className="mt-3 max-w-xl text-[15px] leading-7 text-muted-foreground">{lede}</p>
    </header>
  );
}
