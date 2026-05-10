# Design System Implementation Guide

## Overview

This document describes the comprehensive design system implementation for the WL Sales Academy mobile and web applications. The design system has been completely refactored to provide a consistent, accessible, and performant user experience across all platforms.

## Architecture

### Mobile App Structure

```
apps/mobile/src/
├── components/
│   ├── ui/                    # Reusable UI components
│   │   ├── Button.tsx        # Accessible button with variants
│   │   ├── Card.tsx          # Card component with elevation
│   │   ├── Input.tsx         # Form inputs with validation
│   │   ├── Modal.tsx         # Accessible modal system
│   │   ├── Loading.tsx       # Loading states and skeletons
│   │   └── ErrorState.tsx    # Error handling components
│   ├── layout/                # Layout components
│   │   └── Screen.tsx        # Base screen with safe areas
│   └── features/              # Feature-specific components
│       ├── dashboard/
│       ├── roadmap/
│       ├── goalsheet/
│       ├── roleplay/
│       ├── resources/
│       └── support/
├── hooks/                     # Custom React hooks
│   ├── useTheme.ts           # Theme system
│   ├── useAuth.ts            # Authentication management
│   └── useApi.ts             # API communication
├── constants/                 # Design tokens
│   ├── colors.ts             # Color palette (WCAG AA compliant)
│   ├── typography.ts         # Type scale
│   ├── spacing.ts            # Spacing system
│   └── theme.ts              # Main theme configuration
└── utils/                     # Utility functions
```

### Web App Structure

```
frontend/src/
├── styles/
│   ├── styles.css            # Base styles
│   └── responsive.css        # Responsive design system
├── components/
│   ├── ui/                   # Reusable UI components
│   ├── layout/               # Layout components
│   └── features/             # Feature-specific components
├── hooks/                    # Custom React hooks
└── utils/                    # Utility functions
```

## Design System Features

### 1. Color System (WCAG AA Compliant)

#### Mobile (TypeScript)
```typescript
import { Colors } from './constants/colors';

// Primary colors
Colors.primary.gold          // #f2ca50
Colors.primary.goldLight     // #ffe088
Colors.primary.goldDark      // #e6b840

// Semantic colors
Colors.semantic.success.primary  // #29e35f
Colors.semantic.error.primary    // #ff4141
Colors.semantic.warning.primary  // #ff9500
```

#### Web (CSS Custom Properties)
```css
/* Primary colors */
--color-primary-gold: #f2ca50;
--color-primary-gold-light: #ffe088;
--color-primary-gold-dark: #e6b840;

/* Semantic colors */
--color-success: #29e35f;
--color-error: #ff4141;
--color-warning: #ff9500;
```

### 2. Typography Scale

#### Mobile
```typescript
import { Typography } from './constants/typography';

Typography.display           // 42px, weight 900
Typography.h1               // 32px, weight 900
Typography.h2               // 24px, weight 800
Typography.body             // 16px, weight 400
Typography.caption          // 12px, weight 400
Typography.button           // 16px, weight 800
```

#### Web
```css
/* Responsive typography */
.text-display { font-size: clamp(2rem, 5vw, 4rem); }
.text-h1 { font-size: clamp(1.5rem, 4vw, 3rem); }
.text-h2 { font-size: clamp(1.25rem, 3vw, 2rem); }
.text-body { font-size: 1rem; line-height: 1.6; }
```

### 3. Spacing System

#### Mobile
```typescript
import { Spacing } from './constants/spacing';

Spacing.xs    // 4px
Spacing.sm    // 8px
Spacing.md    // 16px
Spacing.lg    // 24px
Spacing.xl    // 32px
Spacing.xxl   // 48px
```

#### Web
```css
/* Spacing scale */
--spacing-xs: 4px;
--spacing-sm: 8px;
--spacing-md: 16px;
--spacing-lg: 24px;
--spacing-xl: 32px;
--spacing-xxl: 48px;
```

### 4. Component Library

#### Button Component

**Mobile:**
```typescript
import { Button } from './components/ui';

<Button
  title="Submit"
  variant="primary"
  size="medium"
  loading={false}
  disabled={false}
  icon={<Icon />}
  onPress={handleSubmit}
/>
```

**Web:**
```html
<button class="btn-primary">
  Submit
</button>
```

#### Card Component

**Mobile:**
```typescript
import { Card, CardHeader, CardContent, CardActions } from './components/ui';

<Card variant="elevated" elevation="medium">
  <CardHeader
    title="Card Title"
    subtitle="Card subtitle"
    icon={<Icon />}
  />
  <CardContent>
    {/* Card content */}
  </CardContent>
  <CardActions>
    <Button title="Action" />
  </CardActions>
</Card>
```

#### Input Component

**Mobile:**
```typescript
import { Input } from './components/ui';

<Input
  label="Email"
  value={email}
  onChangeText={setEmail}
  placeholder="Enter email"
  error={error}
  keyboardType="email-address"
  autoCapitalize="none"
/>
```

**Web:**
```html
<label for="email" class="text-label">Email</label>
<input
  id="email"
  type="email"
  placeholder="Enter email"
  class="input"
  required
/>
```

### 5. Custom Hooks

#### useTheme Hook
```typescript
import { useTheme } from './hooks/useTheme';

const theme = useTheme();
const { colors, typography, spacing } = theme;

// Responsive utilities
const isTablet = theme.responsive.isTablet();
const currentBreakpoint = theme.responsive.getCurrentBreakpoint();
```

#### useAuth Hook
```typescript
import { useAuth } from './hooks/useAuth';

const {
  user,
  token,
  isAuthenticated,
  isLoading,
  error,
  login,
  logout,
  hasRole,
  hasPermission
} = useAuth();

// Check roles
if (hasRole('admin')) {
  // Admin logic
}
```

#### useApi Hook
```typescript
import { useApi, useFetch, useMutation } from './hooks/useApi';

// Basic API usage
const { get, post, put, patch, delete: del } = useApi();

// Data fetching
const { data, loading, error, refetch } = useFetch('/api/data');

// Mutations
const mutation = useMutation(async (data) => {
  return await post('/api/submit', data);
});
```

## Accessibility Features

### 1. Semantic HTML (Web)
```html
<!-- Proper heading hierarchy -->
<main>
  <header>
    <nav aria-label="Main navigation">
      {/* Navigation */}
    </nav>
  </header>

  <section aria-labelledby="dashboard-heading">
    <h1 id="dashboard-heading">Dashboard</h1>
    {/* Content */}
  </section>

  <footer>
    {/* Footer content */}
  </footer>
</main>
```

### 2. ARIA Labels
```typescript
<TouchableOpacity
  onPress={handleAction}
  accessibilityRole="button"
  accessibilityLabel="Close modal"
  accessibilityHint="Closes the modal and returns to previous screen"
>
  <Icon />
</TouchableOpacity>
```

### 3. Keyboard Navigation
```css
/* Focus visible styles */
:focus-visible {
  outline: 2px solid var(--color-primary-gold);
  outline-offset: 2px;
}

/* Skip link */
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: var(--color-primary-gold);
  color: var(--color-surface-background);
  padding: var(--spacing-sm) var(--spacing-md);
  text-decoration: none;
  z-index: var(--z-notification);
}

.skip-link:focus {
  top: 0;
}
```

### 4. Screen Reader Support
```typescript
// Accessibility info
<AccessibilityInfo
  accessibilityLabel="Progress: 50% complete"
  accessibilityRole="progressbar"
>
  <ProgressBar value={50} />
</AccessibilityInfo>
```

## Responsive Design

### Breakpoints
```typescript
// Mobile
const breakpoints = {
  small: 640,
  medium: 768,
  large: 1024,
  xlarge: 1280,
};
```

```css
/* Web */
@media (max-width: 768px) {
  /* Mobile styles */
}

@media (min-width: 769px) and (max-width: 1024px) {
  /* Tablet styles */
}

@media (min-width: 1025px) {
  /* Desktop styles */
}
```

### Responsive Utilities
```typescript
// Mobile
const isTablet = theme.responsive.isTablet();
const responsiveSpacing = theme.responsive.spacing(16); // Scales with screen size

// Web
.container {
  max-width: 1400px;
  padding: 0 var(--spacing-lg);
}

.grid-auto-fit {
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
}
```

## Performance Optimizations

### 1. Component Memoization
```typescript
import React, { memo, useMemo, useCallback } from 'react';

// Memoized component
const MemoizedCard = memo(({ data, onPress }) => {
  return <Card data={data} onPress={onPress} />;
}, (prevProps, nextProps) => {
  return prevProps.data.id === nextProps.data.id;
});

// Memoized values
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data);
}, [data]);

// Memoized callbacks
const handlePress = useCallback(() => {
  onPress(item.id);
}, [item.id, onPress]);
```

### 2. Code Splitting
```typescript
// Lazy loading
const RoleplayScreen = React.lazy(() =>
  import('./screens/RoleplayScreen')
);

// Suspense wrapper
<Suspense fallback={<LoadingScreen />}>
  <RoleplayScreen />
</Suspense>
```

### 3. Image Optimization
```typescript
// Responsive images
<Image
  source={{
    uri: isSmallScreen ? smallImageUri : largeImageUri,
  }}
  style={{ width: '100%', height: 200 }}
  resizeMode="cover"
/>
```

## Platform-Specific Features

### iOS Optimizations
```typescript
import { Platform } from 'react-native';

// iOS-specific code
if (Platform.OS === 'ios') {
  // Use iOS-specific APIs
  // Enable Face ID
  // Use haptic feedback
}
```

### Android Optimizations
```typescript
// Android-specific code
if (Platform.OS === 'android') {
  // Use Material Design
  // Enable fingerprint auth
  // Use ripple effects
}
```

### Web Optimizations
```typescript
// Progressive enhancement
if ('serviceWorker' in navigator) {
  // Register service worker
  // Enable offline support
}
```

## Testing Guidelines

### Component Testing
```typescript
// Test component accessibility
test('button has accessibility role', () => {
  const { getByRole } = render(<Button title="Test" />);
  expect(getByRole('button')).toBeInTheDocument();
});

// Test keyboard navigation
test('input is focusable', () => {
  const { getByLabelText } = render(<Input label="Email" />);
  const input = getByLabelText('Email');
  input.focus();
  expect(input).toHaveFocus();
});
```

### Accessibility Testing
```typescript
// Test accessibility properties
test('modal traps focus', () => {
  const { getByLabelText } = render(<Modal><div>Content</div></Modal>);
  const modal = getByLabelText('Modal');
  expect(modal).toHaveFocus();
});
```

## Migration Guide

### From Old to New System

1. **Replace hardcoded values with design tokens:**
```typescript
// Old
style={{ backgroundColor: '#f2ca50', padding: 16 }}

// New
import { Theme } from './constants/theme';
style={{ backgroundColor: Theme.colors.primary.gold, padding: Theme.spacing.md }}
```

2. **Use reusable components instead of custom ones:**
```typescript
// Old
<TouchableOpacity style={styles.button} onPress={handleSubmit}>
  <Text style={styles.buttonText}>Submit</Text>
</TouchableOpacity>

// New
import { Button } from './components/ui';
<Button title="Submit" onPress={handleSubmit} />
```

3. **Replace useState with custom hooks:**
```typescript
// Old
const [token, setToken] = useState('');
const [user, setUser] = useState(null);

// New
import { useAuth } from './hooks/useAuth';
const { token, user, login, logout } = useAuth();
```

## Best Practices

1. **Always use design tokens** instead of hardcoded values
2. **Make components accessible** by default
3. **Test on multiple screen sizes** during development
4. **Use platform-specific APIs** when available
5. **Optimize images and assets** for different devices
6. **Implement proper error handling** with user-friendly messages
7. **Use TypeScript strict mode** for type safety
8. **Follow WCAG 2.1 AA guidelines** for accessibility
9. **Test with screen readers** regularly
10. **Monitor performance** and optimize bottlenecks

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [React Native Accessibility](https://reactnative.dev/docs/accessibility)
- [Web Accessibility Checklist](https://www.a11yproject.com/checklist/)
- [Mobile Design Guidelines](https://material.io/design)
- [iOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)

## Support

For questions or issues related to the design system, please refer to:
- This documentation
- Component prop types (TypeScript)
- CSS custom properties (Web)
- Storybook examples (when available)

---

**Last Updated:** 2026-05-05
**Version:** 2.0.0