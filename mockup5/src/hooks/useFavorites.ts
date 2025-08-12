import { useState, useEffect } from 'react';

interface FavoriteDesign {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  price: number;
  category: string;
  downloads: number;
  likes: number;
  userName: string;
  favoritedAt: string;
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteDesign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load favorites from localStorage on mount
    const savedFavorites = localStorage.getItem('shapemint_favorites');
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites));
    }
    setLoading(false);
  }, []);

  const isFavorited = (designId: string) => {
    return favorites.some(fav => fav.id === designId);
  };

  const addToFavorites = (design: Omit<FavoriteDesign, 'favoritedAt'>) => {
    const newFavorite = {
      ...design,
      favoritedAt: new Date().toISOString().split('T')[0] // Format as YYYY-MM-DD
    };
    
    const updatedFavorites = [...favorites, newFavorite];
    setFavorites(updatedFavorites);
    localStorage.setItem('shapemint_favorites', JSON.stringify(updatedFavorites));
  };

  const removeFromFavorites = (designId: string) => {
    const updatedFavorites = favorites.filter(fav => fav.id !== designId);
    setFavorites(updatedFavorites);
    localStorage.setItem('shapemint_favorites', JSON.stringify(updatedFavorites));
  };

  const toggleFavorite = (design: Omit<FavoriteDesign, 'favoritedAt'>) => {
    if (isFavorited(design.id)) {
      removeFromFavorites(design.id);
    } else {
      addToFavorites(design);
    }
  };

  return {
    favorites,
    loading,
    isFavorited,
    addToFavorites,
    removeFromFavorites,
    toggleFavorite
  };
}