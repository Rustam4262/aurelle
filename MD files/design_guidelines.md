# Beauty Salon Website Design Guidelines

## Design Approach
**Reference-Based Approach**: Drawing inspiration from premium wellness and beauty platforms (Glossier, Sephora's service pages, luxury spa websites) with focus on elegance, trust-building, and visual storytelling.

## Core Design Principles
- **Sophisticated Minimalism**: Clean layouts with strategic use of whitespace
- **Visual Trust**: High-quality imagery showcasing results and ambiance
- **Effortless Navigation**: Intuitive service discovery and booking flow
- **Warmth & Welcome**: Approachable yet premium aesthetic

## Typography
- **Primary Font**: Cormorant Garamond (headings) - elegant serif for luxury appeal
- **Secondary Font**: Inter (body text) - clean, readable sans-serif
- **Hierarchy**:
  - Hero: text-5xl to text-7xl, font-light
  - Section Headers: text-4xl, font-light
  - Subsections: text-2xl, font-normal
  - Body: text-base to text-lg, font-normal
  - Small/Meta: text-sm

## Layout System
**Spacing Units**: Tailwind units of 4, 6, 8, 12, 16, 20, 24 for consistent rhythm
- Section padding: py-20 lg:py-32
- Component spacing: gap-8 to gap-12
- Container: max-w-7xl mx-auto px-6

## Page Structure

### Hero Section (80vh)
- Full-width background image showing salon interior or treatment in progress
- Centered overlay content with blurred background buttons
- Headline emphasizing transformation or luxury experience
- Primary CTA: "Book Appointment" (blurred bg)
- Trust indicator: "Serving [City] since [Year]" or awards/certifications

### Services Showcase (Multi-column)
- 3-column grid (lg:grid-cols-3 md:grid-cols-2 grid-cols-1)
- Service cards with hover elevation effect
- Each card: Image, service name, brief description, duration, price range
- "View Details" link per service

### Visual Results Gallery
- Masonry or 3-column grid of before/after images
- Subtle overlay with treatment name on hover
- Filters for service categories

### Stylist/Team Section
- 2-3 column layout with professional headshots
- Brief bio, specialties, experience
- "Book with [Name]" CTA per stylist

### Testimonials
- 2-column quote cards with client photos
- Star ratings prominently displayed
- Service received noted below each testimonial

### Booking/Contact Section
- 2-column split: Contact form left, salon info/hours right
- Embedded map or location image
- Phone, email, social links
- Business hours clearly displayed

### Footer
- Newsletter signup: "Beauty tips & exclusive offers"
- Quick links: Services, Team, Gallery, Contact
- Social media icons
- Location/hours summary
- Trust badges: certifications, payment methods

## Component Library

**Navigation**
- Transparent over hero, becomes solid on scroll
- Logo left, menu items center, "Book Now" button right
- Mobile: Hamburger menu with smooth slide-in

**Buttons**
- Primary: Rounded-full, px-8 py-3, medium font weight
- When on images: backdrop-blur-md with semi-transparent background
- Secondary: Outlined variant

**Service Cards**
- Rounded-lg, subtle shadow
- Aspect ratio 4:3 for images
- Padding: p-6
- Hover: Slight scale and shadow increase

**Input Fields**
- Rounded-lg borders
- Generous padding: px-4 py-3
- Focus states with subtle border highlight

## Images

**Required Images**:
1. **Hero**: Large, high-quality image of salon interior or stylist at work - professional, inviting, well-lit
2. **Service Cards** (6-8): Close-ups of treatments, tools, or results
3. **Gallery** (12-15): Before/after transformations, detail shots
4. **Team Photos** (4-6): Professional headshots with consistent style
5. **Testimonial Photos** (6): Client headshots or avatars
6. **Location/Map**: Salon exterior or embedded map visual

## Icons
**Heroicons** (outline style for consistency)
- Service categories, contact methods, features, social media

## Animations
**Minimal & Purposeful**:
- Subtle fade-in on scroll for section reveals
- Image hover: slight scale (1.05)
- Button hover: gentle glow/shadow increase
- No parallax or heavy scroll effects

## Accessibility
- Sufficient contrast for text overlays on images
- Alt text for all images, especially before/afters
- Keyboard navigation for booking form
- ARIA labels for interactive elements

**Mobile-First Responsiveness**: All multi-column layouts stack to single column on mobile, increased touch targets (min 44px), simplified navigation.