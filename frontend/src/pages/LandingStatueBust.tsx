import { Link } from 'react-router-dom';
import { ArrowRight, Upload, Cpu, Package, Gift, Building2, Home, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  FadeIn,
  FadeInUp,
  RevealOnScroll,
  StaggerList,
  StaggerItem,
  MotionButton,
} from '../components/Motion';

/* ── assets (public/) ─────────────────────────────────────── */
const HERO_IMG   = '/images/landing/statue-bust/hero.png';
const SHOW_1     = '/images/landing/statue-bust/showcase-1.png';
const SHOW_2     = '/images/landing/statue-bust/showcase-2.png';
const SHOW_3     = '/images/landing/statue-bust/showcase-3.png';

/* ── data ─────────────────────────────────────────────────── */
const STATS = [
  { value: '2,000+', label: 'Busts Created' },
  { value: '4.9★',   label: 'Avg. Rating' },
  { value: '5 days', label: 'Avg. Delivery' },
  { value: '100%',   label: 'Satisfaction' },
];

const STEPS = [
  {
    num: '01',
    icon: Upload,
    title: 'Upload a Photo',
    desc: 'Send us any clear portrait photo. Front-facing works best, but we can work with most angles.',
  },
  {
    num: '02',
    icon: Cpu,
    title: 'AI Sculpts Your Bust',
    desc: 'Our AI generates a detailed 3D model capturing every facial feature, then you preview and approve it.',
  },
  {
    num: '03',
    icon: Package,
    title: 'Printed & Shipped',
    desc: 'Professional full-color 3D printing brings your bust to life. It arrives safely packaged at your door.',
  },
];

const SHOWCASE = [
  { src: SHOW_1, title: 'Full-Color Realism',   desc: 'Every skin tone and hair detail captured faithfully.' },
  { src: SHOW_2, title: 'Classical Marble',      desc: 'Timeless white marble aesthetic for an elegant statement.' },
  { src: SHOW_3, title: 'The Perfect Gift',      desc: 'Surprise someone with a one-of-a-kind keepsake.' },
];

const USE_CASES = [
  { icon: Gift,      title: 'Personalized Gifts',   desc: 'Birthdays, anniversaries, graduations — a gift they\'ll never forget.' },
  { icon: Home,      title: 'Home Décor',            desc: 'A conversation piece that adds personality to any shelf or mantle.' },
  { icon: Trophy,    title: 'Awards & Recognition',  desc: 'Custom busts for employee awards, retirement tributes, or hall-of-fame displays.' },
  { icon: Building2, title: 'Memorial Keepsakes',    desc: 'Honor loved ones with a beautiful, tangible tribute that lasts forever.' },
];

/* ── helpers ──────────────────────────────────────────────── */
const goldGradient = 'bg-gradient-to-r from-brand-accent to-amber-300';
const goldText     = 'bg-clip-text text-transparent bg-gradient-to-r from-brand-accent via-amber-200 to-brand-accent';

/* ═══════════════════════════════════════════════════════════ */
export function LandingStatueBust() {
  return (
    <div className="bg-brand-dark overflow-x-hidden">

      {/* ── HERO ────────────────────────────────────────────── */}
      <section className="relative min-h-[100dvh] flex items-center">
        {/* bg image + overlays */}
        <div className="absolute inset-0">
          <img
            src={HERO_IMG}
            alt=""
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-brand-dark via-brand-dark/85 to-brand-dark/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-dark via-transparent to-brand-dark/30" />
        </div>

        {/* grain texture overlay */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 py-32 md:py-0 w-full">
          <div className="max-w-2xl">
            <FadeIn delay={0.15} y={10}>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-accent/80 mb-6">
                Custom 3D-Printed Portraits
              </p>
            </FadeIn>

            <FadeIn delay={0.3} y={16}>
              <h1 className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold leading-[1.05] text-white mb-6">
                Immortalize
                <br />
                <span className={goldText}>anyone</span> in
                <br />
                sculpture.
              </h1>
            </FadeIn>

            <FadeIn delay={0.5} y={14}>
              <p className="text-lg md:text-xl text-white/60 leading-relaxed mb-10 max-w-lg">
                Upload a photo, and our AI sculpts a stunningly detailed portrait bust — then we 3D print and deliver it to your door.
              </p>
            </FadeIn>

            <FadeInUp delay={0.65}>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/create/statue-bust">
                  <MotionButton
                    className={`${goldGradient} text-brand-dark px-8 py-4 rounded-full text-sm font-semibold uppercase tracking-wider flex items-center gap-2 hover:shadow-[0_0_40px_rgba(237,174,73,0.4)] transition-shadow`}
                  >
                    Create Your Bust
                    <ArrowRight className="h-4 w-4" />
                  </MotionButton>
                </Link>
                <a
                  href="#how-it-works"
                  className="px-8 py-4 rounded-full text-sm font-medium text-white/60 uppercase tracking-wider border border-white/10 hover:border-white/25 hover:text-white/80 transition-all flex items-center gap-2"
                >
                  How It Works
                </a>
              </div>
            </FadeInUp>

            <FadeIn delay={0.8}>
              <p className="mt-8 text-sm text-white/30">
                From $29 &middot; Ships in 3–7 days &middot; No design skills needed
              </p>
            </FadeIn>
          </div>
        </div>

        {/* scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
        >
          <div className="w-5 h-8 rounded-full border border-white/20 flex items-start justify-center pt-1.5">
            <div className="w-1 h-2 rounded-full bg-brand-accent/60" />
          </div>
        </motion.div>
      </section>

      {/* ── SOCIAL PROOF BAR ────────────────────────────────── */}
      <section className="relative border-y border-white/5">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <RevealOnScroll>
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/5">
              {STATS.map((s) => (
                <div key={s.label} className="py-8 md:py-10 text-center px-4">
                  <p className={`font-display text-2xl md:text-3xl font-bold ${goldText} mb-1`}>
                    {s.value}
                  </p>
                  <p className="text-xs uppercase tracking-[0.15em] text-white/40">{s.label}</p>
                </div>
              ))}
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* ── SHOWCASE GALLERY ────────────────────────────────── */}
      <section className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <RevealOnScroll>
            <div className="text-center mb-16">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-accent/70 mb-4">
                Gallery
              </p>
              <h2 className="font-display text-4xl md:text-5xl font-bold text-white">
                Every bust tells a story
              </h2>
            </div>
          </RevealOnScroll>

          <StaggerList className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {SHOWCASE.map((item) => (
              <StaggerItem key={item.title}>
                <div className="group relative rounded-2xl overflow-hidden bg-brand-dark-card">
                  <div className="aspect-square overflow-hidden">
                    <img
                      src={item.src}
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-brand-dark via-brand-dark/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-500" />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h3 className="font-display text-xl font-semibold text-white mb-1">
                      {item.title}
                    </h3>
                    <p className="text-sm text-white/50">{item.desc}</p>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerList>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 md:py-32 relative">
        {/* subtle divider line */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-px bg-gradient-to-r from-transparent via-brand-accent/30 to-transparent" />

        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <RevealOnScroll>
            <div className="text-center mb-20">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-accent/70 mb-4">
                How it works
              </p>
              <h2 className="font-display text-4xl md:text-5xl font-bold text-white">
                Three steps to your <em className="italic text-brand-accent">masterpiece</em>
              </h2>
            </div>
          </RevealOnScroll>

          <StaggerList className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            {STEPS.map((step) => (
              <StaggerItem key={step.num}>
                <div className="relative">
                  {/* step number watermark */}
                  <span className="font-display text-[6rem] font-bold leading-none text-white/[0.03] absolute -top-6 -left-2 select-none pointer-events-none">
                    {step.num}
                  </span>
                  <div className="relative z-10">
                    <div className="w-12 h-12 rounded-xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center mb-5">
                      <step.icon className="h-5 w-5 text-brand-accent" />
                    </div>
                    <h3 className="font-display text-xl font-semibold text-white mb-3">
                      {step.title}
                    </h3>
                    <p className="text-sm text-white/50 leading-relaxed">
                      {step.desc}
                    </p>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerList>
        </div>
      </section>

      {/* ── USE CASES ───────────────────────────────────────── */}
      <section className="py-24 md:py-32 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-px bg-gradient-to-r from-transparent via-brand-accent/30 to-transparent" />

        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <RevealOnScroll>
            <div className="text-center mb-16">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-accent/70 mb-4">
                Perfect for
              </p>
              <h2 className="font-display text-4xl md:text-5xl font-bold text-white">
                A gift unlike any other
              </h2>
            </div>
          </RevealOnScroll>

          <StaggerList className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {USE_CASES.map((uc) => (
              <StaggerItem key={uc.title}>
                <div className="group rounded-2xl bg-brand-dark-card/50 border border-white/5 p-8 hover:border-brand-accent/20 transition-colors duration-500">
                  <div className="flex items-start gap-5">
                    <div className="w-11 h-11 rounded-xl bg-brand-accent/10 flex items-center justify-center shrink-0 group-hover:bg-brand-accent/20 transition-colors">
                      <uc.icon className="h-5 w-5 text-brand-accent" />
                    </div>
                    <div>
                      <h3 className="font-display text-lg font-semibold text-white mb-2 group-hover:text-brand-accent transition-colors">
                        {uc.title}
                      </h3>
                      <p className="text-sm text-white/45 leading-relaxed">
                        {uc.desc}
                      </p>
                    </div>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerList>
        </div>
      </section>

      {/* ── PRICING HINT ────────────────────────────────────── */}
      <section className="py-24 md:py-32 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-px bg-gradient-to-r from-transparent via-brand-accent/30 to-transparent" />

        <div className="max-w-3xl mx-auto px-6 lg:px-8 text-center">
          <RevealOnScroll>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-accent/70 mb-4">
              Pricing
            </p>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-6">
              Museum quality,<br />accessible price
            </h2>
            <p className="text-white/50 text-lg leading-relaxed mb-10 max-w-xl mx-auto">
              Every bust is custom-made, full-color 3D printed, and hand-finished. Pricing is based on size — most busts start at just $29.
            </p>
          </RevealOnScroll>

          <RevealOnScroll delay={0.15}>
            <div className="inline-flex flex-col sm:flex-row items-center gap-6 sm:gap-10 rounded-2xl bg-brand-dark-card/60 border border-white/5 px-10 py-8">
              <div className="text-center">
                <p className="text-xs uppercase tracking-[0.15em] text-white/40 mb-1">Small (7 cm)</p>
                <p className={`font-display text-3xl font-bold ${goldText}`}>$29</p>
              </div>
              <div className="hidden sm:block w-px h-12 bg-white/10" />
              <div className="text-center">
                <p className="text-xs uppercase tracking-[0.15em] text-white/40 mb-1">Medium (12 cm)</p>
                <p className={`font-display text-3xl font-bold ${goldText}`}>$49</p>
              </div>
              <div className="hidden sm:block w-px h-12 bg-white/10" />
              <div className="text-center">
                <p className="text-xs uppercase tracking-[0.15em] text-white/40 mb-1">Large (20 cm)</p>
                <p className={`font-display text-3xl font-bold ${goldText}`}>$89</p>
              </div>
            </div>
          </RevealOnScroll>

          <RevealOnScroll delay={0.25}>
            <p className="mt-6 text-sm text-white/30">
              Free shipping on orders over $50 &middot; Satisfaction guaranteed
            </p>
          </RevealOnScroll>
        </div>
      </section>

      {/* ── FINAL CTA ───────────────────────────────────────── */}
      <section className="py-32 md:py-40 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-px bg-gradient-to-r from-transparent via-brand-accent/30 to-transparent" />

        {/* ambient glow */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[500px] h-[500px] rounded-full bg-brand-accent/5 blur-[120px]" />
        </div>

        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <RevealOnScroll>
            <h2 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-tight mb-6">
              Ready to sculpt<br />your story?
            </h2>
            <p className="text-lg text-white/50 mb-12 max-w-md mx-auto">
              It takes 60 seconds to start. Upload a photo and see your bust come to life.
            </p>
            <Link to="/create/statue-bust">
              <MotionButton
                className={`${goldGradient} text-brand-dark px-10 py-5 rounded-full text-sm font-semibold uppercase tracking-wider hover:shadow-[0_0_50px_rgba(237,174,73,0.4)] transition-shadow`}
              >
                Start Creating Now
                <ArrowRight className="inline-block ml-2 h-4 w-4" />
              </MotionButton>
            </Link>
          </RevealOnScroll>
        </div>
      </section>
    </div>
  );
}
