#version 330 core

out vec4 fragColor;

uniform sampler2D uSceneColor;
uniform sampler2D uSceneNormal;
uniform float uCellSize;
uniform int uColorMode;
uniform int uGlyphSet;
uniform float uExposure;
uniform float uContrast;
uniform float uEdgeBoost;
uniform float uGlyphSpacing;
uniform int uInvert;
uniform vec3 uBackgroundColor;

const int FONT_ROWS[70] = int[70](
    0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 4,
    0, 4, 0, 0, 4, 0, 0,
    0, 0, 0, 14, 0, 0, 0,
    0, 14, 0, 14, 0, 0, 0,
    0, 4, 4, 31, 4, 4, 0,
    0, 21, 14, 31, 14, 21, 0,
    10, 31, 10, 10, 31, 10, 0,
    17, 2, 4, 8, 17, 0, 0,
    14, 17, 23, 21, 23, 16, 14
);

int glyphPixel(int glyph, ivec2 position) {
    if (glyph < 0 || glyph > 9 ||
        position.x < 0 || position.x > 4 ||
        position.y < 0 || position.y > 6) {
        return 0;
    }

    int rowBits = FONT_ROWS[glyph * 7 + position.y];
    return (rowBits >> (4 - position.x)) & 1;
}

void main() {
    float cellWidth = uCellSize > 0.0 ? uCellSize : 12.0;
    vec2 cellSizePixels = vec2(cellWidth, cellWidth * 1.4);

    ivec2 cell = ivec2(floor(gl_FragCoord.xy / cellSizePixels));
    ivec2 textureSizePixels = textureSize(uSceneColor, 0);
    ivec2 safeCell = clamp(cell, ivec2(0), textureSizePixels - ivec2(1));

    vec4 sceneSample = texelFetch(uSceneColor, safeCell, 0);
    vec4 normalSample = texelFetch(uSceneNormal, safeCell, 0);
    vec3 background = max(uBackgroundColor, vec3(0.0));

    if (normalSample.a < 0.5) {
        fragColor = vec4(background, 1.0);
        return;
    }

    vec2 localPosition = fract(gl_FragCoord.xy / cellSizePixels);
    float glyphGap = clamp(uGlyphSpacing, 0.0, 0.16);
    vec2 glyphMargin = vec2(glyphGap * 0.5, glyphGap * 0.35);
    vec2 glyphScale = vec2(1.0 - glyphGap, 1.0 - glyphGap * 0.7);
    vec2 fontPosition = (localPosition - glyphMargin) / glyphScale;

    if (fontPosition.x < 0.0 || fontPosition.x >= 1.0 ||
        fontPosition.y < 0.0 || fontPosition.y >= 1.0) {
        fragColor = vec4(background, 1.0);
        return;
    }

    ivec2 glyphCoordinate = ivec2(floor(fontPosition * vec2(5.0, 7.0)));

    vec3 viewNormal = normalize(normalSample.rgb * 2.0 - 1.0);
    float luminance = dot(sceneSample.rgb, vec3(0.2126, 0.7152, 0.0722));
    float density = clamp(
        (luminance - 0.035) * max(uExposure, 0.01) * max(uContrast, 0.01),
        0.0,
        1.0
    );

    float silhouette = 1.0 - abs(viewNormal.z);
    density = clamp(density + silhouette * max(uEdgeBoost, 0.0) * 0.35, 0.0, 1.0);

    if (uGlyphSet == 1) {
        density = pow(density, 0.78);
    } else if (uGlyphSet == 2) {
        density = pow(density, 1.28);
    }

    if (uInvert != 0) {
        density = 1.0 - density;
    }

    int glyph = clamp(int(floor(density * 9.999)), 0, 9);
    if (glyphPixel(glyph, glyphCoordinate) == 0) {
        fragColor = vec4(background, 1.0);
        return;
    }

    vec3 glyphColor;
    if (uColorMode == 1) {
        glyphColor = vec3(0.30, 1.0, 0.52) * (0.70 + 0.30 * density);
    } else if (uColorMode == 2) {
        glyphColor = viewNormal * 0.5 + 0.5;
    } else if (uColorMode == 3) {
        glyphColor = sceneSample.rgb;
    } else {
        glyphColor = vec3(1.0);
    }

    fragColor = vec4(glyphColor, 1.0);
}
