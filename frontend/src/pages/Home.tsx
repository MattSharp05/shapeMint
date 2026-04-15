import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronRight } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { PRINT_TYPES } from '../data/printTypes';
import {
  FadeIn,
  FadeInUp,
  RevealOnScroll,
  StaggerList,
  StaggerItem,
  MotionButton,
} from '../components/Motion';
import { BeamsBackground } from '../components/UI/BeamsBackground';
import { ContainerScroll, CardSticky } from '../components/UI/CardsStack';

const HOW_IT_WORKS_STEPS = [
  {
    title: 'Describe or Upload',
    description:
      'Type what you want or upload a reference image. Our AI generates a detailed 3D model in minutes — no modeling experience required.',
  },
  {
    title: 'Preview & Customize',
    description:
      'View your model in 3D from every angle. Choose full color or monochromatic printing, pick your size, and get an instant price.',
  },
  {
    title: 'Printed & Delivered',
    description:
      'Our professional 3D printing partners produce your model and ship it straight to your door. Track every step along the way.',
  },
];

const WHY_SHAPEMINT_POINTS = [
  {
    title: 'No Design Skills Needed',
    description:
      'Just describe your idea in plain English. Our AI handles the complex 3D modeling for you, so you can focus on what to make rather than how to make it.',
  },
  {
    title: 'Production-Ready Quality',
    description:
      'Every model is automatically repaired, scaled, and optimized for 3D printing. No manual cleanup, no failed prints, no surprises.',
  },
  {
    title: 'Delivered to Your Door',
    description:
      'From digital model to physical product. We handle printing and shipping through our network of pro 3D printing partners so you don\'t have to.',
  },
];

interface FeaturedDesign {
  id: string;
  name: string;
  prompt: string;
  thumbnail_url: string | null;
  glb_url: string | null;
  stl_url: string | null;
  obj_url: string | null;
}


export function Home() {
  const [featuredDesigns, setFeaturedDesigns] = useState<FeaturedDesign[]>([]);
  const navigate = useNavigate();

  // Hardcoded showcase models — curated selection
  const SHOWCASE_IDS = [
    'b1860618-99c9-44ca-87de-8db2251c7622',
    '6fa0bc03-4853-494f-9ed5-df3312719ce8',
    'c8a98c4d-1696-45eb-8452-b1eac803249d',
  ];
  useEffect(() => {
    supabase
      .from('generated_models')
      .select('id, name, prompt, thumbnail_url, glb_url, stl_url, obj_url')
      .in('id', SHOWCASE_IDS)
      .then(({ data }) => { if (data) setFeaturedDesigns(data); });
  }, []);

  return (
    <BeamsBackground className="pt-16 bg-brand-dark" intensity="strong">
      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-32 md:py-48 text-center">
            <FadeIn delay={0.1} y={12}>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-accent mb-8">
                AI-powered custom 3D printing
              </p>
            </FadeIn>

            <FadeIn delay={0.25} y={16}>
              <h1 className="text-6xl md:text-8xl font-extrabold text-white leading-[1.05] mb-6">
                Describe it.
                <br />
                <span className="gradient-text">We'll print it.</span>
              </h1>
            </FadeIn>

            <FadeIn delay={0.4} y={16}>
              <p className="text-lg md:text-xl text-[#9ca3af] mb-12 max-w-xl mx-auto leading-relaxed">
                Turn any idea into a real, physical object. No design skills needed.
                AI generates your 3D model, we print and ship it to your door.
              </p>
            </FadeIn>

            <FadeInUp delay={0.55}>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <a href="#choose-print">
                  <MotionButton className="btn-glow w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-brand-accent to-brand-accent-dark text-brand-dark text-sm font-semibold uppercase tracking-wider rounded-full hover:shadow-[0_0_30px_rgba(237,174,73,0.5)] transition-shadow">
                    Start Creating
                    <ArrowRight className="inline-block ml-2 h-4 w-4" />
                  </MotionButton>
                </a>
                <a
                  href="#how-it-works"
                  className="w-full sm:w-auto px-10 py-4 text-[#9ca3af] text-sm font-medium uppercase tracking-wider rounded-full hover:text-white transition-all flex items-center justify-center gap-2"
                >
                  See How It Works
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </FadeInUp>

            <FadeIn delay={0.7}>
              <p className="mt-10 text-sm text-[#6b7280]">
                Starting from $20 &middot; No account required
              </p>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── Print types ────────────────────────────────────────────────── */}
      <section id="choose-print" className="py-24 relative">
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <RevealOnScroll>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-accent text-center mb-4">
              What do you want to create?
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-14">
              Choose your print type
            </h2>
          </RevealOnScroll>

          <StaggerList className="grid grid-cols-2 lg:grid-cols-3 gap-5">
            {PRINT_TYPES.map((pt, idx) => {
              const landingPageMap: Record<string, string> = {
                'statue-bust': '/landing/statue-bust',
                'cake-topper': '/landing/cake-topper',
                'pet-portrait': '/landing/print-my-pet',
                'action-figure': '/landing/fantasy-miniatures',
              };
              const linkTo = landingPageMap[pt.slug] || `/create/${pt.slug}`;
              const imgMap: Record<string, string> = {
                'statue-bust': '/images/character-bust.png',
                'pet-portrait': '/images/pet-figurine.png',
                'action-figure': '/images/action-figure-hero.png',
                'cake-topper': '/images/wedding-cake-topper.png',
                'custom': '/images/steampunk-dragon.png',
              };
              // Last item spans full width on even grids
              const isLast = idx === PRINT_TYPES.length - 1 && PRINT_TYPES.length % 3 !== 0;
              return (
                <StaggerItem key={pt.slug} className={isLast ? 'col-span-2 lg:col-span-1' : ''}>
                  <Link
                    to={linkTo}
                    className="group relative block rounded-2xl overflow-hidden bg-brand-dark-card aspect-[3/4] transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_8px_40px_rgba(237,174,73,0.15)]"
                  >
                    <img
                      src={imgMap[pt.slug]}
                      alt={pt.title}
                      className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                      decoding="async"
                    />
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                    {/* Accent border glow on hover */}
                    <div className="absolute inset-0 rounded-2xl border border-white/5 group-hover:border-brand-accent/30 transition-colors duration-300" />
                    {/* Label */}
                    <div className="absolute bottom-0 left-0 right-0 p-5">
                      <h3 className="font-semibold text-white text-lg group-hover:text-brand-accent transition-colors duration-300">
                        {pt.title}
                      </h3>
                      <p className="text-white/50 text-sm mt-1 leading-relaxed">
                        {pt.subtitle}
                      </p>
                      <div className="mt-3 flex items-center text-sm font-medium text-brand-accent opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                        Get started <ChevronRight className="h-4 w-4 ml-1" />
                      </div>
                    </div>
                  </Link>
                </StaggerItem>
              );
            })}
          </StaggerList>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 relative">
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 md:gap-12 lg:gap-16">
            {/* Sticky intro column */}
            <div className="md:sticky md:top-24 md:self-start md:h-fit mb-12 md:mb-0">
              <RevealOnScroll>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-accent mb-4">
                  How it works
                </p>
                <h2 className="text-3xl md:text-5xl font-bold text-white leading-[1.1] tracking-tight mb-6">
                  From idea to your{' '}
                  <span className="gradient-text">doorstep</span>
                </h2>
                <p className="text-base md:text-lg text-[#9ca3af] leading-relaxed max-w-md">
                  Three simple steps take you from a rough idea to a physical object on your desk. No modeling software, no print shop, no hassle.
                </p>
              </RevealOnScroll>
            </div>

            {/* Sticky-stack cards */}
            <ContainerScroll className="space-y-6 md:space-y-8 md:pb-32">
              {HOW_IT_WORKS_STEPS.map((step, index) => (
                <CardSticky
                  key={step.title}
                  index={index}
                  baseOffset={96}
                  incrementY={16}
                  className="rounded-2xl bg-brand-dark-card border border-white/10 p-8 md:p-10 shadow-2xl shadow-black/40"
                >
                  <div className="flex items-start justify-between gap-6 mb-4">
                    <h3 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                      {step.title}
                    </h3>
                    <span className="text-2xl md:text-3xl font-bold text-brand-accent tabular-nums shrink-0">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                  </div>
                  <p className="text-[#9ca3af] leading-relaxed">
                    {step.description}
                  </p>
                </CardSticky>
              ))}
            </ContainerScroll>
          </div>
        </div>
      </section>

      {/* ── Showcase ──────────────────────────────────────────────────── */}
      {featuredDesigns.length > 0 && (
        <section className="py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <RevealOnScroll>
              <div className="text-center mb-14">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-accent mb-4">
                  Showcase
                </p>
                <h2 className="text-3xl md:text-4xl font-bold text-white">
                  See what people are making
                </h2>
              </div>
            </RevealOnScroll>

            <StaggerList className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
              {featuredDesigns.map((design) => (
                <StaggerItem key={design.id}>
                  <div
                    className="group cursor-pointer rounded-2xl overflow-hidden bg-brand-dark-card border border-white/10 shadow-2xl shadow-black/40 hover:border-brand-accent/30 transition-colors duration-300"
                    onClick={() => {
                      if (design.glb_url) {
                        navigate('/generate', {
                          state: {
                            existingModel: {
                              id: design.id,
                              prompt: design.prompt || design.name,
                              modelUrl: design.glb_url,
                              urls: {
                                glb: design.glb_url,
                                stl: design.stl_url || undefined,
                                obj: design.obj_url || undefined,
                              },
                            },
                          },
                        });
                      }
                    }}
                  >
                    <div className="aspect-square overflow-hidden">
                      <img
                        src={design.thumbnail_url || ''}
                        alt={design.name || design.prompt}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </StaggerList>
          </div>
        </section>
      )}

      {/* ── Why ShapeMint ─────────────────────────────────────────────── */}
      <section className="py-24 relative">
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 md:gap-12 lg:gap-16">
            {/* Intro column — order-2 on desktop (right side), order-1 in DOM for mobile reading */}
            <div className="md:order-2 md:sticky md:top-24 md:self-start md:h-fit mb-12 md:mb-0">
              <RevealOnScroll>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-accent mb-4">
                  Why ShapeMint
                </p>
                <h2 className="text-3xl md:text-5xl font-bold text-white leading-[1.1] tracking-tight mb-6">
                  Everything you need,{' '}
                  <span className="gradient-text">nothing you don't</span>
                </h2>
                <p className="text-base md:text-lg text-[#9ca3af] leading-relaxed max-w-md">
                  We handle the technical heavy lifting so you can focus on the fun part — making something real.
                </p>
              </RevealOnScroll>
            </div>

            {/* Sticky-stack cards — order-1 on desktop (left) */}
            <ContainerScroll className="md:order-1 space-y-6 md:space-y-8 md:pb-32">
              {WHY_SHAPEMINT_POINTS.map((point, index) => (
                <CardSticky
                  key={point.title}
                  index={index}
                  baseOffset={96}
                  incrementY={20}
                  className="rounded-2xl bg-brand-dark-card border border-white/10 p-8 md:p-10 shadow-2xl shadow-black/40"
                >
                  <div className="h-1 w-10 bg-brand-accent rounded-full mb-6" />
                  <h3 className="text-2xl md:text-3xl font-bold text-white tracking-tight mb-4">
                    {point.title}
                  </h3>
                  <p className="text-[#9ca3af] leading-relaxed">
                    {point.description}
                  </p>
                </CardSticky>
              ))}
            </ContainerScroll>
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────── */}
      <section className="py-24 relative">
        <RevealOnScroll className="relative z-10 max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to bring your idea to life?
          </h2>
          <p className="text-[#9ca3af] mb-10">
            No account needed. Start creating in seconds.
          </p>
          <Link to="/generate">
            <MotionButton className="btn-glow px-10 py-4 bg-gradient-to-r from-brand-accent to-brand-accent-dark text-brand-dark text-sm font-semibold uppercase tracking-wider rounded-full hover:shadow-[0_0_30px_rgba(237,174,73,0.5)] transition-shadow">
              Get Started
            </MotionButton>
          </Link>
        </RevealOnScroll>
      </section>
    </BeamsBackground>
  );
}
