import Link from "next/link";

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div
        className="absolute inset-0 -z-10"
        style={{
          backgroundImage:
            "linear-gradient(120deg, rgba(18,54,47,0.82), rgba(18,21,26,0.55)), url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1800&q=80')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col justify-end px-6 pb-16 pt-10 md:px-10">
        <p className="brand animate-rise text-5xl text-[#f6f0e4] md:text-7xl">ALEYA</p>
        <h1
          className="mt-3 max-w-xl animate-rise text-2xl font-medium text-[#f6f0e4]"
          style={{ animationDelay: "80ms" }}
        >
          Logo Creator
        </h1>
        <p
          className="mt-3 max-w-lg animate-rise text-[#efe7d8]"
          style={{ animationDelay: "140ms" }}
        >
          Generate distinct brand marks, refine concepts, and export a reusable Brand Kit for Aleya
          Invoicing.
        </p>
        <div
          className="mt-8 flex flex-wrap gap-3 animate-rise"
          style={{ animationDelay: "200ms" }}
        >
          <Link href="/signup" className="btn btn-primary">
            Start creating
          </Link>
          <Link href="/login" className="btn btn-secondary border-[#f6f0e4] text-[#f6f0e4]">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
