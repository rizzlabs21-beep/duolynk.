import { SiteHeader } from '@/components/landing/SiteHeader';
import { Hero } from '@/components/landing/Hero';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { RoomOptions } from '@/components/landing/RoomOptions';
import { ChatSection } from '@/components/landing/ChatSection';
import { GamesSection } from '@/components/landing/GamesSection';
import { ProgressSection } from '@/components/landing/ProgressSection';
import { AboutSection } from '@/components/landing/AboutSection';
import { SubscriptionSection } from '@/components/landing/SubscriptionSection';
import { FinalCta } from '@/components/landing/FinalCta';
import { SiteFooter } from '@/components/landing/SiteFooter';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <Hero />
        <HowItWorks />
        <RoomOptions />
        <ChatSection />
        <GamesSection />
        <ProgressSection />
        <AboutSection />
        <SubscriptionSection />
        <FinalCta />
      </main>
      <SiteFooter />
    </div>
  );
}
