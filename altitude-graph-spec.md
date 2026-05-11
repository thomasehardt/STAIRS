# Altitude Graph Mockup Specification

## Task
Create a self-contained HTML mockup of a sky object altitude graph over time, meeting all requirements below.

## Core Requirements

### Data & Curve
- **X-axis**: Time from 6 AM to 6 PM (sunrise to sunset)
- **Y-axis**: Altitude in degrees, fixed range 0° (horizon) to 90° (zenith)
- **Altitude curve**: Sine wave peaking at 90° at noon (12 PM), starting and ending at 0°
- No altitudes below 0° should be displayed (clip all negative values to 0)

### Line Styling
The altitude line must be **continuous with no gaps** at style boundaries. Style segments based on altitude:
| Altitude Range | Line Width | Color | Description |
|---------------|------------|-------|-------------|
| 0° – 30° | 1px | Gray (`#808080`) | Below desired range |
| 30° – 80° | 3px | Blue (`#1f77b4`) | Desired observation range |
| 80° – 90° | 1px | Gray (`#808080`) | Above desired range |

Use segment-based styling (single dataset with per-segment styling) to avoid line gaps.

### Reference Lines (Horizontal Dashed Lines)
Draw dashed horizontal lines at the following altitudes with labels:
| Altitude | Line Color | Line Width | Dash Pattern | Label Text | Label Position |
|----------|------------|-------------|--------------|-------------|----------------|
| 30° (min) | `#666` | 2px | [8, 4] | "30° (min)" | Left side, above line |
| 80° (max) | `#666` | 2px | [8, 4] | "80° (max)" | Left side, above line |
| 90° (peak) | `#999` | 1px | [3, 3] | "90° (peak)" | Left side, above line |

### Shading
Add a semi-transparent blue shaded region between 30° and 80° on the Y-axis to visually highlight the desired range:
- Fill color: `rgba(31, 119, 180, 0.1)`

### Axes Formatting
- Y-axis: Labeled "Altitude (degrees)", fixed 0-90 range
- X-axis: Labeled "Time", ticks formatted as 12-hour time (e.g., "6 AM", "7 AM", ..., "6 PM")

## Implementation Notes
- Deliver a single self-contained HTML file (no external dependencies beyond CDN-hosted charting library)
- Use a widely supported JS charting library (Chart.js, Recharts, etc.)
- Ensure reference lines and shading are drawn as overlays/annotations
- The line must not have gaps at 30° or 80° boundaries

## Expected Output
A working HTML file that renders the altitude graph correctly when opened in a modern web browser.
