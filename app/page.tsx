import { Navbar } from '@/components/landing/Navbar';
import { Hero } from '@/components/landing/Hero';
import { LogosMarquee } from '@/components/landing/LogosMarquee';
import { About } from '@/components/landing/About';
import { AgentsGrid } from '@/components/landing/AgentsGrid';
import { Testimonials } from '@/components/landing/Testimonials';
import { Pricing } from '@/components/landing/Pricing';
import { ContactForm } from '@/components/landing/ContactForm';
import { Footer } from '@/components/landing/Footer';

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-bg-base">
      <Navbar />
      <Hero />
      <LogosMarquee />
      <About />
      <AgentsGrid />
      <Testimonials />
      <Pricing />
      <ContactForm />
      <Footer />
    </main>
  );
}
