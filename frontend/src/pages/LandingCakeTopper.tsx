import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Upload,
  Eye,
  Package,
  Shield,
  Clock,
  RefreshCw,
  Heart,
  Star,
  ChevronDown,
  Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import {
  FadeIn,
  FadeInUp,
  RevealOnScroll,
  StaggerList,
  StaggerItem,
  MotionButton,
} from '../components/Motion';

/* ── assets ───────────────────────────────────────────────── */
const HERO_IMG  = '/images/landing/cake-topper/hero.png';
const SHOW_1    = '/images/landing/cake-topper/showcase-1.png';
const SHOW_2    = '/images/landing/cake-topper/showcase-2.png';
const SHOW_3    = '/images/landing/cake-topper/showcase-3.png';

/* ── data ─────────────────────────────────────────────────── */
const TRUST_STATS = [
  { value: '2,500+',   label: 'Happy Couples' },
  { value: '4.9★',     label: 'Average Rating' },
  { value: '< 7 days', label: 'Turnaround' },
  { value: '100%',     label: 'Preview Before Print' },
];

const STEPS = [
  {
    num: '01',
    icon: Upload,
    title: 'Upload Your Photos',
    desc: 'Send us a photo of you and your partner. Front-facing works best — we can work with almost any clear shot.',
  },
  {
    num: '02',
    icon: Eye,
    title: 'Approve Your Preview',
    desc: 'Our AI sculpts a 3D model of you both. You review it first and request changes — we don\'t print until you love it.',
    highlight: true,
  },
  {
    num: '03',
    icon: Package,
    title: 'Receive Your Topper',
    desc: 'Full-color 3D printed, hand-inspected, and shipped in protective packaging — ready for the big day.',
  },
];

const GUARANTEES = [
  { icon: Clock,     title: 'On-Time Guarantee',  desc: 'We guarantee delivery before your wedding date or your money back. Enter your date when ordering.' },
  { icon: RefreshCw, title: 'Free Revisions',      desc: 'Not happy with the preview? We\'ll revise it until you are — no extra charge. You approve before we print.' },
  { icon: Shield,    title: 'Satisfaction Promise', desc: 'If the final product doesn\'t match your approved preview, we\'ll reprint it or refund you. No questions.' },
];

const TESTIMONIALS = [
  {
    quote: 'Our guests couldn\'t stop talking about the cake topper. It looked exactly like us — even my mom teared up when she saw it.',
    name: 'Jessica & Ryan',
    detail: 'Married October 2025',
    stars: 5,
  },
  {
    quote: 'I was nervous ordering something custom online for our wedding, but the preview step sold me. What arrived was even better than the preview.',
    name: 'Maria & David',
    detail: 'Married June 2025',
    stars: 5,
  },
  {
    quote: 'Ordered with only 2 weeks to go and it arrived 4 days early. It\'s now sitting on our mantle — the best keepsake from the whole day.',
    name: 'Sarah & Tom',
    detail: 'Married August 2025',
    stars: 5,
  },
];

const FAQS = [
  {
    q: 'Will it actually look like us?',
    a: 'Yes — our AI captures your facial features, hair, and body proportions from your photos. You\'ll see a full 3D preview before we print, and you can request free revisions until you\'re satisfied.',
  },
  {
    q: 'Will it arrive before my wedding?',
    a: 'We guarantee it. Enter your wedding date at checkout and we\'ll ensure delivery at least 7 days before. If we can\'t meet the deadline, you\'ll get a full refund.',
  },
  {
    q: 'Is it food-safe to put on a cake?',
    a: 'The topper comes with a wide, stable base designed to sit on top of the cake without touching the frosting. A food-safe coating option is also available at checkout.',
  },
  {
    q: 'What photos work best?',
    a: 'A clear, well-lit front-facing photo from the chest up. We can work with most photos — even phone selfies — as long as your face is clearly visible.',
  },
  {
    q: 'Can I include our pet?',
    a: 'Absolutely! Add a pet photo and we\'ll include them in the scene for a small additional fee. Dogs, cats, and other pets are all welcome.',
  },
  {
    q: 'What if I don\'t like the final product?',
    a: 'If the printed topper doesn\'t match the preview you approved, we\'ll reprint it at no cost or issue a full refund. We stand behind every order.',
  },
];

/* ── helpers ──────────────────────────────────────────────── */
const warmGradient = 'bg-gradient-to-r from-brand-accent via-amber-300 to-rose-300';
const warmText     = 'bg-clip-text text-transparent bg-gradient-to-r from-brand-accent via-amber-200 to-rose-300';
const divider      = 'absolute top-0 left-1/2 -translate-x-1/2 w-24 h-px bg-gradient-to-r from-transparent via-rose-300/20 to-transparent';

function FAQItem({ faq }: { faq: { q: string; a: string } }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/5">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-left group"
      >
        <span className="font-display text-base font-medium text-white group-hover:text-rose-300 transition-colors pr-4">
          {faq.q}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-white/40 shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        />
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
            <p className="text-sm text-white/45 leading-relaxed pb-5">
              {faq.a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
export function LandingCakeTopper() {
  return (
    <div className="bg-brand-dark overflow-x-hidden">

      {/* ════════════════════════════════════════════════════
          1. HERO — Emotional, wedding-focused, single CTA
          ════════════════════════════════════════════════════ */}
      <section className="relative min-h-[100dvh] flex items-center">
        <div className="absolute inset-0">
          <img src={HERO_IMG} alt="" className="w-full h-full object-cover object-center" />
          <div className="absolute inset-0 bg-gradient-to-r from-brand-dark via-brand-dark/85 to-brand-dark/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-dark via-transparent to-brand-dark/20" />
        </div>

        <div className="absolute bottom-0 left-1/4 w-[600px] h-[400px] bg-rose-500/5 blur-[120px] pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 py-32 md:py-0 w-full">
          <div className="max-w-2xl">
            <FadeIn delay={0.15} y={10}>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-rose-300/70 mb-6">
                Custom 3D-Printed Wedding Cake Toppers
              </p>
            </FadeIn>

            <FadeIn delay={0.3} y={16}>
              <h1 className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] font-bold leading-[1.08] text-white mb-6">
                Your love story,
                <br />
                <span className={warmText}>miniaturized.</span>
              </h1>
            </FadeIn>

            <FadeIn delay={0.5} y={14}>
              <p className="text-lg md:text-xl text-white/55 leading-relaxed mb-10 max-w-lg">
                Upload a photo of you and your partner. Our AI creates a one-of-a-kind 3D-printed cake topper that looks just like you — a keepsake you'll treasure long after the cake is gone.
              </p>
            </FadeIn>

            <FadeInUp delay={0.65}>
              <Link to="/create/cake-topper">
                <MotionButton
                  className={`${warmGradient} text-brand-dark px-8 py-4 rounded-full text-sm font-semibold uppercase tracking-wider flex items-center gap-2 hover:shadow-[0_0_40px_rgba(244,163,188,0.3)] transition-shadow`}
                >
                  Upload Your Photo
                  <ArrowRight className="h-4 w-4" />
                </MotionButton>
              </Link>
            </FadeInUp>

            <FadeIn delay={0.8}>
              <p className="mt-8 text-sm text-white/25">
                From $49 &middot; Preview before we print &middot; On-time delivery guaranteed
              </p>
            </FadeIn>
          </div>
        </div>

        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
        >
          <div className="w-5 h-8 rounded-full border border-white/20 flex items-start justify-center pt-1.5">
            <div className="w-1 h-2 rounded-full bg-rose-300/50" />
          </div>
        </motion.div>
      </section>

      {/* ════════════════════════════════════════════════════
          2. TRUST BAR
          ════════════════════════════════════════════════════ */}
      <section className="relative border-y border-white/5">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <RevealOnScroll>
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/5">
              {TRUST_STATS.map((s) => (
                <div key={s.label} className="py-8 md:py-10 text-center px-4">
                  <p className={`font-display text-2xl md:text-3xl font-bold ${warmText} mb-1`}>
                    {s.value}
                  </p>
                  <p className="text-xs uppercase tracking-[0.15em] text-white/35">{s.label}</p>
                </div>
              ))}
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          3. HOW IT WORKS — Emphasis on preview/approval step
          ════════════════════════════════════════════════════ */}
      <section id="how-it-works" className="py-24 md:py-32 relative">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <RevealOnScroll>
            <div className="text-center mb-20">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-rose-300/60 mb-4">
                How it works
              </p>
              <h2 className="font-display text-4xl md:text-5xl font-bold text-white">
                Three steps to your <em className="italic text-rose-300">perfect</em> topper
              </h2>
            </div>
          </RevealOnScroll>

          <StaggerList className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            {STEPS.map((step) => (
              <StaggerItem key={step.num}>
                <div className={`relative rounded-2xl p-8 ${step.highlight ? 'bg-rose-300/5 border border-rose-300/15' : ''}`}>
                  <span className="font-display text-[6rem] font-bold leading-none text-white/[0.03] absolute -top-2 -left-1 select-none pointer-events-none">
                    {step.num}
                  </span>
                  <div className="relative z-10">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${step.highlight ? 'bg-rose-300/20 border border-rose-300/30' : 'bg-rose-300/10 border border-rose-300/15'}`}>
                      <step.icon className="h-5 w-5 text-rose-300" />
                    </div>
                    <h3 className="font-display text-xl font-semibold text-white mb-3">
                      {step.title}
                    </h3>
                    <p className="text-sm text-white/45 leading-relaxed">
                      {step.desc}
                    </p>
                    {step.highlight && (
                      <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-rose-300/70">
                        ← You approve before we print
                      </p>
                    )}
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerList>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          4. BEFORE/AFTER — Most persuasive section
          ════════════════════════════════════════════════════ */}
      <section className="py-24 md:py-32 relative">
        <div className={divider} />
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <RevealOnScroll>
            <div className="text-center mb-16">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-rose-300/60 mb-4">
                See the likeness
              </p>
              <h2 className="font-display text-4xl md:text-5xl font-bold text-white">
                From your photo to your cake
              </h2>
            </div>
          </RevealOnScroll>

          {/* Featured before/after */}
          <RevealOnScroll>
            <div className="max-w-3xl mx-auto mb-12">
              <div className="rounded-2xl overflow-hidden bg-brand-dark-card border border-white/5">
                <img
                  src={SHOW_2}
                  alt="Photo of couple next to their custom 3D printed cake topper figurine"
                  className="w-full"
                />
                <div className="p-6 text-center">
                  <p className="text-sm text-white/50">
                    Your photo on the left → Your custom topper on the right
                  </p>
                </div>
              </div>
            </div>
          </RevealOnScroll>

          {/* Gallery row */}
          <StaggerList className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <StaggerItem>
              <div className="group rounded-2xl overflow-hidden bg-brand-dark-card relative">
                <div className="aspect-square overflow-hidden">
                  <img
                    src={SHOW_1}
                    alt="Custom wedding cake topper figurine with gift box"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-brand-dark via-brand-dark/10 to-transparent opacity-50" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h3 className="font-display text-lg font-semibold text-white mb-1">Hand-Inspected Quality</h3>
                  <p className="text-sm text-white/50">Every topper is checked before shipping — arrives gift-ready in a keepsake box.</p>
                </div>
              </div>
            </StaggerItem>
            <StaggerItem>
              <div className="group rounded-2xl overflow-hidden bg-brand-dark-card relative">
                <div className="aspect-square overflow-hidden">
                  <img
                    src={SHOW_3}
                    alt="Three different wedding cake topper styles"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-brand-dark via-brand-dark/10 to-transparent opacity-50" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h3 className="font-display text-lg font-semibold text-white mb-1">Choose Your Style</h3>
                  <p className="text-sm text-white/50">Classic, playful, or whimsical — pick the pose and style that fits your vibe.</p>
                </div>
              </div>
            </StaggerItem>
          </StaggerList>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          5. GUARANTEES — Kill the top 3 objections
          ════════════════════════════════════════════════════ */}
      <section className="py-24 md:py-32 relative">
        <div className={divider} />
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <RevealOnScroll>
            <div className="text-center mb-16">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-rose-300/60 mb-4">
                Our promise
              </p>
              <h2 className="font-display text-4xl md:text-5xl font-bold text-white">
                Zero risk for your big day
              </h2>
            </div>
          </RevealOnScroll>

          <StaggerList className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {GUARANTEES.map((g) => (
              <StaggerItem key={g.title}>
                <div className="rounded-2xl bg-brand-dark-card/50 border border-white/5 p-8 text-center h-full">
                  <div className="w-12 h-12 rounded-xl bg-rose-300/10 border border-rose-300/15 flex items-center justify-center mx-auto mb-5">
                    <g.icon className="h-5 w-5 text-rose-300" />
                  </div>
                  <h3 className="font-display text-lg font-semibold text-white mb-3">{g.title}</h3>
                  <p className="text-sm text-white/40 leading-relaxed">{g.desc}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerList>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          6. TESTIMONIALS — Real couples
          ════════════════════════════════════════════════════ */}
      <section className="py-24 md:py-32 relative">
        <div className={divider} />
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <RevealOnScroll>
            <div className="text-center mb-16">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-rose-300/60 mb-4">
                Loved by couples
              </p>
              <h2 className="font-display text-4xl md:text-5xl font-bold text-white">
                Don't take our word for it
              </h2>
            </div>
          </RevealOnScroll>

          <StaggerList className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <StaggerItem key={t.name}>
                <div className="rounded-2xl bg-brand-dark-card/50 border border-white/5 p-8 h-full flex flex-col">
                  <div className="flex gap-0.5 mb-4">
                    {Array.from({ length: t.stars }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-brand-accent text-brand-accent" />
                    ))}
                  </div>
                  <p className="text-sm text-white/60 leading-relaxed italic flex-1 mb-6">
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
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          7. KEEPSAKE FRAMING + PRICING
          ════════════════════════════════════════════════════ */}
      <section className="py-24 md:py-32 relative">
        <div className={divider} />
        <div className="max-w-3xl mx-auto px-6 lg:px-8 text-center">
          <RevealOnScroll>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-rose-300/60 mb-4">
              More than a cake topper
            </p>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-6">
              A keepsake that lasts<br />a lifetime
            </h2>
            <p className="text-white/45 text-lg leading-relaxed mb-12 max-w-xl mx-auto">
              Long after the cake is gone, your topper lives on — on your mantle, your bookshelf, or next to your wedding photo. It's the one piece of your wedding you'll hold in your hands forever.
            </p>
          </RevealOnScroll>

          <RevealOnScroll delay={0.15}>
            <div className="inline-flex flex-col sm:flex-row items-center gap-6 sm:gap-10 rounded-2xl bg-brand-dark-card/60 border border-white/5 px-10 py-8">
              <div className="text-center">
                <p className="text-xs uppercase tracking-[0.15em] text-white/35 mb-1">Couple (10 cm)</p>
                <p className={`font-display text-3xl font-bold ${warmText}`}>$49</p>
              </div>
              <div className="hidden sm:block w-px h-12 bg-white/10" />
              <div className="text-center">
                <p className="text-xs uppercase tracking-[0.15em] text-white/35 mb-1">Couple + Base (12 cm)</p>
                <p className={`font-display text-3xl font-bold ${warmText}`}>$69</p>
              </div>
              <div className="hidden sm:block w-px h-12 bg-white/10" />
              <div className="text-center">
                <p className="text-xs uppercase tracking-[0.15em] text-white/35 mb-1">Couple + Pet (14 cm)</p>
                <p className={`font-display text-3xl font-bold ${warmText}`}>$89</p>
              </div>
            </div>
          </RevealOnScroll>

          <RevealOnScroll delay={0.25}>
            <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-white/30">
              <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-rose-300/50" /> Free preview & revisions</span>
              <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-rose-300/50" /> On-time delivery guarantee</span>
              <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-rose-300/50" /> Keepsake gift box included</span>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          8. FAQ — Address remaining objections
          ════════════════════════════════════════════════════ */}
      <section className="py-24 md:py-32 relative">
        <div className={divider} />
        <div className="max-w-2xl mx-auto px-6 lg:px-8">
          <RevealOnScroll>
            <div className="text-center mb-12">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-rose-300/60 mb-4">
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

      {/* ════════════════════════════════════════════════════
          9. FINAL CTA — Urgency + action
          ════════════════════════════════════════════════════ */}
      <section className="py-32 md:py-40 relative">
        <div className={divider} />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[500px] h-[500px] rounded-full bg-rose-400/5 blur-[120px]" />
        </div>

        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <RevealOnScroll>
            <Heart className="h-8 w-8 text-rose-300/40 mx-auto mb-6" />
            <h2 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-tight mb-6">
              Your wedding date<br />is set. Start here.
            </h2>
            <p className="text-lg text-white/45 mb-12 max-w-md mx-auto">
              Upload your photo, approve your preview, and we'll have your custom topper at your door before the big day.
            </p>
            <Link to="/create/cake-topper">
              <MotionButton
                className={`${warmGradient} text-brand-dark px-10 py-5 rounded-full text-sm font-semibold uppercase tracking-wider hover:shadow-[0_0_50px_rgba(244,163,188,0.3)] transition-shadow`}
              >
                Upload Your Photo
                <ArrowRight className="inline-block ml-2 h-4 w-4" />
              </MotionButton>
            </Link>
            <p className="mt-6 text-sm text-white/25">
              Takes 60 seconds &middot; No account needed &middot; Free preview included
            </p>
          </RevealOnScroll>
        </div>
      </section>
    </div>
  );
}
