import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Upload,
  Eye,
  Package,
  Sword,
  Wand2,
  Shield,
  Users,
  Star,
  ChevronDown,
  Check,
  Palette,
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
const HERO_IMG  = '/images/landing/fantasy-miniatures/hero.png';
const SHOW_1    = '/images/landing/fantasy-miniatures/showcase-1.png';
const SHOW_2    = '/images/landing/fantasy-miniatures/showcase-2.png';
const SHOW_3    = '/images/landing/fantasy-miniatures/showcase-3.png';

/* ── data ─────────────────────────────────────────────────── */
const TRUST_STATS = [
  { value: '3,000+',  label: 'Minis Printed' },
  { value: '4.8★',    label: 'Average Rating' },
  { value: '< 7 days', label: 'Turnaround' },
  { value: '28mm+',   label: 'Scale Options' },
];

const STEPS = [
  {
    num: '01',
    icon: Upload,
    title: 'Describe or Upload',
    desc: 'Describe your character in words or upload reference art. Include race, class, gear, pose — whatever matters to you.',
  },
  {
    num: '02',
    icon: Eye,
    title: 'Review Your 3D Preview',
    desc: 'Our AI sculpts a detailed 3D model from your description. You review it from every angle and request changes — free of charge.',
    highlight: true,
  },
  {
    num: '03',
    icon: Package,
    title: 'Printed & Shipped',
    desc: 'Full-color 3D printed at your chosen scale with a textured base. Arrives safely packaged, ready for the table.',
  },
];

const CHARACTERS = [
  { icon: Sword,   title: 'Warriors & Fighters',  desc: 'Barbarians, paladins, knights — armored heroes with weapons drawn and battle-ready poses.' },
  { icon: Wand2,   title: 'Mages & Casters',      desc: 'Wizards, warlocks, druids — flowing robes, glowing staves, arcane energy effects.' },
  { icon: Shield,  title: 'Rogues & Rangers',      desc: 'Thieves, archers, assassins — dynamic crouching or aiming poses with detailed gear.' },
  { icon: Users,   title: 'Full Party Sets',       desc: 'Get your entire adventuring party printed together. Discount on sets of 4 or more.' },
];

const TESTIMONIALS = [
  {
    quote: 'I described my half-orc warlock and what came back was better than any commission I\'ve gotten. My table lost it when I put it down at our session.',
    name: 'Marcus T.',
    detail: 'D&D Player, 5e',
    stars: 5,
  },
  {
    quote: 'The detail at 32mm scale is insane — you can see individual pouches on the belt. And the color printing means no painting needed if you don\'t want to.',
    name: 'Elena K.',
    detail: 'Pathfinder GM',
    stars: 5,
  },
  {
    quote: 'Ordered our full party of 5 for our campaign finale. The GM even got the BBEG printed as a surprise. Best session we\'ve ever had.',
    name: 'Jake & Friends',
    detail: 'Weekly Game Group',
    stars: 5,
  },
];

const FAQS = [
  {
    q: 'What info do I need to provide?',
    a: 'As much or as little as you want. A text description of your character works great — include race, class, armor, weapons, and any distinguishing features. Reference art or character portraits help even more. We can also work from HeroForge screenshots or existing character art.',
  },
  {
    q: 'What scales are available?',
    a: '28mm (standard tabletop), 32mm (heroic scale), and 75mm (display/collector). All miniatures come on a round base sized appropriately for the scale.',
  },
  {
    q: 'Is it already painted or do I paint it myself?',
    a: 'Our miniatures are 3D printed in full color — they arrive painted and ready to play. The color is baked into the print, not a surface coating. If you prefer to paint your own, we offer unpainted grey resin versions too.',
  },
  {
    q: 'How detailed can it get?',
    a: 'Very. Our process captures fine details like individual armor scales, weapon engravings, facial expressions, and fabric folds. At 32mm scale, you\'ll see belt pouches, gem inlays, and hair texture.',
  },
  {
    q: 'Can I get monsters, NPCs, or terrain?',
    a: 'Yes — dragons, beholders, tavern NPCs, whatever you need. Monster and large creature prints are priced based on size. Contact us for custom terrain sets.',
  },
  {
    q: 'What if I don\'t like the preview?',
    a: 'Revisions are free. We\'ll adjust the pose, gear, colors, or any detail until you\'re happy. We never print until you approve the final 3D model.',
  },
];

/* ── helpers ──────────────────────────────────────────────── */
const epicGradient = 'bg-gradient-to-r from-violet-400 via-purple-400 to-emerald-400';
const epicText     = 'bg-clip-text text-transparent bg-gradient-to-r from-violet-400 via-purple-300 to-emerald-400';
const accentColor  = 'text-violet-400';
const accentBg     = 'bg-violet-400/10';
const accentBorder = 'border-violet-400/15';
const divider      = 'absolute top-0 left-1/2 -translate-x-1/2 w-24 h-px bg-gradient-to-r from-transparent via-violet-400/20 to-transparent';

function FAQItem({ faq }: { faq: { q: string; a: string } }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/5">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-left group"
      >
        <span className="font-display text-base font-medium text-white group-hover:text-violet-400 transition-colors pr-4">
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
            <p className="text-sm text-white/45 leading-relaxed pb-5">{faq.a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
export function LandingFantasyMiniatures() {
  return (
    <div className="bg-brand-dark overflow-x-hidden">

      {/* ═══ 1. HERO ═══════════════════════════════════════ */}
      <section className="relative min-h-[100dvh] flex items-center">
        <div className="absolute inset-0">
          <img src={HERO_IMG} alt="" className="w-full h-full object-cover object-center" />
          <div className="absolute inset-0 bg-gradient-to-r from-brand-dark via-brand-dark/85 to-brand-dark/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-dark via-transparent to-brand-dark/20" />
        </div>

        {/* purple ambient glow */}
        <div className="absolute bottom-0 left-1/3 w-[600px] h-[400px] bg-violet-600/5 blur-[120px] pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 py-32 md:py-0 w-full">
          <div className="max-w-2xl">
            <FadeIn delay={0.15} y={10}>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-violet-400/70 mb-6">
                Custom 3D-Printed Tabletop Miniatures
              </p>
            </FadeIn>

            <FadeIn delay={0.3} y={16}>
              <h1 className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] font-bold leading-[1.08] text-white mb-6">
                Your character,
                <br />
                <span className={epicText}>brought to life.</span>
              </h1>
            </FadeIn>

            <FadeIn delay={0.5} y={14}>
              <p className="text-lg md:text-xl text-white/55 leading-relaxed mb-10 max-w-lg">
                Describe your character or upload reference art. Our AI sculpts a detailed miniature, and we 3D print it in full color — ready for the table.
              </p>
            </FadeIn>

            <FadeInUp delay={0.65}>
              <Link to="/create/custom">
                <MotionButton
                  className={`${epicGradient} text-brand-dark px-8 py-4 rounded-full text-sm font-semibold uppercase tracking-wider flex items-center gap-2 hover:shadow-[0_0_40px_rgba(139,92,246,0.3)] transition-shadow`}
                >
                  Create Your Mini
                  <ArrowRight className="h-4 w-4" />
                </MotionButton>
              </Link>
            </FadeInUp>

            <FadeIn delay={0.8}>
              <p className="mt-8 text-sm text-white/25">
                From $19 &middot; 28mm, 32mm &amp; 75mm scales &middot; Full color, ready to play
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
            <div className="w-1 h-2 rounded-full bg-violet-400/50" />
          </div>
        </motion.div>
      </section>

      {/* ═══ 2. TRUST BAR ══════════════════════════════════ */}
      <section className="relative border-y border-white/5">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <RevealOnScroll>
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/5">
              {TRUST_STATS.map((s) => (
                <div key={s.label} className="py-8 md:py-10 text-center px-4">
                  <p className={`font-display text-2xl md:text-3xl font-bold ${epicText} mb-1`}>
                    {s.value}
                  </p>
                  <p className="text-xs uppercase tracking-[0.15em] text-white/35">{s.label}</p>
                </div>
              ))}
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* ═══ 3. HOW IT WORKS ═══════════════════════════════ */}
      <section id="how-it-works" className="py-24 md:py-32 relative">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <RevealOnScroll>
            <div className="text-center mb-20">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-violet-400/60 mb-4">
                How it works
              </p>
              <h2 className="font-display text-4xl md:text-5xl font-bold text-white">
                From imagination to <em className="italic text-violet-400">miniature</em>
              </h2>
            </div>
          </RevealOnScroll>

          <StaggerList className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            {STEPS.map((step) => (
              <StaggerItem key={step.num}>
                <div className={`relative rounded-2xl p-8 ${step.highlight ? 'bg-violet-400/5 border border-violet-400/15' : ''}`}>
                  <span className="font-display text-[6rem] font-bold leading-none text-white/[0.03] absolute -top-2 -left-1 select-none pointer-events-none">
                    {step.num}
                  </span>
                  <div className="relative z-10">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${step.highlight ? 'bg-violet-400/20 border border-violet-400/30' : `${accentBg} border ${accentBorder}`}`}>
                      <step.icon className={`h-5 w-5 ${accentColor}`} />
                    </div>
                    <h3 className="font-display text-xl font-semibold text-white mb-3">
                      {step.title}
                    </h3>
                    <p className="text-sm text-white/45 leading-relaxed">{step.desc}</p>
                    {step.highlight && (
                      <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-violet-400/70">
                        ← Free revisions until you're happy
                      </p>
                    )}
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerList>
        </div>
      </section>

      {/* ═══ 4. ART-TO-MINI + GALLERY ═════════════════════ */}
      <section className="py-24 md:py-32 relative">
        <div className={divider} />
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <RevealOnScroll>
            <div className="text-center mb-16">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-violet-400/60 mb-4">
                See the detail
              </p>
              <h2 className="font-display text-4xl md:text-5xl font-bold text-white">
                From concept art to your table
              </h2>
            </div>
          </RevealOnScroll>

          {/* Art-to-mini comparison */}
          <RevealOnScroll>
            <div className="max-w-3xl mx-auto mb-12">
              <div className="rounded-2xl overflow-hidden bg-brand-dark-card border border-white/5">
                <img
                  src={SHOW_2}
                  alt="Character illustration compared to the matching 3D printed miniature"
                  className="w-full"
                />
                <div className="p-6 text-center">
                  <p className="text-sm text-white/50">
                    Your character art on the left → Your printed miniature on the right
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
                    alt="Detailed 3D printed elven ranger miniature"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-brand-dark via-brand-dark/10 to-transparent opacity-50" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h3 className="font-display text-lg font-semibold text-white mb-1">Incredible Detail</h3>
                  <p className="text-sm text-white/50">Individual armor scales, weapon engravings, and fabric texture — all captured at tabletop scale.</p>
                </div>
              </div>
            </StaggerItem>
            <StaggerItem>
              <div className="group rounded-2xl overflow-hidden bg-brand-dark-card relative">
                <div className="aspect-square overflow-hidden">
                  <img
                    src={SHOW_3}
                    alt="Fantasy miniatures being used in a tabletop game"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-brand-dark via-brand-dark/10 to-transparent opacity-50" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h3 className="font-display text-lg font-semibold text-white mb-1">Ready for the Table</h3>
                  <p className="text-sm text-white/50">Full color, pre-painted, and sized for your battle map. Drop them in and play.</p>
                </div>
              </div>
            </StaggerItem>
          </StaggerList>
        </div>
      </section>

      {/* ═══ 5. CHARACTER TYPES ════════════════════════════ */}
      <section className="py-24 md:py-32 relative">
        <div className={divider} />
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <RevealOnScroll>
            <div className="text-center mb-16">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-violet-400/60 mb-4">
                Any character, any class
              </p>
              <h2 className="font-display text-4xl md:text-5xl font-bold text-white">
                Roll for initiative
              </h2>
            </div>
          </RevealOnScroll>

          <StaggerList className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {CHARACTERS.map((ch) => (
              <StaggerItem key={ch.title}>
                <div className="group rounded-2xl bg-brand-dark-card/50 border border-white/5 p-8 hover:border-violet-400/15 transition-colors duration-500">
                  <div className="flex items-start gap-5">
                    <div className={`w-11 h-11 rounded-xl ${accentBg} flex items-center justify-center shrink-0 group-hover:bg-violet-400/20 transition-colors`}>
                      <ch.icon className={`h-5 w-5 ${accentColor}`} />
                    </div>
                    <div>
                      <h3 className="font-display text-lg font-semibold text-white mb-2 group-hover:text-violet-400 transition-colors">
                        {ch.title}
                      </h3>
                      <p className="text-sm text-white/40 leading-relaxed">{ch.desc}</p>
                    </div>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerList>
        </div>
      </section>

      {/* ═══ 6. TESTIMONIALS ═══════════════════════════════ */}
      <section className="py-24 md:py-32 relative">
        <div className={divider} />
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <RevealOnScroll>
            <div className="text-center mb-16">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-violet-400/60 mb-4">
                From the table
              </p>
              <h2 className="font-display text-4xl md:text-5xl font-bold text-white">
                What players are saying
              </h2>
            </div>
          </RevealOnScroll>

          <StaggerList className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <StaggerItem key={t.name}>
                <div className="rounded-2xl bg-brand-dark-card/50 border border-white/5 p-8 h-full flex flex-col">
                  <div className="flex gap-0.5 mb-4">
                    {Array.from({ length: t.stars }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-violet-400 text-violet-400" />
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

      {/* ═══ 7. PRICING ════════════════════════════════════ */}
      <section className="py-24 md:py-32 relative">
        <div className={divider} />
        <div className="max-w-3xl mx-auto px-6 lg:px-8 text-center">
          <RevealOnScroll>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-violet-400/60 mb-4">
              Pricing
            </p>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-6">
              Cheaper than a<br />commission, better detail
            </h2>
            <p className="text-white/45 text-lg leading-relaxed mb-12 max-w-xl mx-auto">
              Full-color, pre-painted miniatures at a fraction of what a custom sculpt and paint job would cost. Choose your scale and go.
            </p>
          </RevealOnScroll>

          <RevealOnScroll delay={0.15}>
            <div className="inline-flex flex-col sm:flex-row items-center gap-6 sm:gap-10 rounded-2xl bg-brand-dark-card/60 border border-white/5 px-10 py-8">
              <div className="text-center">
                <p className="text-xs uppercase tracking-[0.15em] text-white/35 mb-1">28mm Standard</p>
                <p className={`font-display text-3xl font-bold ${epicText}`}>$19</p>
              </div>
              <div className="hidden sm:block w-px h-12 bg-white/10" />
              <div className="text-center">
                <p className="text-xs uppercase tracking-[0.15em] text-white/35 mb-1">32mm Heroic</p>
                <p className={`font-display text-3xl font-bold ${epicText}`}>$29</p>
              </div>
              <div className="hidden sm:block w-px h-12 bg-white/10" />
              <div className="text-center">
                <p className="text-xs uppercase tracking-[0.15em] text-white/35 mb-1">75mm Display</p>
                <p className={`font-display text-3xl font-bold ${epicText}`}>$59</p>
              </div>
            </div>
          </RevealOnScroll>

          <RevealOnScroll delay={0.25}>
            <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-white/30">
              <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-violet-400/50" /> Free preview & revisions</span>
              <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-violet-400/50" /> Full color, pre-painted</span>
              <span className="flex items-center gap-1.5"><Palette className="h-3.5 w-3.5 text-violet-400/50" /> Unpainted grey resin also available</span>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* ═══ 8. FAQ ════════════════════════════════════════ */}
      <section className="py-24 md:py-32 relative">
        <div className={divider} />
        <div className="max-w-2xl mx-auto px-6 lg:px-8">
          <RevealOnScroll>
            <div className="text-center mb-12">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-violet-400/60 mb-4">
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

      {/* ═══ 9. FINAL CTA ═════════════════════════════════ */}
      <section className="py-32 md:py-40 relative">
        <div className={divider} />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[500px] h-[500px] rounded-full bg-violet-500/5 blur-[120px]" />
        </div>

        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <RevealOnScroll>
            <Sword className="h-8 w-8 text-violet-400/40 mx-auto mb-6" />
            <h2 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-tight mb-6">
              Your next session<br />deserves this.
            </h2>
            <p className="text-lg text-white/45 mb-12 max-w-md mx-auto">
              Describe your character, approve the preview, and hold your hero in your hands.
            </p>
            <Link to="/create/custom">
              <MotionButton
                className={`${epicGradient} text-brand-dark px-10 py-5 rounded-full text-sm font-semibold uppercase tracking-wider hover:shadow-[0_0_50px_rgba(139,92,246,0.3)] transition-shadow`}
              >
                Create Your Mini
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
