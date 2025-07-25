import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Zap, Download, ShoppingBag, Users, TrendingUp, Camera, Heart, Share2 } from 'lucide-react';
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
  return (
    <div className="pt-16">
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
    </div>
  );
}