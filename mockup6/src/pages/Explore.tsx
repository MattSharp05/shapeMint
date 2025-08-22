import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, TrendingUp, Heart, Users, Zap, Camera, PawPrint, Gamepad2, Coffee, Car, Home, Palette, Type, Upload } from 'lucide-react';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';

const trendingPrompts = [
  {
    id: 'pet-figurine',
    title: 'Pet Figurine',
    description: 'Turn your furry friend into a 3D figurine',
    prompt: 'A detailed 3D figurine of [pet type] with [description], sitting pose, cute expression, suitable for 3D printing',
    placeholder: 'golden retriever with floppy ears',
    icon: PawPrint,
    category: 'Pets',
    trending: true,
    socialTag: '#PetFigurine #3DPet',
    examples: ['golden retriever with floppy ears', 'tabby cat with green eyes', 'small parrot with colorful feathers'],
    supportsImage: true,
    imagePrompt: 'Create a detailed 3D figurine based on this pet photo, sitting pose, cute expression, suitable for 3D printing'
  },
  {
    id: 'action-figure',
    title: 'Me as Action Figure',
    description: 'Create your own superhero action figure',
    prompt: 'A heroic action figure of [description], dynamic pose, superhero style, detailed costume, 3D printable',
    placeholder: 'person in blue cape and mask',
    icon: Gamepad2,
    category: 'People',
    trending: true,
    socialTag: '#ActionFigure #SuperheroMe',
    examples: ['person in blue cape and mask', 'warrior with sword and armor', 'space explorer with helmet'],
    supportsImage: true,
    imagePrompt: 'Transform this person into a heroic action figure with dynamic pose, superhero style, detailed costume, 3D printable'
  },
  {
    id: 'mini-me',
    title: 'Mini Me Figurine',
    description: 'A miniature version of yourself',
    prompt: 'A cute chibi-style figurine of [description], friendly expression, casual outfit, 3D printable miniature',
    placeholder: 'person with glasses and hoodie',
    icon: Users,
    category: 'People',
    trending: false,
    socialTag: '#MiniMe #ChibiFigurine',
    examples: ['person with glasses and hoodie', 'person with curly hair and smile', 'person in business suit'],
    supportsImage: true,
    imagePrompt: 'Create a cute chibi-style figurine based on this person, friendly expression, casual outfit, 3D printable miniature'
  },
  {
    id: 'custom-mug',
    title: 'Personalized Mug',
    description: 'Design your perfect coffee companion',
    prompt: 'A modern coffee mug with [design elements], ergonomic handle, [style] aesthetic, perfect for daily use',
    placeholder: 'geometric patterns and my initials',
    icon: Coffee,
    category: 'Home',
    trending: false,
    socialTag: '#CustomMug #PersonalizedDrinkware',
    examples: ['geometric patterns and my initials', 'floral design with gold accents', 'minimalist with favorite quote'],
    supportsImage: false
  },
  {
    id: 'keychain',
    title: 'Custom Keychain',
    description: 'Design a unique keychain with your style',
    prompt: 'A personalized keychain with [design elements], compact size, durable design, perfect for keys or bags',
    placeholder: 'my name and favorite symbol',
    icon: Zap,
    category: 'Accessories',
    trending: true,
    socialTag: '#CustomKeychain #PersonalizedAccessory',
    examples: ['my name and favorite symbol', 'pet silhouette with initials', 'geometric pattern with birthdate'],
    supportsImage: true,
    imagePrompt: 'Create a custom keychain design based on this image, compact size, durable design, perfect for keys or bags'
  },
  {
    id: 'dream-car',
    title: 'Dream Car Model',
    description: 'Create a model of your dream vehicle',
    prompt: 'A detailed scale model of [car description], sleek design, realistic proportions, perfect for display',
    placeholder: 'red sports car with racing stripes',
    icon: Car,
    category: 'Vehicles',
    trending: true,
    socialTag: '#DreamCar #CarModel',
    examples: ['red sports car with racing stripes', 'vintage motorcycle with chrome details', 'futuristic electric vehicle'],
    supportsImage: true,
    imagePrompt: 'Create a detailed scale model based on this vehicle, sleek design, realistic proportions, perfect for display'
  },
  {
    id: 'phone-stand',
    title: 'Custom Phone Stand',
    description: 'Design a phone stand that matches your style',
    prompt: 'A stylish phone stand with [design features], stable base, adjustable angle, modern aesthetic',
    placeholder: 'marble texture and gold accents',
    icon: Camera,
    category: 'Tech',
    trending: false,
    socialTag: '#PhoneStand #TechAccessory',
    examples: ['marble texture and gold accents', 'wooden finish with cable management', 'transparent crystal design'],
    supportsImage: false
  },
  {
    id: 'plant-pot',
    title: 'Designer Plant Pot',
    description: 'Create the perfect home for your plants',
    prompt: 'A modern plant pot with [design elements], drainage holes, [size] size, suitable for [plant type]',
    placeholder: 'hexagonal pattern, medium, succulents',
    icon: Home,
    category: 'Home',
    trending: false,
    socialTag: '#PlantPot #HomeDecor',
    examples: ['hexagonal pattern, medium, succulents', 'minimalist white, large, monstera', 'textured ceramic, small, herbs'],
    supportsImage: false
  },
  {
    id: 'art-sculpture',
    title: 'Abstract Art Piece',
    description: 'Express your creativity with abstract art',
    prompt: 'An abstract sculpture with [artistic elements], flowing forms, [style] aesthetic, perfect for display',
    placeholder: 'twisted ribbons and smooth curves',
    icon: Palette,
    category: 'Art',
    trending: false,
    socialTag: '#AbstractArt #3DSculpture',
    examples: ['twisted ribbons and smooth curves', 'geometric blocks with negative space', 'organic flowing shapes'],
    supportsImage: true,
    imagePrompt: 'Create an abstract sculpture inspired by this image, flowing forms, artistic aesthetic, perfect for display'
  }
];

const categories = ['All', 'Pets', 'People', 'Home', 'Tech', 'Vehicles', 'Art'];

export function Explore() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedPrompt, setSelectedPrompt] = useState<typeof trendingPrompts[0] | null>(null);
  const [customInput, setCustomInput] = useState('');
  const [inputMode, setInputMode] = useState<'text' | 'image'>('text');
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const navigate = useNavigate();

  const filteredPrompts = trendingPrompts.filter(prompt => 
    selectedCategory === 'All' || prompt.category === selectedCategory
  );

  const handleUsePrompt = (prompt: typeof trendingPrompts[0]) => {
    let finalPrompt;
    let mode = inputMode;
    let imageFile = null;

    if (inputMode === 'image' && uploadedImage) {
      finalPrompt = prompt.imagePrompt || prompt.prompt;
      imageFile = uploadedImage;
    } else {
      finalPrompt = prompt.prompt.replace('[description]', customInput || prompt.placeholder)
        .replace('[pet type]', customInput || prompt.placeholder)
        .replace('[design elements]', customInput || prompt.placeholder)
        .replace('[car description]', customInput || prompt.placeholder)
        .replace('[design features]', customInput || prompt.placeholder)
        .replace('[artistic elements]', customInput || prompt.placeholder)
        .replace(/\[.*?\]/g, customInput || prompt.placeholder);
      mode = 'text';
    }

    // Navigate to generate page with the customized prompt
    navigate('/generate', {
      state: {
        prefilledPrompt: finalPrompt,
        socialTag: prompt.socialTag,
        mode: mode,
        image: imageFile
      }
    });
  };

  return (
    <div className="pt-16 min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-2 rounded-lg">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900">
              Explore Trending Ideas
            </h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Discover viral 3D model ideas perfect for social media. Personalize trending prompts and share your creations!
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedCategory === category
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Trending Prompts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {filteredPrompts.map((prompt) => (
            <Card 
              key={prompt.id} 
              className="p-6 hover cursor-pointer transition-all"
              onClick={() => setSelectedPrompt(prompt)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-gradient-to-r from-purple-100 to-blue-100 p-2 rounded-lg">
                    <prompt.icon className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{prompt.title}</h3>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {prompt.category}
                    </span>
                  </div>
                </div>
                {prompt.trending && (
                  <div className="flex items-center space-x-1 text-orange-500">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-xs font-medium">Trending</span>
                  </div>
                )}
              </div>
              
              <p className="text-gray-600 text-sm mb-4">{prompt.description}</p>
              
              <div className="space-y-3">
                <div className="text-xs text-gray-500">
                  <span className="font-medium">Social Tags:</span> {prompt.socialTag}
                </div>
                
                <div className="flex flex-wrap gap-1">
                  {prompt.examples.slice(0, 2).map((example, index) => (
                    <span key={index} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                      {example}
                    </span>
                  ))}
                </div>
                
                <Button 
                  size="sm" 
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPrompt(prompt);
                  }}
                >
                  Customize & Generate
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* Customization Modal */}
        {selectedPrompt && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="bg-gradient-to-r from-purple-100 to-blue-100 p-2 rounded-lg">
                      <selectedPrompt.icon className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">{selectedPrompt.title}</h2>
                      <p className="text-gray-600">{selectedPrompt.description}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedPrompt(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Input Mode Selection */}
                  {selectedPrompt.supportsImage && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Choose Input Method
                      </label>
                      <div className="flex space-x-4">
                        <button
                          type="button"
                          onClick={() => {
                            setInputMode('text');
                            setUploadedImage(null);
                          }}
                          className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg border-2 transition-all ${
                            inputMode === 'text'
                              ? 'border-purple-500 bg-purple-50 text-purple-700'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <Type className="h-4 w-4" />
                          <span>Text Description</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setInputMode('image');
                            setCustomInput('');
                          }}
                          className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg border-2 transition-all ${
                            inputMode === 'image'
                              ? 'border-purple-500 bg-purple-50 text-purple-700'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <Upload className="h-4 w-4" />
                          <span>Upload Photo</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Input Section */}
                  {inputMode === 'text' ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Customize Your Prompt
                      </label>
                      <input
                        type="text"
                        value={customInput}
                        onChange={(e) => setCustomInput(e.target.value)}
                        placeholder={selectedPrompt.placeholder}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Leave blank to use the example: "{selectedPrompt.placeholder}"
                      </p>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Upload Your Photo
                      </label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-purple-400 transition-colors">
                        <input
                          type="file"
                          onChange={(e) => setUploadedImage(e.target.files?.[0] || null)}
                          accept="image/*"
                          className="hidden"
                          id="explore-image-upload"
                        />
                        <label htmlFor="explore-image-upload" className="cursor-pointer">
                          <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-600">
                            {uploadedImage ? uploadedImage.name : 'Click to upload your photo'}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 10MB</p>
                        </label>
                      </div>
                    </div>
                  )}

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Preview Prompt:</h4>
                    <p className="text-sm text-gray-700 italic">
                      {inputMode === 'image' && uploadedImage
                        ? (selectedPrompt.imagePrompt || selectedPrompt.prompt)
                        : selectedPrompt.prompt.replace('[description]', customInput || selectedPrompt.placeholder)
                            .replace('[pet type]', customInput || selectedPrompt.placeholder)
                            .replace('[design elements]', customInput || selectedPrompt.placeholder)
                            .replace('[car description]', customInput || selectedPrompt.placeholder)
                            .replace('[design features]', customInput || selectedPrompt.placeholder)
                            .replace('[artistic elements]', customInput || selectedPrompt.placeholder)
                            .replace(/\[.*?\]/g, customInput || selectedPrompt.placeholder)}
                    </p>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                      <Heart className="h-4 w-4 mr-2 text-red-500" />
                      Perfect for Social Media!
                    </h4>
                    <p className="text-sm text-gray-700 mb-2">
                      Share your creation with: <span className="font-mono text-blue-600">{selectedPrompt.socialTag}</span>
                    </p>
                    <p className="text-xs text-gray-600">
                      💡 Tip: Film the generation process for TikTok/Instagram Reels!
                    </p>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Popular Examples:</h4>
                    {inputMode === 'text' ? (
                      <div className="grid grid-cols-1 gap-2">
                        {selectedPrompt.examples.map((example, index) => (
                          <button
                            key={index}
                            onClick={() => setCustomInput(example)}
                            className="text-left p-2 bg-white border border-gray-200 rounded hover:bg-gray-50 text-sm"
                          >
                            {example}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-gray-500">
                        <p className="text-sm">Upload your photo above to get started!</p>
                      </div>
                    )}
                  </div>

                  <div className="flex space-x-3">
                    <Button
                      onClick={() => handleUsePrompt(selectedPrompt)}
                      className="flex-1"
                      icon={Zap}
                    >
                      Generate Now
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setSelectedPrompt(null)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Social Media CTA */}
        <Card className="p-8 text-center bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Share Your Creations!
          </h3>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Tag us in your social media posts and use our trending hashtags. 
            We love seeing what amazing 3D models our community creates!
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <span className="bg-white px-3 py-1 rounded-full text-sm font-medium text-purple-600">
              #ShapeMint3D
            </span>
            <span className="bg-white px-3 py-1 rounded-full text-sm font-medium text-purple-600">
              #AI3DModel
            </span>
            <span className="bg-white px-3 py-1 rounded-full text-sm font-medium text-purple-600">
              #3DPrintable
            </span>
            <span className="bg-white px-3 py-1 rounded-full text-sm font-medium text-purple-600">
              #CustomFigurine
            </span>
          </div>
        </Card>
      </div>
    </div>
  );
}