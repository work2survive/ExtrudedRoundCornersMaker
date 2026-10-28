# Extruded Round Corners Maker

**A native 3D/2.5D Extruded Rounded Rectangle Generator & Animator for Adobe After Effects.**

Built as a high-performance alternative to Cinema 4D / Ray-Traced rendering, **Extruded Round Corners Maker** generates mathematically precise 3D rounded rectangles using native 2D segment strips (6 to 24 segments per 90° corner arc) and independent corner radii. 

Everything is driven by live After Effects expressions parented to a single **Master Controller**, allowing full real-time animation directly on the timeline.

---

## 🚀 Key Features

### 1. Pure Classic 3D (No Cinema 4D Renderer Needed)
- Bypasses all the bugs, slow viewport rendering, and lighting limitations of the C4D renderer.
- Uses native Classic 3D vector shape layers and composition strips.
- Renders instantly in real-time, fully compatible with standard AE Cameras and Lights.

### 2. Independent Corner Control
- Set custom corner radii independently for **Top-Left**, **Top-Right**, **Bottom-Right**, and **Bottom-Left**, or toggle **Link Radii** to control all four at once.
- Built-in proportional clamping ensures corners never self-intersect or invert even if radii exceed the rectangle dimensions.

### 3. Customizable Arc Segments (6 to 24 Segments)
- Define the smoothness of each corner arc from **6 segments** (stylized / low-poly) up to **24 segments** (ultra-smooth round arch).
- **Dynamic Segment Count Toggle**: Animates the segment count directly on the timeline via a slider!

### 4. Full Extrusion & Depth Control
- **Extruded (Checkbox)**: Instantly switch between a flat 2D custom rounded rectangle and a full 3D extrusion.
- **Extrusion Depth**: Control the depth along the Z-axis. Positive values extrude forward; negative values extrude backward.

### 5. Precision Seam & Anti-Clipping Math
- **Anti-Gap Seam Overlap**: Classic 3D renderer antialiasing often creates a 1-pixel hairline gap between adjacent 3D polygons. The built-in sub-pixel seam overlap (+0.5px) completely eliminates edge gaps.
- **Cap Z-Offset (Anti Z-Fighting)**: Offsets cap layers by a microscopic 0.1px from wall edges, eliminating GPU flickering and coplanar clipping.

### 6. Timeline & Expression Animatable Colors
- Dedicated controls on the Master Controller for:
  - **Cap Top Color**
  - **Cap Bottom Color**
  - **Edge Color**
- **Cylindrical Shading Intensity**: Simulates realistic ambient light curvature around the rounded corners even without 3D scene lights.

### 7. Cap as Screen (Composition Playback & Mapping)
- Play and reproduce any composition, footage, or video on the **Top Cap**, **Bottom Cap**, or **Both Caps** (shared or separate comps).
- **Automatic Track Matte**: Screen layers are automatically alpha-matted by the exact rounded rectangle shape of the cap—no spillover or messy masks.
- **9 Alignment Presets**: Center, Top-Left, Top-Center, Top-Right, Center-Left, Center-Right, Bottom-Left, Bottom-Center, Bottom-Right.
- **Scale Modes**:
  - `Auto Fit (Inside)`: Automatically fits the comp within cap bounds preserving aspect ratio.
  - `Auto Fill (Cover)`: Fills the entire cap area, cropping excess.
  - `Stretch`: Stretches to match exact Width & Height.
  - `Manual Scale (%)`: Direct slider control.
- **X / Y Offset**: Fine-tune screen positioning in pixels.

---

## 📦 Installation

### Method A: One-Click Installer Script
1. Open Adobe After Effects.
2. Go to **File > Scripts > Run Script File...**
3. Select `installer/install_script.jsx`.
4. The installer will copy `ExtrudedRoundCornersMaker.jsx` into your `Scripts/ScriptUI Panels/` directory.
5. Restart After Effects. The tool will appear under the **Window** menu.

### Method B: Manual Installation
Copy `ExtrudedRoundCornersMaker.jsx` directly into your After Effects ScriptUI Panels directory:
- **Windows**: `C:\Program Files\Adobe\Adobe After Effects <version>\Support Files\Scripts\ScriptUI Panels\`
- **macOS**: `/Applications/Adobe After Effects <version>/Scripts/ScriptUI Panels/`

Restart After Effects and open:
**Window > ExtrudedRoundCornersMaker.jsx**

---

## 🎛️ Master Controller Parameter Reference

When a rig is created, all parameters are exposed on the **Master Controller** Null layer under **Effect Controls**:

| Group | Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Geometry** | `Extruded` | Checkbox | `ON` | Toggles 3D extrusion on/off. |
| | `Width` | Slider | `600` | Total rectangle width in pixels. |
| | `Height` | Slider | `400` | Total rectangle height in pixels. |
| | `Link Radii` | Checkbox | `ON` | Links all 4 corners to `Radius All`. |
| | `Radius All` | Slider | `80` | Corner radius when linked. |
| | `Radius Top-Left` | Slider | `80` | Independent TL radius. |
| | `Radius Top-Right` | Slider | `80` | Independent TR radius. |
| | `Radius Bottom-Right`| Slider | `80` | Independent BR radius. |
| | `Radius Bottom-Left` | Slider | `80` | Independent BL radius. |
| **Extrusion** | `Extrusion Depth` | Slider | `60` | Depth along Z. Supports negative values. |
| | `Corner Segments` | Slider | `12` | Segments per corner (6 - 24). |
| | `Seam Overlap (px)` | Slider | `0.5` | Sub-pixel overlap preventing gaps. |
| | `Cap Z-Offset (px)` | Slider | `0.1` | Z-offset preventing Z-fighting. |
| **Colors** | `Cap Top Color` | Color | `#1E88E5` | Color of the front/top cap. |
| | `Cap Bottom Color` | Color | `#0D47A1` | Color of the back/bottom cap. |
| | `Edge Color` | Color | `#1565C0` | Base color of the side walls. |
| | `Shading Intensity` | Slider | `15` | Cylindrical lighting falloff on arcs. |
| **Front Screen**| `Front Screen Enabled` | Checkbox | `OFF/ON` | Toggles front composition playback. |
| | `Front Screen Alignment`| Slider | `0` (Center) | 0: Center, 1: TL, 2: TC, 3: TR, 4: CL, 5: CR, 6: BL, 7: BC, 8: BR. |
| | `Front Screen Offset` | Point | `[0, 0]` | X and Y pixel offset. |
| | `Front Screen Scale Mode`| Slider | `1` (Fit) | 0: Manual, 1: Fit, 2: Fill, 3: Stretch. |
| | `Front Screen Scale` | Slider | `100%` | Manual scale percentage. |
| | `Front Screen Opacity` | Slider | `100%` | Screen opacity. |
| **Back Screen** | `Back Screen Enabled` | Checkbox | `OFF/ON` | Toggles back composition playback. |
| | `Back Screen Alignment` | Slider | `0` (Center) | Alignment preset for back screen. |
| | `Back Screen Offset` | Point | `[0, 0]` | Back screen X and Y pixel offset. |
| | `Back Screen Scale Mode`| Slider | `1` (Fit) | Back scale mode. |
| | `Back Screen Scale` | Slider | `100%` | Back scale percentage. |
| | `Back Screen Opacity` | Slider | `100%` | Back screen opacity. |

---

## ⚡ Built-in Presets

The ScriptUI panel includes one-click presets for common design assets:
1. **Smartphone Mockup**: 450x920px with 75px radius, 35px depth, front screen active.
2. **Credit / ID Card**: 856x540px with 32px radius, 8px depth, gold finish.
3. **Rounded 3D Tile**: 500x500px with 60px radius, 80px depth, green theme.
4. **UI Button Pill**: 360x100px with 50px radius, 25px depth, vibrant orange gradient.
5. **Sharp Corner Box**: 500x350px with 0px radius, 120px depth.

---

## 🛠️ ZXP Packaging & Marketplace Publishing

For packaging instructions and submission guidelines for **Adobe Developer Console** and **aescripts.com**, see:
[build_zxp/ZXP_PACKAGING_GUIDE.md](file:///g:/My%20Drive/_openProjects/Extruded_round_corners_corners/build_zxp/ZXP_PACKAGING_GUIDE.md)

---

## 📄 License
MIT License. Free to use, modify, and distribute.
