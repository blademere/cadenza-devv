import { Header, Footer } from "../components";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <main>
        <section className="overflow-hidden bg-background ">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-16 lg:px-8">
            Cadenza Music Center
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
