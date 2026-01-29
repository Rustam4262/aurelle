# AURELLE Iconography & Illustrations Guide

**Task**: P2 #36 - Иконография и иллюстрации
**Status**: Complete Specification
**Date**: 2026-01-10
**Version**: 1.0

---

## Executive Summary

This document provides a comprehensive iconography and illustration system for AURELLE, enhancing visual appeal and professionalism across the platform. The guide covers custom service category icons, empty/error state illustrations, onboarding graphics, and hero section imagery.

**Goals**:

- Create cohesive visual language
- Improve user experience through clear iconography
- Add personality with custom illustrations
- Maintain accessibility (WCAG 2.1 AA)
- Ensure brand consistency

---

## Current Icon System Analysis

### Lucide React Icon Library

**Status**: ✅ Already Integrated

**Package**: `lucide-react` v0.453.0 (confirmed in [package.json:66](package.json#L66))

**Current Usage**: 56 files using Lucide icons

**Most Used Icons**:

- `Star` - Ratings (13 files)
- `Calendar` / `CalendarDays` - Booking, scheduling (9 files)
- `User` / `Users` - Profiles, clients (8 files)
- `Clock` - Duration, time slots (7 files)
- `MapPin` - Location (6 files)
- `Scissors` - Hair services (5 files)
- `Heart` - Favorites, nails category (4 files)
- `Loader2` - Loading states (3 files)

**Icon Categories in Use**:

```
Navigation: ChevronRight, ChevronDown, ChevronLeft, Menu, X
Actions: Upload, Download, Copy, ExternalLink, RefreshCcw, Edit, Trash2
Status: CheckCircle2, XCircle, AlertCircle, AlertTriangle
Communication: MessageCircle, Bell, BellOff
Business: Store, DollarSign, TrendingUp, BarChart3
Services: Scissors, Heart, Sparkles
```

**Assessment**: ✅ Good foundation, but needs custom service category icons for better brand identity.

---

## Service Category Icons

### Current Implementation ([home.tsx:45-51](client/src/pages/home.tsx#L45-L51))

```typescript
const categories = [
  { id: "all", icon: Sparkles, labelKey: "marketplace.categories.all" },
  { id: "hair", icon: Scissors, labelKey: "marketplace.categories.hair" },
  { id: "nails", icon: Heart, labelKey: "marketplace.categories.nails" }, // ❌ Generic
  { id: "spa", icon: Sparkles, labelKey: "marketplace.categories.spa" }, // ❌ Duplicate
  { id: "makeup", icon: Heart, labelKey: "marketplace.categories.makeup" }, // ❌ Duplicate
];
```

**Problem**: Generic icons (Heart, Sparkles used multiple times), not service-specific.

---

### Custom Service Category Icon Set

#### Design Principles

1. **Recognizable**: Instantly convey service type
2. **Consistent**: Same line weight, corner radius, style
3. **Scalable**: Work at 16px-64px sizes
4. **Accessible**: Clear at small sizes, distinct shapes
5. **Brand-Aligned**: Match AURELLE aesthetic (elegant, modern, feminine)

#### Icon Specifications

**Technical Specs**:

- **Format**: SVG (inline React components)
- **Viewbox**: `0 0 24 24`
- **Stroke Width**: 2px (consistent with Lucide)
- **Stroke Cap**: `round`
- **Stroke Join**: `round`
- **Fill**: None (outline style, matches Lucide)
- **Colors**: Inherit from `currentColor` (theme-aware)

**Style**:

- Outline icons (not filled)
- 2px stroke weight
- Rounded corners
- Minimal detail (work at small sizes)
- Match Lucide React aesthetic

---

### Custom Icons to Create

#### 1. Haircut / Стрижка (`IconHaircut`)

**Concept**: Scissors cutting hair strands

**SVG Path Description**:

```svg
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <!-- Scissors handles (two circles) -->
  <circle cx="6" cy="6" r="3"/>
  <circle cx="6" cy="18" r="3"/>

  <!-- Scissors blades -->
  <path d="M 6 6 L 20 12 L 6 18"/>
  <path d="M 21 12 h 2"/>

  <!-- Hair strand indication -->
  <path d="M 20 10 Q 22 10 22 8" stroke-dasharray="2 2"/>
</svg>
```

**Alternative**: Use existing `Scissors` from Lucide (already perfect)

**Recommendation**: **Keep Lucide `Scissors`** ✅

---

#### 2. Hair Coloring / Окрашивание (`IconHairColor`)

**Concept**: Hair dye brush or color palette on hair

**SVG Path Description**:

```svg
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <!-- Brush handle -->
  <path d="M 12 4 V 12" stroke-linecap="round"/>

  <!-- Brush bristles -->
  <path d="M 9 12 L 9 16 Q 9 18 10.5 19 L 13.5 19 Q 15 18 15 16 L 15 12"/>

  <!-- Paint drops -->
  <circle cx="8" cy="8" r="1.5" fill="currentColor"/>
  <circle cx="16" cy="7" r="1.5" fill="currentColor"/>
  <circle cx="12" cy="6" r="1.5" fill="currentColor"/>
</svg>
```

**Alternative Icon**: Paint palette

```svg
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <!-- Palette shape -->
  <circle cx="12" cy="12" r="9"/>
  <circle cx="12" cy="12" r="2" fill="currentColor"/>

  <!-- Paint wells -->
  <circle cx="8" cy="8" r="1.5" fill="currentColor"/>
  <circle cx="16" cy="8" r="1.5" fill="currentColor"/>
  <circle cx="8" cy="16" r="1.5" fill="currentColor"/>
  <circle cx="16" cy="16" r="1.5" fill="currentColor"/>
</svg>
```

**Recommendation**: **Hair dye brush** (more specific to service)

---

#### 3. Manicure / Маникюр (`IconManicure`)

**Concept**: Hand with painted nails

**SVG Path Description**:

```svg
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <!-- Hand palm -->
  <path d="M 8 12 L 8 18 Q 8 20 10 20 L 14 20 Q 16 20 16 18 L 16 12"/>

  <!-- Fingers (simplified) -->
  <path d="M 9 12 L 9 6 Q 9 4 10 4 Q 11 4 11 6 L 11 10"/>
  <path d="M 11 10 L 11 5 Q 11 3 12 3 Q 13 3 13 5 L 13 10"/>
  <path d="M 13 10 L 13 6 Q 13 4 14 4 Q 15 4 15 6 L 15 12"/>

  <!-- Nail polish indicator -->
  <path d="M 10 4 L 10 3" stroke-width="3" stroke-linecap="round"/>
  <path d="M 12 3 L 12 2" stroke-width="3" stroke-linecap="round"/>
  <path d="M 14 4 L 14 3" stroke-width="3" stroke-linecap="round"/>
</svg>
```

**Simpler Alternative**: Nail polish bottle

```svg
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <!-- Bottle cap -->
  <rect x="10" y="4" width="4" height="3" rx="1"/>

  <!-- Bottle neck -->
  <path d="M 10.5 7 L 10 10 L 14 10 L 13.5 7"/>

  <!-- Bottle body -->
  <rect x="8" y="10" width="8" height="10" rx="2"/>

  <!-- Polish level -->
  <path d="M 9 14 L 15 14" stroke-width="6" opacity="0.3"/>

  <!-- Brush in liquid -->
  <path d="M 12 7 L 12 12" stroke-width="1"/>
</svg>
```

**Recommendation**: **Nail polish bottle** (clearer at small sizes)

---

#### 4. Pedicure / Педикюр (`IconPedicure`)

**Concept**: Foot with painted toenails

**SVG Path Description**:

```svg
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <!-- Foot outline (side view) -->
  <path d="M 18 16 Q 20 16 20 14 L 20 10 Q 20 8 18 8 L 10 8 Q 8 8 8 10 L 8 12 Q 6 12 6 14 Q 6 16 8 16 Z"/>

  <!-- Toes (simplified) -->
  <circle cx="18" cy="11" r="1.5"/>
  <circle cx="15" cy="10" r="1.5"/>
  <circle cx="12" cy="10" r="1.5"/>
  <circle cx="9" cy="11" r="1.5"/>

  <!-- Polish indicator on big toe -->
  <circle cx="18" cy="11" r="1" fill="currentColor"/>
</svg>
```

**Alternative**: Spa water basin with feet

```svg
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <!-- Basin -->
  <path d="M 4 14 L 4 18 Q 4 20 6 20 L 18 20 Q 20 20 20 18 L 20 14"/>
  <path d="M 4 14 Q 4 12 6 12 L 18 12 Q 20 12 20 14"/>

  <!-- Water level -->
  <path d="M 5 15 Q 7 16 9 15 T 13 15 T 17 15 T 19 15" stroke-dasharray="1 2"/>

  <!-- Feet -->
  <ellipse cx="9" cy="13" rx="2" ry="1" fill="currentColor" opacity="0.3"/>
  <ellipse cx="15" cy="13" rx="2" ry="1" fill="currentColor" opacity="0.3"/>
</svg>
```

**Recommendation**: **Spa basin** (more distinctive from manicure)

---

#### 5. Makeup / Макияж (`IconMakeup`)

**Concept**: Lipstick or makeup brush

**SVG Path Description (Lipstick)**:

```svg
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <!-- Lipstick tube -->
  <rect x="9" y="12" width="6" height="8" rx="1"/>

  <!-- Lipstick bullet -->
  <path d="M 9 12 L 9 8 Q 9 6 10.5 5 L 13.5 5 Q 15 6 15 8 L 15 12"/>

  <!-- Shine effect -->
  <path d="M 11 7 L 11 9" stroke-width="1" opacity="0.5"/>

  <!-- Decorative band -->
  <path d="M 9 14 L 15 14"/>
</svg>
```

**Alternative (Makeup Brush)**:

```svg
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <!-- Brush handle -->
  <path d="M 12 20 L 12 10" stroke-linecap="round"/>

  <!-- Ferrule (metal part) -->
  <path d="M 10.5 10 L 10 8 L 14 8 L 13.5 10"/>

  <!-- Brush hairs -->
  <path d="M 10 8 Q 10 5 12 4 Q 14 5 14 8"/>
  <path d="M 10.5 7 Q 11 5 12 4.5"/>
  <path d="M 13.5 7 Q 13 5 12 4.5"/>
</svg>
```

**Recommendation**: **Lipstick** (more iconic and recognizable)

---

#### 6. Massage / Массаж (`IconMassage`)

**Concept**: Hands massaging or lotus flower (spa symbol)

**SVG Path Description (Hands)**:

```svg
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <!-- Person's back/shoulders -->
  <path d="M 8 14 Q 8 12 12 12 Q 16 12 16 14 L 16 20 L 8 20 Z"/>

  <!-- Massaging hands -->
  <path d="M 6 8 Q 6 6 8 6 L 10 6 Q 10 8 10 10" stroke-linecap="round"/>
  <path d="M 18 8 Q 18 6 16 6 L 14 6 Q 14 8 14 10" stroke-linecap="round"/>

  <!-- Pressure points (dots) -->
  <circle cx="10" cy="14" r="0.8" fill="currentColor"/>
  <circle cx="14" cy="14" r="0.8" fill="currentColor"/>
  <circle cx="12" cy="16" r="0.8" fill="currentColor"/>
</svg>
```

**Alternative (Lotus Flower)**:

```svg
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <!-- Center -->
  <circle cx="12" cy="14" r="2"/>

  <!-- Petals (5 petals) -->
  <path d="M 12 12 Q 12 8 10 6 Q 12 8 12 12"/>
  <path d="M 12 12 Q 8 10 6 10 Q 10 10 12 12"/>
  <path d="M 12 12 Q 10 16 10 18 Q 12 16 12 12"/>
  <path d="M 12 12 Q 16 16 14 18 Q 14 14 12 12"/>
  <path d="M 12 12 Q 16 10 18 10 Q 14 10 12 12"/>
</svg>
```

**Recommendation**: **Hands massaging** (more descriptive)

---

### Icon Component Structure

**File**: `client/src/components/icons/service-icons.tsx`

```typescript
import React from "react";

interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  className?: string;
}

export const IconHairColor: React.FC<IconProps> = ({
  size = 24,
  className = "",
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M 12 4 V 12" />
    <path d="M 9 12 L 9 16 Q 9 18 10.5 19 L 13.5 19 Q 15 18 15 16 L 15 12" />
    <circle cx="8" cy="8" r="1.5" fill="currentColor" />
    <circle cx="16" cy="7" r="1.5" fill="currentColor" />
    <circle cx="12" cy="6" r="1.5" fill="currentColor" />
  </svg>
);

export const IconManicure: React.FC<IconProps> = ({
  size = 24,
  className = "",
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <rect x="10" y="4" width="4" height="3" rx="1" />
    <path d="M 10.5 7 L 10 10 L 14 10 L 13.5 7" />
    <rect x="8" y="10" width="8" height="10" rx="2" />
    <path d="M 9 14 L 15 14" strokeWidth={6} opacity="0.3" />
    <path d="M 12 7 L 12 12" strokeWidth={1} />
  </svg>
);

export const IconPedicure: React.FC<IconProps> = ({
  size = 24,
  className = "",
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M 4 14 L 4 18 Q 4 20 6 20 L 18 20 Q 20 20 20 18 L 20 14" />
    <path d="M 4 14 Q 4 12 6 12 L 18 12 Q 20 12 20 14" />
    <path d="M 5 15 Q 7 16 9 15 T 13 15 T 17 15 T 19 15" strokeDasharray="1 2" />
    <ellipse cx="9" cy="13" rx="2" ry="1" fill="currentColor" opacity="0.3" />
    <ellipse cx="15" cy="13" rx="2" ry="1" fill="currentColor" opacity="0.3" />
  </svg>
);

export const IconMakeup: React.FC<IconProps> = ({
  size = 24,
  className = "",
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <rect x="9" y="12" width="6" height="8" rx="1" />
    <path d="M 9 12 L 9 8 Q 9 6 10.5 5 L 13.5 5 Q 15 6 15 8 L 15 12" />
    <path d="M 11 7 L 11 9" strokeWidth={1} opacity="0.5" />
    <path d="M 9 14 L 15 14" />
  </svg>
);

export const IconMassage: React.FC<IconProps> = ({
  size = 24,
  className = "",
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M 8 14 Q 8 12 12 12 Q 16 12 16 14 L 16 20 L 8 20 Z" />
    <path d="M 6 8 Q 6 6 8 6 L 10 6 Q 10 8 10 10" />
    <path d="M 18 8 Q 18 6 16 6 L 14 6 Q 14 8 14 10" />
    <circle cx="10" cy="14" r="0.8" fill="currentColor" />
    <circle cx="14" cy="14" r="0.8" fill="currentColor" />
    <circle cx="12" cy="16" r="0.8" fill="currentColor" />
  </svg>
);

export const IconSpa: React.FC<IconProps> = ({
  size = 24,
  className = "",
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    {/* Lotus flower for spa */}
    <circle cx="12" cy="14" r="2" />
    <path d="M 12 12 Q 12 8 10 6 Q 12 8 12 12" />
    <path d="M 12 12 Q 8 10 6 10 Q 10 10 12 12" />
    <path d="M 12 12 Q 10 16 10 18 Q 12 16 12 12" />
    <path d="M 12 12 Q 16 16 14 18 Q 14 14 12 12" />
    <path d="M 12 12 Q 16 10 18 10 Q 14 10 12 12" />
  </svg>
);
```

---

### Usage Example

Update [home.tsx](client/src/pages/home.tsx):

```typescript
import { Scissors, Sparkles } from "lucide-react";
import {
  IconHairColor,
  IconManicure,
  IconPedicure,
  IconMakeup,
  IconMassage,
  IconSpa,
} from "@/components/icons/service-icons";

const categories = [
  { id: "all", icon: Sparkles, labelKey: "marketplace.categories.all" },
  { id: "haircut", icon: Scissors, labelKey: "marketplace.categories.haircut" },
  { id: "coloring", icon: IconHairColor, labelKey: "marketplace.categories.coloring" },
  { id: "manicure", icon: IconManicure, labelKey: "marketplace.categories.manicure" },
  { id: "pedicure", icon: IconPedicure, labelKey: "marketplace.categories.pedicure" },
  { id: "makeup", icon: IconMakeup, labelKey: "marketplace.categories.makeup" },
  { id: "massage", icon: IconMassage, labelKey: "marketplace.categories.massage" },
  { id: "spa", icon: IconSpa, labelKey: "marketplace.categories.spa" },
];
```

---

## Empty State Illustrations

### Design Philosophy

**Tone**: Friendly, encouraging, not frustrating
**Style**: Flat illustration, 2-3 colors max, simple shapes
**Size**: 200-300px width
**Format**: SVG (inline React components)

---

### 1. No Salons Found (`EmptyStateSalons`)

**Scenario**: User searches for salons, no results found

**Illustration Concept**: Empty storefront or map with location pin

**SVG Illustration**:

```svg
<svg viewBox="0 0 200 200" fill="none">
  <!-- Map background -->
  <rect x="20" y="40" width="160" height="120" rx="8" fill="#F5F5F5"/>

  <!-- Map grid lines -->
  <path d="M 60 40 V 160" stroke="#E0E0E0" stroke-width="1"/>
  <path d="M 100 40 V 160" stroke="#E0E0E0" stroke-width="1"/>
  <path d="M 140 40 V 160" stroke="#E0E0E0" stroke-width="1"/>
  <path d="M 20 80 H 180" stroke="#E0E0E0" stroke-width="1"/>
  <path d="M 20 120 H 180" stroke="#E0E0E0" stroke-width="1"/>

  <!-- Large location pin (empty) -->
  <path
    d="M 100 60 Q 85 60 85 75 Q 85 90 100 110 Q 115 90 115 75 Q 115 60 100 60 Z"
    fill="var(--primary)"
    opacity="0.2"
  />
  <circle cx="100" cy="75" r="8" fill="var(--primary)" opacity="0.3"/>

  <!-- Magnifying glass (searching) -->
  <circle cx="150" cy="140" r="15" stroke="var(--muted-foreground)" stroke-width="2" fill="none"/>
  <path d="M 162 152 L 172 162" stroke="var(--muted-foreground)" stroke-width="2" stroke-linecap="round"/>
</svg>
```

**Text**:

- Title: `t("marketplace.empty.noSalons.title")` - "No salons found"
- Description: `t("marketplace.empty.noSalons.description")` - "Try adjusting your search or filters"
- CTA: `t("marketplace.empty.noSalons.cta")` - "Clear filters"

---

### 2. No Bookings (`EmptyStateBookings`)

**Scenario**: User's booking history is empty

**Illustration Concept**: Empty calendar with welcoming gesture

**SVG Illustration**:

```svg
<svg viewBox="0 0 200 200" fill="none">
  <!-- Calendar -->
  <rect x="40" y="50" width="120" height="100" rx="8" fill="var(--card)" stroke="var(--border)" stroke-width="2"/>

  <!-- Calendar header -->
  <rect x="40" y="50" width="120" height="25" rx="8" fill="var(--primary)" opacity="0.1"/>
  <circle cx="60" cy="62.5" r="3" fill="var(--primary)"/>
  <circle cx="140" cy="62.5" r="3" fill="var(--primary)"/>

  <!-- Calendar grid (empty) -->
  <path d="M 40 90 H 160" stroke="var(--border)" stroke-width="1"/>
  <path d="M 70 75 V 150" stroke="var(--border)" stroke-width="1" opacity="0.3"/>
  <path d="M 100 75 V 150" stroke="var(--border)" stroke-width="1" opacity="0.3"/>
  <path d="M 130 75 V 150" stroke="var(--border)" stroke-width="1" opacity="0.3"/>

  <!-- Empty state icon (calendar with checkmark) -->
  <circle cx="100" cy="115" r="20" fill="var(--muted)" opacity="0.3"/>
  <path d="M 90 115 L 97 122 L 110 109" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
```

**Text**:

- Title: `t("marketplace.empty.noBookings.title")` - "No bookings yet"
- Description: `t("marketplace.empty.noBookings.description")` - "Book your first appointment to get started"
- CTA: `t("marketplace.empty.noBookings.cta")` - "Browse salons"

---

### 3. No Services (`EmptyStateServices`)

**Scenario**: Salon has no services listed

**Illustration Concept**: Empty service menu

**SVG Illustration**:

```svg
<svg viewBox="0 0 200 200" fill="none">
  <!-- Menu board -->
  <rect x="30" y="40" width="140" height="120" rx="8" fill="var(--card)" stroke="var(--border)" stroke-width="2"/>

  <!-- Menu title area -->
  <rect x="40" y="50" width="60" height="8" rx="4" fill="var(--muted)" opacity="0.3"/>

  <!-- Empty menu items (placeholder lines) -->
  <rect x="40" y="70" width="120" height="6" rx="3" fill="var(--muted)" opacity="0.2"/>
  <rect x="40" y="85" width="100" height="6" rx="3" fill="var(--muted)" opacity="0.2"/>
  <rect x="40" y="100" width="110" height="6" rx="3" fill="var(--muted)" opacity="0.2"/>
  <rect x="40" y="115" width="90" height="6" rx="3" fill="var(--muted)" opacity="0.2"/>

  <!-- Plus icon (add services) -->
  <circle cx="100" cy="140" r="15" fill="var(--primary)" opacity="0.1"/>
  <path d="M 100 132 V 148" stroke="var(--primary)" stroke-width="2" stroke-linecap="round"/>
  <path d="M 92 140 H 108" stroke="var(--primary)" stroke-width="2" stroke-linecap="round"/>
</svg>
```

**Text**:

- Title: `t("marketplace.empty.noServices.title")` - "No services available"
- Description: `t("marketplace.empty.noServices.description")` - "This salon hasn't added services yet"

---

### 4. No Reviews (`EmptyStateReviews`)

**Scenario**: Salon/Master has no reviews

**SVG Illustration**:

```svg
<svg viewBox="0 0 200 200" fill="none">
  <!-- Review card (empty) -->
  <rect x="30" y="60" width="140" height="80" rx="8" fill="var(--card)" stroke="var(--border)" stroke-width="2"/>

  <!-- Empty stars -->
  <g transform="translate(60, 80)">
    <path d="M 12 2 L 15 10 L 24 10 L 17 16 L 20 24 L 12 19 L 4 24 L 7 16 L 0 10 L 9 10 Z"
      fill="none" stroke="var(--muted)" stroke-width="1.5" opacity="0.3"/>
    <path d="M 32 2 L 35 10 L 44 10 L 37 16 L 40 24 L 32 19 L 24 24 L 27 16 L 20 10 L 29 10 Z"
      fill="none" stroke="var(--muted)" stroke-width="1.5" opacity="0.3"/>
    <path d="M 52 2 L 55 10 L 64 10 L 57 16 L 60 24 L 52 19 L 44 24 L 47 16 L 40 10 L 49 10 Z"
      fill="none" stroke="var(--muted)" stroke-width="1.5" opacity="0.3"/>
  </g>

  <!-- Empty comment lines -->
  <rect x="40" y="110" width="100" height="4" rx="2" fill="var(--muted)" opacity="0.2"/>
  <rect x="40" y="120" width="80" height="4" rx="2" fill="var(--muted)" opacity="0.2"/>
</svg>
```

**Text**:

- Title: `t("marketplace.empty.noReviews.title")` - "No reviews yet"
- Description: `t("marketplace.empty.noReviews.description")` - "Be the first to leave a review"

---

### 5. No Search Results (`EmptyStateSearch`)

**Scenario**: Search query returns no results

**SVG Illustration**:

```svg
<svg viewBox="0 0 200 200" fill="none">
  <!-- Large magnifying glass -->
  <circle cx="85" cy="85" r="40" stroke="var(--muted-foreground)" stroke-width="3" fill="none" opacity="0.3"/>
  <path d="M 115 115 L 145 145" stroke="var(--muted-foreground)" stroke-width="3" stroke-linecap="round" opacity="0.3"/>

  <!-- Question mark inside glass -->
  <text x="85" y="100" font-size="40" fill="var(--muted-foreground)" text-anchor="middle" opacity="0.5">?</text>

  <!-- Sparkles (no results) -->
  <path d="M 150 50 L 152 55 L 157 57 L 152 59 L 150 64 L 148 59 L 143 57 L 148 55 Z" fill="var(--primary)" opacity="0.3"/>
  <path d="M 45 140 L 47 143 L 50 145 L 47 147 L 45 150 L 43 147 L 40 145 L 43 143 Z" fill="var(--primary)" opacity="0.3"/>
</svg>
```

**Text**:

- Title: `t("marketplace.empty.noSearchResults.title")` - "No results for '{query}'"
- Description: `t("marketplace.empty.noSearchResults.description")` - "Try a different search term"

---

## Error State Illustrations

### Design Philosophy

**Tone**: Apologetic but helpful, not scary
**Style**: Flat illustration with friendly character/element
**Colors**: Use destructive color sparingly (accents only)

---

### 1. 404 Not Found (`ErrorState404`)

**Current Implementation**: Basic [not-found.tsx](client/src/pages/not-found.tsx#L1-L22)

**Illustration Concept**: Lost person with map, or broken compass

**SVG Illustration**:

```svg
<svg viewBox="0 0 300 300" fill="none">
  <!-- Large "404" text (decorative) -->
  <text x="150" y="120" font-size="80" font-weight="bold" fill="var(--muted)" opacity="0.1" text-anchor="middle">404</text>

  <!-- Character with map (confused) -->
  <circle cx="150" cy="140" r="30" fill="var(--primary)" opacity="0.1"/>
  <circle cx="145" cy="135" r="2" fill="var(--foreground)"/>
  <circle cx="155" cy="135" r="2" fill="var(--foreground)"/>
  <path d="M 140 145 Q 150 148 160 145" stroke="var(--foreground)" stroke-width="1.5" stroke-linecap="round"/>

  <!-- Map in hands -->
  <rect x="130" y="175" width="40" height="30" rx="2" fill="var(--card)" stroke="var(--border)" stroke-width="1.5"/>
  <path d="M 135 180 L 145 190 L 155 180 L 165 190" stroke="var(--muted-foreground)" stroke-width="1" fill="none"/>

  <!-- Question marks floating -->
  <text x="115" y="125" font-size="16" fill="var(--muted-foreground)" opacity="0.5">?</text>
  <text x="185" y="135" font-size="20" fill="var(--muted-foreground)" opacity="0.5">?</text>
</svg>
```

**Text**:

- Title: "Page Not Found"
- Description: "The page you're looking for doesn't exist or has been moved"
- CTA: "Go Home" (link to /)

---

### 2. 500 Server Error (`ErrorState500`)

**Illustration Concept**: Broken server/wrench, maintenance

**SVG Illustration**:

```svg
<svg viewBox="0 0 300 300" fill="none">
  <!-- Server box (broken) -->
  <rect x="100" y="80" width="100" height="120" rx="4" fill="var(--card)" stroke="var(--border)" stroke-width="2"/>

  <!-- Server lights (all red/off) -->
  <circle cx="120" cy="100" r="4" fill="var(--destructive)" opacity="0.5"/>
  <circle cx="135" cy="100" r="4" fill="var(--muted)" opacity="0.3"/>
  <circle cx="150" cy="100" r="4" fill="var(--muted)" opacity="0.3"/>

  <!-- Server panel lines -->
  <rect x="110" y="115" width="80" height="15" rx="2" fill="var(--muted)" opacity="0.1"/>
  <rect x="110" y="135" width="80" height="15" rx="2" fill="var(--muted)" opacity="0.1"/>
  <rect x="110" y="155" width="80" height="15" rx="2" fill="var(--muted)" opacity="0.1"/>

  <!-- Wrench icon (repair) -->
  <path d="M 170 170 L 185 185 Q 190 190 185 195 L 175 185 Q 172 182 175 179 Z"
    fill="var(--muted-foreground)" opacity="0.5"/>

  <!-- Crack/error lightning bolt -->
  <path d="M 150 85 L 145 120 L 152 120 L 148 150"
    stroke="var(--destructive)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
```

**Text**:

- Title: "Something Went Wrong"
- Description: "We're experiencing technical difficulties. Please try again later."
- CTA: "Refresh Page" / "Go Home"

---

### 3. Network Error (`ErrorStateNetwork`)

**Illustration Concept**: Disconnected wifi/plug

**SVG Illustration**:

```svg
<svg viewBox="0 0 200 200" fill="none">
  <!-- WiFi symbol (disconnected) -->
  <path d="M 60 100 Q 100 60 140 100" stroke="var(--muted)" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.3"/>
  <path d="M 75 110 Q 100 85 125 110" stroke="var(--muted)" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.3"/>
  <path d="M 90 120 Q 100 110 110 120" stroke="var(--muted)" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.3"/>
  <circle cx="100" cy="130" r="5" fill="var(--muted)" opacity="0.3"/>

  <!-- X mark (disconnected) -->
  <circle cx="100" cy="100" r="50" fill="var(--destructive)" opacity="0.05"/>
  <path d="M 75 75 L 125 125" stroke="var(--destructive)" stroke-width="4" stroke-linecap="round"/>
  <path d="M 125 75 L 75 125" stroke="var(--destructive)" stroke-width="4" stroke-linecap="round"/>
</svg>
```

**Text**:

- Title: "Connection Lost"
- Description: "Check your internet connection and try again"
- CTA: "Retry"

---

## Onboarding Illustrations

### User Flow

**Onboarding Steps** (for new users):

1. **Welcome** - Introduce AURELLE
2. **Browse Salons** - Discover nearby salons
3. **Book Easily** - Simple booking process
4. **Get Reminders** - Never miss appointments

---

### 1. Welcome (`OnboardingWelcome`)

**Illustration Concept**: Welcoming beauty professional

**SVG Illustration**:

```svg
<svg viewBox="0 0 300 300" fill="none">
  <!-- Background gradient circle -->
  <circle cx="150" cy="150" r="100" fill="url(#welcomeGradient)" opacity="0.1"/>
  <defs>
    <linearGradient id="welcomeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="var(--primary)"/>
      <stop offset="100%" stop-color="var(--accent)"/>
    </linearGradient>
  </defs>

  <!-- Person waving -->
  <circle cx="150" cy="120" r="25" fill="var(--primary)" opacity="0.2"/>
  <circle cx="145" cy="115" r="2" fill="var(--foreground)"/>
  <circle cx="155" cy="115" r="2" fill="var(--foreground)"/>
  <path d="M 142 125 Q 150 128 158 125" stroke="var(--foreground)" stroke-width="1.5" stroke-linecap="round"/>

  <!-- Waving hand -->
  <path d="M 180 100 Q 185 95 188 100 L 188 115 Q 185 120 180 115 Z" fill="var(--primary)" opacity="0.3"/>

  <!-- Sparkles -->
  <path d="M 120 90 L 122 95 L 127 97 L 122 99 L 120 104 L 118 99 L 113 97 L 118 95 Z" fill="var(--primary)"/>
  <path d="M 185 130 L 187 133 L 190 135 L 187 137 L 185 140 L 183 137 L 180 135 L 183 133 Z" fill="var(--accent)"/>

  <!-- AURELLE logo text (stylized) -->
  <text x="150" y="200" font-size="24" font-weight="600" fill="var(--primary)" text-anchor="middle">AURELLE</text>
</svg>
```

**Text**:

- Title: "Welcome to AURELLE"
- Description: "Your beauty marketplace"

---

### 2. Browse Salons (`OnboardingBrowse`)

**Illustration Concept**: Map with salon pins

**SVG (simplified version of empty state map with added salons)**

---

### 3. Book Easily (`OnboardingBook`)

**Illustration Concept**: Calendar with checkmark

**SVG (simplified version of empty booking calendar but with filled slots)**

---

### 4. Get Reminders (`OnboardingReminders`)

**Illustration Concept**: Phone with notification bell

**SVG Illustration**:

```svg
<svg viewBox="0 0 300 300" fill="none">
  <!-- Phone -->
  <rect x="100" y="60" width="100" height="180" rx="12" fill="var(--card)" stroke="var(--border)" stroke-width="2"/>
  <rect x="110" y="75" width="80" height="140" rx="4" fill="var(--background)"/>

  <!-- Notification on screen -->
  <rect x="115" y="85" width="70" height="40" rx="6" fill="var(--primary)" opacity="0.1"/>
  <circle cx="130" cy="105" r="8" fill="var(--primary)" opacity="0.3"/>
  <rect x="145" y="95" width="30" height="4" rx="2" fill="var(--primary)"/>
  <rect x="145" y="105" width="25" height="3" rx="1.5" fill="var(--primary)" opacity="0.5"/>
  <rect x="145" y="112" width="20" height="3" rx="1.5" fill="var(--primary)" opacity="0.5"/>

  <!-- Bell icon with badge -->
  <circle cx="180" cy="80" r="18" fill="var(--primary)" opacity="0.9"/>
  <path d="M 172 75 Q 172 70 176 68 L 184 68 Q 188 70 188 75 L 188 80 Q 190 82 190 85 L 170 85 Q 170 82 172 80 Z"
    fill="white"/>
  <path d="M 176 86 Q 177 88 180 88 Q 183 88 184 86" fill="white"/>
  <circle cx="188" cy="72" r="5" fill="var(--destructive)"/>
</svg>
```

**Text**:

- Title: "Never Miss an Appointment"
- Description: "Get reminders before your bookings"

---

## Hero Section Illustration

**Location**: [home.tsx](client/src/pages/home.tsx) - Hero section

**Current Implementation**: Uses stock photo `heroImage`

**Recommendation**: Create custom illustration OR use high-quality photo + SVG overlay

---

### Option 1: Custom Hero Illustration

**Concept**: Abstract beauty elements (scissors, makeup, flowers, etc.) in elegant composition

**SVG Illustration** (Large format: 1200x600):

```svg
<svg viewBox="0 0 1200 600" fill="none">
  <!-- Background gradient -->
  <rect width="1200" height="600" fill="url(#heroGradient)"/>
  <defs>
    <linearGradient id="heroGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="var(--primary)" opacity="0.05"/>
      <stop offset="100%" stop-color="var(--accent)" opacity="0.1"/>
    </linearGradient>
  </defs>

  <!-- Abstract shapes (beauty elements) -->
  <!-- Scissors (large, decorative) -->
  <g transform="translate(800, 250)" opacity="0.15">
    <circle cx="0" cy="0" r="40" fill="var(--primary)"/>
    <circle cx="0" cy="120" r="40" fill="var(--primary)"/>
    <path d="M 0 0 L 150 60 L 0 120" stroke="var(--primary)" stroke-width="8" fill="none"/>
  </g>

  <!-- Lipstick (decorative) -->
  <g transform="translate(300, 350)" opacity="0.1">
    <rect x="0" y="0" width="30" height="80" rx="4" fill="var(--primary)"/>
    <path d="M 0 0 L 0 -30 Q 0 -45 7.5 -52.5 L 22.5 -52.5 Q 30 -45 30 -30 L 30 0" fill="var(--primary)"/>
  </g>

  <!-- Flower accents -->
  <circle cx="200" cy="150" r="60" fill="var(--accent)" opacity="0.08"/>
  <circle cx="950" cy="450" r="80" fill="var(--primary)" opacity="0.06"/>

  <!-- Sparkles -->
  <path d="M 400 200 L 405 210 L 415 215 L 405 220 L 400 230 L 395 220 L 385 215 L 395 210 Z" fill="var(--primary)" opacity="0.3"/>
  <path d="M 700 400 L 703 406 L 709 409 L 703 412 L 700 418 L 697 412 L 691 409 L 697 406 Z" fill="var(--accent)" opacity="0.4"/>
  <path d="M 550 180 L 553 186 L 559 189 L 553 192 L 550 198 L 547 192 L 541 189 L 547 186 Z" fill="var(--primary)" opacity="0.25"/>
</svg>
```

---

### Option 2: Photo + SVG Overlay

**Keep existing photo**, add decorative SVG overlay with:

- Subtle gradient overlay
- Floating beauty icons
- Geometric shapes

**Example Overlay**:

```typescript
<div className="relative">
  <img src={heroImage} alt="Beauty salon" className="w-full h-96 object-cover" />

  {/* SVG Overlay */}
  <svg className="absolute inset-0 w-full h-full pointer-events-none">
    <defs>
      <linearGradient id="overlay" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="black" stopOpacity="0.3"/>
        <stop offset="100%" stopOpacity="0"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#overlay)"/>

    {/* Decorative elements */}
    <circle cx="10%" cy="20%" r="20" fill="white" opacity="0.1"/>
    <circle cx="90%" cy="80%" r="30" fill="white" opacity="0.15"/>
  </svg>
</div>
```

**Recommendation**: **Option 2** (easier to implement, keeps current aesthetic)

---

## Implementation Guide

### Phase 1: Custom Service Icons (Week 1)

1. **Create icon component file**:

   ```bash
   touch client/src/components/icons/service-icons.tsx
   ```

2. **Implement icons** (copy from specification above)

3. **Update category usage**:
   - Modify [home.tsx:45-51](client/src/pages/home.tsx#L45-L51)
   - Import new icons
   - Update categories array

4. **Test rendering**:
   - Verify icons display correctly
   - Test dark/light mode
   - Test different sizes (mobile/desktop)

---

### Phase 2: Empty State Components (Week 2)

1. **Create empty state component file**:

   ```bash
   touch client/src/components/empty-states.tsx
   ```

2. **Implement base `EmptyState` component**:

```typescript
import React from "react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  illustration: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  illustration,
  title,
  description,
  actionLabel,
  onAction,
}) => (
  <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
    <div className="mb-6 w-48 h-48">
      {illustration}
    </div>
    <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
    <p className="text-muted-foreground mb-6 max-w-md">{description}</p>
    {actionLabel && onAction && (
      <Button onClick={onAction}>{actionLabel}</Button>
    )}
  </div>
);
```

3. **Implement specific empty states** (`EmptyStateSalons`, `EmptyStateBookings`, etc.)

4. **Add to existing pages**:
   - [home.tsx](client/src/pages/home.tsx) - No salons
   - [client.tsx](client/src/pages/client.tsx) - No bookings
   - [salon.tsx](client/src/pages/salon.tsx) - No services, no reviews

---

### Phase 3: Error State Pages (Week 3)

1. **Update [not-found.tsx](client/src/pages/not-found.tsx)**:
   - Replace current simple card with illustrated error page
   - Add `ErrorState404` illustration

2. **Create `error-500.tsx`** (generic error page)

3. **Update [error-boundary.tsx](client/src/components/error-boundary.tsx)**:
   - Add illustration to error fallback

---

### Phase 4: Onboarding (Week 4)

1. **Create onboarding component**:

   ```bash
   touch client/src/components/onboarding-carousel.tsx
   ```

2. **Implement onboarding slides** with illustrations

3. **Add to app**:
   - Show on first visit (localStorage flag)
   - Optional: Show on signup/login

---

### Phase 5: Hero Illustration (Week 5)

1. **Option A**: Create custom SVG illustration
   - Design in Figma
   - Export as React component
   - Replace `heroImage`

2. **Option B**: Add SVG overlay to existing photo
   - Keep `heroImage`
   - Add decorative SVG layer
   - Test mobile responsiveness

---

## Accessibility Checklist

- [ ] All illustrations have `aria-hidden="true"` (decorative)
- [ ] Empty states have proper text content (not just image)
- [ ] Icons have accessible labels when interactive
- [ ] Color contrast ratios meet WCAG AA (4.5:1 for text)
- [ ] SVGs don't rely on color alone (use shapes/labels too)
- [ ] Animations can be disabled (prefers-reduced-motion)

---

## Translation Keys

Add to `client/src/locales/*.json`:

```json
{
  "marketplace": {
    "categories": {
      "all": "All Services",
      "haircut": "Haircut",
      "coloring": "Hair Coloring",
      "manicure": "Manicure",
      "pedicure": "Pedicure",
      "makeup": "Makeup",
      "massage": "Massage",
      "spa": "Spa & Wellness"
    },
    "empty": {
      "noSalons": {
        "title": "No salons found",
        "description": "Try adjusting your search or filters",
        "cta": "Clear filters"
      },
      "noBookings": {
        "title": "No bookings yet",
        "description": "Book your first appointment to get started",
        "cta": "Browse salons"
      },
      "noServices": {
        "title": "No services available",
        "description": "This salon hasn't added services yet"
      },
      "noReviews": {
        "title": "No reviews yet",
        "description": "Be the first to leave a review"
      },
      "noSearchResults": {
        "title": "No results for '{query}'",
        "description": "Try a different search term"
      }
    }
  },
  "onboarding": {
    "welcome": {
      "title": "Welcome to AURELLE",
      "description": "Your beauty marketplace"
    },
    "browse": {
      "title": "Discover Nearby Salons",
      "description": "Find the perfect salon for your needs"
    },
    "book": {
      "title": "Book in Seconds",
      "description": "Simple and fast appointment booking"
    },
    "reminders": {
      "title": "Never Miss an Appointment",
      "description": "Get reminders before your bookings"
    }
  },
  "error": {
    "404": {
      "title": "Page Not Found",
      "description": "The page you're looking for doesn't exist or has been moved"
    },
    "500": {
      "title": "Something Went Wrong",
      "description": "We're experiencing technical difficulties. Please try again later."
    },
    "network": {
      "title": "Connection Lost",
      "description": "Check your internet connection and try again"
    }
  }
}
```

Repeat for Russian and Uzbek translations.

---

## Acceptance Criteria

✅ **Icon Set Complete**

- 6 custom service category icons created
- Icons match Lucide React style (2px stroke, outline)
- Icons work at small (16px) and large (64px) sizes
- Icons integrated in [home.tsx](client/src/pages/home.tsx)

✅ **Empty States**

- 5 empty state illustrations created
- EmptyState component implemented
- Applied to: No salons, No bookings, No services, No reviews, No search results
- All have helpful text + optional CTA

✅ **Error States**

- 404 page redesigned with illustration
- 500 error page created
- Network error illustration
- Error boundary updated

✅ **Onboarding**

- 4 onboarding slides with illustrations
- Carousel component created
- Shows on first visit

✅ **Hero Section**

- Hero illustration OR photo overlay implemented
- Responsive (mobile/desktop)
- Maintains brand aesthetic

✅ **Professional Appearance**

- Consistent illustration style across all components
- Brand colors used (primary, accent)
- Smooth, polished animations (optional)
- Site feels premium and cohesive

---

## Resources

**Icon Design Tools**:

- [Figma](https://figma.com) - Vector design
- [Lucide Icons](https://lucide.dev/) - Reference for style matching
- [Heroicons](https://heroicons.com/) - Inspiration

**Illustration Tools**:

- [unDraw](https://undraw.co/) - Free illustrations (inspiration)
- [Storyset](https://storyset.com/) - Animated illustrations
- [Figma Community](https://www.figma.com/community) - Free templates

**SVG Optimization**:

- [SVGOMG](https://jakearchibald.github.io/svgomg/) - Optimize SVG files
- [SVGR](https://react-svgr.com/) - Convert SVG to React components

---

## File Structure

```
client/src/
├── components/
│   ├── icons/
│   │   └── service-icons.tsx          # NEW: Custom service category icons
│   ├── illustrations/
│   │   ├── empty-states.tsx           # NEW: Empty state illustrations
│   │   ├── error-states.tsx           # NEW: Error illustrations
│   │   ├── onboarding.tsx             # NEW: Onboarding illustrations
│   │   └── hero-illustration.tsx      # NEW: Hero section (optional)
│   ├── empty-state.tsx                # NEW: Base EmptyState component
│   └── onboarding-carousel.tsx        # NEW: Onboarding component
├── pages/
│   ├── not-found.tsx                  # MODIFIED: Add illustration
│   ├── error-500.tsx                  # NEW: 500 error page
│   ├── home.tsx                       # MODIFIED: Use custom icons
│   ├── salon.tsx                      # MODIFIED: Add empty states
│   └── client.tsx                     # MODIFIED: Add empty states
└── locales/
    ├── en.json                        # MODIFIED: Add empty/error/onboarding keys
    ├── ru.json                        # MODIFIED
    └── uz.json                        # MODIFIED
```

---

## Conclusion

This iconography and illustration system provides AURELLE with:

1. **Custom Service Icons**: 6 unique, brand-aligned icons for service categories
2. **Empty State Illustrations**: 5 friendly, helpful empty states
3. **Error Illustrations**: 3 apologetic, clear error pages
4. **Onboarding**: 4-slide visual introduction for new users
5. **Hero Enhancement**: Professional hero section illustration/overlay

**Expected Impact**:

- 📈 **Improved Visual Appeal**: Professional, cohesive design
- 😊 **Better UX**: Clear empty/error states reduce confusion
- 🎨 **Brand Identity**: Custom icons differentiate AURELLE
- 📱 **Engagement**: Onboarding increases user activation
- ⭐ **Professionalism**: Polished illustrations build trust

**Implementation Time**: 4-5 weeks (1 week per phase)

---

**Document Version**: 1.0
**Last Updated**: 2026-01-10
**Author**: Claude (AI Assistant)
**Status**: Ready for Implementation

---

**Next Steps**:

1. Review and approve icon designs
2. Create icons in Figma (export to React components)
3. Implement empty state components
4. Update existing pages with illustrations
5. Test across devices and themes
