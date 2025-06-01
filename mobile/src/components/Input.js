import React, { useState, forwardRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../styles/colors';

const Input = forwardRef(({
  label,
  placeholder,
  value,
  onChangeText,
  onBlur,
  onFocus,
  error,
  helperText,
  type = 'text', // text, email, password, number, phone
  required = false,
  disabled = false,
  leftIcon,
  rightIcon,
  onRightIconPress,
  style,
  inputStyle,
  containerStyle,
  multiline = false,
  numberOfLines = 1,
  maxLength,
  autoCapitalize = 'sentences',
  autoComplete = 'off',
  keyboardType = 'default',
  returnKeyType = 'done',
  onSubmitEditing,
  ...props
}, ref) => {
  
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [focusAnim] = useState(new Animated.Value(0));

  // Configuration par type
  const getTypeConfig = () => {
    switch (type) {
      case 'email':
        return {
          keyboardType: 'email-address',
          autoCapitalize: 'none',
          autoComplete: 'email',
          leftIcon: leftIcon || 'mail-outline',
        };
      case 'password':
        return {
          secureTextEntry: !isPasswordVisible,
          autoCapitalize: 'none',
          autoComplete: 'password',
          leftIcon: leftIcon || 'lock-closed-outline',
          rightIcon: isPasswordVisible ? 'eye-off-outline' : 'eye-outline',
          onRightIconPress: () => setIsPasswordVisible(!isPasswordVisible),
        };
      case 'number':
        return {
          keyboardType: 'numeric',
          leftIcon: leftIcon || 'calculator-outline',
        };
      case 'phone':
        return {
          keyboardType: 'phone-pad',
          autoComplete: 'tel',
          leftIcon: leftIcon || 'call-outline',
        };
      default:
        return {
          keyboardType: keyboardType,
          autoCapitalize: autoCapitalize,
          autoComplete: autoComplete,
        };
    }
  };

  const typeConfig = getTypeConfig();

  // Gestion du focus
  const handleFocus = (e) => {
    setIsFocused(true);
    Animated.timing(focusAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
    onFocus && onFocus(e);
  };

  const handleBlur = (e) => {
    setIsFocused(false);
    Animated.timing(focusAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
    onBlur && onBlur(e);
  };

  // Couleurs dynamiques
  const borderColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      error ? colors.danger : colors.input.border,
      error ? colors.danger : colors.input.borderFocus,
    ],
  });

  const labelColor = error ? colors.danger : isFocused ? colors.primary : colors.text.secondary;

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Label */}
      {label && (
        <View style={styles.labelContainer}>
          <Text style={[styles.label, { color: labelColor }]}>
            {label}
            {required && <Text style={styles.required}> *</Text>}
          </Text>
        </View>
      )}

      {/* Input Container */}
      <Animated.View
        style={[
          styles.inputContainer,
          {
            borderColor: borderColor,
            backgroundColor: disabled ? colors.gray[100] : colors.input.background,
          },
          error && styles.inputError,
          isFocused && styles.inputFocused,
          style,
        ]}
      >
        {/* Left Icon */}
        {(leftIcon || typeConfig.leftIcon) && (
          <View style={styles.iconContainer}>
            <Ionicons
              name={leftIcon || typeConfig.leftIcon}
              size={20}
              color={isFocused ? colors.primary : colors.gray[400]}
            />
          </View>
        )}

        {/* Text Input */}
        <TextInput
          ref={ref}
          style={[
            styles.input,
            {
              color: disabled ? colors.gray[400] : colors.text.primary,
            },
            inputStyle,
          ]}
          placeholder={placeholder}
          placeholderTextColor={colors.input.placeholder}
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          editable={!disabled}
          multiline={multiline}
          numberOfLines={numberOfLines}
          maxLength={maxLength}
          secureTextEntry={typeConfig.secureTextEntry}
          keyboardType={typeConfig.keyboardType}
          autoCapitalize={typeConfig.autoCapitalize}
          autoComplete={typeConfig.autoComplete}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          {...props}
        />

        {/* Right Icon */}
        {(rightIcon || typeConfig.rightIcon) && (
          <TouchableOpacity
            style={styles.iconContainer}
            onPress={onRightIconPress || typeConfig.onRightIconPress}
            disabled={!onRightIconPress && !typeConfig.onRightIconPress}
          >
            <Ionicons
              name={rightIcon || typeConfig.rightIcon}
              size={20}
              color={isFocused ? colors.primary : colors.gray[400]}
            />
          </TouchableOpacity>
        )}

        {/* Character Count */}
        {maxLength && value && (
          <View style={styles.characterCount}>
            <Text style={styles.characterCountText}>
              {value.length}/{maxLength}
            </Text>
          </View>
        )}
      </Animated.View>

      {/* Error Message */}
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Helper Text */}
      {helperText && !error && (
        <Text style={styles.helperText}>{helperText}</Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  labelContainer: {
    marginBottom: 6,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  required: {
    color: colors.danger,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 16,
    minHeight: 52,
    position: 'relative',
  },
  inputFocused: {
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  inputError: {
    borderColor: colors.danger,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  iconContainer: {
    padding: 4,
  },
  characterCount: {
    position: 'absolute',
    right: 8,
    bottom: 4,
  },
  characterCountText: {
    fontSize: 12,
    color: colors.gray[400],
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingHorizontal: 4,
  },
  errorText: {
    fontSize: 14,
    color: colors.danger,
    marginLeft: 6,
    flex: 1,
  },
  helperText: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 6,
    paddingHorizontal: 4,
  },
});

Input.displayName = 'Input';

export default Input;