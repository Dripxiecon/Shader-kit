# 3D ASCII Shader

A two-pass GLSL 3.30 Core renderer that turns lit 3D surfaces into animated ASCII characters. It includes a raymarched demo scene and a separate ASCII post-process pass that can also be fed by another renderer.

## Files

- \`ascii3d_scene.frag\` — raymarches a small SDF scene and writes color plus camera-space normals to two render targets.
- \`ascii3d.frag\` — converts those render targets into 5×7 ASCII glyphs.
- \`fullscreen.vert\` — full-screen triangle vertex shader, shared by both passes.

## Requirements

- OpenGL 3.3 Core or newer.
- Two color attachments for the scene pass (RGBA8 or preferably RGBA16F).
- A full-resolution target for the ASCII pass.
- The scene color and normal textures must have matching dimensions.

## Render pipeline

1. Choose a character width in pixels, for example \`12\`. Character height is \`1.4 × width\`.
2. Calculate the character-grid size:
   - \`gridWidth = ceil(screenWidth / cellWidth)\`
   - \`gridHeight = ceil(screenHeight / (cellWidth × 1.4))\`
3. Bind a framebuffer with two color attachments sized to that grid.
4. Draw a full-screen triangle with \`fullscreen.vert\` + \`ascii3d_scene.frag\`. Set the scene uniforms below.
5. Bind the full-resolution output framebuffer. Bind scene color to texture unit 0 and scene normals to texture unit 1.
6. Draw a full-screen triangle with \`fullscreen.vert\` + \`ascii3d.frag\`.

The scene pass stores camera-space normals encoded from \`[-1, 1]\` into \`[0, 1]\`. The normal attachment alpha is the hit mask: 1 for geometry and 0 for background. Keep the two attachments at the same grid resolution.

## Scene-pass uniforms

| Uniform | Suggested value | Meaning |
| --- | ---: | --- |
| \`uOutputResolution\` | screen width, height | Full output size in pixels |
| \`uGridResolution\` | grid width, height | Scene render-target size |
| \`uCellSize\` | \`12.0\` | Character width in pixels |
| \`uTime\` | elapsed seconds | Animation clock |
| \`uCameraDistance\` | \`5.2\` | Camera distance |
| \`uRotationSpeed\` | \`0.55\` | Object rotation speed |
| \`uAnimate\` | \`1\` | Set to 0 to freeze rotation |
| \`uShape\` | \`0\` | 0 sculpture, 1 sphere, 2 torus, 3 box |
| \`uLightDirection\` | \`(-0.45, 0.8, 0.55)\` | World-space light direction |
| \`uAmbient\` | \`0.20\` | Ambient light |
| \`uSpecular\` | \`0.18\` | Specular highlight strength |
| \`uFog\` | \`0.0\` | Exponential fog amount |

## ASCII-pass uniforms

| Uniform | Suggested value | Meaning |
| --- | ---: | --- |
| \`uSceneColor\` | texture unit 0 | Scene color attachment |
| \`uSceneNormal\` | texture unit 1 | Encoded normal and hit-mask attachment |
| \`uCellSize\` | \`12.0\` | Must match the scene pass |
| \`uColorMode\` | \`3\` | 0 monochrome, 1 terminal green, 2 normal RGB, 3 full scene color |
| \`uGlyphSet\` | \`0\` | 0 classic, 1 softer density, 2 bolder density |
| \`uExposure\` | \`1.15\` | Glyph density exposure |
| \`uContrast\` | \`1.0\` | Glyph density contrast |
| \`uEdgeBoost\` | \`0.25\` | Adds character density around silhouettes |
| \`uInvert\` | \`0\` | Set to 1 to invert glyph density |
| \`uBackgroundColor\` | \`(0, 0, 0)\` | Background color |

The default look is full-color ASCII. Change \`uColorMode\` at runtime to switch styles without recompiling.

## Built-in glyph ramp

The shader uses a compact 5×7 bitmap font with this dark-to-bright ramp:

\`\`\`text
 .:-=+*#%@
\`\`\`

The glyph-set setting changes how quickly the ramp fills in; the glyph shapes stay fixed so the shader remains self-contained and does not need a font atlas.

## Using your own 3D scene

The ASCII pass is independent of the demo geometry. Render your own scene into the two low-resolution attachments:

- Color attachment: lit scene color in RGB.
- Normal attachment: camera-space normal encoded to RGB in \`[0, 1]\`, with alpha set to 1 for geometry and 0 for background.

Then run \`ascii3d.frag\` as the full-resolution post-process pass. The demo raymarcher is optional.

## OpenGL draw setup

Use a core-profile VAO, bind the shader program and issue:

\`\`\`cpp
glDrawArrays(GL_TRIANGLES, 0, 3);
\`\`\`

The vertex shader uses \`gl_VertexID\`, so no vertex buffer is required. Set the uniforms explicitly for both passes. Use nearest filtering for the low-resolution scene textures to keep character cells stable.

## Performance notes

The raymarcher runs once per character cell, rather than once per output pixel. Start with a cell width of 10–16 pixels. Larger cells reduce raymarch cost and create a chunkier terminal look.

## Interactive preview

A desktop OpenGL preview app is included in [preview/](preview/README.md). It loads these shader files directly, builds the two-pass render pipeline, and provides keyboard controls for live tweaking.

See the [preview build instructions](preview/README.md) to compile and run it.
