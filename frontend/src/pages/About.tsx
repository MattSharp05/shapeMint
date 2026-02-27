import React from 'react';
import { Sparkles, Zap, Users, Shield, Target, Heart, Lightbulb } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';

const values = [
  {
    icon: Lightbulb,
    title: 'Innovation First',
    description: 'We push the boundaries of what\'s possible with AI and 3D technology.'
  },
  {
    icon: Users,
    title: 'Community Driven',
    description: 'Our platform thrives on the creativity and feedback of our amazing community.'
  },
  {
    icon: Shield,
    title: 'Trust & Security',
    description: 'Your designs and data are protected with enterprise-grade security.'
  },
  {
    icon: Heart,
    title: 'Passion for Making',
    description: 'We believe everyone should have the power to bring their ideas to life.'
  }
];

export function About() {
  return (
    <div className="pt-16 min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center space-x-2 mb-6">
            <div className="bg-brand-primary p-3 rounded-lg">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-5xl font-bold text-brand-primary">
              ShapeMint
            </h1>
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Transforming Ideas into 3D Reality
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            We're on a mission to democratize 3D design creation through the power of artificial intelligence.
            From concept to creation in under 60 seconds, we're making 3D design accessible to everyone.
          </p>
        </div>

        {/* Mission & Vision */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          <Card className="p-8">
            <div className="flex items-center space-x-3 mb-4">
              <Target className="h-6 w-6 text-brand-primary" />
              <h3 className="text-2xl font-bold text-gray-900">Our Mission</h3>
            </div>
            <p className="text-gray-600 leading-relaxed">
              To empower creators, entrepreneurs, and dreamers worldwide by making 3D design creation as simple as
              describing an idea. We believe that everyone should have the tools to bring their imagination to life,
              regardless of their technical background or design experience.
            </p>
          </Card>

          <Card className="p-8">
            <div className="flex items-center space-x-3 mb-4">
              <Zap className="h-6 w-6 text-brand-accent" />
              <h3 className="text-2xl font-bold text-gray-900">Our Vision</h3>
            </div>
            <p className="text-gray-600 leading-relaxed">
              A world where physical products can be created as easily as digital content. Where anyone with an idea
              can instantly generate, customize, and manufacture physical objects, fostering a new era of creativity
              and innovation in product design.
            </p>
          </Card>
        </div>

        {/* Values */}
        <div className="mb-16">
          <h3 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Our Values
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => (
              <Card key={index} className="p-6 text-center hover">
                <div className="bg-brand-light w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <value.icon className="h-8 w-8 text-brand-primary" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  {value.title}
                </h4>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {value.description}
                </p>
              </Card>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Card className="p-12 bg-brand-primary text-white">
            <h3 className="text-3xl font-bold mb-4">
              Ready to Start Creating?
            </h3>
            <p className="text-xl mb-8 opacity-90">
              Join creators who are already bringing their ideas to life with ShapeMint.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register">
                <Button className="bg-brand-accent text-gray-900 hover:bg-brand-accent-dark px-8 py-3">
                  Get Started Free
                </Button>
              </Link>
              <Link to="/contact">
                <Button variant="outline" className="border-white text-white hover:bg-white/10 px-8 py-3">
                  Contact Us
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
