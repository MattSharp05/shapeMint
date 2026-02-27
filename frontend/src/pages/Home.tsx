import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Zap, Download, ShoppingBag, Loader2 } from 'lucide-react';
import { Button } from '../components/UI/Button';
import { Card } from '../components/UI/Card';
import { supabase } from '../supabaseClient';

interface FeaturedDesign {
  id: string;
  name: string;
  prompt: string;
  thumbnail_url: string | null;
  created_at: string;
}

export function Home() {
  const [featuredDesigns, setFeaturedDesigns] = useState<FeaturedDesign[]>([]);
  const [loadingDesigns, setLoadingDesigns] = useState(true);

  useEffect(() => {
    const fetchFeaturedDesigns = async () => {
      try {
        const { data, error } = await supabase
          .from('generated_models')
          .select('id, name, prompt, thumbnail_url, created_at')
          .eq('status', 'completed')
          .not('thumbnail_url', 'is', null)
          .order('created_at', { ascending: false })
          .limit(3);

        if (!error && data) {
          setFeaturedDesigns(data);
        }
      } catch (err) {
        console.error('Failed to fetch featured designs:', err);
      } finally {
        setLoadingDesigns(false);
      }
    };

    fetchFeaturedDesigns();
  }, []);

  return (
    <div className="pt-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-brand-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              <span className="block">Think it</span>
              <span className="block text-brand-primary">
                Shape it
              </span>
              <span className="block">Ship it</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Transform your ideas into 3D reality with AI-powered generation.
              From concept to creation in under 60 seconds.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/generate">
                <Button size="lg" icon={Zap} className="min-w-[200px]">
                  Start Creating
                </Button>
              </Link>
              <Link to="/marketplace">
                <Button variant="outline" size="lg" className="min-w-[200px]">
                  Browse Designs
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Floating Elements */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-brand-primary rounded-full opacity-10 animate-bounce"></div>
        <div className="absolute bottom-20 right-10 w-16 h-16 bg-brand-accent rounded-full opacity-10 animate-bounce delay-1000"></div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Powerful AI-Driven 3D Creation
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Professional-grade 3D models generated instantly from your imagination
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="p-8 text-center hover">
              <div className="bg-brand-primary w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <Zap className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Lightning Fast Generation
              </h3>
              <p className="text-gray-600">
                Advanced AI creates detailed 3D models from text or images in under 60 seconds
              </p>
            </Card>

            <Card className="p-8 text-center hover">
              <div className="bg-brand-accent w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <Download className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Full Ownership Rights
              </h3>
              <p className="text-gray-600">
                Complete ownership of your digital assets for modification, reproduction, or commercial use
              </p>
            </Card>

            <Card className="p-8 text-center hover">
              <div className="bg-brand-primary-light w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShoppingBag className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Instant Manufacturing
              </h3>
              <p className="text-gray-600">
                Get instant quotes and order physical prints through our integrated manufacturing partners
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Featured Designs - Real data from database */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-12">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Recent Creations
              </h2>
              <p className="text-xl text-gray-600">
                See what our community is creating with AI
              </p>
            </div>
            <Link to="/marketplace">
              <Button variant="outline" icon={ArrowRight}>
                View All
              </Button>
            </Link>
          </div>

          {loadingDesigns ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 text-brand-primary animate-spin" />
            </div>
          ) : featuredDesigns.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {featuredDesigns.map((design) => (
                <Link key={design.id} to={`/design/${design.id}`}>
                  <Card className="overflow-hidden hover">
                    <img
                      src={design.thumbnail_url || 'https://placehold.co/400x300?text=3D+Model'}
                      alt={design.name || design.prompt}
                      className="w-full h-48 object-cover"
                    />
                    <div className="p-6">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {design.name || design.prompt || 'Untitled Design'}
                      </h3>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No designs yet. Be the first to create one!</p>
              <Link to="/generate">
                <Button icon={Zap}>Generate Your First Model</Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-brand-primary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to bring your ideas to life?
          </h2>
          <p className="text-xl text-brand-light mb-8 max-w-2xl mx-auto">
            Join creators using AI to transform imagination into reality
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register">
              <Button variant="secondary" size="lg" className="min-w-[200px] bg-brand-accent text-gray-900 hover:bg-brand-accent-dark">
                Get Started Free
              </Button>
            </Link>
            <Link to="/generate">
              <Button variant="outline" size="lg" className="min-w-[200px] text-white border-white hover:bg-white hover:text-brand-primary">
                Try It Now
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
