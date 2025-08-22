import React from 'react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Zap, Download, ShoppingBag, Users, TrendingUp, Camera, Heart, Share2, Gift, Hammer, Video } from 'lucide-react';
import { Button } from '../components/UI/Button';
import { Card } from '../components/UI/Card';

const featuredDesigns = [
  {
    id: '1',
    title: 'Modern Coffee Mug',
    thumbnail: 'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=400',
    price: 12.99,
    downloads: 245
  },
  {
    id: '2',
    title: 'Geometric Vase',
    thumbnail: 'https://images.pexels.com/photos/1094767/pexels-photo-1094767.jpeg?auto=compress&cs=tinysrgb&w=400',
    price: 18.50,
    downloads: 189
  },
  {
    id: '3',
    title: 'Phone Stand',
    thumbnail: 'https://images.pexels.com/photos/404280/pexels-photo-404280.jpeg?auto=compress&cs=tinysrgb&w=400',
    price: 8.99,
    downloads: 512
  }
];

export function Home() {
  const [activeTab, setActiveTab] = useState('home');

  const tabs = [
    { id: 'home', label: 'Home', icon: ArrowRight },
    { id: 'creators', label: 'For Content Creators', icon: Video },
    { id: 'gifts', label: 'For Gift Givers', icon: Gift },
    { id: 'builders', label: 'For Builders', icon: Hammer }
  ];

  return (
    <div className="pt-16">
      {/* Tab Navigation */}
      <section className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center">
            <nav className="flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>
      </section>

      {/* Content based on active tab */}
      {activeTab === 'home' && <OriginalHomePage />}
      {activeTab === 'creators' && <ContentCreatorsPage />}
      {activeTab === 'gifts' && <GiftGiversPage />}
      {activeTab === 'builders' && <BuildersPage />}
    </div>
  );
}

// Original Home Page
function OriginalHomePage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              <span className="block">Think it</span>
              <span className="block bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
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
              <Link to="/explore">
                <Button variant="outline" size="lg" className="min-w-[200px]">
                  Explore Trending Ideas
                </Button>
              </Link>
            </div>
          </div>
        </div>
        
        {/* Floating Elements */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-purple-200 rounded-full opacity-20 animate-bounce"></div>
        <div className="absolute bottom-20 right-10 w-16 h-16 bg-blue-200 rounded-full opacity-20 animate-bounce delay-1000"></div>
      </section>

      {/* Viral Content Section */}
      <section className="py-24 bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <TrendingUp className="h-8 w-8 text-pink-500" />
              <h2 className="text-3xl font-bold text-gray-900">
                Create Viral Content
              </h2>
            </div>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Turn your pets, selfies, and ideas into viral TikTok and Instagram content with trending 3D model prompts
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <Card className="p-6 text-center hover bg-white">
              <div className="bg-gradient-to-r from-pink-500 to-rose-500 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Pet Figurines
              </h3>
              <p className="text-gray-600 text-sm mb-3">
                Upload pet photos and create adorable 3D figurines
              </p>
              <span className="text-xs bg-pink-100 text-pink-700 px-2 py-1 rounded-full">
                #PetFigurine
              </span>
            </Card>

            <Card className="p-6 text-center hover bg-white">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-500 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Action Figures
              </h3>
              <p className="text-gray-600 text-sm mb-3">
                Transform selfies into superhero action figures
              </p>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                #ActionFigure
              </span>
            </Card>

            <Card className="p-6 text-center hover bg-white">
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <Camera className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Mini Me
              </h3>
              <p className="text-gray-600 text-sm mb-3">
                Create cute chibi-style figurines from photos
              </p>
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                #MiniMe
              </span>
            </Card>

            <Card className="p-6 text-center hover bg-white">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <Share2 className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Custom Items
              </h3>
              <p className="text-gray-600 text-sm mb-3">
                Design personalized mugs, stands, and decor
              </p>
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                #CustomDesign
              </span>
            </Card>
          </div>

          <div className="text-center">
            <Link to="/explore">
              <Button size="lg" icon={TrendingUp} className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600">
                Explore Trending Prompts
              </Button>
            </Link>
            <p className="text-sm text-gray-500 mt-3">
              💡 Perfect for TikTok, Instagram Reels, and YouTube Shorts
            </p>
          </div>
        </div>
      </section>

      {/* Dual Input Feature */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Text or Image - Your Choice
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                Create 3D models from detailed text descriptions or upload photos for AI-powered transformation. Perfect for any creative workflow.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-start space-x-4">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <Zap className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Text Prompts</h3>
                    <p className="text-gray-600 text-sm">Describe your vision in detail and watch AI bring it to life</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="bg-purple-100 p-2 rounded-lg">
                    <Camera className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Photo Upload</h3>
                    <p className="text-gray-600 text-sm">Upload images and transform them into 3D models</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <div className="w-full h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg mb-3 flex items-center justify-center">
                    <Zap className="h-8 w-8 text-purple-600" />
                  </div>
                  <p className="text-xs text-gray-600 text-center">Text Description</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <div className="w-full h-24 bg-gradient-to-br from-pink-100 to-orange-100 rounded-lg mb-3 flex items-center justify-center">
                    <Camera className="h-8 w-8 text-orange-600" />
                  </div>
                  <p className="text-xs text-gray-600 text-center">Photo Upload</p>
                </div>
              </div>
              <div className="text-center mt-6">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto">
                  <ArrowRight className="h-6 w-6 text-white transform rotate-90" />
                </div>
                <p className="text-sm text-gray-600 mt-2">AI-Generated 3D Model</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-gray-50">
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
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
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
              <div className="bg-gradient-to-r from-green-500 to-teal-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
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
              <div className="bg-gradient-to-r from-orange-500 to-red-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
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

      {/* Featured Designs */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-12">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Featured Designs
              </h2>
              <p className="text-xl text-gray-600">
                Discover popular 3D models from our community
              </p>
            </div>
            <Link to="/marketplace">
              <Button variant="outline" icon={ArrowRight}>
                View All
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {featuredDesigns.map((design) => (
              <Card key={design.id} className="overflow-hidden hover">
                <img
                  src={design.thumbnail}
                  alt={design.title}
                  className="w-full h-48 object-cover"
                />
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {design.title}
                  </h3>
                  <div className="flex justify-between items-center">
                    <span className="text-2xl font-bold text-purple-600">
                      ${design.price}
                    </span>
                    <span className="text-sm text-gray-500">
                      {design.downloads} downloads
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-purple-600 to-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to bring your ideas to life?
          </h2>
          <p className="text-xl text-purple-100 mb-8 max-w-2xl mx-auto">
            Join thousands of creators using AI to transform imagination into reality
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register">
              <Button variant="secondary" size="lg" className="min-w-[200px]">
                Get Started Free
              </Button>
            </Link>
            <Link to="/explore">
              <Button variant="outline" size="lg" className="min-w-[200px] text-white border-white hover:bg-white hover:text-purple-600">
                Explore Ideas
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

// Content Creators Landing Page
function ContentCreatorsPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              <span className="block">Create Viral</span>
              <span className="block bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                3D Content
              </span>
              <span className="block">Go Viral</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Turn your pets, selfies, and ideas into viral TikTok and Instagram content. 
              Perfect for content creators who want to stand out.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/generate">
                <Button size="lg" icon={TrendingUp} className="min-w-[200px] bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600">
                  Create Viral Content
                </Button>
              </Link>
              <Link to="/explore">
                <Button variant="outline" size="lg" className="min-w-[200px]">
                  Browse Trending Prompts
                </Button>
              </Link>
            </div>
            <p className="text-sm text-gray-500 mt-4">
              💡 Perfect for TikTok, Instagram Reels, and YouTube Shorts
            </p>
          </div>
        </div>
        
        {/* Floating Elements */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-purple-200 rounded-full opacity-20 animate-bounce"></div>
        <div className="absolute bottom-20 right-10 w-16 h-16 bg-blue-200 rounded-full opacity-20 animate-bounce delay-1000"></div>
      </section>

      {/* Viral Content Section */}
      <section className="py-24 bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <TrendingUp className="h-8 w-8 text-pink-500" />
              <h2 className="text-3xl font-bold text-gray-900">
                Create Viral Content
              </h2>
            </div>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Turn your pets, selfies, and ideas into viral TikTok and Instagram content with trending 3D model prompts
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <Card className="p-6 text-center hover bg-white">
              <div className="bg-gradient-to-r from-pink-500 to-rose-500 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Pet Figurines
              </h3>
              <p className="text-gray-600 text-sm mb-3">
                Upload pet photos and create adorable 3D figurines
              </p>
              <span className="text-xs bg-pink-100 text-pink-700 px-2 py-1 rounded-full">
                #PetFigurine
              </span>
            </Card>

            <Card className="p-6 text-center hover bg-white">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-500 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Action Figures
              </h3>
              <p className="text-gray-600 text-sm mb-3">
                Transform selfies into superhero action figures
              </p>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                #ActionFigure
              </span>
            </Card>

            <Card className="p-6 text-center hover bg-white">
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <Camera className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Mini Me
              </h3>
              <p className="text-gray-600 text-sm mb-3">
                Create cute chibi-style figurines from photos
              </p>
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                #MiniMe
              </span>
            </Card>

            <Card className="p-6 text-center hover bg-white">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <Share2 className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Custom Items
              </h3>
              <p className="text-gray-600 text-sm mb-3">
                Design personalized mugs, stands, and decor
              </p>
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                #CustomDesign
              </span>
            </Card>
          </div>

          <div className="text-center">
            <Link to="/explore">
              <Button size="lg" icon={TrendingUp} className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600">
                Explore Trending Prompts
              </Button>
            </Link>
            <p className="text-sm text-gray-500 mt-3">
              💡 Perfect for TikTok, Instagram Reels, and YouTube Shorts
            </p>
          </div>
        </div>
      </section>

      {/* Dual Input Feature */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Text or Image - Your Choice
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                Create 3D models from detailed text descriptions or upload photos for AI-powered transformation. Perfect for any creative workflow.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-start space-x-4">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <Zap className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Text Prompts</h3>
                    <p className="text-gray-600 text-sm">Describe your vision in detail and watch AI bring it to life</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="bg-purple-100 p-2 rounded-lg">
                    <Camera className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Photo Upload</h3>
                    <p className="text-gray-600 text-sm">Upload images and transform them into 3D models</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <div className="w-full h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg mb-3 flex items-center justify-center">
                    <Zap className="h-8 w-8 text-purple-600" />
                  </div>
                  <p className="text-xs text-gray-600 text-center">Text Description</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <div className="w-full h-24 bg-gradient-to-br from-pink-100 to-orange-100 rounded-lg mb-3 flex items-center justify-center">
                    <Camera className="h-8 w-8 text-orange-600" />
                  </div>
                  <p className="text-xs text-gray-600 text-center">Photo Upload</p>
                </div>
              </div>
              <div className="text-center mt-6">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto">
                  <ArrowRight className="h-6 w-6 text-white transform rotate-90" />
                </div>
                <p className="text-sm text-gray-600 mt-2">AI-Generated 3D Model</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-gray-50">
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
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
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
              <div className="bg-gradient-to-r from-green-500 to-teal-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
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
              <div className="bg-gradient-to-r from-orange-500 to-red-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
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

      {/* Featured Designs */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-12">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Featured Designs
              </h2>
              <p className="text-xl text-gray-600">
                Discover popular 3D models from our community
              </p>
            </div>
            <Link to="/marketplace">
              <Button variant="outline" icon={ArrowRight}>
                View All
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {featuredDesigns.map((design) => (
              <Card key={design.id} className="overflow-hidden hover">
                <img
                  src={design.thumbnail}
                  alt={design.title}
                  className="w-full h-48 object-cover"
                />
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {design.title}
                  </h3>
                  <div className="flex justify-between items-center">
                    <span className="text-2xl font-bold text-purple-600">
                      ${design.price}
                    </span>
                    <span className="text-sm text-gray-500">
                      {design.downloads} downloads
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-purple-600 to-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to bring your ideas to life?
          </h2>
          <p className="text-xl text-purple-100 mb-8 max-w-2xl mx-auto">
            Join thousands of creators using AI to transform imagination into reality
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register">
              <Button variant="secondary" size="lg" className="min-w-[200px]">
                Get Started Free
              </Button>
            </Link>
            <Link to="/explore">
              <Button variant="outline" size="lg" className="min-w-[200px] text-white border-white hover:bg-white hover:text-purple-600">
                Explore Ideas
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

// Gift Givers Landing Page
function GiftGiversPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-red-50 via-pink-50 to-rose-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              <span className="block">Give the Gift of</span>
              <span className="block bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent">
                Personalization
              </span>
              <span className="block">They'll Never Forget</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Create meaningful, personalized gifts that show you care. From custom figurines 
              to personalized home decor - make every occasion special.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/generate">
                <Button size="lg" icon={Gift} className="min-w-[200px] bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600">
                  Create Custom Gift
                </Button>
              </Link>
              <Link to="/marketplace">
                <Button variant="outline" size="lg" className="min-w-[200px]">
                  Browse Gift Ideas
                </Button>
              </Link>
            </div>
            <p className="text-sm text-gray-500 mt-4">
              🎁 Perfect for birthdays, holidays, anniversaries, and special occasions
            </p>
          </div>
        </div>
        
        {/* Floating Elements */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-red-200 rounded-full opacity-20 animate-bounce"></div>
        <div className="absolute bottom-20 right-10 w-16 h-16 bg-pink-200 rounded-full opacity-20 animate-bounce delay-1000"></div>
      </section>

      {/* Gift Ideas Section */}
      <section className="py-24 bg-gradient-to-br from-red-50 via-pink-50 to-rose-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Gift className="h-8 w-8 text-red-500" />
              <h2 className="text-3xl font-bold text-gray-900">
                Perfect Gift Ideas
              </h2>
            </div>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Thoughtful, personalized gifts that create lasting memories
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <Card className="p-6 text-center hover bg-white">
              <div className="bg-gradient-to-r from-red-500 to-pink-500 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Pet Memorials
              </h3>
              <p className="text-gray-600 text-sm mb-3">
                Honor beloved pets with custom figurines
              </p>
              <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                Most Meaningful
              </span>
            </Card>

            <Card className="p-6 text-center hover bg-white">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-500 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Family Figurines
              </h3>
              <p className="text-gray-600 text-sm mb-3">
                Create custom family portraits in 3D
              </p>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                Family Favorite
              </span>
            </Card>

            <Card className="p-6 text-center hover bg-white">
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <Gift className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Custom Jewelry
              </h3>
              <p className="text-gray-600 text-sm mb-3">
                Personalized pendants and accessories
              </p>
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                Elegant Choice
              </span>
            </Card>

            <Card className="p-6 text-center hover bg-white">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <Camera className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Memory Keepsakes
              </h3>
              <p className="text-gray-600 text-sm mb-3">
                Turn special moments into 3D memories
              </p>
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                Sentimental
              </span>
            </Card>
          </div>

          <div className="text-center">
            <Link to="/explore">
              <Button size="lg" icon={Gift} className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600">
                Start Creating Gifts
              </Button>
            </Link>
            <p className="text-sm text-gray-500 mt-3">
              🎁 No design skills needed—just your imagination
            </p>
          </div>
        </div>
      </section>

      {/* Occasions Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Perfect for Every Occasion
            </h2>
            <p className="text-xl text-gray-600">
              From birthdays to holidays, make every moment special
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { occasion: 'Birthdays', emoji: '🎂' },
              { occasion: 'Anniversaries', emoji: '💕' },
              { occasion: 'Holidays', emoji: '🎄' },
              { occasion: 'Graduations', emoji: '🎓' },
              { occasion: 'New Baby', emoji: '👶' },
              { occasion: 'Weddings', emoji: '💒' },
              { occasion: 'Retirement', emoji: '🏆' },
              { occasion: 'Just Because', emoji: '💝' }
            ].map((item) => (
              <div key={item.occasion} className="text-center p-4 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="text-3xl mb-2">{item.emoji}</div>
                <h3 className="font-medium text-gray-900">{item.occasion}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dual Input Feature */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Text or Image - Your Choice
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                Create 3D models from detailed text descriptions or upload photos for AI-powered transformation. Perfect for any creative workflow.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-start space-x-4">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <Zap className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Text Prompts</h3>
                    <p className="text-gray-600 text-sm">Describe your vision in detail and watch AI bring it to life</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="bg-purple-100 p-2 rounded-lg">
                    <Camera className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Photo Upload</h3>
                    <p className="text-gray-600 text-sm">Upload images and transform them into 3D models</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <div className="w-full h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg mb-3 flex items-center justify-center">
                    <Zap className="h-8 w-8 text-purple-600" />
                  </div>
                  <p className="text-xs text-gray-600 text-center">Text Description</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <div className="w-full h-24 bg-gradient-to-br from-pink-100 to-orange-100 rounded-lg mb-3 flex items-center justify-center">
                    <Camera className="h-8 w-8 text-orange-600" />
                  </div>
                  <p className="text-xs text-gray-600 text-center">Photo Upload</p>
                </div>
              </div>
              <div className="text-center mt-6">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto">
                  <ArrowRight className="h-6 w-6 text-white transform rotate-90" />
                </div>
                <p className="text-sm text-gray-600 mt-2">AI-Generated 3D Model</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-gray-50">
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
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
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
              <div className="bg-gradient-to-r from-green-500 to-teal-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
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
              <div className="bg-gradient-to-r from-orange-500 to-red-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
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

      {/* Featured Designs */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-12">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Featured Designs
              </h2>
              <p className="text-xl text-gray-600">
                Discover popular 3D models from our community
              </p>
            </div>
            <Link to="/marketplace">
              <Button variant="outline" icon={ArrowRight}>
                View All
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {featuredDesigns.map((design) => (
              <Card key={design.id} className="overflow-hidden hover">
                <img
                  src={design.thumbnail}
                  alt={design.title}
                  className="w-full h-48 object-cover"
                />
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {design.title}
                  </h3>
                  <div className="flex justify-between items-center">
                    <span className="text-2xl font-bold text-purple-600">
                      ${design.price}
                    </span>
                    <span className="text-sm text-gray-500">
                      {design.downloads} downloads
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-red-600 to-pink-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Give a Gift They'll Treasure Forever
          </h2>
          <p className="text-xl text-red-100 mb-8 max-w-2xl mx-auto">
            Create personalized 3D gifts that show how much you care
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/generate">
              <Button variant="secondary" size="lg" className="min-w-[200px]">
                Start Creating
              </Button>
            </Link>
            <Link to="/marketplace">
              <Button variant="outline" size="lg" className="min-w-[200px] text-white border-white hover:bg-white hover:text-red-600">
                Browse Gift Ideas
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

// Builders Landing Page
function BuildersPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-cyan-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              <span className="block">Build, Print,</span>
              <span className="block bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                Create
              </span>
              <span className="block">Without Limits</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Professional-grade 3D models optimized for printing. From functional prototypes 
              to custom tools - build exactly what you need.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/generate">
                <Button size="lg" icon={Hammer} className="min-w-[200px] bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600">
                  Start Building
                </Button>
              </Link>
              <Link to="/manufacturing">
                <Button variant="outline" size="lg" className="min-w-[200px]">
                  Find Manufacturers
                </Button>
              </Link>
            </div>
            <p className="text-sm text-gray-500 mt-4">
              🔧 Optimized for FDM, SLA, and industrial 3D printers
            </p>
          </div>
        </div>
        
        {/* Floating Elements */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-blue-200 rounded-full opacity-20 animate-bounce"></div>
        <div className="absolute bottom-20 right-10 w-16 h-16 bg-cyan-200 rounded-full opacity-20 animate-bounce delay-1000"></div>
      </section>

      {/* Builder Categories Section */}
      <section className="py-24 bg-gradient-to-br from-blue-50 via-indigo-50 to-cyan-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Hammer className="h-8 w-8 text-blue-500" />
              <h2 className="text-3xl font-bold text-gray-900">
                Built for Makers
              </h2>
            </div>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Professional tools and models for every type of builder
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <Card className="p-6 text-center hover bg-white">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-500 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Rapid Prototyping
              </h3>
              <p className="text-gray-600 text-sm mb-3">
                Quick iterations for product development
              </p>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                Fast & Precise
              </span>
            </Card>

            <Card className="p-6 text-center hover bg-white">
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <Hammer className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Custom Tools
              </h3>
              <p className="text-gray-600 text-sm mb-3">
                Specialized tools for unique applications
              </p>
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                Functional
              </span>
            </Card>

            <Card className="p-6 text-center hover bg-white">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShoppingBag className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Replacement Parts
              </h3>
              <p className="text-gray-600 text-sm mb-3">
                Custom parts when originals aren't available
              </p>
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                Problem Solver
              </span>
            </Card>

            <Card className="p-6 text-center hover bg-white">
              <div className="bg-gradient-to-r from-orange-500 to-red-500 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Educational Models
              </h3>
              <p className="text-gray-600 text-sm mb-3">
                Teaching aids and demonstration models
              </p>
              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                Educational
              </span>
            </Card>
          </div>

          <div className="text-center">
            <Link to="/explore">
              <Button size="lg" icon={Hammer} className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600">
                Explore Builder Tools
              </Button>
            </Link>
            <p className="text-sm text-gray-500 mt-3">
              🔧 All models include technical specifications
            </p>
          </div>
        </div>
      </section>

      {/* Technical Features */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Built for Professional Results
            </h2>
            <p className="text-xl text-gray-600">
              Every model optimized for real-world manufacturing
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Print-Ready Files</h3>
              <p className="text-gray-600">STL, OBJ, and 3MF formats with optimized geometry for reliable printing</p>
            </div>
            
            <div className="text-center">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Download className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Technical Specs</h3>
              <p className="text-gray-600">Detailed printing parameters, material recommendations, and assembly instructions</p>
            </div>
            
            <div className="text-center">
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShoppingBag className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Manufacturing Network</h3>
              <p className="text-gray-600">Connect with verified manufacturers for professional-grade production</p>
            </div>
          </div>
        </div>
      </section>

      {/* Dual Input Feature */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Text or Image - Your Choice
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                Create 3D models from detailed text descriptions or upload photos for AI-powered transformation. Perfect for any creative workflow.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-start space-x-4">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <Zap className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Text Prompts</h3>
                    <p className="text-gray-600 text-sm">Describe your vision in detail and watch AI bring it to life</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="bg-purple-100 p-2 rounded-lg">
                    <Camera className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Photo Upload</h3>
                    <p className="text-gray-600 text-sm">Upload images and transform them into 3D models</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <div className="w-full h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg mb-3 flex items-center justify-center">
                    <Zap className="h-8 w-8 text-purple-600" />
                  </div>
                  <p className="text-xs text-gray-600 text-center">Text Description</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <div className="w-full h-24 bg-gradient-to-br from-pink-100 to-orange-100 rounded-lg mb-3 flex items-center justify-center">
                    <Camera className="h-8 w-8 text-orange-600" />
                  </div>
                  <p className="text-xs text-gray-600 text-center">Photo Upload</p>
                </div>
              </div>
              <div className="text-center mt-6">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto">
                  <ArrowRight className="h-6 w-6 text-white transform rotate-90" />
                </div>
                <p className="text-sm text-gray-600 mt-2">AI-Generated 3D Model</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-gray-50">
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
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
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
              <div className="bg-gradient-to-r from-green-500 to-teal-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
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
              <div className="bg-gradient-to-r from-orange-500 to-red-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
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

      {/* Featured Designs */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-12">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Featured Designs
              </h2>
              <p className="text-xl text-gray-600">
                Discover popular 3D models from our community
              </p>
            </div>
            <Link to="/marketplace">
              <Button variant="outline" icon={ArrowRight}>
                View All
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {featuredDesigns.map((design) => (
              <Card key={design.id} className="overflow-hidden hover">
                <img
                  src={design.thumbnail}
                  alt={design.title}
                  className="w-full h-48 object-cover"
                />
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {design.title}
                  </h3>
                  <div className="flex justify-between items-center">
                    <span className="text-2xl font-bold text-purple-600">
                      ${design.price}
                    </span>
                    <span className="text-sm text-gray-500">
                      {design.downloads} downloads
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-blue-600 to-cyan-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Build Something Amazing?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join thousands of makers, engineers, and builders creating with AI-powered 3D generation
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/generate">
              <Button variant="secondary" size="lg" className="min-w-[200px]">
                Start Building
              </Button>
            </Link>
            <Link to="/manufacturing">
              <Button variant="outline" size="lg" className="min-w-[200px] text-white border-white hover:bg-white hover:text-blue-600">
                Find Manufacturers
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}