# Android / Browser Preview

This is a mobile-friendly WebGL 2 preview for the 3D ASCII shader. It runs in a modern Android browser (such as current Chrome) and does not require a native app, CMake, or a desktop computer.

## Open on Android

Open the published preview:

https://dripxiecon.github.io/Shader-kit/web-preview/

The page loads the shader source files from the same published site, so it does not need a third-party shader proxy.

The preview is published with GitHub Pages. The deployment workflow publishes only the 3D ASCII shader folder, and new commits to that folder automatically redeploy the page.

If WebGL 2 is unavailable, update Chrome and check that hardware acceleration is enabled. The phone's GPU must support WebGL 2.

## Controls

- Scene shape: sculpture, sphere, torus, or box.
- Color mode: monochrome, terminal green, normal RGB, or full color.
- Glyph density: classic, soft, or bold.
- Character size, exposure, contrast, and edge boost: adjustable sliders.
- Invert density, pause/resume animation, and reset settings.

The renderer caps the device pixel ratio to keep the workload reasonable on phones. It uses RGBA8 render targets and WebGL 2 multiple render targets for broad mobile compatibility.

## Shader source

The page fetches these source files at runtime:

- ../fullscreen.vert
- ../ascii3d_scene.frag
- ../ascii3d.frag

It converts the GLSL 330 version header to GLSL ES 3.00 and adds the required precision declarations. The shader source remains in the main shader folder, so there are no duplicated shader copies to maintain.

## Local hosting

The page must be served from HTTPS or localhost for WebGL and shader loading to work reliably. GitHub's source-code file viewer does not execute HTML. The GitHub Pages link above is the recommended phone-friendly route.
