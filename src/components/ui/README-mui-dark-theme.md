# Dark Theme Compatible MUI Components

This directory contains dark theme compatible Material-UI (MUI) components that integrate seamlessly with the existing design system and support both light and dark themes.

## Components

### 1. DarkThemeTextField
A dark theme compatible TextField component that automatically adapts to the current theme.

**Location:** `mui-input.tsx`

**Usage:**
```tsx
import { DarkThemeTextField } from '@/components/ui/mui-input';

// Basic usage
<DarkThemeTextField
  placeholder="Enter text..."
  value={value}
  onChange={(e) => setValue(e.target.value)}
/>

// With label and helper text
<DarkThemeTextField
  label="Email Address"
  type="email"
  placeholder="Enter your email"
  helperText="We'll never share your email"
  required
/>

// With error state
<DarkThemeTextField
  label="Password"
  type="password"
  error={hasError}
  helperText={hasError ? "Password is required" : ""}
/>
```

**Props:** All standard MUI TextField props are supported.

### 2. DarkThemeAutocomplete
A dark theme compatible Autocomplete component with proper styling for dropdown options.

**Location:** `mui-autocomplete.tsx`

**Usage:**
```tsx
import { DarkThemeAutocomplete } from '@/components/ui/mui-autocomplete';
import { DarkThemeTextField } from '@/components/ui/mui-input';

const options = [
  { id: 1, name: 'Option 1' },
  { id: 2, name: 'Option 2' },
];

<DarkThemeAutocomplete
  options={options}
  getOptionLabel={(option) => option.name}
  value={selectedOption}
  onChange={(_, newValue) => setSelectedOption(newValue)}
  renderInput={(params) => (
    <DarkThemeTextField
      {...params}
      label="Select an option"
      placeholder="Choose from options..."
    />
  )}
/>
```

**Props:** All standard MUI Autocomplete props are supported.

### 3. MuiThemeProvider
A unified theme provider that can wrap multiple MUI components to ensure consistent theming.

**Location:** `mui-theme-provider.tsx`

**Usage:**
```tsx
import { MuiThemeProvider } from '@/components/ui/mui-theme-provider';

<MuiThemeProvider>
  <DarkThemeTextField />
  <DarkThemeAutocomplete />
  {/* Other MUI components */}
</MuiThemeProvider>
```

## Features

### ✅ Dark Theme Support
- Automatically detects and adapts to the current theme (light/dark)
- Uses CSS custom properties from the design system
- Consistent colors across all components

### ✅ Design System Integration
- Uses the same color palette as other UI components
- Consistent spacing, typography, and border radius
- Matches the overall design language

### ✅ Full MUI Compatibility
- Supports all standard MUI props and features
- Works with form libraries (React Hook Form, Formik, etc.)
- Compatible with validation libraries

### ✅ Accessibility
- Proper ARIA labels and descriptions
- Keyboard navigation support
- Screen reader friendly

## Theme Colors

The components use the following CSS custom properties for theming:

```css
--primary: Primary brand color
--primary-foreground: Text color on primary background
--secondary: Secondary brand color
--secondary-foreground: Text color on secondary background
--background: Main background color
--foreground: Main text color
--muted-foreground: Muted text color
--border: Border color
--accent: Accent color for hover states
--destructive: Error/danger color
--destructive-foreground: Text color on destructive background
--card: Card background color
```

## Migration Guide

### From Regular MUI Components

**Before:**
```tsx
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';

<TextField
  sx={{ 
    input: { color: 'inherit', background: 'inherit' }, 
    '& .MuiOutlinedInput-root': { background: 'inherit' } 
  }}
/>
```

**After:**
```tsx
import { DarkThemeTextField } from '@/components/ui/mui-input';

<DarkThemeTextField />
```

### From Custom Theme Providers

**Before:**
```tsx
import { createTheme, ThemeProvider } from '@mui/material/styles';

const theme = createTheme({
  palette: { mode: 'dark' },
  // ... custom theme configuration
});

<ThemeProvider theme={theme}>
  <TextField />
</ThemeProvider>
```

**After:**
```tsx
import { MuiThemeProvider } from '@/components/ui/mui-theme-provider';

<MuiThemeProvider>
  <DarkThemeTextField />
</MuiThemeProvider>
```

## Examples

See `mui-input-example.tsx` for comprehensive examples of all component variants and use cases.

## Best Practices

1. **Always wrap MUI components** with `MuiThemeProvider` when using multiple components
2. **Use the provided components** instead of importing directly from `@mui/material`
3. **Leverage the design system** colors and spacing for consistency
4. **Test in both themes** to ensure proper contrast and readability
5. **Use proper labels and helper text** for accessibility

## Troubleshooting

### Component not adapting to theme changes
- Ensure the component is wrapped with `MuiThemeProvider`
- Check that `next-themes` is properly configured
- Verify the theme context is available

### Styling conflicts
- Remove any custom `sx` props that override theme colors
- Use the provided components instead of raw MUI components
- Check for conflicting CSS custom properties

### Performance issues
- The theme is recreated on every theme change, but this is optimized for the use case
- Consider memoizing components if you have many instances
- Use React.memo for components that don't need frequent updates 