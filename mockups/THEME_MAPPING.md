# STAIRS Theme Mapping - v1 & v2 Compatibility

## Goal
Allow swapping between v1 (original) and v2 (cyber) themes by using consistent class names.

## Class Name Mapping

| Component | v1 (Original) | v2 (Cyber/Glass) | Unified Class |
|-----------|----------------|------------------|---------------|
| Sidebar | `sidebar` | `sidebar` / `cyber-sidebar` | `sidebar` |
| Sidebar Item | `sidebar-item` | `sidebar-item` | `sidebar-item` |
| Cards | `card` | `glass-card` / `holo-card` | `card` |
| Badges | `badge` | `badge` | `badge` |
| Buttons (Primary) | `btn` | `cyber-btn` | `btn-primary` |
| Main Content | `flex-1 p-8` | `main-content` | `main-content` |
| Title (Page) | `text-3xl font-bold mb-2` | `neon-text-* / glitch` | `page-title` |
| Section Title | `text-xl font-semibold` | `font-display` | `section-title` |
| Stats Grid | `grid grid-cols-3 gap-6` | `metrics-grid` | `stats-grid` |
| Target Grid | (none) | `target-grid` | `target-grid` |
| Filter Button | (none) | `filter-chip` | `filter-chip` |

## Implementation Plan

### For v2 HTML files:
1. Add `card` class alongside `glass-card` / `holo-card` (v2 styles)
2. Use `sidebar` consistently (already done)
3. Add `main-content` class to main content divs
4. Add `page-title` and `section-title` classes

### CSS Files:
- `v1-theme.css` - Original dark theme styles (using `card`, `sidebar`, etc.)
- `v2-cyber-theme.css` - Cyber theme styles (using same class names, different look)
- `v2-glass-theme.css` - Glass morphism theme (alternative v2 style)

### Usage:
```html
<!-- In HTML head -->
<link rel="stylesheet" href="shared/v1-theme.css" id="theme-css">
<!-- or -->
<link rel="stylesheet" href="shared/v2-cyber-theme.css" id="theme-css">

<!-- To switch themes via JS -->
<script>
document.getElementById('theme-css').href = 'shared/v2-cyber-theme.css';
</script>
```
