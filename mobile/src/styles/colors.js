// Palette de couleurs moderne pour l'application mobile
export const colors = {
    // Couleurs primaires
    primary: '#667eea',
    primaryDark: '#5a67d8',
    primaryLight: '#a78bfa',
    
    // Couleurs secondaires
    secondary: '#764ba2',
    secondaryDark: '#553c9a',
    secondaryLight: '#9f7aea',
    
    // Gradients
    gradients: {
      primary: ['#667eea', '#764ba2'],
      secondary: ['#f093fb', '#f5576c'],
      success: ['#4ade80', '#22c55e'],
      warning: ['#fbbf24', '#f59e0b'],
      danger: ['#ef4444', '#dc2626'],
      dark: ['#1f2937', '#111827'],
      light: ['#f8fafc', '#e2e8f0'],
    },
    
    // Couleurs d'état
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#3b82f6',
    
    // Couleurs neutres
    white: '#ffffff',
    black: '#000000',
    gray: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
    },
    
    // Couleurs spécifiques à l'interface
    background: '#f8fafc',
    surface: '#ffffff',
    text: {
      primary: '#1f2937',
      secondary: '#6b7280',
      light: '#9ca3af',
      inverse: '#ffffff',
    },
    
    // Couleurs pour les inputs
    input: {
      background: '#f9fafb',
      border: '#e5e7eb',
      borderFocus: '#667eea',
      placeholder: '#9ca3af',
    },
    
    // Couleurs Google
    google: {
      red: '#db4437',
      blue: '#4285f4',
      yellow: '#f4b400',
      green: '#0f9d58',
    },
    
    // Couleurs d'overlay
    overlay: 'rgba(0, 0, 0, 0.5)',
    overlayLight: 'rgba(0, 0, 0, 0.3)',
    
    // Couleurs de statut
    online: '#10b981',
    offline: '#6b7280',
    
    // Couleurs pour les rôles
    roles: {
      user: '#3b82f6',
      seller: '#f59e0b',
      admin: '#ef4444',
    }
  };
  
  // Fonction utilitaire pour obtenir une couleur avec opacité
  export const getColorWithOpacity = (color, opacity) => {
    // Convertir hex en rgba
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };
  
  // Fonction pour obtenir un gradient en string
  export const getGradientString = (gradientName) => {
    const gradient = colors.gradients[gradientName];
    if (!gradient) return colors.gradients.primary;
    return gradient;
  };
  
  export default colors;