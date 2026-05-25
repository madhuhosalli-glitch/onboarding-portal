import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <div className="grid min-h-[70vh] items-center gap-8 lg:grid-cols-2">
      <section className="rounded-3xl bg-white p-8 shadow-xl ring-1 ring-slate-200 sm:p-10">
        <div className="mb-4 inline-flex rounded-full bg-blue-50 px-4 py-1 text-sm font-medium text-blue-700 ring-1 ring-blue-100">
          Internal Training Portal
        </div>

        <h2 className="max-w-2xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Build strong articles and employees through structured training.
        </h2>

        <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
          Complete training modules, attempt quizzes, and track learning progress
          through one secure internal platform.
        </p>

        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            href="/login"
            className="inline-flex items-center rounded-xl bg-blue-700 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-blue-800"
          >
            Login
          </Link>
        </div>
      </section>

      <section>
        <div className="overflow-hidden rounded-3xl shadow-xl ring-1 ring-slate-200">
          <Image
            src="/office.png"
            alt="Office training"
            width={800}
            height={500}
            className="h-full w-full object-cover"
            priority
          />
        </div>
      </section>
    </div>
  );
}
