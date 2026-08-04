const PageContainer = ({ title, subtitle, children }) => (
  <section className="rounded-[28px] border border-slate-800/80 bg-slate-900/70 p-6 shadow-[0_24px_80px_rgba(2,6,23,0.45)] backdrop-blur-xl">
    <div className="mb-6 flex flex-col gap-2 border-b border-slate-800/80 pb-5">
      <h2 className="text-2xl font-semibold tracking-tight text-white">{title}</h2>
      {subtitle ? <p className="text-sm leading-6 text-slate-400">{subtitle}</p> : null}
    </div>
    {children}
  </section>
);

export default PageContainer;
