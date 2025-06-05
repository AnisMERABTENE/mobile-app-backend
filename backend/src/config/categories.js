/**
 * Configuration des catégories et sous-catégories
 */

const CATEGORIES = {
    electronique: {
      name: 'Électronique',
      icon: 'phone-portrait-outline',
      subCategories: [
        { id: 'smartphones', name: 'Smartphones' },
        { id: 'tablettes', name: 'Tablettes' },
        { id: 'ordinateurs', name: 'Ordinateurs' },
        { id: 'tv-audio', name: 'TV & Audio' },
        { id: 'appareils-photo', name: 'Appareils photo' },
        { id: 'gaming', name: 'Gaming' },
        { id: 'wearables', name: 'Montres connectées' },
        { id: 'accessoires', name: 'Accessoires' }
      ]
    },
  
    mobilier: {
      name: 'Mobilier',
      icon: 'bed-outline',
      subCategories: [
        { id: 'salon', name: 'Salon' },
        { id: 'chambre', name: 'Chambre' },
        { id: 'cuisine', name: 'Cuisine' },
        { id: 'bureau', name: 'Bureau' },
        { id: 'salle-bain', name: 'Salle de bain' },
        { id: 'exterieur', name: 'Extérieur' },
        { id: 'rangement', name: 'Rangement' },
        { id: 'decoration', name: 'Décoration' }
      ]
    },
  
    vetements: {
      name: 'Vêtements',
      icon: 'shirt-outline',
      subCategories: [
        { id: 'homme', name: 'Homme' },
        { id: 'femme', name: 'Femme' },
        { id: 'enfant', name: 'Enfant' },
        { id: 'bebe', name: 'Bébé' },
        { id: 'chaussures', name: 'Chaussures' },
        { id: 'accessoires', name: 'Accessoires' },
        { id: 'sport', name: 'Sport' },
        { id: 'mariage', name: 'Mariage & Cérémonie' }
      ]
    },
  
    livres: {
      name: 'Livres & Médias',
      icon: 'book-outline',
      subCategories: [
        { id: 'romans', name: 'Romans' },
        { id: 'bd-mangas', name: 'BD & Mangas' },
        { id: 'enfants', name: 'Enfants' },
        { id: 'scolaires', name: 'Scolaires' },
        { id: 'cuisine', name: 'Cuisine' },
        { id: 'developpement', name: 'Développement personnel' },
        { id: 'musique', name: 'Musique' },
        { id: 'films', name: 'Films & Séries' }
      ]
    },
  
    sport: {
      name: 'Sport & Loisirs',
      icon: 'football-outline',
      subCategories: [
        { id: 'fitness', name: 'Fitness & Musculation' },
        { id: 'velo', name: 'Vélo' },
        { id: 'sports-hiver', name: 'Sports d\'hiver' },
        { id: 'sports-eau', name: 'Sports nautiques' },
        { id: 'football', name: 'Football' },
        { id: 'tennis', name: 'Tennis' },
        { id: 'camping', name: 'Camping & Randonnée' },
        { id: 'autres', name: 'Autres sports' }
      ]
    },
  
    jardinage: {
      name: 'Jardinage',
      icon: 'leaf-outline',
      subCategories: [
        { id: 'outils', name: 'Outils de jardinage' },
        { id: 'plantes', name: 'Plantes' },
        { id: 'graines', name: 'Graines & Bulbes' },
        { id: 'pots', name: 'Pots & Jardinières' },
        { id: 'engrais', name: 'Engrais & Terreau' },
        { id: 'arrosage', name: 'Arrosage' },
        { id: 'mobilier-jardin', name: 'Mobilier de jardin' },
        { id: 'barbecue', name: 'Barbecue & Plancha' }
      ]
    },
  
    bricolage: {
      name: 'Bricolage',
      icon: 'hammer-outline',
      subCategories: [
        { id: 'outils-main', name: 'Outils à main' },
        { id: 'outils-electriques', name: 'Outils électriques' },
        { id: 'peinture', name: 'Peinture' },
        { id: 'plomberie', name: 'Plomberie' },
        { id: 'electricite', name: 'Électricité' },
        { id: 'menuiserie', name: 'Menuiserie' },
        { id: 'carrelage', name: 'Carrelage' },
        { id: 'quincaillerie', name: 'Quincaillerie' }
      ]
    },
  
    cuisine: {
      name: 'Cuisine & Maison',
      icon: 'restaurant-outline',
      subCategories: [
        { id: 'electromenager', name: 'Électroménager' },
        { id: 'ustensiles', name: 'Ustensiles' },
        { id: 'vaisselle', name: 'Vaisselle' },
        { id: 'petit-electro', name: 'Petit électroménager' },
        { id: 'robot-cuisine', name: 'Robots de cuisine' },
        { id: 'art-table', name: 'Art de la table' },
        { id: 'rangement-cuisine', name: 'Rangement' },
        { id: 'cave-vin', name: 'Cave à vin' }
      ]
    },
  
    decoration: {
      name: 'Décoration',
      icon: 'color-palette-outline',
      subCategories: [
        { id: 'luminaires', name: 'Luminaires' },
        { id: 'textiles', name: 'Textiles' },
        { id: 'tableaux', name: 'Tableaux & Posters' },
        { id: 'miroirs', name: 'Miroirs' },
        { id: 'vases', name: 'Vases & Objets déco' },
        { id: 'bougies', name: 'Bougies & Parfums' },
        { id: 'horloges', name: 'Horloges' },
        { id: 'tapis', name: 'Tapis' }
      ]
    },
  
    jouets: {
      name: 'Jouets & Enfants',
      icon: 'game-controller-outline',
      subCategories: [
        { id: 'premier-age', name: 'Premier âge' },
        { id: 'jeux-construction', name: 'Jeux de construction' },
        { id: 'poupees', name: 'Poupées & Peluches' },
        { id: 'jeux-societe', name: 'Jeux de société' },
        { id: 'puzzles', name: 'Puzzles' },
        { id: 'jeux-exterieur', name: 'Jeux d\'extérieur' },
        { id: 'deguisements', name: 'Déguisements' },
        { id: 'educatifs', name: 'Jeux éducatifs' }
      ]
    },
  
    vehicules: {
      name: 'Véhicules',
      icon: 'car-outline',
      subCategories: [
        { id: 'voitures', name: 'Voitures' },
        { id: 'motos', name: 'Motos' },
        { id: 'velos', name: 'Vélos' },
        { id: 'trottinettes', name: 'Trottinettes' },
        { id: 'pieces-auto', name: 'Pièces auto' },
        { id: 'accessoires-auto', name: 'Accessoires auto' },
        { id: 'caravaning', name: 'Caravaning' },
        { id: 'nautisme', name: 'Nautisme' }
      ]
    },
  
    autres: {
      name: 'Autres',
      icon: 'ellipsis-horizontal-outline',
      subCategories: [
        { id: 'animaux', name: 'Animaux' },
        { id: 'services', name: 'Services' },
        { id: 'musique', name: 'Instruments de musique' },
        { id: 'collection', name: 'Collection' },
        { id: 'antiquites', name: 'Antiquités' },
        { id: 'artisanat', name: 'Artisanat' },
        { id: 'professionnel', name: 'Matériel professionnel' },
        { id: 'divers', name: 'Divers' }
      ]
    }
  };
  
  /**
   * Obtenir toutes les catégories
   */
  const getAllCategories = () => {
    return Object.keys(CATEGORIES).map(key => ({
      id: key,
      name: CATEGORIES[key].name,
      icon: CATEGORIES[key].icon,
      subCategoriesCount: CATEGORIES[key].subCategories.length
    }));
  };
  
  /**
   * Obtenir les sous-catégories d'une catégorie
   */
  const getSubCategories = (categoryId) => {
    if (!CATEGORIES[categoryId]) {
      return [];
    }
    return CATEGORIES[categoryId].subCategories;
  };
  
  /**
   * Valider qu'une catégorie et sous-catégorie existent
   */
  const validateCategoryAndSubCategory = (categoryId, subCategoryId) => {
    if (!CATEGORIES[categoryId]) {
      return false;
    }
    
    const subCategories = CATEGORIES[categoryId].subCategories;
    return subCategories.some(sub => sub.id === subCategoryId);
  };
  
  /**
   * Obtenir le nom complet d'une catégorie/sous-catégorie
   */
  const getCategoryDisplayName = (categoryId, subCategoryId) => {
    if (!CATEGORIES[categoryId]) {
      return 'Catégorie inconnue';
    }
    
    const category = CATEGORIES[categoryId];
    
    if (!subCategoryId) {
      return category.name;
    }
    
    const subCategory = category.subCategories.find(sub => sub.id === subCategoryId);
    if (!subCategory) {
      return category.name;
    }
    
    return `${category.name} > ${subCategory.name}`;
  };
  
  module.exports = {
    CATEGORIES,
    getAllCategories,
    getSubCategories,
    validateCategoryAndSubCategory,
    getCategoryDisplayName
  };