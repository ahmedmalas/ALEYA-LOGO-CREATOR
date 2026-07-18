import Link from "next/link";

export function FirstRunOnboarding() {
  return (
    <section className="panel animate-rise mb-8 rounded-3xl p-6 md:p-8">
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--forest)]">Welcome</p>
      <h2 className="mt-2 text-2xl md:text-3xl">Create your first logo in three steps</h2>
      <ol className="mt-6 grid gap-4 md:grid-cols-3">
        {[
          {
            step: "1",
            title: "Describe the brand",
            body: "Enter the business name, industry, style, colours, and icon ideas.",
          },
          {
            step: "2",
            title: "Generate concepts",
            body: "Create multiple directions, compare them, and refine the strongest mark.",
          },
          {
            step: "3",
            title: "Save a Brand Kit",
            body: "Select a final logo to keep exports, palette, and typography together.",
          },
        ].map((item) => (
          <li key={item.step} className="border-t border-black/10 pt-4">
            <p className="text-sm font-semibold text-[var(--forest-deep)]">Step {item.step}</p>
            <p className="mt-1 font-medium">{item.title}</p>
            <p className="mt-1 text-sm text-black/60">{item.body}</p>
          </li>
        ))}
      </ol>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/projects/new" className="btn btn-primary">
          Create first project
        </Link>
        <Link href="/gallery" className="btn btn-secondary">
          Browse examples
        </Link>
      </div>
    </section>
  );
}
