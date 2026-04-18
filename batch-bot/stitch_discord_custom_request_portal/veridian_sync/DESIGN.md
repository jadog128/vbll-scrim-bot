# Design System Specification: High-End Request Management

## 1. Overview & Creative North Star
**Creative North Star: The Lucid Conservatory**

This design system is built upon the tension between organic growth and surgical precision. It rejects the "flat SaaS" status quo in favor of an editorial-inspired landscape where data feels cultivated rather than merely displayed. By blending deep forest greens with sun-lit yellows, we create a workspace that feels calm, authoritative, and sophisticated.

The system breaks the standard "grid-block" template through **Intentional Depth**. We move away from the traditional 1px stroke-based containment, instead using layered tonal surfaces and expansive white space to guide the eye. It is designed to feel like a high-end physical dashboard—tactile, responsive, and unmistakably premium.

## 2. Colors & Tonal Architecture
The palette is a sophisticated interplay of deep "Deep Moss" (Primary) and "Radiant Saffron" (Secondary), grounded by a series of bone and parchment neutrals.

### The "No-Line" Rule
**Strict Mandate:** Designers are prohibited from using 1px solid borders to section off UI components. 
Structure must be achieved through:
- **Tonal Shifts:** Placing a `surface_container_low` card atop a `surface` background.
- **Negative Space:** Using the spacing scale to create distinct visual groups.
- **Elevation:** Using soft, ambient shadows to imply separation.

### Surface Hierarchy & Nesting
Treat the UI as physical layers of fine paper.
*   **Base:** `surface` (#f9f9f8) for the main application background.
*   **Sectioning:** `surface_container_low` (#f3f4f3) for sidebar regions or secondary panels.
*   **Interaction Layer:** `surface_container_lowest` (#ffffff) for primary content cards and data modules.
*   **Highlight Layer:** `surface_container_highest` (#e1e3e2) for navigation hover states or active selection indicators.

### The "Glass & Gradient" Rule
To elevate the "SaaS" aesthetic, use Glassmorphism for floating elements (e.g., Discord admin popovers or notification overlays).
*   **Implementation:** Use a semi-transparent `surface` color (80% opacity) with a `20px` backdrop-blur.
*   **Signature Textures:** For high-impact data visualizations or primary CTAs, utilize a subtle linear gradient from `primary` (#002e20) to `primary_container` (#0b4633) at a 135-degree angle.

## 3. Typography
We utilize **Plus Jakarta Sans** across the entire system. It provides a geometric clarity that feels modern yet approachable.

*   **Display (lg/md/sm):** Used for "Hero" stats or welcome greetings. Set with `-0.02em` letter spacing to feel "tight" and editorial.
*   **Headline (lg/md/sm):** Used for dashboard section titles. These are the anchors of the page.
*   **Title (lg/md/sm):** Reserved for card headers and modal titles. Always use `on_surface` (#191c1c).
*   **Body (lg/md/sm):** The workhorse of the system. `body-md` is the default for most request management data.
*   **Label (md/sm):** Used for micro-copy, Discord timestamps, and metadata. These should often use `on_surface_variant` (#404944) for hierarchy.

**Hierarchy Note:** Always contrast a `headline-md` title with a `label-md` uppercase subtitle to create a professional, "published" look.

## 4. Elevation & Depth
Elevation is communicated through **Tonal Layering** rather than structural lines.

### The Layering Principle
Do not use shadows for every card. If a card sits on the main background, use the `surface_container_lowest` color. The subtle shift from `#f9f9f8` to `#ffffff` is enough to define the boundary for a sophisticated eye.

### Ambient Shadows
When a "floating" effect is required (e.g., a dragging request card or a Discord admin modal):
*   **Blur:** `32px` to `64px`.
*   **Opacity:** `4%` to `8%`.
*   **Color:** Use a tinted shadow (a darkened version of `primary`) rather than pure black. This creates a more natural, "lush" depth.

### The "Ghost Border" Fallback
If accessibility requirements demand a border (e.g., in high-contrast modes), use a **Ghost Border**:
*   Token: `outline_variant` at **15% opacity**.
*   This ensures the boundary is felt, but not seen as a harsh "box."

## 5. Components

### Buttons
*   **Primary:** Gradient fill (`primary` to `primary_container`), white text, `xl` roundedness (1.5rem).
*   **Secondary:** `secondary_container` fill with `on_secondary_container` text.
*   **Tertiary:** No fill, `on_surface` text, with a subtle `surface_variant` background on hover.

### Request Cards
*   **Layout:** No dividers. Use `title-sm` for the request name and `body-sm` for the description. 
*   **Status Indicators:** Use `secondary` (Yellow) for "Pending" and `primary_fixed` (Light Green) for "Completed."
*   **Nesting:** Place the request status in a `chip` format using `sm` roundedness.

### Data Visualization (The "SaaS" Pulse)
*   **Charts:** Use `primary` and `secondary` for high-contrast data points.
*   **Progress Bars:** Use a `surface_container_highest` track with a `primary` fill. No borders; use rounded `full` ends.

### Discord-Integrated Admin Panel
*   **Message Bubbles:** Use `surface_container_low` for incoming and `primary_container` for outgoing.
*   **Integration Chips:** Small `label-sm` chips that denote "Verified Discord User" using the `tertiary` color family.

### Input Fields
*   **Default:** `surface_container_lowest` background. 
*   **Focus State:** A 2px "Ghost Border" using `primary` at 30% opacity. No harsh glow; just a soft tonal shift.

## 6. Do's and Don'ts

### Do
*   **DO** use whitespace as a separator. If you think you need a line, try adding 16px of padding instead.
*   **DO** use asymmetrical layouts for dashboards (e.g., a wide primary feed and a narrow high-context sidebar).
*   **DO** leverage the "Yellow" (`secondary`) sparingly as an accent to draw attention to critical "Action Required" requests.

### Don't
*   **DON'T** use 100% black text. Always use `on_surface` (#191c1c) to maintain the soft, sophisticated palette.
*   **DON'T** use sharp corners. Every element should follow the `roundedness` scale, favoring `lg` and `xl` for a friendly SaaS feel.
*   **DON'T** clutter the Discord admin panel with borders. Let the avatars and typography define the flow of conversation.