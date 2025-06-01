import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import colors, { getGradientString } from '../styles/colors';

const Button = ({
  title,
  onPress,
  variant = 'primary', // primary, secondary, outline, text, google
  size = 'medium', // small, medium, large
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left', // left, right
  style,
  textStyle,
  fullWidth = false,
  gradient = true,
  ...props
}) => {
  
  // Configurations par variant
  const getVariantConfig = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: colors.primary,
          textColor: colors.white,
          gradientColors: getGradientString('primary'),
        };
      case 'secondary':
        return {
          backgroundColor: colors.secondary,
          textColor: colors.white,
          gradientColors: getGradientString('secondary'),
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          textColor: colors.primary,
          borderColor: colors.primary,
          borderWidth: 2,
        };
      case 'text':
        return {
          backgroundColor: 'transparent',
          textColor: colors.primary,
        };
      case 'google':
        return {
          backgroundColor: colors.white,
          textColor: colors.text.primary,
          borderColor: colors.gray[300],
          borderWidth: 1,
        };
      case 'danger':
        return {
          backgroundColor: colors.danger,
          textColor: colors.white,
          gradientColors: getGradientString('danger'),
        };
      case 'success':
        return {
          backgroundColor: colors.success,
          textColor: colors.white,
          gradientColors: getGradientString('success'),
        };
      default:
        return {
          backgroundColor: colors.primary,
          textColor: colors.white,
          gradientColors: getGradientString('primary'),
        };
    }
  };

  // Configuration par taille
  const getSizeConfig = () => {
    switch (size) {
      case 'small':
        return {
          paddingVertical: 8,
          paddingHorizontal: 16,
          fontSize: 14,
          iconSize: 16,
        };
      case 'large':
        return {
          paddingVertical: 16,
          paddingHorizontal: 24,
          fontSize: 18,
          iconSize: 24,
        };
      default: // medium
        return {
          paddingVertical: 12,
          paddingHorizontal: 20,
          fontSize: 16,
          iconSize: 20,
        };
    }
  };

  const variantConfig = getVariantConfig();
  const sizeConfig = getSizeConfig();

  // Styles du bouton
  const buttonStyles = [
    styles.button,
    {
      paddingVertical: sizeConfig.paddingVertical,
      paddingHorizontal: sizeConfig.paddingHorizontal,
      backgroundColor: variantConfig.backgroundColor,
      borderColor: variantConfig.borderColor,
      borderWidth: variantConfig.borderWidth || 0,
    },
    fullWidth && styles.fullWidth,
    disabled && styles.disabled,
    style,
  ];

  // Styles du texte
  const textStyles = [
    styles.text,
    {
      fontSize: sizeConfig.fontSize,
      color: disabled ? colors.gray[400] : variantConfig.textColor,
    },
    textStyle,
  ];

  // Contenu du bouton
  const renderContent = () => (
    <View style={styles.content}>
      {icon && iconPosition === 'left' && (
        <Ionicons
          name={icon}
          size={sizeConfig.iconSize}
          color={disabled ? colors.gray[400] : variantConfig.textColor}
          style={styles.iconLeft}
        />
      )}
      
      {loading ? (
        <ActivityIndicator
          size={size === 'small' ? 'small' : 'small'}
          color={disabled ? colors.gray[400] : variantConfig.textColor}
        />
      ) : (
        <Text style={textStyles}>{title}</Text>
      )}
      
      {icon && iconPosition === 'right' && (
        <Ionicons
          name={icon}
          size={sizeConfig.iconSize}
          color={disabled ? colors.gray[400] : variantConfig.textColor}
          style={styles.iconRight}
        />
      )}
    </View>
  );

  // Si gradient et variant supporte les gradients
  if (gradient && variantConfig.gradientColors && !disabled) {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.8}
        {...props}
      >
        <LinearGradient
          colors={variantConfig.gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={buttonStyles}
        >
          {renderContent()}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  // Bouton normal sans gradient
  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      {...props}
    >
      {renderContent()}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.6,
    shadowOpacity: 0,
    elevation: 0,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
});

export default Button;