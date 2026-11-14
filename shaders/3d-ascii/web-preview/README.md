# Android / Browser Preview

This is a mobile-friendly WebGL 2 preview for the 3D ASCII shader. It runs in a modern Android browser (such as current Chrome) and does not require a native app, CMake, or a desktop computer.

## Open on Android

Open the published preview:

https://dripxiecon.github.io/Shader-kit/web-preview/

The page loads the shader source files from the same published site, so it does not need a third-party shader proxy.

The preview is published with GitHub Pages. The deployment workflow publishes only the 3D ASCII shader folder, and new commits to that folder automatically redeploy the page.

If WebGL 2 is unavailable, update Chrome and check that hardware acceleration is enabled. The phone's GPU must support WebGL 2.

## Camera controls

- Drag with one finger on Android, or click and drag with a mouse, to orbit around the object.
- Pinch with two fingers to zoom on a touchscreen.
- Scroll the mouse wheel to zoom on desktop.
- Use the camera-distance slider for precise zoom.
- Double-tap/double-click or choose **Reset camera** to return to the starting view.
- Choose **Full screen** to expand the render to the entire display.

The camera orbit is separate from object animation. Turn off **Spin object** to keep the model still while you inspect it from different angles.

## Render controls

- Scene shape: sculpture, sphere, torus, or box.
- Color mode: monochrome, terminal green, normal RGB, or full color.
- Glyph density: classic, soft, or bold.
- Character size and character gap: adjustable sliders, with a tighter default gap.
- ASCII blur: softens character bitmap edges only; it does not blur the 3D scene or camera view. Set it to 0 for crisp characters.
- Exposure, contrast, and edge boost: tuned to a softer default image.
- Invert density, pause/resume animation, and reset all settings.

The preview uses a larger responsive render stage and caps the device pixel ratio to keep the workload reasonable on phones. It uses RGBA8 render targets and WebGL 2 multiple render targets for broad mobile compatibility.

## Shader source

The page fetches these source files at runtime:

- ../fullscreen.vert
- ../ascii3d_scene.frag
- ../ascii3d.frag

It converts the GLSL 330 version header to GLSL ES 3.00 and adds the required precision declarations. The shader source remains in the main shader folder, so there are no duplicated shader copies to maintain.

## Local hosting

The page must be served from HTTPS or localhost for WebGL and shader loading to work reliably. GitHub's source-code file viewer does not execute HTML. The GitHub Pages link above is the recommended phone-friendly route.
