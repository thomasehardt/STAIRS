# STAIRS Web UI - Style Guide

## Overview

The STAIRS Web UI uses a **dark-first, space-themed design** optimized for astronomers working at night. The design prioritizes readability under red light conditions and reduces eye strain during long observation sessions.

---

## Color Palette

### Primary Colors

| Token | Hex Code | Usage | Example |
|-------|----------|-------|---------|
| `--color-bg-primary` | `#0a0e1a` | Main page background | ![#0a0e1a](https://via.placeholder.com/40/0a0e1a/000000?text=+) |
| `--color-bg-surface` | `#111827` | Cards, surfaces, sidebar | ![#111827](https://via.placeholder.com/40/111827/000000?text=+) |
| `--color-bg-surface-hover` | `#1f2937` | Hover states, alternate rows | ![#1f2937](https://via.placeholder.com/40/1f2937/000000?text=+) |
| `--color-bg-elevated` | `#374151` | Borders, dividers, input backgrounds | ![#374151](https://via.placeholder.com/40/374151/000000?text=+) |

### Brand & Action Colors

| Token | Hex Code | Usage |
|-------|----------|-------|
| `--color-primary` | `#3b82f6` | Primary buttons, links, active states |
| `--color-primary-hover` | `#2563eb` | Hover state for primary actions |
| `--color-primary-light` | `rgba(59, 130, 246, 0.1)` | Background fills, highlights |

### Semantic Colors (Scores & Status)

| Token | Hex Code | Meaning | Score Range |
|-------|----------|---------|-------------|
| `--color-success` | `#22c55e` | Excellent quality | 80-100 |
| `--color-warning` | `#eab308` | Good/Fair quality | 40-79 |
| `--color-danger` | `#ef4444` | Poor quality | 0-39 |
| `--color-yellow` | `#eab308` | Star ratings (☆) | N/A |

### Text Colors

| Token | Hex Code | Usage |
|-------|----------|-------|
| `--color-text-primary` | `#f9fafb` | Headings, main text |
| `--color-text-secondary` | `#9ca3af` | Labels, secondary text |
| `--color-text-muted` | `#6b7280` | Disabled states, placeholders |

---

## Typography

### Font Stack
```
--font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
```

### Type Scale

| Class | Size | Line Height | Weight | Usage |
|--------|------|-------------|--------|-------|
| `text-xs` | 12px (0.75rem) | 1.25 | 400 | Captions, small labels |
| `text-sm` | 14px (0.875rem) | 1.5 | 400/500 | Body text, form labels |
| `text-base` | 16px (1rem) | 1.5 | 400 | Default body text |
| `text-lg` | 18px (1.125rem) | 1.5 | 600 | Card titles |
| `text-xl` | 20px (1.25rem) | 1.5 | 600 | Section headings |
| `text-2xl` | 24px (1.5rem) | 1.25 | 700 | Page titles |
| `text-3xl` | 30px (1.875rem) | 1.25 | 700 | Hero headings |
| `text-4xl` | 36px (2.25rem) | 1.25 | 700 | Display headings |

### Font Weights

| Token | Value | Usage |
|-------|-------|-------|
| `--font-light` | 300 | Light emphasis |
| `--font-normal` | 400 | Body text |
| `--font-medium` | 500 | Labels, buttons |
| `--font-semibold` | 600 | Subheadings |
| `--font-bold` | 700 | Headings, strong emphasis |

---

## Spacing

Based on a 4px base unit (Tailwind-inspired).

| Token | Value | Pixels | Usage |
|-------|-------|--------|-------|
| `--space-1` | 0.25rem | 4px | Tight gaps |
| `--space-2` | 0.5rem | 8px | Small padding |
| `--space-3` | 0.75rem | 12px | Compact spacing |
| `--space-4` | 1rem | 16px | Standard padding |
| `--space-5` | 1.25rem | 20px | Medium spacing |
| `--space-6` | 1.5rem | 24px | Large padding |
| `--space-8` | 2rem | 32px | Section spacing |
| `--space-10` | 2.5rem | 40px | Major sections |
| `--space-12` | 3rem | 48px | Page sections |

---

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 6px (0.375rem) | Small elements, badges |
| `--radius-md` | 8px (0.5rem) | Buttons, inputs |
| `--radius-lg` | 12px (0.75rem) | Cards, modals |
| `--radius-xl` | 16px (1rem) | Large containers |
| `--radius-full` | 9999px | Pills, avatars |

---

## Shadows

Used sparingly to maintain the flat, dark theme.

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.3)` | Subtle elevation |
| `--shadow-md` | `0 4px 6px rgba(0,0,0,0.4)` | Cards on hover |
| `--shadow-lg` | `0 10px 15px rgba(0,0,0,0.5)` | Modals, dropdowns |

---

## Component Examples

### Badge Variants

```html
<span class="badge badge--success">★★★☆ 82</span>
<span class="badge badge--warning">★★☆☆ 65</span>
<span class="badge badge--danger">★☆☆☆ 32</span>
<span class="badge badge--info">captured</span>
```

**Rendered:**
- ![#166534](https://via.placeholder.com/120/166534/bbf7d0?text=★★★☆+82) Success (80-100)
- ![#854d0e](https://via.placeholder.com/120/854d0e/fef08a?text=★★☆☆+65) Warning (40-79)
- ![#991b1b](https://via.placeholder.com/120/991b1b/fecaca?text=★☆☆☆+32) Danger (0-39)

### Button Variants

```html
<button class="btn btn--primary">Primary Action</button>
<button class="btn btn--secondary">Secondary</button>
<button class="btn btn--danger">Delete</button>
<button class="btn btn--success">Success</button>
<button class="btn btn--sm">Small</button>
<button class="btn btn--lg">Large</button>
```

### Score Color Coding

| Score | Color | CSS Class | Background |
|-------|-------|-----------|------------|
| 90-100 | ![#22c55e](https://via.placeholder.com/20/22c55e/000000?text=+) Green | `.score-excellent` | ![#166534](https://via.placeholder.com/60/166534/000000?text=+) |
| 70-89 | ![#4ade80](https://via.placeholder.com/20/4ade80/000000?text=+) Light Green | `.score-good` | ![#166534](https://via.placeholder.com/60/166534/000000?text=+) |
| 50-69 | ![#eab308](https://via.placeholder.com/20/eab308/000000?text=+) Yellow | `.score-fair` | ![#854d0e](https://via.placeholder.com/60/854d0e/000000?text=+) |
| 30-49 | ![#fb923c](https://via.placeholder.com/20/fb923c/000000?text=+) Orange | `.score-poor` | ![#854d0e](https://via.placeholder.com/60/854d0e/000000?text=+) |
| 0-29 | ![#ef4444](https://via.placeholder.com/20/ef4444/000000?text=+) Red | `.score-very-poor` | ![#991b1b](https://via.placeholder.com/60/991b1b/000000?text=+) |

### Star Ratings

```html
<span class="star">★★★★★</span>  <!-- 5/5 stars -->
<span class="star">★★★★☆</span>  <!-- 4/5 stars -->
<span class="star">★★★☆☆</span>  <!-- 3/5 stars -->
<span class="star">★★☆☆☆</span>  <!-- 2/5 stars -->
<span class="star">★☆☆☆☆</span>  <!-- 1/5 stars -->
```

**Color:** `#eab308` (Gold)

---

## Layout Patterns

### Standard Page Layout

```html
<div class="main-content">
    <div class="header">
        <h1 class="header__title">Page Title</h1>
        <div class="header__actions">
            <!-- Action buttons -->
        </div>
    </div>

    <!-- Content sections -->
    <div class="grid grid-cols-2 gap-6">
        <div class="card">...</div>
        <div class="card">...</div>
    </div>
</div>
```

### Card Pattern

```html
<div class="card">
    <div class="card__header">
        <h2 class="card__title">Card Title</h2>
        <p class="card__subtitle">Optional subtitle</p>
    </div>
    <!-- Card content -->
</div>
```

### Timeline Block

```html
<div class="timeline-block timeline-block--excellent">
    <div class="flex justify-between">
        <div>
            <div class="font-bold">Target Name</div>
            <div class="text-sm text-secondary">Time range</div>
        </div>
        <span class="badge badge--success">Score</span>
    </div>
</div>
```

---

## Iconography

### Recommended Icon Set: **Lucide React** (or Lucide for web)

| UI Element | Icon Name | Unicode (Fallback) |
|------------|-----------|-------------------|
| Home/Dashboard | `Home` | 🏠 |
| Plan Generator | `Calendar` | 📋 |
| Forecast | `Moon` | 🌙 |
| Catalogs | `Telescope` | 🔭 |
| Logs | `ClipboardList` | 📝 |
| Settings | `Settings` | ⚙️ |
| Location | `MapPin` | 📍 |
| Weather | `Cloud` | ☁️ |
| Star/Rating | `Star` | ⭐ |
| Notification | `Bell` | 🔔 |
| User | `User` | 👤 |
| Add | `Plus` | ➕ |
| Edit | `Pencil` | ✎ |
| Delete | `Trash2` | 🗑️ |
| Close | `X` | ✕ |
| Search | `Search` | 🔍 |
| Download | `Download` | ↓ |
| Error | `AlertTriangle` | ⚠️ |
| Success | `CheckCircle` | ✅ |
| Refresh | `RefreshCw` | 🔄 |

---

## Responsive Breakpoints

| Breakpoint | Width | Layout Changes |
|------------|-------|----------------|
| Desktop | > 1024px | Full sidebar (240px), multi-column grid |
| Tablet | 768px - 1024px | Collapsed sidebar (64px icons only) |
| Mobile | < 768px | No sidebar, single column, stacked cards |

### Mobile Considerations

- Use **PWA (Progressive Web App)** for field use
- Large touch targets (min 44px × 44px)
- Red-light friendly (dark theme already supports this)
- Bottom navigation on mobile instead of sidebar

---

## Animation & Transitions

### Standard Transitions

```css
--transition-fast: 150ms ease;    /* Hover states */
--transition-normal: 250ms ease;  /* Color changes, reveals */
--transition-slow: 350ms ease;    /* Page transitions */
```

### Keyframes

**Fade In (elements appearing):**
```css
@keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}
```

**Slide In (sidebar, panels):**
```css
@keyframes slideIn {
    from { transform: translateX(-20px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
}
```

**Usage:**
```html
<div class="animate-fade-in">Content appears smoothly</div>
```

---

## Data Visualization Colors

### Chart.js / Recharts Palette

| Data Type | Color | Usage |
|-----------|-------|-------|
| Altitude | `#3b82f6` | Blue - Target altitude over time |
| SQS Score | `#22c55e` | Green - Quality score |
| Weather | `#9ca3af` | Gray - Cloud cover, humidity |
| Moon | `#fbbf24` | Yellow - Moon phase/quality |
| Target Line | `#a78bfa` | Purple - Specific target highlight |

### Chart Background
- Grid lines: `#374151` (--color-bg-elevated)
- Axis text: `#9ca3af` (--color-text-secondary)
- Chart background: transparent (inherits --color-bg-primary)

---

## Accessibility Guidelines

### Color Contrast
- All text meets **WCAG 2.1 AA** standard (4.5:1 contrast ratio)
- Primary text on surface: 4.5:1 ✓
- Secondary text on surface: 3.1:1 (use larger font for WCAG compliance)

### Focus States
```css
:focus {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
}
```

### Keyboard Navigation
- All interactive elements reachable via `Tab`
- Visible focus indicators on all focusable elements
- Skip-to-content link for screen readers

---

## Implementation Notes

### Using the CSS File

Include in your HTML prototypes:
```html
<link rel="stylesheet" href="styles.css">
```

### Tailwind Compatibility

The CSS custom properties map directly to Tailwind classes:
- `var(--color-bg-primary)` → `bg-space-900`
- `var(--color-primary)` → `bg-blue-500`
- `var(--text-lg)` → `text-lg`

### When to Use Custom CSS vs Tailwind

| Use Case | Approach |
|----------|----------|
| Prototypes (static HTML) | Custom CSS (`styles.css`) |
| React components | Tailwind utility classes + `tailwind.config.js` extending theme |
| One-off styles | Inline styles or custom CSS classes |

---

## File Structure

```
web_prototypes/
├── styles.css           # Main stylesheet (design tokens + components)
├── STYLE_GUIDE.md      # This file
├── index.html          # Dashboard prototype
├── plan.html           # Plan Generator prototype
├── target-detail.html  # Target Detail prototype
├── forecast.html       # Forecast prototype
└── assets/
    └── (images, icons, etc.)
```

---

## Quick Reference Card

```
Background:    #0a0e1a  ██████
Surface:        #111827  ██████
Primary:        #3b82f6  ██████
Success:        #22c55e  ██████
Warning:        #eab308  ██████
Danger:         #ef4444  ██████
Text Primary:   #f9fafb  ██████
Text Secondary: #9ca3af  ██████
```

---

**Last Updated:** April 2026
**Version:** 1.0
**Maintainer:** STAIRS Development Team
