# AURELLE Design System

**Version**: 1.0.0
**Last Updated**: 2026-01-10
**Framework**: React + Tailwind CSS + shadcn/ui
**Status**: Production Ready ✅

---

## Table of Contents

1. [Design Tokens](#design-tokens)
   - [Colors](#colors)
   - [Typography](#typography)
   - [Spacing](#spacing)
   - [Border Radius](#border-radius)
   - [Shadows](#shadows)
   - [Transitions](#transitions)
2. [Component Library](#component-library)
3. [Usage Guidelines](#usage-guidelines)
4. [Figma Integration](#figma-integration)

---

## Design Tokens

Design tokens are the visual design atoms of the design system — specifically, they are named entities that store visual design attributes. We use them in place of hard-coded values to maintain consistency and enable theming.

### Colors

AURELLE uses a semantic color system based on HSL values, enabling seamless light/dark mode switching.

#### Brand Colors

**Primary** - Main brand color (Rose/Pink)
```css
Light Mode:  hsl(340, 85%, 45%)  /* #C81D60 - Deep Rose */
Dark Mode:   hsl(340, 75%, 55%)  /* #E84281 - Bright Rose */
Foreground:  hsl(340, 85%, 98%)  /* #FEF5F8 - Nearly White */
```

**Usage**: CTAs, links, brand elements, primary actions

---

#### Neutral Colors

**Background** - Page background
```css
Light Mode:  hsl(0, 0%, 100%)   /* #FFFFFF - Pure White */
Dark Mode:   hsl(0, 0%, 7%)     /* #121212 - Near Black */
```

**Foreground** - Primary text
```css
Light Mode:  hsl(0, 0%, 9%)     /* #171717 - Dark Gray */
Dark Mode:   hsl(0, 0%, 98%)    /* #FAFAFA - Off White */
```

**Border** - Default borders
```css
Light Mode:  hsl(0, 0%, 90%)    /* #E6E6E6 - Light Gray */
Dark Mode:   hsl(0, 0%, 16%)    /* #292929 - Dark Gray */
```

**Card** - Card backgrounds
```css
Light Mode:  hsl(0, 0%, 98%)    /* #FAFAFA - Off White */
Dark Mode:   hsl(0, 0%, 9%)     /* #171717 - Dark Gray */
```

**Muted** - Subtle backgrounds
```css
Light Mode:  hsl(0, 4%, 88%)    /* #E0E0E0 - Medium Gray */
Dark Mode:   hsl(0, 4%, 18%)    /* #2E2E2E - Charcoal */
```

**Muted Foreground** - Secondary text
```css
Light Mode:  hsl(0, 0%, 35%)    /* #595959 - Medium Gray */
Dark Mode:   hsl(0, 0%, 70%)    /* #B3B3B3 - Light Gray */
```

---

#### Semantic Colors

**Secondary** - Secondary actions
```css
Light Mode:  hsl(0, 0%, 91%)    /* #E8E8E8 */
Dark Mode:   hsl(0, 0%, 17%)    /* #2B2B2B */
```

**Accent** - Highlighted elements
```css
Light Mode:  hsl(340, 12%, 90%) /* #E8D9DF */
Dark Mode:   hsl(340, 10%, 16%) /* #2B2426 */
```

**Destructive** - Errors, deletion
```css
Light Mode:  hsl(0, 84%, 48%)   /* #E12626 - Bright Red */
Dark Mode:   hsl(0, 72%, 45%)   /* #C41E1E - Deep Red */
```

---

#### UI Element Colors

**Input** - Form inputs
```css
Light Mode:  hsl(0, 0%, 75%)    /* #BFBFBF */
Dark Mode:   hsl(0, 0%, 30%)    /* #4D4D4D */
```

**Ring** - Focus rings
```css
Light/Dark:  hsl(340, 85%, 45%) /* Same as Primary */
```

**Popover** - Dropdown backgrounds
```css
Light Mode:  hsl(0, 0%, 95%)    /* #F2F2F2 */
Dark Mode:   hsl(0, 0%, 13%)    /* #212121 */
```

---

#### Chart Colors

For data visualization:

```css
Chart 1:  hsl(340, 70%, 40%)  /* Rose */
Chart 2:  hsl(320, 65%, 45%)  /* Magenta */
Chart 3:  hsl(300, 60%, 50%)  /* Purple */
Chart 4:  hsl(280, 55%, 55%)  /* Violet */
Chart 5:  hsl(260, 50%, 50%)  /* Indigo */
```

---

#### Status Colors

For user status indicators:

```css
Online:   rgb(34, 197, 94)   /* Green-500 */
Away:     rgb(245, 158, 11)  /* Amber-500 */
Busy:     rgb(239, 68, 68)   /* Red-500 */
Offline:  rgb(156, 163, 175) /* Gray-400 */
```

---

### Typography

AURELLE uses a three-font system for hierarchy and readability.

#### Font Families

**Sans-Serif** (Primary) - Inter
```css
--font-sans: 'Inter', sans-serif;
```
**Usage**: Body text, UI elements, buttons, forms

**Serif** (Display) - Cormorant Garamond
```css
--font-serif: 'Cormorant Garamond', Georgia, serif;
```
**Usage**: Headings, brand elements, elegance

**Monospace** (Code) - Menlo
```css
--font-mono: Menlo, Monaco, 'Courier New', monospace;
```
**Usage**: Code, technical content, logs

---

#### Font Sizes (Tailwind Scale)

| Class | Size | Line Height | Usage |
|-------|------|-------------|-------|
| `text-xs` | 12px | 16px | Captions, labels |
| `text-sm` | 14px | 20px | Small text, metadata |
| `text-base` | 16px | 24px | Body text (default) |
| `text-lg` | 18px | 28px | Large body, subheadings |
| `text-xl` | 20px | 28px | Small headings |
| `text-2xl` | 24px | 32px | Section headings |
| `text-3xl` | 30px | 36px | Page titles |
| `text-4xl` | 36px | 40px | Hero headings |
| `text-5xl` | 48px | 1 | Display text |

---

#### Font Weights

| Class | Weight | Usage |
|-------|--------|-------|
| `font-normal` | 400 | Body text |
| `font-medium` | 500 | Emphasis, buttons |
| `font-semibold` | 600 | Headings, strong emphasis |
| `font-bold` | 700 | Extra emphasis |

---

#### Letter Spacing

```css
--tracking-normal: 0em;  /* Default tracking */
```

Use Tailwind's `tracking-*` utilities:
- `tracking-tight`: -0.025em (headings)
- `tracking-normal`: 0em (body)
- `tracking-wide`: 0.025em (labels)

---

### Spacing

AURELLE uses a consistent 4px base spacing scale.

#### Spacing Scale

| Token | Value | Pixels | Usage |
|-------|-------|--------|-------|
| `0` | 0 | 0px | No spacing |
| `0.5` | 0.125rem | 2px | Hairline spacing |
| `1` | 0.25rem | 4px | Minimal spacing |
| `2` | 0.5rem | 8px | Small spacing |
| `3` | 0.75rem | 12px | Medium-small |
| `4` | 1rem | 16px | Base spacing |
| `5` | 1.25rem | 20px | Medium |
| `6` | 1.5rem | 24px | Large |
| `8` | 2rem | 32px | Extra large |
| `10` | 2.5rem | 40px | Section spacing |
| `12` | 3rem | 48px | Major sections |
| `16` | 4rem | 64px | Hero spacing |
| `20` | 5rem | 80px | Extra spacing |
| `24` | 6rem | 96px | Maximum |

**Base Spacing Variable**:
```css
--spacing: 0.25rem;  /* 4px base unit */
```

---

### Border Radius

Soft, rounded corners for a modern feel.

```css
--radius: 0.5rem;  /* 8px - Default radius */
```

#### Border Radius Scale

| Class | Value | Pixels | Usage |
|-------|-------|--------|-------|
| `rounded-sm` | 0.1875rem | 3px | Small elements |
| `rounded` | 0.25rem | 4px | Default |
| `rounded-md` | 0.375rem | 6px | Cards, inputs |
| `rounded-lg` | 0.5625rem | 9px | Buttons, modals |
| `rounded-xl` | 0.75rem | 12px | Large cards |
| `rounded-2xl` | 1rem | 16px | Hero elements |
| `rounded-full` | 9999px | Full | Pills, avatars |

**Custom radii** (defined in config):
- `sm`: 3px
- `md`: 6px
- `lg`: 9px

---

### Shadows

AURELLE uses minimal, flat shadows (currently disabled for flat design aesthetic).

```css
/* Shadows are set to 0 for flat design */
--shadow-sm: 0px 2px 0px 0px hsl(0 0% 0% / 0.00);
--shadow: 0px 2px 0px 0px hsl(0 0% 0% / 0.00);
--shadow-md: 0px 2px 0px 0px hsl(0 0% 0% / 0.00);
--shadow-lg: 0px 2px 0px 0px hsl(0 0% 0% / 0.00);
--shadow-xl: 0px 2px 0px 0px hsl(0 0% 0% / 0.00);
```

**If shadows are needed in future**:
```css
/* Example non-flat shadows */
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
--shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
```

---

### Transitions

Smooth, consistent animations for better UX.

#### Durations

| Duration | Value | Usage |
|----------|-------|-------|
| Fast | 150ms | Hover states, small UI |
| Normal | 200ms | Most transitions |
| Slow | 300ms | Modals, large elements |
| Slower | 500ms | Page transitions |

#### Easing Functions

| Easing | Value | Usage |
|--------|-------|-------|
| `ease-in` | cubic-bezier(0.4, 0, 1, 1) | Accelerating |
| `ease-out` | cubic-bezier(0, 0, 0.2, 1) | Decelerating (default) |
| `ease-in-out` | cubic-bezier(0.4, 0, 0.2, 1) | Smooth start & end |

**Common Transitions**:
```css
/* Opacity fade */
transition: opacity 300ms ease-out;

/* Transform scale */
transition: transform 200ms ease-out;

/* Background color */
transition: background-color 200ms ease-out;

/* All properties */
transition: all 200ms ease-out;
```

---

## Component Library

AURELLE uses **shadcn/ui** - a collection of re-usable components built with Radix UI and Tailwind CSS.

### Component Categories

#### 1. Buttons & Actions

**Button** (`button.tsx`)
- Variants: `default`, `destructive`, `outline`, `secondary`, `ghost`, `link`
- Sizes: `default`, `sm`, `lg`, `icon`

**Toggle** (`toggle.tsx`)
- Binary state toggle button

**Toggle Group** (`toggle-group.tsx`)
- Multiple toggle options

---

#### 2. Forms & Inputs

**Input** (`input.tsx`)
- Text, email, password, number, etc.

**Textarea** (`textarea.tsx`)
- Multi-line text input

**Select** (`select.tsx`)
- Dropdown select with search

**Checkbox** (`checkbox.tsx`)
- Binary selection

**Radio Group** (`radio-group.tsx`)
- Single selection from multiple options

**Switch** (`switch.tsx`)
- Toggle switch (on/off)

**Slider** (`slider.tsx`)
- Numeric range input

**Label** (`label.tsx`)
- Form field labels

**Form** (`form.tsx`)
- Form wrapper with validation (React Hook Form)

**Input OTP** (`input-otp.tsx`)
- One-time password input

---

#### 3. Data Display

**Card** (`card.tsx`)
- Content container with header, content, footer

**Table** (`table.tsx`)
- Tabular data display

**Badge** (`badge.tsx`)
- Status indicators, tags
- Variants: `default`, `secondary`, `destructive`, `outline`

**Avatar** (`avatar.tsx`)
- User profile images with fallback

**Skeleton** (`skeleton.tsx`)
- Loading placeholders

**Progress** (`progress.tsx`)
- Progress bar indicator

**Chart** (`chart.tsx`)
- Data visualization (Recharts wrapper)

---

#### 4. Overlays & Modals

**Dialog** (`dialog.tsx`)
- Modal dialogs with backdrop

**Alert Dialog** (`alert-dialog.tsx`)
- Confirmation dialogs

**Sheet** (`sheet.tsx`)
- Slide-out panels (side drawer)

**Drawer** (`drawer.tsx`)
- Bottom drawer (mobile-friendly)

**Popover** (`popover.tsx`)
- Floating content

**Hover Card** (`hover-card.tsx`)
- Preview on hover

**Tooltip** (`tooltip.tsx`)
- Info on hover

**Context Menu** (`context-menu.tsx`)
- Right-click menu

**Dropdown Menu** (`dropdown-menu.tsx`)
- Action menus

**Command** (`command.tsx`)
- Command palette (⌘K)

**Menubar** (`menubar.tsx`)
- Application menu bar

---

#### 5. Navigation

**Tabs** (`tabs.tsx`)
- Tab navigation

**Accordion** (`accordion.tsx`)
- Collapsible sections

**Collapsible** (`collapsible.tsx`)
- Expandable content

**Navigation Menu** (`navigation-menu.tsx`)
- Main site navigation

**Breadcrumb** (`breadcrumb.tsx`)
- Hierarchical navigation

**Pagination** (`pagination.tsx`)
- Page number navigation

**Sidebar** (`sidebar.tsx`)
- App sidebar navigation

---

#### 6. Feedback

**Toast** (`toast.tsx`, `toaster.tsx`)
- Non-blocking notifications

**Alert** (`alert.tsx`)
- Inline alerts
- Variants: `default`, `destructive`

---

#### 7. Layout

**Separator** (`separator.tsx`)
- Visual divider

**Scroll Area** (`scroll-area.tsx`)
- Custom scrollbar

**Aspect Ratio** (`aspect-ratio.tsx`)
- Maintain aspect ratio

**Resizable** (`resizable.tsx`)
- Resizable panels

**Carousel** (`carousel.tsx`)
- Image/content carousel

**Calendar** (`calendar.tsx`)
- Date picker

---

### Complete Component List

Total: **41 Components**

1. Accordion
2. Alert
3. Alert Dialog
4. Aspect Ratio
5. Avatar
6. Badge
7. Breadcrumb
8. Button
9. Calendar
10. Card
11. Carousel
12. Chart
13. Checkbox
14. Collapsible
15. Command
16. Context Menu
17. Dialog
18. Drawer
19. Dropdown Menu
20. Form
21. Hover Card
22. Input
23. Input OTP
24. Label
25. Menubar
26. Navigation Menu
27. Pagination
28. Popover
29. Progress
30. Radio Group
31. Resizable
32. Scroll Area
33. Select
34. Separator
35. Sheet
36. Sidebar
37. Skeleton
38. Slider
39. Switch
40. Table
41. Tabs
42. Textarea
43. Toast/Toaster
44. Toggle
45. Toggle Group
46. Tooltip

---

## Usage Guidelines

### Color Usage

**Primary Color** - Use sparingly for:
- Primary CTAs
- Important links
- Brand moments
- Focus states

**DO**: Use primary for "Book Now", "Sign Up", "Submit"
**DON'T**: Use primary for backgrounds or large areas

**Secondary Color** - Use for:
- Secondary actions
- Subtle buttons
- Hover states

**Destructive Color** - Use only for:
- Delete actions
- Error states
- Warnings

---

### Typography Guidelines

**Headings**:
- Use `font-serif` for elegant, display headings
- Use `font-sans` for UI, sub-headings
- Maintain hierarchy: h1 > h2 > h3

**Body Text**:
- Always use `font-sans`
- Default size: `text-base` (16px)
- Line height: At least 1.5 for readability

**Labels & Metadata**:
- Use `text-sm` (14px) or `text-xs` (12px)
- `font-medium` for emphasis
- `text-muted-foreground` for color

---

### Spacing Guidelines

**Consistent Spacing**:
- Use multiples of 4px (`1`, `2`, `3`, `4`, `6`, `8`, `12`, `16`)
- Inner padding: Usually 4 or 6 (16px or 24px)
- Outer margins: Usually 6 or 8 (24px or 32px)

**Component Spacing**:
```tsx
// Card with consistent spacing
<Card className="p-6">  {/* 24px padding */}
  <h3 className="mb-2">Title</h3>  {/* 8px bottom margin */}
  <p className="text-muted-foreground">Content</p>
</Card>
```

---

### Component Best Practices

**Buttons**:
```tsx
// Primary action
<Button variant="default">Submit</Button>

// Secondary action
<Button variant="outline">Cancel</Button>

// Dangerous action
<Button variant="destructive">Delete</Button>

// Minimal action
<Button variant="ghost">Close</Button>
```

**Cards**:
```tsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Subtitle</CardDescription>
  </CardHeader>
  <CardContent>
    Main content here
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

**Forms**:
```tsx
<Form {...form}>
  <FormField
    control={form.control}
    name="email"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Email</FormLabel>
        <FormControl>
          <Input placeholder="you@example.com" {...field} />
        </FormControl>
        <FormDescription>We'll never share your email.</FormDescription>
        <FormMessage />
      </FormItem>
    )}
  />
</Form>
```

---

## Figma Integration

### Preparing Design System for Figma

#### Step 1: Set Up Color Styles

Create color styles in Figma matching our tokens:

**Light Mode Colors**:
1. Background → `#FFFFFF`
2. Foreground → `#171717`
3. Primary → `#C81D60`
4. Primary Foreground → `#FEF5F8`
5. Secondary → `#E8E8E8`
6. Muted → `#E0E0E0`
7. Muted Foreground → `#595959`
8. Destructive → `#E12626`
9. Border → `#E6E6E6`
10. Input → `#BFBFBF`
11. Ring → `#C81D60`

**Dark Mode Colors**:
1. Background → `#121212`
2. Foreground → `#FAFAFA`
3. Primary → `#E84281`
(... same structure as light mode)

---

#### Step 2: Set Up Text Styles

Create text styles matching our typography:

**Sans-Serif (Inter)**:
- Heading 1: 48px/1.2, Semibold
- Heading 2: 36px/1.2, Semibold
- Heading 3: 30px/1.2, Semibold
- Heading 4: 24px/1.3, Semibold
- Body Large: 18px/1.56, Normal
- Body: 16px/1.5, Normal
- Body Small: 14px/1.43, Normal
- Caption: 12px/1.33, Normal

**Serif (Cormorant Garamond)**:
- Display 1: 48px/1.2, Semibold
- Display 2: 36px/1.2, Semibold
- Display 3: 30px/1.2, Semibold

---

#### Step 3: Set Up Effects (Shadows)

Currently flat design (no shadows), but prepare for future:

- Shadow SM: Y:1, Blur:2, Color:#000 @ 5%
- Shadow MD: Y:4, Blur:6, Color:#000 @ 10%
- Shadow LG: Y:10, Blur:15, Color:#000 @ 10%
- Shadow XL: Y:20, Blur:25, Color:#000 @ 10%

---

#### Step 4: Create Component Library

**Button Components**:
- Master: Base button (all variants)
- Variants: Default, Outline, Secondary, Ghost, Destructive, Link
- States: Default, Hover, Active, Disabled, Focus
- Sizes: Default (40px), Small (32px), Large (48px), Icon (40x40)

**Input Components**:
- Master: Base input
- States: Default, Focus, Error, Disabled
- Types: Text, Password, Email, Number

**Card Components**:
- Master: Base card
- Variants: Default, Elevated (if shadows added)
- Sections: Header, Content, Footer

... (Continue for all 41 components)

---

#### Step 5: Auto Layout & Constraints

All components should use:
- **Auto Layout** for flexible spacing
- **Constraints** for responsive behavior
- **Component Properties** for variants

**Example Button Auto Layout**:
```
- Direction: Horizontal
- Padding: 16px horizontal, 12px vertical
- Gap: 8px
- Hug contents: Horizontal
- Fixed height: 40px
```

---

### Figma File Structure

```
📁 AURELLE Design System v1.0
  📄 Cover Page
  📄 📚 Design Tokens
    - Colors (Light Mode)
    - Colors (Dark Mode)
    - Typography
    - Spacing Scale
    - Border Radius
  📄 🎨 Components
    - Buttons
    - Forms
    - Cards
    - Navigation
    - Overlays
    - Data Display
  📄 📱 Patterns
    - Login Form
    - Salon Card
    - Booking Calendar
    - User Profile
  📄 📄 Templates
    - Homepage
    - Salon Detail
    - User Dashboard
```

---

### Exporting from Figma

**For Developers**:
- Export components as SVG
- Use "Inspect" panel for CSS values
- Copy color hex codes
- Measure spacing in 4px increments

**For Handoff**:
- Use Figma Dev Mode
- Generate CSS/Tailwind code
- Ensure component names match codebase

---

## Design System Maintenance

### Versioning

Follow semantic versioning:
- **Major** (1.0.0): Breaking changes
- **Minor** (0.1.0): New features, components
- **Patch** (0.0.1): Bug fixes, tweaks

### Change Log

**v1.0.0** (2026-01-10)
- ✅ Initial design system documentation
- ✅ 41 components cataloged
- ✅ Color tokens (light/dark mode)
- ✅ Typography system
- ✅ Spacing scale
- ✅ Figma integration guide

---

## Resources

**Code Implementation**:
- `client/src/index.css` - CSS variables
- `tailwind.config.ts` - Tailwind configuration
- `client/src/components/ui/` - Component library

**Documentation**:
- [shadcn/ui](https://ui.shadcn.com/) - Component documentation
- [Tailwind CSS](https://tailwindcss.com/) - Utility classes
- [Radix UI](https://radix-ui.com/) - Primitive components

**Design Tools**:
- Figma - Design files
- ColorSlurp - Color picker
- WhatFont - Font identifier

---

## Conclusion

The AURELLE Design System provides a comprehensive, consistent foundation for building beautiful, accessible interfaces. All components are production-ready and follow best practices for performance, accessibility, and user experience.

**Ready for Figma**: Use this documentation to create a matching Figma library.

**For Designers**: Reference this for accurate implementation specs.

**For Developers**: All tokens and components are already implemented in code.

---

**Design System Status**: ✅ **Production Ready**

**Next Steps**:
1. Create Figma library based on this documentation
2. Add component usage examples
3. Create design patterns library
4. Document common layouts

---

*This design system is living documentation and should be updated as the product evolves.*
