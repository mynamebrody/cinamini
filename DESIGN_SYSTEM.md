# cinamini Design System

This document describes the unified design system for cinamini, featuring cinema-themed styling with comprehensive light/dark mode support.

## Overview

The design system is built on:
- **shadcn/ui** component primitives
- **Tailwind CSS** with CSS custom properties
- **next-themes** for theme management
- **Cinema brand identity** preservation

## Theme System

### Theme Provider Configuration

```tsx
<ThemeProvider
  attribute="class"
  defaultTheme="system"
  enableSystem
  disableTransitionOnChange
>
  {children}
</ThemeProvider>
```

### Available Themes

- **Light**: Default cinema theme with white backgrounds
- **Dark**: Cinema theme adapted for dark mode with proper contrast
- **System**: Automatically follows user's system preference

## Color Palette

### Cinema Brand Colors

```css
/* Light Theme */
--cinema-red: 153 37 29;           /* #99251d - Primary brand color */
--cinema-red-dark: 122 29 22;      /* #7a1d16 - Darker variant */
--cinema-red-light: 181 45 32;     /* #b52d20 - Lighter variant */
--cinema-gold: 235 187 74;         /* #ebbb4a - Accent color */
--cinema-gold-light: 247 238 139;  /* #f7ee8b - Light variant */
--cinema-gold-dark: 212 169 53;    /* #d4a935 - Darker variant */
--cinema-charcoal: 58 58 60;       /* #3a3a3c - Dark neutral */
--cinema-silver: 209 210 212;      /* #d1d2d4 - Light neutral */

/* Dark Theme */
--cinema-red: 181 45 32;           /* Lighter for dark backgrounds */
--cinema-gold: 247 238 139;        /* Light golden for visibility */
--cinema-charcoal: 82 82 84;       /* Lighter for text */
--cinema-silver: 161 161 170;      /* Adapted for dark mode */
```

### Semantic Colors

| Token | Light | Dark | Usage |
|-------|--------|------|-------|
| `background` | #ffffff | #09090b | Page backgrounds |
| `foreground` | #3a3a3c | #fafafa | Primary text |
| `card` | #ffffff | #18181b | Card backgrounds |
| `border` | #d1d2d4 | #3f3f46 | Element borders |
| `primary` | #99251d | #b52d20 | Primary actions |
| `muted` | #f5f5f5 | #18181b | Secondary backgrounds |

### Game State Colors

```css
/* Maintained across themes for consistency */
--game-correct: Light: #6AAA64, Dark: #86efac
--game-present: Light: #C9B458, Dark: #fde047
--game-absent: Light: #787C7E, Dark: #a1a1aa
```

## Typography

### Font Families

- **Headings**: Funnel Display Bold (serif-style for elegance)
- **Body**: Funnel Sans Light (clean, readable sans-serif)
- **Monospace**: System monospace for code/share text

### Type Scale

```css
h1: 2.5rem (mobile: 2rem)
h2: 2rem (mobile: 1.5rem)
h3: 1.5rem
body: 1rem (16px base)
small: 0.875rem
```

## Component System

### Button Variants

```tsx
<Button variant="primary">Primary Action</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="outline">Outline</Button>
<Button variant="destructive">Destructive</Button>
```

**Key Features:**
- Square corners (border-radius: 0)
- 3D shadow hover effects using cinema red
- Full theme awareness
- Consistent sizing and spacing

### Button Sizes

```tsx
<Button size="sm">Small</Button>      <!-- h-9, px-3 -->
<Button size="md">Medium</Button>     <!-- h-10, px-4 (default) -->
<Button size="lg">Large</Button>      <!-- h-11, px-8 -->
<Button size="icon">Icon</Button>     <!-- h-10, w-10 -->
```

### 3D Shadow Effects

The signature 3D layered shadows are preserved across themes:

```css
/* Standard 3D shadow */
box-shadow: 1px 1px 0px rgb(var(--primary)),
            2px 2px 0px rgb(var(--primary)),
            3px 3px 0px rgb(var(--primary)),
            4px 4px 0px rgb(var(--primary));

/* Hover state */
box-shadow: 2px 2px 0px rgb(var(--primary)),
            4px 4px 0px rgb(var(--primary)),
            6px 6px 0px rgb(var(--primary)),
            8px 8px 0px rgb(var(--primary));
```

## Theme Toggle

### Implementation

```tsx
import { ThemeToggle } from '@/components/theme-toggle'

// Add to header/navigation
<ThemeToggle />
```

### Features

- Dropdown with Light/Dark/System options
- Visual indicators for current theme
- Smooth transitions
- Proper SSR support with next-themes

## Usage Guidelines

### CSS Custom Properties

Always use CSS variables for theme-aware styling:

```css
/* ✅ Good - Theme aware */
color: rgb(var(--foreground));
background: rgb(var(--background));
border: 1px solid rgb(var(--border));

/* ❌ Avoid - Hard-coded colors */
color: #000000;
background: white;
border: 1px solid #ccc;
```

### Tailwind Classes

Use semantic Tailwind classes:

```tsx
{/* ✅ Good - Semantic classes */}
<div className="bg-background text-foreground border border-border">

{/* ❌ Avoid - Hard-coded colors */}
<div className="bg-white text-black border border-gray-300">
```

### Component Styling

Follow the established patterns:

```tsx
// Button with cinema theme hover
<button className="bg-primary text-primary-foreground hover:shadow-[1px_1px_0px_rgb(var(--primary)),2px_2px_0px_rgb(var(--primary)),3px_3px_0px_rgb(var(--primary)),4px_4px_0px_rgb(var(--primary))]">

// Card with theme-aware background
<div className="bg-card text-card-foreground border border-border">
```

## Migration Guide

### Existing Components

1. **Replace hard-coded colors** with CSS variables
2. **Update className props** to use semantic tokens
3. **Test in both themes** to ensure proper contrast
4. **Preserve existing behavior** and animations

### Admin Components

The admin panel maintains its sophisticated styling with theme awareness:

```css
.admin-card {
  background: rgb(var(--card));
  border: 2px solid rgb(var(--border));
  box-shadow: var(--shadow-3d-grey);
}
```

## Accessibility

### Contrast Requirements

All colors meet WCAG AA contrast requirements:
- **Light theme**: 4.5:1 minimum for normal text
- **Dark theme**: 7:1 for enhanced readability

### Focus Indicators

```css
focus-visible:outline-none
focus-visible:ring-2
focus-visible:ring-ring
focus-visible:ring-offset-2
```

### Keyboard Navigation

All interactive elements support keyboard navigation with visible focus states.

## Testing

### Theme Switching

Test components in all three theme modes:
1. Light mode
2. Dark mode  
3. System preference changes

### Critical Paths

Verify theme support for:
- Game interfaces (all 4 games)
- Admin panel functionality
- Authentication flows
- Profile/settings pages

## Future Enhancements

### Planned Features

- Additional theme variants (high contrast, cinema noir)
- More sophisticated animation system
- Component-level theme overrides
- Advanced color palette generation

### Maintenance

- Regular contrast audits
- Component consistency checks
- Performance monitoring for theme switches
- Documentation updates for new components

## Resources

- [shadcn/ui Documentation](https://ui.shadcn.com)
- [next-themes Documentation](https://github.com/pacocoursey/next-themes)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [WCAG Color Contrast Guidelines](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)