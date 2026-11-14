# 3D ASCII Preview

A small desktop host for the 3D ASCII shader. It opens an OpenGL 3.3 window, renders the included raymarched scene into two low-resolution color targets, then runs the ASCII post-process across the window.

The preview lives in its own folder so its build files and dependencies stay separate from the shader source and other shader projects.

## Requirements

- CMake 3.21 or newer.
- A C++17 compiler.
- Python 3.8 or newer (used by GLAD to generate its OpenGL loader).
- An OpenGL 3.3 Core-capable graphics driver.
- An internet connection during the first CMake configure, so CMake can fetch GLFW 3.4 and GLAD 2.0.8.

GLFW and GLAD are fetched into the build directory. Their source files are not copied into the shader kit.

## Build

Run these commands from this preview folder:

    cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
    cmake --build build --config Release

Run the app on Linux:

    ./build/ascii3d_preview

Run the app on Windows:

    .\build\Release\ascii3d_preview.exe

Run the app on macOS:

    ./build/ascii3d_preview

The shader directory is embedded at configure time, so the app can be launched from another working directory. You can also pass a shader directory as the first argument:

    ./build/ascii3d_preview /path/to/shaders/3d-ascii

## Controls

| Key | Action |
| --- | --- |
| 1–4 | Sculpture, sphere, torus, or box |
| C | Cycle monochrome, terminal green, normal RGB, and full color |
| G | Cycle classic, soft, and bold glyph density |
| [ / ] | Decrease or increase character width |
| - / = | Decrease or increase exposure |
| , / . | Decrease or increase contrast |
| I | Invert glyph density |
| Space | Pause or resume scene rotation |
| R | Reset all settings |
| Esc | Close the preview |

The window title shows the active shape, color mode, glyph set, cell width, exposure, and pause state.

## Render setup

1. The app calculates a character grid from the current window size and cell width.
2. It creates a two-attachment RGBA16F framebuffer at that grid resolution.
3. The scene shader raymarches once per character cell and writes lit color plus encoded camera-space normals and a hit mask.
4. The ASCII shader samples those attachments and draws the glyphs at full window resolution.

The two scene textures use nearest-neighbor filtering so the character cells remain crisp. Resizing the window or changing cell width automatically recreates the low-resolution framebuffer.

## Notes

- The preview uses the shader kit's source files directly; it does not maintain duplicate shader copies.
- The scene is intentionally small and procedural, so no model or texture assets are needed.
- The app reports shader compile, program link, and framebuffer errors in the terminal.
- The preview is a development harness, not a game engine integration layer.
