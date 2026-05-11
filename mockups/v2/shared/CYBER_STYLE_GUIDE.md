# STAIRS Cyber Theme - Style Guide

## Overview

The **Cyber Theme** is a futuristic, neon-inspired design system created for the Sky Visualization mockup. It features a dark space aesthetic with vibrant neon accents, holographic effects, and cyberpunk-inspired UI elements. This theme is designed to feel like a high-tech heads-up display (HUD) from a sci-fi spacecraft.

---

## Color Palette

### Neon Colors (Primary Accents)

| Token | Hex Code | RGB | Usage |
|-------|----------|-----|-------|
| `--neon-blue` | `#00d4ff` | 0, 212, 255 | Primary actions, interactive elements, data visualization |
| `--neon-purple` | `#bf00ff` | 191, 0, 255 | Secondary accents, highlights, gradients |
| `--neon-pink` | `#ff00ff` | 255, 0, 255 | Tertiary accents, special states |
| `--neon-green` | `#00ff88` | 0, 255, 136 | Success states, positive metrics |

### Background Colors

| Token | Hex Code | Usage |
|-------|----------|-------|
| `--deep-space` | `#050510` | Main page background (near-black with blue tint) |
| `--space-dark` | `#0a0a1a` | Alternative dark surface |
| `--space-surface` | `rgba(5, 5, 16, 0.9)` | Glass card surfaces |
| `--space-surface-light` | `rgba(10, 10, 30, 0.95)` | Lighter surface variant |

### Text Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--text-primary` | `#ffffff` | Headings, main text |
| `--text-secondary` | `rgba(255, 255, 255, 0.5)` | Labels, secondary information |
| `--text-muted` | `rgba(255, 255, 255, 0.3)` | Disabled states, placeholders |

---

## Typography

### Font Families

| Token | Font Stack | Usage |
|-------|-----------|-------|
| `--font-display` | `'Orbitron', sans-serif` | Headings, buttons, sidebar, all caps text |
| `--font-body` | `'Rajdhani', sans-serif` | Body text, descriptions |
| `--font-mono` | `'Courier New', Courier, monospace` | Data streams, telemetry, code |

### Type Scale

| Class | Size | Weight | Font | Usage |
|-------|------|--------|------|-------|
| `text-hero` | 48px | 900 | Orbitron | Main page hero titles |
| `text-2xl` | 24px | 700 | Orbitron | Section headings |
| `text-xl` | 18px | 700 | Orbitron | Card titles |
| `text-lg` | 16px | 600 | Rajdhani | Emphasized body text |
| `text-base` | 14px | 400 | Rajdhani | Default body text |
| `text-sm` | 12px | 500 | Rajdhani | Labels, captions |
| `text-xs` | 11px | 400 | Courier New | Data stream text |

### Letter Spacing

- **Headings & Buttons:** `2px` (`.tracking-wide`)
- **Subtitles & Labels:** `3px` (`.tracking-wider`)
- **Uppercase Elements:** `1px` (sidebar items)

---

## Component Library

### 1. Cyber Sidebar

**Class:** `.cyber-sidebar`

A fixed sidebar with a dark gradient background, animated scanline effect, and glowing border.

**Key Features:**
- Gradient background: `linear-gradient(180deg, var(--space-surface) 0%, var(--space-surface-light) 100%)`
- Right border animation (scanline) moves top to bottom every 3s
- Items have a sliding highlight effect on hover
- Active state shows left border accent + background glow

**Usage:**
```html
<div class="cyber-sidebar">
    <div class="cyber-sidebar-header">
        <div class="cyber-logo">
            <span class="neon-text-blue">S</span><span class="neon-text-purple">T</span>...
        </div>
    </div>
    <nav>
        <div class="sidebar-item active">...</div>
    </nav>
</div>
```

---

### 2. Holographic Card

**Class:** `.holo-card`

A card with a rotating conic gradient border that creates a holographic effect.

**Key Features:**
- Conic gradient rotates 360° over 10s (infinite)
- Glass morphism background with backdrop blur
- Hover state increases border opacity and adds glow
- All child elements positioned relative to appear above the animation

**CSS Animation:**
```css
@keyframes holo-rotate {
    100% { transform: rotate(360deg); }
}
```

**Usage:**
```html
<div class="holo-card">
    <!-- Content here is above the rotating gradient -->
</div>
```

---

### 3. Neon Text Effects

**Classes:** `.neon-text-blue`, `.neon-text-purple`, `.neon-text-pink`, `.neon-text-green`

Text with multiple layered `text-shadow` to create a neon glow effect.

**Blue Example:**
```css
.neon-text-blue {
    color: #00d4ff;
    text-shadow:
        0 0 10px #00d4ff,
        0 0 20px #00d4ff,
        0 0 40px #00d4ff;
}
```

---

### 4. Cyber Button

**Class:** `.cyber-btn`

A button with a gradient background, expanding circle hover effect, and neon border.

**Key Features:**
- Gradient background: `linear-gradient(135deg, rgba(0,212,255,0.2), rgba(191,0,255,0.2))`
- On hover: circle expands from center with `::before` pseudo-element
- Glow shadow appears on hover
- Slight scale increase (1.05x)

**Usage:**
```html
<button class="cyber-btn">
    <i data-lucide="download"></i>
    Export Data
</button>
```

---

### 5. Radial Progress

**Class:** `.radial-progress`

A circular progress indicator using `conic-gradient` and CSS custom property `--progress`.

**CSS:**
```css
.radial-progress {
    background: conic-gradient(from 0deg, var(--neon-blue) var(--progress), rgba(0,212,255,0.1) var(--progress));
}
```

**Usage:**
```html
<div class="radial-progress" style="--progress: 72%;">
    <span>72%</span>
</div>
```

---

### 6. Metric Card

**Class:** `.metric-card`

A card for displaying metrics with a gradient top border line.

**Key Features:**
- Subtle background tint matching neon-blue
- `::after` pseudo-element creates animated gradient line at top
- Typically contains a radial progress or icon + large number

**Usage:**
```html
<div class="metric-card">
    <div class="radial-progress" style="--progress: 72%;">
        <span>72%</span>
    </div>
</div>
```

---

### 7. Data Stream

**Class:** `.data-stream`

Terminal/monospace style text for displaying telemetry data.

**Key Features:**
- Uses Courier New monospace font
- Small font size (11px)
- Line height of 1.8 for readability
- `.highlight` class for emphasized values

**Usage:**
```html
<div class="data-stream">
    <div><span class="highlight">ALT:</span> 42.3° ↗</div>
    <div><span class="highlight">AZ:</span> 187.6°</div>
</div>
```

---

### 8. Floating Orbs

**Class:** `.orb`

Large, blurred gradient circles that float around the background for ambient atmosphere.

**Key Features:**
- `filter: blur(40px)` creates soft glow
- Float animation moves in a triangular path
- Purely decorative, `pointer-events: none`

**CSS Animation:**
```css
@keyframes float {
    0%, 100% { transform: translate(0, 0) scale(1); }
    33% { transform: translate(30px, -30px) scale(1.1); }
    66% { transform: translate(-20px, 20px) scale(0.9); }
}
```

**Usage:**
```html
<div class="orb" style="
    width: 400px;
    height: 400px;
    background: rgba(0,212,255,0.1);
    top: 10%;
    right: 10%;
    animation-delay: 0s;
"></div>
```

---

## Animations

### Glitch Effect

Simulates a digital glitch with random positioning shifts.

```css
@keyframes glitch {
    0%, 90%, 100% { transform: translate(0); }
    91% { transform: translate(-2px, 2px); }
    92% { transform: translate(2px, -2px); }
    93% { transform: translate(-2px, -2px); }
    94% { transform: translate(2px, 2px); }
}
```

**Usage:** Add `.glitch` class to any element.

---

### Scanline

Vertical line that moves from top to bottom continuously.

```css
@keyframes scanline {
    0% { transform: translateY(-100%); }
    100% { transform: translateY(100%); }
}
```

Used on the sidebar's right border.

---

### Pulse Line

Opacity pulse for constellation lines.

```css
@keyframes pulse-line {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 1; }
}
```

---

## Layout Patterns

### Metrics Grid (4-Column)

```html
<div class="metrics-grid">
    <div class="metric-card">...</div>
    <div class="metric-card">...</div>
    <div class="metric-card">...</div>
    <div class="metric-card">...</div>
</div>
```

### Two-Column Layout (2:1 Ratio)

```html
<div class="two-col-layout">
    <div class="holo-card">Main Content (2/3)</div>
    <div>Side Panel (1/3)</div>
</div>
```

### Target Grid (Responsive)

```html
<div class="target-grid">
    <div class="holo-card">...</div>
    <div class="holo-card">...</div>
    <div class="holo-card">...</div>
</div>
```

Grid auto-fills with minmax(280px, 1fr).

---

## Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | 5px | Minimal gaps |
| `--space-sm` | 10px | Small padding |
| `--space-md` | 15px | Standard padding |
| `--space-lg` | 25px | Large padding |
| `--space-xl` | 40px | Section padding |

---

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 8px | Buttons, small elements |
| `--radius-md` | 12px | Medium cards |
| `--radius-lg` | 16px | Large cards |
| `--radius-xl` | 20px | Holographic cards |
| `--radius-full` | 50% | Circles (orbs, progress) |

---

## Real-Time Effects

### Star Field Canvas

The `#starfield` canvas uses JavaScript to render 300 animated stars with:
- Random positioning
- Variable sizes (0-2px)
- Opacity fluctuation
- Downward movement with reset

### Glass Morphism

Used throughout with:
```css
backdrop-filter: blur(20px);
background: linear-gradient(135deg, rgba(0,212,255,0.05), rgba(191,0,255,0.05));
border: 1px solid rgba(0,212,255,0.3);
```

---

## Implementation Notes

1. **Load Google Fonts** in `<head>`:
   ```html
   <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&family=Rajdhani:wght@300;400;500;600;700&display=swap" rel="stylesheet">
   ```

2. **Load Cyber Theme CSS** after fonts:
   ```html
   <link rel="stylesheet" href="shared/cyber-theme.css">
   ```

3. **Initialize Lucide Icons** (if using):
   ```html
   <script src="https://unpkg.com/lucide@latest"></script>
   <script>lucide.createIcons();</script>
   ```

4. **Star Field Animation** requires the JavaScript from `sky-visualization.html`.

---

## Design Principles

1. **High Contrast** - Neon colors pop against near-black backgrounds
2. **Layered Depth** - Multiple z-index layers create visual hierarchy
3. **Continuous Motion** - Subtle animations keep the UI feeling "alive"
4. **Glow Hierarchy** - More important elements have stronger glow
5. **Sci-Fi Aesthetic** - Every element should feel like it belongs in a spacecraft

---

## DOs and DON'Ts

### DO:
- Use neon colors sparingly for maximum impact
- Maintain the dark background (#050510) for authenticity
- Use Orbitron for anything "important" or "technical"
- Add hover effects to interactive elements
- Keep animations subtle (except for decorative elements)

### DON'T:
- Use more than 2 neon colors in close proximity
- Apply glitch effects to body text (readability)
- Use bright backgrounds (breaks the theme)
- Over-animate (performance + distraction)
- Forget `pointer-events: none` on decorative elements

---

## Browser Support

- **Chrome/Edge:** Full support
- **Firefox:** Full support (may need `-moz-` prefixes for some backdrop-filter)
- **Safari:** Full support
- **Mobile:** Responsive layout included, but effects may be reduced for performance

---

## Credits

Inspired by:
- Cyberpunk 2077 UI
- Star Trek LCARS interfaces
- Elite Dangerous HUD
- TRON: Legacy visual style

---

*Last updated: April 2026*
