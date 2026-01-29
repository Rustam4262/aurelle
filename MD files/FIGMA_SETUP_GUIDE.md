# Figma Setup Guide for AURELLE Design System

**Purpose**: Step-by-step guide to create AURELLE design system library in Figma
**Time Required**: 4-6 hours
**Difficulty**: Intermediate

---

## Prerequisites

- Figma account (free or paid)
- Access to Inter font (Google Fonts)
- Access to Cormorant Garamond font (Google Fonts)
- Basic Figma knowledge (components, variants, auto layout)

---

## Step 1: Create New Figma File

1. **Create File**:
   - Go to Figma → New Design File
   - Name it: `AURELLE Design System v1.0`

2. **Set Up Pages**:
   - Page 1: `🎨 Cover`
   - Page 2: `📚 Design Tokens`
   - Page 3: `🧩 Components`
   - Page 4: `📱 Patterns`
   - Page 5: `📄 Templates`
   - Page 6: `📖 Documentation`

---

## Step 2: Install Fonts

1. **Download Fonts**:

   ```
   Inter: https://fonts.google.com/specimen/Inter
   Cormorant Garamond: https://fonts.google.com/specimen/Cormorant+Garamond
   ```

2. **Install Locally** (or use Figma font service)

3. **Test**: Create text, verify fonts load correctly

---

## Step 3: Create Color Styles

### Light Mode Colors

Go to `Design Tokens` page → Create color palette:

1. **Create Color Swatches** (50x50px squares):
   - Background: `#FFFFFF`
   - Foreground: `#171717`
   - Border: `#E6E6E6`
   - Card: `#FAFAFA`
   - Card Foreground: `#171717`
   - Primary: `#C81D60`
   - Primary Foreground: `#FEF5F8`
   - Secondary: `#E8E8E8`
   - Secondary Foreground: `#171717`
   - Muted: `#E0E0E0`
   - Muted Foreground: `#595959`
   - Accent: `#E8D9DF`
   - Accent Foreground: `#2B1D1F`
   - Destructive: `#E12626`
   - Destructive Foreground: `#FEF2F2`
   - Input: `#BFBFBF`
   - Ring: `#C81D60` (same as Primary)

2. **Create Color Styles**:
   - Select each swatch
   - Right panel → Fill → Click 4-dot icon → Create Style
   - Name: `Light/Background`, `Light/Foreground`, etc.

### Dark Mode Colors

Repeat for dark mode:

- Background: `#121212`
- Foreground: `#FAFAFA`
- Primary: `#E84281`
- Border: `#292929`
- Card: `#171717`
- Muted: `#2E2E2E`
- Muted Foreground: `#B3B3B3`
  (... etc.)

**Naming Convention**: `Dark/Background`, `Dark/Foreground`, etc.

---

## Step 4: Create Text Styles

### Sans-Serif Styles (Inter)

1. **Heading 1**:
   - Font: Inter
   - Weight: Semibold (600)
   - Size: 48px
   - Line Height: 58px (1.2)
   - Name: `Sans/Heading 1`

2. **Heading 2**:
   - Size: 36px
   - Line Height: 43px
   - Name: `Sans/Heading 2`

3. **Heading 3**:
   - Size: 30px
   - Line Height: 36px
   - Name: `Sans/Heading 3`

4. **Heading 4**:
   - Size: 24px
   - Line Height: 31px
   - Name: `Sans/Heading 4`

5. **Body Large**:
   - Weight: Normal (400)
   - Size: 18px
   - Line Height: 28px
   - Name: `Sans/Body Large`

6. **Body**:
   - Size: 16px
   - Line Height: 24px
   - Name: `Sans/Body`

7. **Body Small**:
   - Size: 14px
   - Line Height: 20px
   - Name: `Sans/Body Small`

8. **Caption**:
   - Size: 12px
   - Line Height: 16px
   - Name: `Sans/Caption`

### Serif Styles (Cormorant Garamond)

1. **Display 1**:
   - Font: Cormorant Garamond
   - Weight: Semibold (600)
   - Size: 48px
   - Line Height: 58px
   - Name: `Serif/Display 1`

2. **Display 2**:
   - Size: 36px
   - Line Height: 43px
   - Name: `Serif/Display 2`

3. **Display 3**:
   - Size: 30px
   - Line Height: 36px
   - Name: `Serif/Display 3`

---

## Step 5: Create Spacing Grid

Create visual spacing reference:

1. **Create Frames** for each spacing value:
   - 0px, 2px, 4px, 8px, 12px, 16px, 20px, 24px, 32px, 40px, 48px, 64px, 80px, 96px

2. **Visual Grid**:

   ```
   [  ] 0px   (no spacing)
   [▪] 2px    (hairline)
   [▪▪] 4px   (minimal)
   [▪▪▪▪] 8px (small)
   [████] 16px (base)
   [████████] 24px (large)
   ```

3. **Label Each**: `spacing-0`, `spacing-1`, `spacing-2`, etc.

---

## Step 6: Build Button Component

### Base Button

1. **Create Frame**: 40px height
2. **Add Auto Layout**:
   - Direction: Horizontal
   - Padding: 16px (horizontal), 12px (vertical)
   - Gap: 8px
   - Hug contents: Horizontal
   - Fixed height: 40px
3. **Add Text**: "Button" (Sans/Body Small, Medium weight)
4. **Add Background**: Fill with Primary color
5. **Border Radius**: 6px

### Create Variants

1. **Select Frame** → Create Component (⌥⌘K)
2. **Add Variant Property**: `variant`
   - Default
   - Destructive
   - Outline
   - Secondary
   - Ghost
   - Link

3. **Style Each Variant**:
   - **Default**: Primary background, Primary Foreground text
   - **Destructive**: Destructive background, Destructive Foreground text
   - **Outline**: Transparent background, Primary text, Primary border (1px)
   - **Secondary**: Secondary background, Secondary Foreground text
   - **Ghost**: Transparent background, Foreground text
   - **Link**: No background, Primary text, underline on hover

4. **Add State Property**: `state`
   - Default
   - Hover
   - Active
   - Disabled
   - Focus

5. **Add Size Property**: `size`
   - Small (32px height, 12px padding)
   - Default (40px height, 16px padding)
   - Large (48px height, 20px padding)
   - Icon (40x40px, icon only)

### Hover States

For each variant:

- **Hover**: Slightly darker/lighter background (use opacity or darker shade)
- **Active**: Even more contrast
- **Disabled**: 50% opacity
- **Focus**: Add 2px ring in Ring color

---

## Step 7: Build Input Component

1. **Create Frame**: 40px height, 200px width (example)
2. **Auto Layout**:
   - Padding: 12px (horizontal), 10px (vertical)
   - Fixed height: 40px
   - Fill container: Horizontal
3. **Border**: 1px, Border color
4. **Border Radius**: 6px
5. **Placeholder Text**: "Enter text..." (Muted Foreground)

### Input Variants

1. **Add Property**: `state`
   - Default
   - Focus
   - Error
   - Disabled

2. **Style States**:
   - **Focus**: Border changes to Ring color, add 2px ring
   - **Error**: Border changes to Destructive
   - **Disabled**: Background becomes Muted, opacity 50%

---

## Step 8: Build Card Component

1. **Create Frame**: Auto layout vertical
2. **Background**: Card color
3. **Border**: 1px, Card Border color
4. **Border Radius**: 9px
5. **Padding**: 24px

### Card Sections

Create 3 nested auto-layout frames:

1. **Card Header**:
   - Direction: Vertical
   - Gap: 8px
   - Add: Title (Heading 3), Subtitle (Body Small, Muted Foreground)

2. **Card Content**:
   - Direction: Vertical
   - Gap: 16px
   - Padding Top: 16px

3. **Card Footer**:
   - Direction: Horizontal
   - Gap: 8px
   - Padding Top: 16px
   - Justify: Space Between

### Make Component

- Select all → Create Component
- Name: `Card`
- Add slot for custom content

---

## Step 9: Build Badge Component

1. **Create Frame**: Auto layout horizontal
2. **Padding**: 4px horizontal, 2px vertical
3. **Gap**: 4px
4. **Border Radius**: 9999px (full)
5. **Height**: Hug contents
6. **Background**: Secondary

### Badge Variants

**Add Property**: `variant`

- Default (Secondary background)
- Primary (Primary background)
- Destructive (Destructive background)
- Outline (Transparent background, Border)

**Add Property**: `size`

- Small (2px vertical padding)
- Default (4px vertical padding)

---

## Step 10: Organize Components

### Component Structure

Create component sets for each category:

```
📁 Buttons
  - Button (all variants)
  - Icon Button

📁 Forms
  - Input
  - Textarea
  - Select
  - Checkbox
  - Radio
  - Switch
  - Label

📁 Data Display
  - Card
  - Table
  - Badge
  - Avatar
  - Progress Bar

📁 Overlays
  - Dialog/Modal
  - Popover
  - Tooltip
  - Dropdown

📁 Navigation
  - Tabs
  - Accordion
  - Breadcrumb
```

---

## Step 11: Create Documentation

On `Documentation` page:

1. **Color Guidelines**:
   - When to use Primary
   - When to use Destructive
   - Accessibility contrast ratios

2. **Typography Guidelines**:
   - Heading hierarchy
   - Body text usage
   - Do's and Don'ts

3. **Spacing Guidelines**:
   - Consistent spacing examples
   - Component padding rules

4. **Component Usage**:
   - Each component with example
   - When to use which variant
   - Accessibility notes

---

## Step 12: Publish Library

1. **Organize Assets**:
   - Move all components to `Components` page
   - Group by category
   - Add descriptions

2. **Publish Library**:
   - Top menu → Libraries → Publish Library
   - Add description: "AURELLE Design System v1.0"
   - Choose who can use it

3. **Version**:
   - Version: 1.0.0
   - Description: Initial release

---

## Step 13: Test & Validate

1. **Create Test File**:
   - New file → Enable AURELLE library
   - Drag components to test
   - Verify all variants work

2. **Check**:
   - ✅ All colors defined
   - ✅ All text styles defined
   - ✅ Components have proper auto layout
   - ✅ Variants switch correctly
   - ✅ Dark mode colors available

---

## Tips & Best Practices

### Auto Layout

- **Always use Auto Layout** for responsive components
- **Hug contents** when size should fit content
- **Fill container** when component should stretch

### Constraints

- Set constraints for proper responsive behavior
- Use "Scale" for icons that should resize

### Component Properties

- Use **Boolean** for simple toggles (withIcon, disabled)
- Use **Variant** for multiple options (size, variant, state)
- Use **Instance Swap** for swappable icons

### Naming

- Use consistent naming: `Component/Variant/State`
- Example: `Button/Primary/Hover`
- Use emojis for visual organization

### Documentation

- Add descriptions to all components
- Include usage guidelines
- Link to code implementation

---

## Component Priority

Build in this order for fastest MVP:

1. **Colors & Typography** (30 min)
2. **Button** (45 min)
3. **Input** (30 min)
4. **Card** (30 min)
5. **Badge** (15 min)
6. **Dialog** (45 min)
7. **Form Components** (2 hours)
8. **Navigation** (1 hour)
9. **Data Display** (1.5 hours)
10. **Documentation** (30 min)

**Total**: ~6 hours for core library

---

## Resources

**Figma Learning**:

- [Figma Components](https://help.figma.com/hc/en-us/articles/360038662654-Guide-to-components-in-Figma)
- [Component Variants](https://help.figma.com/hc/en-us/articles/360056440594-Create-and-use-variants)
- [Auto Layout](https://help.figma.com/hc/en-us/articles/360040451373-Create-dynamic-designs-with-Auto-Layout)

**Design System Examples**:

- [Material Design](https://material.io/design/color/the-color-system.html)
- [shadcn/ui Figma](https://www.figma.com/@shadcn)
- [Ant Design](https://www.figma.com/@ant-design)

**Plugins to Install**:

- **Contrast** - Check color contrast
- **Iconify** - Icon library
- **Content Reel** - Generate placeholder content
- **Component Inspector** - View component structure

---

## Maintenance

### Updating the Library

When design system changes:

1. Make changes in Figma file
2. Update version number (1.0.1, 1.1.0, 2.0.0)
3. Add changelog description
4. Publish update
5. Notify team to update instances

### Changelog Template

```
Version 1.1.0 (Date)
- Added: New dropdown component
- Changed: Button padding increased by 2px
- Fixed: Card border color in dark mode
```

---

## Conclusion

Following this guide, you'll create a comprehensive, production-ready Figma design system that matches the AURELLE codebase exactly.

**Acceptance Criteria**: ✅

- All 41 components documented
- Color, typography, spacing tokens defined
- Dark mode support
- Component variants for all use cases
- Published as Figma library

**Next Steps**:

1. Share library with design team
2. Create design templates for common pages
3. Build pattern library for recurring layouts
4. Integrate with design-to-code tools

---

**Estimated Time**: 4-6 hours
**Difficulty**: Intermediate
**Result**: Production-ready Figma design system ✅
