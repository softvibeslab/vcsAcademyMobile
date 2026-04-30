# Design System Document: High-Performance Editorial

## 1. Overview & Creative North Star
### The High-Performance Vault
This design system is engineered to move away from the cluttered, utility-first appearance of standard CRM tools toward a "High-End Editorial" experience. The Creative North Star is **The High-Performance Vault**: an environment that feels like a private executive lounge—secure, exclusive, and quiet.

We achieve this through **Intentional Asymmetry** and **Grand Spacing**. We do not fill the screen; we curate it. By using 2-3x the standard padding, we signal that the data within is high-value. The UI does not shout; it resonates through depth, tonal shifts, and the strategic "glow" of achievement.

---

## 2. Colors & Surface Architecture
The palette is rooted in deep obsidian and navy tones, punctuated by gold to signify "Peak Performance."

### The "No-Line" Rule
Standard apps use borders to separate content. This system prohibits 1px solid borders for sectioning. Boundaries are defined strictly through **Background Color Shifts**. A `surface-container-low` card sitting on a `surface` background creates a natural, sophisticated edge without the visual noise of a line.

### Surface Hierarchy & Nesting
Treat the UI as physical layers of stacked obsidian. 
- **Base Layer:** `surface` (#131317) or `surface-container-lowest` (#0e0e12).
- **Secondary Sections:** `surface-container-low` (#1b1b20).
- **Interactive Cards:** `surface-container` (#201f24).
- **High-Focus Overlays:** `surface-container-highest` (#353439).

### Signature Textures (Glass & Gradient)
To provide "visual soul," use the **Navy Gradient Rule**. Backgrounds should never be a flat hex. Apply a subtle radial gradient: `surface` transitioning into a deep `secondary_container` (#264191) at a 15% opacity in the corners to mimic professional studio lighting.

---

## 3. Typography
We utilize **DM Sans** as our sole typeface, relying on extreme scale and weight contrast to establish an authoritative editorial hierarchy.

| Level | Size | Weight | Role |
| :--- | :--- | :--- | :--- |
| **Display-LG** | 3.5rem | Bold | Hero metrics (e.g., Total Revenue) |
| **Headline-MD** | 1.75rem | Bold | Page titles and primary section headers |
| **Title-MD** | 1.125rem | Medium | Card titles and navigational anchors |
| **Body-LG** | 1rem | Regular | Primary data points and descriptions |
| **Label-MD** | 0.75rem | Medium | Meta-data, timestamps, and micro-copy |

**Editorial Note:** Use `on_surface_variant` (#d0c5af) for secondary labels to create a muted, sophisticated contrast against the `primary` gold accents.

---

## 4. Elevation & Depth
In this system, depth is a narrative tool. We use **Tonal Layering** to guide the eye.

### The Layering Principle
Instead of drop shadows, "stack" your tiers. A `surface_container_high` element should only ever sit on a `surface_container` or lower. This creates a natural "lift."

### Ambient Shadows
For floating elements (Modals/Poppers), use an **Ambient Glow**:
- **Blur:** 40px - 60px
- **Color:** A 6% opacity version of `primary` (#f2ca50) to simulate the gold reflecting off the dark surface.
- **Y-Offset:** 20px

### The Ghost Border Fallback
If a container requires a defined edge for accessibility, use a **Ghost Border**: `outline_variant` (#4d4635) at **15% opacity**. This provides a hint of structure without breaking the seamless editorial flow.

---

## 5. Components

### Buttons: The Achievement CTAs
- **Primary:** Gradient fill from `primary_container` (#d4af37) to `primary` (#f2ca50). 12px vertical / 32px horizontal padding.
- **Secondary:** Transparent background with a `Ghost Border`. Text color: `primary`.
- **States:** On hover, apply a `primary` glow (8px blur, 20% opacity) to signify the "Gold Standard" of the action.

### Cards: The Data Vessels
Cards must never have dividers. Use `surface_container_low` and generous internal padding (min. 24px). If multiple data sets exist in one card, separate them with a 32px vertical gap, not a line.

### Input Fields: The Focused Entry
Inputs should be `surface_container_lowest` with a bottom-only `Ghost Border`. When active, the border transitions to a 1px `primary` (Gold) line with a subtle gold outer glow.

### Achievement Chips
Small, high-contrast pills used for status (e.g., "Closed-Won"). Use `secondary_container` (#264191) with `on_secondary_container` (#9db2ff) text. The corners should always be `full` (9999px) for a modern, tech-forward feel.

---

## 6. Do’s and Don’ts

### Do
- **Embrace White Space:** Use 48px or 64px gaps between major sections. Space is a luxury; use it.
- **Use "Metric Heroes":** Make the most important number on the screen (e.g., Sales Target) massive (Display-LG) and Gold.
- **Subtle Motion:** Use 300ms "Ease-Out" transitions for all hover states to maintain a premium, fluid feel.

### Don’t
- **No Sharp Corners:** Never use 0px radius. Use `xl` (0.75rem) for cards and `md` (0.375rem) for smaller elements.
- **No Pure White:** Never use #FFFFFF. It is too harsh for a dark luxury system. Always use `on_background` (#e5e1e8).
- **No Grids of Containers:** Avoid "boxy" layouts. Let elements breathe. If three cards are in a row, ensure the background creates the separation, not a border.

---

## Director's Closing Note
Remember, this system is for high-performers. They don't need a cluttered dashboard; they need a cockpit that feels like a reward for their hard work. Every pixel must feel intentional. If an element doesn't serve a purpose or add to the "Vault" aesthetic, remove it.