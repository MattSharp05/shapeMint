import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Star, Shield, ExternalLink, Heart, Download } from 'lucide-react';
import { Button } from '../components/UI/Button';
import { Card } from '../components/UI/Card';

interface UserProfile {
  username: string;
  displayName: string;
  avatar: string;
  bio: string;
  location: string;
  joinDate: string;
  rating: number;
  totalSales: number;
  isVerified: boolean;
  specialties: string[];
  socialLinks: {
    website?: string;
    instagram?: string;
    twitter?: string;
  };
  designs: {
    id: string;
    title: string;
    thumbnail: string;
    price: number;
    downloads: number;
    likes: number;
  }[];
}

const mockUserProfiles: Record<string, UserProfile> = {
  'TechCreator': {
    username: 'TechCreator',
    displayName: 'David Kim',
    avatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=200',
    bio: 'Passionate about creating functional tech accessories that blend form and function. Specializing in ergonomic designs for the modern digital lifestyle.',
    location: 'Seattle, WA',
    joinDate: 'March 2023',
    rating: 4.7,
    totalSales: 1247,
    isVerified: true,
    specialties: ['Tech Accessories', 'Ergonomic Design', 'Functional Items'],
    socialLinks: {
      website: 'https://techcreator.design',
      instagram: '@techcreator_designs',
      twitter: '@techcreator'
    },
    designs: [
      {
        id: '1',
        title: 'Modern Phone Stand',
        thumbnail: 'https://images.pexels.com/photos/4158/apple-iphone-smartphone-desk.jpg?auto=compress&cs=tinysrgb&w=400',
        price: 12.99,
        downloads: 234,
        likes: 89
      },
      {
        id: '2',
        title: 'Ergonomic Laptop Stand',
        thumbnail: 'https://images.pexels.com/photos/205316/pexels-photo-205316.jpeg?auto=compress&cs=tinysrgb&w=400',
        price: 24.99,
        downloads: 156,
        likes: 67
      },
      {
        id: '3',
        title: 'Cable Management Box',
        thumbnail: 'https://images.pexels.com/photos/442150/pexels-photo-442150.jpeg?auto=compress&cs=tinysrgb&w=400',
        price: 18.99,
        downloads: 98,
        likes: 45
      },
      {
        id: '4',
        title: 'Wireless Charger Stand',
        thumbnail: 'https://images.pexels.com/photos/4219654/pexels-photo-4219654.jpeg?auto=compress&cs=tinysrgb&w=400',
        price: 22.99,
        downloads: 187,
        likes: 73
      }
    ]
  },
  'LightDesigns': {
    username: 'LightDesigns',
    displayName: 'Sarah Johnson',
    avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=200',
    bio: 'Illuminating spaces with thoughtful design. I create lighting solutions that transform any environment into something special.',
    location: 'Portland, OR',
    joinDate: 'January 2023',
    rating: 4.9,
    totalSales: 892,
    isVerified: false,
    specialties: ['Lighting Design', 'Ambient Solutions', 'Interior Accessories'],
    socialLinks: {
      instagram: '@lightdesigns_studio',
      website: 'https://lightdesigns.co'
    },
    designs: [
      {
        id: '5',
        title: 'Minimalist Lamp',
        thumbnail: 'https://images.pexels.com/photos/1112598/pexels-photo-1112598.jpeg?auto=compress&cs=tinysrgb&w=400',
        price: 34.99,
        downloads: 145,
        likes: 92
      },
      {
        id: '6',
        title: 'Pendant Light Shade',
        thumbnail: 'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=400',
        price: 28.99,
        downloads: 78,
        likes: 56
      },
      {
        id: '7',
        title: 'Desk Task Light',
        thumbnail: 'https://images.pexels.com/photos/1112598/pexels-photo-1112598.jpeg?auto=compress&cs=tinysrgb&w=400',
        price: 31.99,
        downloads: 112,
        likes: 68
      }
    ]
  },
  'DesignPro': {
    username: 'DesignPro',
    displayName: 'Alex Thompson',
    avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=200',
    bio: 'Professional designer with 8+ years of experience in product design and 3D modeling. Creating innovative solutions for everyday problems.',
    location: 'San Francisco, CA',
    joinDate: 'February 2023',
    rating: 4.8,
    totalSales: 1456,
    isVerified: true,
    specialties: ['Product Design', '3D Modeling', 'Prototyping'],
    socialLinks: {
      website: 'https://designpro.studio',
      twitter: '@designpro_3d',
      instagram: '@designpro_studio'
    },
    designs: [
      {
        id: '8',
        title: 'Decorative Vase',
        thumbnail: 'https://images.pexels.com/photos/1029604/pexels-photo-1029604.jpeg?auto=compress&cs=tinysrgb&w=400',
        price: 19.99,
        downloads: 203,
        likes: 87
      },
      {
        id: '9',
        title: 'Modern Bookend',
        thumbnail: 'https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg?auto=compress&cs=tinysrgb&w=400',
        price: 16.99,
        downloads: 134,
        likes: 62
      }
    ]
  },
  'ArtisticMind': {
    username: 'ArtisticMind',
    displayName: 'Maria Rodriguez',
    avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=200',
    bio: 'Artist and designer passionate about bringing creativity into functional objects. Every piece tells a story and serves a purpose.',
    location: 'Miami, FL',
    joinDate: 'April 2023',
    rating: 4.6,
    totalSales: 678,
    isVerified: false,
    specialties: ['Artistic Design', 'Decorative Items', 'Creative Solutions'],
    socialLinks: {
      instagram: '@artistic_mind_designs',
      website: 'https://artisticmind.art'
    },
    designs: [
      {
        id: '10',
        title: 'Artistic Bowl',
        thumbnail: 'https://images.pexels.com/photos/1029604/pexels-photo-1029604.jpeg?auto=compress&cs=tinysrgb&w=400',
        price: 22.99,
        downloads: 89,
        likes: 54
      },
      {
        id: '11',
        title: 'Sculptural Candle Holder',
        thumbnail: 'https://images.pexels.com/photos/1112598/pexels-photo-1112598.jpeg?auto=compress&cs=tinysrgb&w=400',
        price: 18.99,
        downloads: 76,
        likes: 43
      }
    ]
  },
  'GreenThumb': {
    username: 'GreenThumb',
    displayName: 'Emma Wilson',
    avatar: 'https://images.pexels.com/photos/1181519/pexels-photo-1181519.jpeg?auto=compress&cs=tinysrgb&w=200',
    bio: 'Bringing nature into homes and workspaces through thoughtful garden accessories and planters. Sustainable design is my passion.',
    location: 'Austin, TX',
    joinDate: 'May 2023',
    rating: 4.5,
    totalSales: 534,
    isVerified: false,
    specialties: ['Garden Accessories', 'Planters', 'Sustainable Design'],
    socialLinks: {
      instagram: '@greenthumb_designs',
      website: 'https://greenthumb.garden'
    },
    designs: [
      {
        id: '12',
        title: 'Garden Planter',
        thumbnail: 'https://images.pexels.com/photos/1005058/pexels-photo-1005058.jpeg?auto=compress&cs=tinysrgb&w=400',
        price: 15.99,
        downloads: 167,
        likes: 78
      },
      {
        id: '13',
        title: 'Hanging Planter',
        thumbnail: 'https://images.pexels.com/photos/1005058/pexels-photo-1005058.jpeg?auto=compress&cs=tinysrgb&w=400',
        price: 18.99,
        downloads: 123,
        likes: 65
      },
      {
        id: '14',
        title: 'Herb Garden Kit',
        thumbnail: 'https://images.pexels.com/photos/1005058/pexels-photo-1005058.jpeg?auto=compress&cs=tinysrgb&w=400',
        price: 24.99,
        downloads: 98,
        likes: 52
      },
      {
        id: '15',
        title: 'Window Sill Planter',
        thumbnail: 'https://images.pexels.com/photos/1005058/pexels-photo-1005058.jpeg?auto=compress&cs=tinysrgb&w=400',
        price: 12.99,
        downloads: 145,
        likes: 71
      }
    ]
  },
  'OrganizeIT': {
    username: 'OrganizeIT',
    displayName: 'Michael Chen',
    avatar: 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=200',
    bio: 'Organization expert helping people declutter and optimize their spaces. Every design is focused on functionality and efficiency.',
    location: 'Denver, CO',
    joinDate: 'June 2023',
    rating: 4.6,
    totalSales: 789,
    isVerified: true,
    specialties: ['Organization', 'Storage Solutions', 'Productivity Tools'],
    socialLinks: {
      website: 'https://organizeit.pro',
      twitter: '@organizeit_pro',
      instagram: '@organizeit_solutions'
    },
    designs: [
      {
        id: '16',
        title: 'Desk Organizer',
        thumbnail: 'https://images.pexels.com/photos/301920/pexels-photo-301920.jpeg?auto=compress&cs=tinysrgb&w=400',
        price: 14.99,
        downloads: 189,
        likes: 84
      },
      {
        id: '17',
        title: 'Drawer Dividers Set',
        thumbnail: 'https://images.pexels.com/photos/301920/pexels-photo-301920.jpeg?auto=compress&cs=tinysrgb&w=400',
        price: 11.99,
        downloads: 156,
        likes: 67
      },
      {
        id: '18',
        title: 'Wall-Mount File Holder',
        thumbnail: 'https://images.pexels.com/photos/301920/pexels-photo-301920.jpeg?auto=compress&cs=tinysrgb&w=400',
        price: 16.99,
        downloads: 134,
        likes: 58
      },
      {
        id: '19',
        title: 'Modular Storage Cubes',
        thumbnail: 'https://images.pexels.com/photos/301920/pexels-photo-301920.jpeg?auto=compress&cs=tinysrgb&w=400',
        price: 19.99,
        downloads: 112,
        likes: 49
      },
      {
        id: '20',
        title: 'Cable Organizer Tray',
        thumbnail: 'https://images.pexels.com/photos/442150/pexels-photo-442150.jpeg?auto=compress&cs=tinysrgb&w=400',
        price: 13.99,
        downloads: 98,
        likes: 41
      }
    ]
  }
};

export function UserProfile() {
  const { username } = useParams<{ username: string }>();
  
  if (!username) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">User not found</h1>
          <Link to="/marketplace">
            <Button>Back to Marketplace</Button>
          </Link>
        </div>
      </div>
    );
  }

  const profile = mockUserProfiles[username];

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">User not found</h1>
          <Link to="/marketplace">
            <Button>Back to Marketplace</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Back Button */}
        <Link 
          to="/marketplace" 
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Marketplace
        </Link>

        {/* Profile Header */}
        <Card className="p-8 mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center space-y-6 md:space-y-0 md:space-x-8">
            <img
              src={profile.avatar}
              alt={profile.displayName}
              className="w-24 h-24 rounded-full object-cover"
            />
            
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">{profile.displayName}</h1>
                {profile.isVerified && (
                  <Shield className="h-6 w-6 text-blue-500" title="Verified Creator" />
                )}
              </div>
              
              <p className="text-gray-600 text-lg mb-4">@{profile.username}</p>
              
              <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500 mb-4">
                <div className="flex items-center space-x-1">
                  <MapPin className="h-4 w-4" />
                  <span>{profile.location}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Star className="h-4 w-4 fill-current text-yellow-400" />
                  <span>{profile.rating} rating</span>
                </div>
                <span>{profile.totalSales.toLocaleString()} sales</span>
                <span>Joined {profile.joinDate}</span>
              </div>
              
              <p className="text-gray-700 mb-6">{profile.bio}</p>
              
              <div className="flex flex-wrap gap-2 mb-6">
                {profile.specialties.map((specialty) => (
                  <span
                    key={specialty}
                    className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm"
                  >
                    {specialty}
                  </span>
                ))}
              </div>
              
              {/* Social Links */}
              <div className="flex space-x-4">
                {profile.socialLinks.website && (
                  <a
                    href={profile.socialLinks.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-1 text-gray-600 hover:text-purple-600 transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>Website</span>
                  </a>
                )}
                {profile.socialLinks.instagram && (
                  <a
                    href="#"
                    className="flex items-center space-x-1 text-gray-600 hover:text-purple-600 transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>{profile.socialLinks.instagram}</span>
                  </a>
                )}
                {profile.socialLinks.twitter && (
                  <a
                    href="#"
                    className="flex items-center space-x-1 text-gray-600 hover:text-purple-600 transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>{profile.socialLinks.twitter}</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Designs Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Designs by {profile.displayName} ({profile.designs.length})
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {profile.designs.map((design) => (
              <Card key={design.id} className="overflow-hidden hover">
                <div className="relative">
                  <img
                    src={design.thumbnail}
                    alt={design.title}
                    className="w-full h-48 object-cover"
                  />
                  <button className="absolute top-2 right-2 p-1.5 bg-white/80 backdrop-blur-sm rounded-full hover:bg-white transition-colors">
                    <Heart className="h-4 w-4 text-gray-400 hover:text-red-500" />
                  </button>
                </div>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <Link 
                      to={`/design/${design.id}`}
                      className="text-lg font-semibold text-gray-900 hover:text-purple-600 transition-colors cursor-pointer"
                    >
                      {design.title}
                    </Link>
                    <span className="text-2xl font-bold text-purple-600">
                      ${design.price}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Download className="h-3 w-3" />
                        <span>{design.downloads}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Heart className="h-3 w-3" />
                        <span>{design.likes}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Link to={`/download-checkout`} state={{
                      modelData: {
                        designId: design.id,
                        designTitle: design.title,
                        creator: profile.username,
                        isMarketplaceItem: true
                      },
                      modelUrl: `mock-model-url-${design.id}`,
                      price: design.price,
                      isGenerated: false
                    }}>
                      <Button size="sm" className="w-full">
                        <Download className="h-3 w-3 mr-1" />
                        Buy Digital Files
                      </Button>
                    </Link>
                    <Link to={`/order`} state={{
                      modelData: {
                        prompt: design.title,
                        settings: {
                          style: 'realistic',
                          quality: 'high',
                          size: 'medium'
                        },
                        isMarketplaceItem: true,
                        designId: design.id,
                        designTitle: design.title,
                        creator: profile.username
                      },
                      modelUrl: `mock-model-url-${design.id}`
                    }}>
                      <Button size="sm" variant="outline" className="w-full">
                        Order Physical Print
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}