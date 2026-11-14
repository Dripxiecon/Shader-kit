# 3D Symbol Shader

A three-pass GLSL 3.30 Core renderer that converts lit 3D surfaces into matching symbols. The built-in 8×12 font contains all 95 printable ASCII characters: uppercase and lowercase letters, digits, punctuation, brackets, operators, and symbols.

## Files

- `ascii3d_scene.frag` — raymarches the demo SDF scene and writes lit color plus camera-space normals.
- `symbol_select.frag` — samples each character cell and compares its light pattern against all 95 glyphs.
- `ascii3d.frag` — draws the selected glyphs at full output resolution.
- `fullscreen.vert` — full-screen triangle vertex shader shared by all three passes.
- `FONT-LICENSE.txt` — license for the DejaVu-derived raster glyph data.

## Requirements

- OpenGL 3.3 Core or newer.
- Two scene color attachments with matching dimensions.
- One symbol-selection color attachment at character-grid resolution.
- A full-resolution output target.

## Render pipeline

1. Choose a character width, for example `13` pixels. Character height is `1.4 × width`.
2. Calculate the character grid:
   - `gridWidth = ceil(screenWidth / cellWidth)`
   - `gridHeight = ceil(screenHeight / (cellWidth × 1.4))`
3. Choose a sample scale of 2 or 3. Create the scene framebuffer at:
   - `sceneWidth = gridWidth × sampleScale`
   - `sceneHeight = gridHeight × sampleScale`
4. Run `ascii3d_scene.frag` into the two scene attachments. Each character cell now contains either four (2×2) or nine (3×3) scene samples.
5. Create a one-attachment symbol framebuffer at the character-grid resolution. Run `symbol_select.frag` with the scene color and normal textures. It compares the sample pattern against the full glyph library and writes the selected glyph index in alpha plus its display color in RGB.
6. Bind the full-resolution output framebuffer and run `ascii3d.frag` with the symbol texture on texture unit 0.

The scene pass stores camera-space normals encoded from `[-1, 1]` into `[0, 1]`. The normal attachment alpha is the hit mask: 1 for geometry and 0 for background. Use nearest filtering for the low-resolution textures.

## Built-in symbol library

The shader contains 95 printable ASCII glyphs, from code point 32 (space) through 126 (tilde). This includes:

- Uppercase and lowercase A–Z.
- Digits 0–9.
- Punctuation, brackets, braces, operators, and common symbols.

Glyphs use an 8×12 bitmap atlas. The matcher compares the actual per-cell light pattern with each glyph's regional coverage instead of choosing a character from brightness alone. The optional symbol-variety control gently breaks near-equal matches so similar patterns do not always resolve to the same character.

The raster glyph data is derived from DejaVu Sans Mono Bold. Its license and notices are included in [FONT-LICENSE.txt](FONT-LICENSE.txt).

This is the complete printable ASCII set, not every Unicode character. Unicode symbol packs can be added later by extending the font atlas and coverage data.

## Scene-pass uniforms

| Uniform | Suggested value | Meaning |
| --- | ---: | --- |
| `uOutputResolution` | screen width, height | Full output size in pixels |
| `uGridResolution` | scene target width, height | Character grid multiplied by sample scale |
| `uCellSize` | `13.0` | Character width in output pixels |
| `uSampleScale` | `2` or `3` | Samples per cell on each axis |
| `uTime` | elapsed seconds | Animation clock |
| `uCameraDistance` | `5.2` | Distance from camera to target |
| `uCameraYaw` | `0.0` | Horizontal orbit angle in radians |
| `uCameraPitch` | `0.0` | Vertical orbit angle in radians; clamped to ±1.45 |
| `uCameraTarget` | `(0, -0.1, 0)` | World-space point the camera looks at |
| `uRotationSpeed` | `0.55` | Object rotation speed |
| `uAnimate` | `1` | Set to 0 to freeze object rotation |
| `uShape` | `0` | 0 sculpture, 1 sphere, 2 torus, 3 box |
| `uLightDirection` | `(-0.45, 0.8, 0.55)` | World-space light direction |
| `uAmbient` | `0.20` | Ambient light |
| `uSpecular` | `0.18` | Specular highlight strength |
| `uFog` | `0.0` | Exponential fog amount |

The scene target must be exactly `gridWidth × uSampleScale` by `gridHeight × uSampleScale`. Pass those actual target dimensions to `uGridResolution`.

## Symbol-selection uniforms

| Uniform | Suggested value | Meaning |
| --- | ---: | --- |
| `uSceneColor` | texture unit 0 | Scene color attachment |
| `uSceneNormal` | texture unit 1 | Encoded normal and hit-mask attachment |
| `uSampleScale` | `2` | Must match the scene pass; use 2 or 3 |
| `uColorMode` | `3` | 0 monochrome, 1 terminal green, 2 normal RGB, 3 full scene color |
| `uGlyphSet` | `0` | 0 balanced, 1 soft, 2 bold tone response |
| `uExposure` | `0.9` | Controls how much scene light fills glyphs |
| `uContrast` | `0.85` | Controls separation between light and dark |
| `uEdgeBoost` | `0.08` | Adds detail around surface silhouettes |
| `uSymbolVariation` | `0.35` | Stable variation between near-equal glyph matches |
| `uInvert` | `0` | Set to 1 to invert symbol density |

The selection pass runs once per character cell, not once per output pixel. It evaluates all 95 printable glyphs using the 2×2 or 3×3 scene samples.

## Final-pass uniforms

| Uniform | Suggested value | Meaning |
| --- | ---: | --- |
| `uSymbolMap` | texture unit 0 | Symbol-selection texture |
| `uCellSize` | `13.0` | Must match the scene pass |
| `uGlyphSpacing` | `0.025` | Fractional gap around each symbol cell; 0 removes the gap |
| `uGlyphBlur` | `0.45` | Softens bitmap symbol edges only; 0 keeps them crisp |
| `uBackgroundColor` | `(0, 0, 0)` | Background color |

The blur only affects the glyph bitmap. It does not blur the scene samples or camera image.

## Using your own 3D scene

The raymarcher is optional. Render your own scene into the two scene attachments:

- Color attachment: lit scene color in RGB.
- Normal attachment: camera-space normal encoded to RGB in `[0, 1]`, with alpha set to 1 for geometry and 0 for background.

Render the scene at the character-grid dimensions multiplied by the chosen sample scale, then run the symbol-selection and final passes.

## OpenGL draw setup

Use a core-profile VAO, bind the shader program, and issue:

```cpp
glDrawArrays(GL_TRIANGLES, 0, 3);
```

The vertex shader uses `gl_VertexID`, so no vertex buffer is required. The scene, selection, and final passes all use the same full-screen triangle.

## Performance notes

- **Balanced · 2×2:** four scene rays per character cell; recommended starting point for phones.
- **Detailed · 3×3:** nine scene rays per character cell; better local shape matching, with a higher raymarch cost.
- Larger character sizes reduce the number of cells and improve performance.
- The symbol comparison runs at character-grid resolution, keeping the 95-glyph search out of the full-resolution output pass.

## Android browser preview

A touch-friendly WebGL 2 preview is available for Android and modern desktop browsers.

[Open 3D Symbol Lab](https://dripxiecon.github.io/Shader-kit/web-preview/)

The preview uses the same shader files, converts their GLSL 330 headers to GLSL ES 3.00 at runtime, and redeploys automatically when this folder changes.

## Desktop preview

A desktop OpenGL preview app is included in [preview/](preview/README.md). Press **Q** to switch between 2×2 and 3×3 matching quality.

See the [preview build instructions](preview/README.md) to compile and run it.
