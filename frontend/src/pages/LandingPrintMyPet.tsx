import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Camera,
  Eye,
  Package,
  Heart,
  Gift,
  Home,
  Star,
  ChevronDown,
  Check,
  Shield,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { motion, AnimatePresence, useInView, useSpring, useMotionValue } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import {
  FadeIn,
  FadeInUp,
  RevealOnScroll,
  StaggerList,
  StaggerItem,
  MotionButton,
} from '../components/Motion';

/* ── assets ───────────────────────────────────────────────── */
const HERO_IMG = '/images/landing/print-my-pet/hero.png';
const SHOW_1   = '/images/landing/print-my-pet/showcase-1.png';
const SHOW_2   = '/images/landing/print-my-pet/showcase-2.png';
const SHOW_3   = '/images/landing/print-my-pet/showcase-3.png';

/* ── animated counter ─────────────────────────────────────── */
function AnimatedCount({ value, suffix = '' }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { duration: 1200, bounce: 0 });
  const [display, setDisplay] = useState('0');

  useEffect(() => {
    if (inView) mv.set(value);
  }, [inView, value, mv]);

  useEffect(() => {
    const unsub = spring.on('change', (v) => {
      setDisplay(Math.round(v).toLocaleString());
    });
    return unsub;
  }, [spring]);

  return <span ref={ref}>{display}{suffix}</span>;
}

/* ── data ─────────────────────────────────────────────────── */
const TRUST_STATS = [
  { value: 4000, suffix: '+', label: 'Pets Printed' },
  { value: 4.9,  suffix: '★', label: 'Average Rating', raw: '4.9★' },
  { value: 7,    suffix: ' day', label: 'Avg. Turnaround', prefix: '< ' },
  { label: 'Dogs, Cats & More', raw: 'All Breeds' },
];

const STEPS = [
  {
    num: '01',
    icon: Camera,
    title: 'Snap a Photo',
    desc: 'Any clear photo works — even a phone selfie with your pet. No professional photography needed.',
  },
  {
    num: '02',
    icon: Eye,
    title: 'Approve Your Preview',
    desc: 'See a full 3D model of your pet before we print. Request free changes until every detail is right.',
    highlight: true,
  },
  {
    num: '03',
    icon: Package,
    title: 'Unbox Your Keepsake',
    desc: 'Full-color, hand-inspected, and shipped in a premium gift box. Ready to display or gift.',
  },
];

const GUARANTEES = [
  { icon: RefreshCw, title: 'Free Revisions',      desc: 'Not happy with the preview? We\'ll adjust every detail — fur color, pose, expression — until you love it.' },
  { icon: Clock,     title: 'Fast Turnaround',      desc: 'Most orders ship within 5–7 business days. Need it sooner? Rush options available at checkout.' },
  { icon: Shield,    title: 'Satisfaction Promise',  desc: 'If the printed figurine doesn\'t match your approved preview, we reprint it free or refund you. No questions.' },
];

const TESTIMONIALS = [
  {
    quote: 'When I opened the box and saw Cooper\'s little face — the exact tilt of his head, the spot behind his ear — I just held it and cried. He\'s been gone a year but this makes it feel like he\'s still here.',
    name: 'Amanda R.',
    detail: 'Memorial for Cooper (Beagle)',
    stars: 5,
    pet: '🐕',
  },
  {
    quote: 'Got my girlfriend\'s cat Mochi printed as a surprise. She said it was the most thoughtful gift she\'s ever received. The tabby markings were spot-on — even the little white chin patch.',
    name: 'Derek M.',
    detail: 'Gift — Mochi (Tabby Cat)',
    stars: 5,
    pet: '🐱',
  },
  {
    quote: 'Ordered all three of my dogs. Luna\'s tiny ear spot, Bear\'s underbite, Penny\'s head tilt — they nailed every one. Only wish I\'d ordered the large size for Bear.',
    name: 'Sarah P.',
    detail: '3-Pet Order — Luna, Bear & Penny',
    stars: 4,
    pet: '🐾',
  },
];

const FAQS = [
  {
    q: 'Will it capture my pet\'s unique markings?',
    a: 'Yes — our AI meticulously matches coat color, markings, patches, spots, and eye color from your photo. You\'ll review a full 3D preview before we print and can request free adjustments to any detail.',
  },
  {
    q: 'What kind of photo works best?',
    a: 'A clear, well-lit photo where your pet is fully visible. Front or three-quarter angle is ideal. Phone photos work great — no professional photography needed.',
  },
  {
    q: 'What animals can you print?',
    a: 'Dogs, cats, rabbits, birds, hamsters, horses — if you can photograph it, we can print it. We\'ve done everything from parrots to guinea pigs.',
  },
  {
    q: 'Can I choose the pose?',
    a: 'We match the pose from your photo by default. Want sitting, lying down, or standing? Just tell us and we\'ll adjust it in the preview stage — free of charge.',
  },
  {
    q: 'What if I want multiple pets together?',
    a: 'We can create a multi-pet figurine with two or more animals on a shared base. Add photos of each pet when ordering. Discount applies automatically for 2+ pets.',
  },
  {
    q: 'Is it food-safe for a cake?',
    a: 'While most customers display these on shelves, a food-safe coating option is available at checkout if you plan to use it as a cake topper.',
  },
];

/* ── helpers ──────────────────────────────────────────────── */
const warmGradient = 'bg-gradient-to-r from-amber-400 via-brand-accent to-orange-400';
const warmText     = 'bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-brand-accent-light to-orange-300';
const accent       = 'text-amber-400';
const accentBg     = 'bg-amber-400/10';
const accentBdr    = 'border-amber-400/15';
const divider      = 'absolute top-0 left-1/2 -translate-x-1/2 w-24 h-px bg-gradient-to-r from-transparent via-amber-400/20 to-transparent';

function InlineCTA({ label = 'Start with your pet\'s photo' }: { label?: string }) {
  return (
    <div className="text-center mt-10">
      <Link
        to="/create/pet-portrait"
        className="inline-flex items-center gap-2 text-sm font-semibold text-amber-400 hover:text-amber-300 transition-colors"
      >
        {label} <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

function FAQItem({ faq }: { faq: { q: string; a: string } }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/5">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-left group"
      >
        <span className="font-display text-base font-medium text-white group-hover:text-amber-400 transition-colors pr-4">
          {faq.q}
        </span>
        <ChevronDown className={`h-4 w-4 text-white/40 shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <p className="text-sm text-white/50 leading-relaxed pb-5">{faq.a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
export function LandingPrintMyPet() {
  return (
    <div className="bg-brand-dark overflow-x-hidden">

      {/* ═══ 1. HERO — Split layout, product visible ══════ */}
      <section className="relative min-h-[100dvh] flex items-center">
        {/* subtle ambient glow */}
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[400px] bg-amber-500/5 blur-[120px] pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 py-24 md:py-0 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Text side */}
            <div className="order-2 lg:order-1">
              <FadeIn delay={0.15} y={10}>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-400/70 mb-6">
                  Custom 3D-Printed Pet Figurines
                </p>
              </FadeIn>

              <FadeIn delay={0.3} y={16}>
                <h1 className="font-display text-5xl sm:text-6xl md:text-7xl font-bold leading-[1.08] text-white mb-6">
                  The face you love,
                  <br />
                  <span className={warmText}>in your hands.</span>
                </h1>
              </FadeIn>

              <FadeIn delay={0.5} y={14}>
                <p className="text-lg md:text-xl text-white/70 leading-relaxed mb-4 max-w-lg">
                  You know that look they give you when you come home? The head tilt? The little spot behind their ear? We capture all of it.
                </p>
                <p className="text-base text-white/50 mb-10 max-w-lg">
                  Upload a photo → approve a 3D preview → receive a hand-inspected figurine in a gift-ready box.
                </p>
              </FadeIn>

              <FadeInUp delay={0.65}>
                <div className="flex flex-col sm:flex-row gap-4 items-start">
                  <Link to="/create/pet-portrait">
                    <MotionButton
                      className={`${warmGradient} text-brand-dark px-8 py-4 rounded-full text-sm font-semibold uppercase tracking-wider flex items-center gap-2 hover:shadow-[0_0_40px_rgba(245,158,11,0.35)] transition-shadow`}
                    >
                      Upload Your Pet's Photo
                      <ArrowRight className="h-4 w-4" />
                    </MotionButton>
                  </Link>
                  <span className="text-sm text-white/30 pt-3">Phone photos work perfectly</span>
                </div>
              </FadeInUp>

              <FadeIn delay={0.8}>
                <p className="mt-8 text-sm text-white/30">
                  From $49 &middot; Free preview before printing &middot; Satisfaction guaranteed
                </p>
              </FadeIn>
            </div>

            {/* Image side — product visible at full brightness */}
            <FadeIn delay={0.4} y={20} className="order-1 lg:order-2">
              <div className="relative">
                <div className="rounded-2xl overflow-hidden shadow-2xl shadow-amber-900/20">
                  <img
                    src={HERO_IMG}
                    alt="Three custom 3D printed pet figurines — a golden retriever, tabby cat, and French bulldog"
                    className="w-full"
                  />
                </div>
                {/* floating badge */}
                <div className="absolute -bottom-4 -left-4 md:left-auto md:-right-4 bg-brand-dark-card border border-white/10 rounded-xl px-4 py-3 shadow-lg">
                  <p className="text-xs text-amber-400 font-semibold">★ 4.9 from 400+ reviews</p>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ═══ 2. TRUST BAR — Animated counters ═════════════ */}
      <section className="relative border-y border-white/5">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/5">
            {TRUST_STATS.map((s) => (
              <div key={s.label} className="py-8 md:py-10 text-center px-4">
                <p className={`font-display text-2xl md:text-3xl font-bold ${warmText} mb-1`}>
                  {s.raw ? s.raw : (
                    <>
                      {s.prefix || ''}<AnimatedCount value={s.value!} suffix={s.suffix} />
                    </>
                  )}
                </p>
                <p className="text-xs uppercase tracking-[0.15em] text-white/35">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 3. HOW IT WORKS ═══════════════════════════════ */}
      <section id="how-it-works" className="py-20 md:py-28 relative">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <RevealOnScroll>
            <div className="text-center mb-16">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-400/60 mb-4">
                How it works
              </p>
              <h2 className="font-display text-4xl md:text-5xl font-bold text-white">
                Three steps. One <em className="italic text-amber-400">perfect</em> keepsake.
              </h2>
            </div>
          </RevealOnScroll>

          <StaggerList className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            {STEPS.map((step) => (
              <StaggerItem key={step.num}>
                <div className={`relative rounded-2xl p-8 ${step.highlight ? 'bg-amber-400/5 border border-amber-400/15' : ''}`}>
                  <span className="font-display text-[6rem] font-bold leading-none text-white/[0.03] absolute -top-2 -left-1 select-none pointer-events-none">
                    {step.num}
                  </span>
                  <div className="relative z-10">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${step.highlight ? 'bg-amber-400/20 border border-amber-400/30' : `${accentBg} border ${accentBdr}`}`}>
                      <step.icon className={`h-5 w-5 ${accent}`} />
                    </div>
                    <h3 className="font-display text-xl font-semibold text-white mb-3">{step.title}</h3>
                    <p className="text-sm text-white/50 leading-relaxed">{step.desc}</p>
                    {step.highlight && (
                      <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-amber-400/70">
                        ← We don't print until you love it
                      </p>
                    )}
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerList>

          <InlineCTA />
        </div>
      </section>

      {/* ═══ 4. BEFORE/AFTER — Large, labeled ═════════════ */}
      <section className="py-20 md:py-28 relative">
        <div className={divider} />
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <RevealOnScroll>
            <div className="text-center mb-12">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-400/60 mb-4">
                See the likeness
              </p>
              <h2 className="font-display text-4xl md:text-5xl font-bold text-white">
                Every marking. Every expression.
              </h2>
            </div>
          </RevealOnScroll>

          <RevealOnScroll>
            <div className="max-w-4xl mx-auto mb-10">
              <div className="rounded-2xl overflow-hidden bg-brand-dark-card border border-white/5 relative">
                <img src={SHOW_1} alt="Photo of golden retriever next to matching 3D printed figurine" className="w-full" />
                {/* Labels overlay */}
                <div className="absolute top-4 left-4 bg-brand-dark/80 backdrop-blur-sm rounded-lg px-3 py-1.5">
                  <p className="text-xs font-semibold text-white/80 uppercase tracking-wider">Photo</p>
                </div>
                <div className="absolute top-4 right-4 bg-brand-dark/80 backdrop-blur-sm rounded-lg px-3 py-1.5">
                  <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Figurine</p>
                </div>
                {/* Center divider */}
                <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/20" />
              </div>
            </div>
          </RevealOnScroll>

          <StaggerList className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <StaggerItem>
              <div className="group rounded-2xl overflow-hidden bg-brand-dark-card relative">
                <div className="aspect-square overflow-hidden">
                  <img src={SHOW_2} alt="3D printed tabby cat figurine with gift box" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-brand-dark via-brand-dark/10 to-transparent opacity-50" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h3 className="font-display text-lg font-semibold text-white mb-1">Arrives Gift-Ready</h3>
                  <p className="text-sm text-white/50">Premium keepsake box included with every order.</p>
                </div>
              </div>
            </StaggerItem>
            <StaggerItem>
              <div className="group rounded-2xl overflow-hidden bg-brand-dark-card relative">
                <div className="aspect-square overflow-hidden">
                  <img src={SHOW_3} alt="Pet figurine displayed on bookshelf next to framed photo" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-brand-dark via-brand-dark/10 to-transparent opacity-50" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h3 className="font-display text-lg font-semibold text-white mb-1">A Keepsake Forever</h3>
                  <p className="text-sm text-white/50">Something you can hold when you miss them.</p>
                </div>
              </div>
            </StaggerItem>
          </StaggerList>

          <InlineCTA label="Ready? Upload your pet's photo" />
        </div>
      </section>

      {/* ═══ 5. MEMORIAL — Dedicated emotional section ════ */}
      <section className="py-20 md:py-28 relative">
        <div className={divider} />
        <div className="max-w-3xl mx-auto px-6 lg:px-8 text-center">
          <RevealOnScroll>
            <Heart className="h-8 w-8 text-amber-400/30 mx-auto mb-6" />
            <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-6">
              For the ones who are no longer here,<br />
              <span className="text-white/50">but never truly gone.</span>
            </h2>
            <p className="text-white/50 text-lg leading-relaxed mb-8 max-w-xl mx-auto">
              Many of our customers create figurines as memorials — a way to keep a piece of their best friend close. The figurine sits on your shelf, next to their photo, exactly where they belong.
            </p>
            <p className="text-sm text-white/60 italic mb-10 max-w-lg mx-auto">
              "When I opened the box and saw Cooper's little face — the exact tilt of his head, the spot behind his ear — I just held it and cried. He's been gone a year but this makes it feel like he's still here."
              <span className="block mt-2 not-italic text-white/40">— Amanda R., Memorial for Cooper</span>
            </p>
            <Link to="/create/pet-portrait">
              <MotionButton
                className="bg-white/5 border border-white/10 text-white px-8 py-4 rounded-full text-sm font-medium hover:border-amber-400/30 hover:text-amber-400 transition-all flex items-center gap-2 mx-auto"
              >
                Create a Memorial Figurine
                <ArrowRight className="h-4 w-4" />
              </MotionButton>
            </Link>
          </RevealOnScroll>
        </div>
      </section>

      {/* ═══ 6. GUARANTEES ════════════════════════════════= */}
      <section className="py-16 md:py-20 relative">
        <div className={divider} />
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <StaggerList className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {GUARANTEES.map((g) => (
              <StaggerItem key={g.title}>
                <div className="rounded-2xl bg-brand-dark-card/50 border border-white/5 p-6 text-center h-full">
                  <div className={`w-10 h-10 rounded-lg ${accentBg} border ${accentBdr} flex items-center justify-center mx-auto mb-4`}>
                    <g.icon className={`h-4 w-4 ${accent}`} />
                  </div>
                  <h3 className="font-display text-base font-semibold text-white mb-2">{g.title}</h3>
                  <p className="text-xs text-white/40 leading-relaxed">{g.desc}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerList>
        </div>
      </section>

      {/* ═══ 7. USE CASES ═════════════════════════════════ */}
      <section className="py-20 md:py-28 relative">
        <div className={divider} />
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <RevealOnScroll>
            <div className="text-center mb-14">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-400/60 mb-4">
                Perfect for
              </p>
              <h2 className="font-display text-4xl md:text-5xl font-bold text-white">
                Because they deserve it
              </h2>
            </div>
          </RevealOnScroll>

          <StaggerList className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { icon: Gift, title: 'Gifts They\'ll Cry Over', desc: 'Birthdays, holidays, or just because. The most thoughtful gift a pet lover can receive.' },
              { icon: Home, title: 'Shelf-Worthy Décor', desc: 'A conversation piece for your mantle or desk. Looks stunning next to a framed pet photo.' },
              { icon: Heart, title: 'Gotcha Days & Milestones', desc: 'Celebrate adoption anniversaries, birthdays, or the everyday joy they bring.' },
            ].map((r) => (
              <StaggerItem key={r.title}>
                <div className="group rounded-2xl bg-brand-dark-card/50 border border-white/5 p-7 hover:border-amber-400/15 transition-colors duration-500 text-center">
                  <div className={`w-11 h-11 rounded-xl ${accentBg} flex items-center justify-center mx-auto mb-4 group-hover:bg-amber-400/20 transition-colors`}>
                    <r.icon className={`h-5 w-5 ${accent}`} />
                  </div>
                  <h3 className="font-display text-base font-semibold text-white mb-2 group-hover:text-amber-400 transition-colors">{r.title}</h3>
                  <p className="text-sm text-white/40 leading-relaxed">{r.desc}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerList>
        </div>
      </section>

      {/* ═══ 8. TESTIMONIALS ═══════════════════════════════ */}
      <section className="py-20 md:py-28 relative bg-brand-dark-lighter/30">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <RevealOnScroll>
            <div className="text-center mb-14">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-400/60 mb-4">
                Happy pet parents
              </p>
              <h2 className="font-display text-4xl md:text-5xl font-bold text-white">
                They love their minis
              </h2>
            </div>
          </RevealOnScroll>

          <StaggerList className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <StaggerItem key={t.name}>
                <div className="rounded-2xl bg-brand-dark-card border border-white/5 p-7 h-full flex flex-col">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-2xl">{t.pet}</span>
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3.5 w-3.5 ${i < t.stars ? 'fill-amber-400 text-amber-400' : 'fill-white/10 text-white/10'}`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-white/60 leading-relaxed italic flex-1 mb-5">
                    "{t.quote}"
                  </p>
                  <div>
                    <p className="text-sm font-semibold text-white">{t.name}</p>
                    <p className="text-xs text-white/35">{t.detail}</p>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerList>

          <InlineCTA label="Join 4,000+ happy pet parents" />
        </div>
      </section>

      {/* ═══ 9. PRICING — Highlighted recommended tier ════ */}
      <section className="py-20 md:py-24 relative">
        <div className={divider} />
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <RevealOnScroll>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-400/60 mb-4">
              Simple pricing
            </p>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-3">
              Custom doesn't mean expensive
            </h2>
            <p className="text-sm text-white/40 mb-10">
              Commissioned pet portraits start at $200+. Ours start at $49 — with free revisions included.
            </p>
          </RevealOnScroll>

          <RevealOnScroll delay={0.1}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
              {/* Small */}
              <div className="rounded-2xl bg-brand-dark-card/60 border border-white/5 p-6 text-center">
                <p className="text-xs uppercase tracking-[0.15em] text-white/35 mb-2">Small (7 cm)</p>
                <p className={`font-display text-3xl font-bold ${warmText} mb-3`}>$29</p>
                <p className="text-xs text-white/30">~Credit card height</p>
              </div>
              {/* Medium — recommended */}
              <div className="rounded-2xl bg-amber-400/5 border-2 border-amber-400/30 p-6 text-center relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-brand-dark text-[10px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full">
                  Most Popular
                </div>
                <p className="text-xs uppercase tracking-[0.15em] text-white/35 mb-2">Medium (10 cm)</p>
                <p className={`font-display text-3xl font-bold ${warmText} mb-3`}>$49</p>
                <p className="text-xs text-white/30">~Coffee mug height</p>
              </div>
              {/* Large */}
              <div className="rounded-2xl bg-brand-dark-card/60 border border-white/5 p-6 text-center">
                <p className="text-xs uppercase tracking-[0.15em] text-white/35 mb-2">Large (15 cm)</p>
                <p className={`font-display text-3xl font-bold ${warmText} mb-3`}>$79</p>
                <p className="text-xs text-white/30">~Banana height</p>
              </div>
            </div>
          </RevealOnScroll>

          <RevealOnScroll delay={0.2}>
            <div className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-white/30">
              <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-amber-400/50" /> Free preview & revisions</span>
              <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-amber-400/50" /> Gift box included</span>
              <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-amber-400/50" /> Multi-pet: +$29 each</span>
            </div>

            <div className="mt-8">
              <Link to="/create/pet-portrait">
                <MotionButton
                  className={`${warmGradient} text-brand-dark px-8 py-4 rounded-full text-sm font-semibold uppercase tracking-wider hover:shadow-[0_0_40px_rgba(245,158,11,0.35)] transition-shadow`}
                >
                  Get Started — Upload a Photo
                  <ArrowRight className="inline-block ml-2 h-4 w-4" />
                </MotionButton>
              </Link>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* ═══ 10. FAQ ═══════════════════════════════════════ */}
      <section className="py-20 md:py-28 relative">
        <div className={divider} />
        <div className="max-w-2xl mx-auto px-6 lg:px-8">
          <RevealOnScroll>
            <div className="text-center mb-12">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-400/60 mb-4">
                Questions
              </p>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-white">
                Everything you need to know
              </h2>
            </div>
          </RevealOnScroll>

          <RevealOnScroll>
            <div>
              {FAQS.map((faq) => (
                <FAQItem key={faq.q} faq={faq} />
              ))}
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* ═══ 11. FINAL CTA ════════════════════════════════ */}
      <section className="py-28 md:py-36 relative">
        <div className={divider} />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[500px] h-[500px] rounded-full bg-amber-500/5 blur-[120px]" />
        </div>

        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <RevealOnScroll>
            <h2 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-tight mb-6">
              They gave you everything.
              <br />
              <span className={warmText}>Give them this.</span>
            </h2>
            <p className="text-lg text-white/50 mb-12 max-w-md mx-auto">
              Upload a photo, approve your preview, and hold your best friend in your hands.
            </p>
            <Link to="/create/pet-portrait">
              <MotionButton
                className={`${warmGradient} text-brand-dark px-10 py-5 rounded-full text-sm font-semibold uppercase tracking-wider hover:shadow-[0_0_50px_rgba(245,158,11,0.35)] transition-shadow`}
              >
                Upload Your Pet's Photo
                <ArrowRight className="inline-block ml-2 h-4 w-4" />
              </MotionButton>
            </Link>
            <p className="mt-6 text-sm text-white/25">
              Takes 60 seconds &middot; Phone photos welcome &middot; Free preview included
            </p>
          </RevealOnScroll>
        </div>
      </section>
    </div>
  );
}
