# Game UI Migration Guide

This guide provides patterns for migrating game components to the new cinamini design system while preserving game functionality and cinema aesthetic.

## Migration Checklist

### ✅ **Completed Migrations**

#### **Retitled Game Components**
- ✅ `retitle-result.tsx` - Theme-aware colors and shadows
- ✅ `retitle-puzzle.tsx` - Updated boarding pass styling with CSS variables
- ✅ `retitle-how-to-play.tsx` - Converted shadow utilities to CSS variables
- ✅ `retitle-stats.tsx` - Already theme-aware (no changes needed)

#### **Budget Bracket Components**  
- ✅ `budget-bracket-round.tsx` - Updated hard-coded colors and shadow utilities

### 🔄 **Migration Patterns**

#### **Color Token Replacements**

| Old Hard-coded Color | New Theme-aware Token | Usage |
|---------------------|----------------------|-------|
| `bg-white` | `bg-card` | Card backgrounds |
| `text-black` | `text-foreground` | Primary text |
| `text-gray-500` | `text-muted-foreground` | Secondary text |
| `border-gray-300` | `border-border` | Element borders |
| `border-[#d1d2d4]` | `border-border` | Specific gray borders |
| `border-[#3a3a3c]` | `border-border` | Charcoal borders |
| `text-red-700` | `text-primary` or `text-destructive` | Error/accent text |

#### **Shadow System Migration**

| Old Shadow Utility | New CSS Variable Shadow | Usage |
|-------------------|------------------------|-------|
| `shadow-3d-grey` | `shadow-[1px_1px_0px_rgb(var(--border)),2px_2px_0px_rgb(var(--border)),3px_3px_0px_rgb(var(--border)),4px_4px_0px_rgb(var(--border))]` | Default 3D shadows |
| `shadow-3d-green` | `shadow-[1px_1px_0px_rgb(34,197,94),2px_2px_0px_rgb(34,197,94),3px_3px_0px_rgb(34,197,94),4px_4px_0px_rgb(34,197,94)]` | Success states |
| `shadow-3d-red` | `shadow-[1px_1px_0px_rgb(239,68,68),2px_2px_0px_rgb(239,68,68),3px_3px_0px_rgb(239,68,68),4px_4px_0px_rgb(239,68,68)]` | Error states |

#### **Component Updates**

##### **Card Components**
```tsx
// Before
<Card className="p-4 bg-white border border-gray-300" style={{ borderRadius: 0 }}>

// After  
<Card className="p-4"> // Uses theme-aware defaults
```

##### **Interactive Elements**
```tsx
// Before
<Card 
  className="border-[#d1d2d4] hover:border-[#99251d] hover:shadow-3d-red"
  onClick={handleClick}
>

// After
<Card 
  variant="interactive"
  onClick={handleClick}
  // Automatically gets cinema red hover effects
>
```

##### **Typography Updates**
```tsx
// Before
<h2 className="text-2xl font-bold text-foreground mb-2">

// After
<h2 className="text-2xl font-bold text-foreground font-funnel-display-bold mb-2">
```

## Game-Specific Considerations

### **Retitled Game**
- **Travel Theme**: Boarding pass styling preserved with theme-aware borders
- **Flag Displays**: Country flags and emojis work in both themes
- **Translation Cards**: Ticket-style components use `bg-card` and `border-border`

### **Budget Bracket Game**  
- **Hollywood Theme**: Gold and cinema colors adapted for dark mode
- **Movie Cards**: Poster frames use theme-aware borders
- **Budget Reveals**: Success/error colors maintained with better contrast

### **Cast Climb Game**
- **Progressive Reveals**: Actor cards use consistent shadow system
- **Search Interface**: Input components follow new theme patterns

### **Poster Pixels Game**
- **Clarity Effects**: CSS filters work with both themes
- **Score Displays**: Gaming UI maintains visibility in dark mode

## Migration Process

### **Step 1: Audit Current Component**
```bash
# Search for hard-coded colors
grep -r "bg-white\|text-gray-\|border-\[" components/game/{game-name}/

# Check for shadow utilities
grep -r "shadow-3d-" components/game/{game-name}/
```

### **Step 2: Replace Color Tokens**
1. Update background colors: `bg-white` → `bg-card`
2. Update text colors: `text-gray-500` → `text-muted-foreground`
3. Update border colors: `border-[#color]` → `border-border`
4. Update accent colors: `text-red-700` → `text-primary`

### **Step 3: Update Shadow System**
1. Replace `shadow-3d-grey` with CSS variable shadows
2. Update game state shadows (green/red) to use fixed colors
3. Ensure hover effects use `rgb(var(--primary))` for cinema red

### **Step 4: Typography Enhancement**
1. Add `font-funnel-display-bold` to headings
2. Ensure consistent font families across components
3. Maintain existing font sizes and spacing

### **Step 5: Test & Validate**
1. Test component in light mode
2. Test component in dark mode  
3. Test component in system mode
4. Verify animations and interactions work
5. Check accessibility (contrast, focus states)

## Validation Checklist

### **Visual Checks**
- [ ] Component backgrounds adapt to theme
- [ ] Text remains readable in both themes
- [ ] Borders and dividers are visible
- [ ] 3D shadows maintain cinema aesthetic
- [ ] Hover effects work with cinema red accents

### **Functional Checks**
- [ ] All interactive elements remain clickable
- [ ] Game logic unchanged
- [ ] Animations and transitions preserved
- [ ] Loading states work properly
- [ ] Error states display correctly

### **Accessibility Checks**
- [ ] Focus indicators visible in both themes
- [ ] Color contrast meets WCAG AA standards
- [ ] Screen reader support maintained
- [ ] Keyboard navigation works

## Common Gotchas

### **CSS Variable Usage**
```css
/* ✅ Correct - RGB format for transparency */
shadow-[1px_1px_0px_rgb(var(--primary))]

/* ❌ Incorrect - Won't work with transparency */
shadow-[1px_1px_0px_var(--primary)]
```

### **Border Radius**
```tsx
/* ✅ Correct - Preserve square aesthetic */
<Card style={{ borderRadius: 0 }}>

/* ❌ Incorrect - Don't use rounded corners */
<Card className="rounded-lg">
```

### **Game State Colors**
```tsx
/* ✅ Correct - Use specific colors for game states */
className={correct ? "border-green-500" : "border-red-500"}

/* ❌ Incorrect - Don't use theme colors for game feedback */
className={correct ? "border-primary" : "border-destructive"}
```

## Next Components to Migrate

### **High Priority**
- [ ] Cast Climb game components
- [ ] Poster Pixels game components  
- [ ] Admin panel components
- [ ] Profile/settings pages

### **Medium Priority**
- [ ] Statistics pages
- [ ] Authentication forms
- [ ] Footer components
- [ ] Modal overlays

### **Low Priority**
- [ ] Loading states
- [ ] Error pages
- [ ] Celebration animations
- [ ] Legacy components

## Testing Strategy

### **Manual Testing**
1. Navigate to `/test-components` to test base components
2. Play each migrated game in light/dark modes
3. Test theme switching mid-game
4. Verify mobile responsiveness

### **Automated Testing**
1. Component screenshot testing (future)
2. Accessibility audit tools
3. Theme consistency validation
4. Performance impact measurement

## Performance Considerations

### **CSS Variable Impact**
- Minimal performance overhead
- Better maintainability
- Reduced bundle size from consolidated styles

### **Shadow Optimization**
- Use consistent shadow patterns
- Avoid complex gradient shadows
- Maintain hardware acceleration with `transform` properties

## Maintenance

### **Design Token Updates**
- Update CSS variables in `globals.css`
- Changes automatically propagate to all components
- Test in both themes after updates

### **New Component Creation**
- Always use design system tokens
- Follow established shadow patterns
- Include theme switching tests
- Document any new patterns

This migration guide ensures consistent application of the design system while preserving the unique game experiences that make cinamini special.