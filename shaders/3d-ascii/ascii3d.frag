#version 330 core

out vec4 fragColor;

uniform sampler2D uSymbolMap;
uniform float uCellSize;
uniform float uGlyphSpacing;
uniform float uGlyphBlur;
uniform vec3 uBackgroundColor;

const uint FONT_BITS[285] = uint[285](
    0x00000000u, 0x00000000u, 0x00000000u, 0x18181800u, 0x18001818u, 0x00000000u,
    0x3C3C3C00u, 0x00000000u, 0x00000000u, 0x7E286800u, 0x14147E3Cu, 0x00000000u,
    0x1C3C1000u, 0x3C30381Cu, 0x00000010u, 0x2E0A0E00u, 0x70507418u, 0x00000000u,
    0x0C0C1C00u, 0x7C76765Cu, 0x00000000u, 0x18181800u, 0x00000000u, 0x00000000u,
    0x08181810u, 0x18180808u, 0x00000010u, 0x10181808u, 0x18181010u, 0x00000008u,
    0x3C3C3C00u, 0x0000003Cu, 0x00000000u, 0x18180000u, 0x0018187Eu, 0x00000000u,
    0x00000000u, 0x18180000u, 0x00000008u, 0x00000000u, 0x00003C00u, 0x00000000u,
    0x00000000u, 0x18180000u, 0x00000000u, 0x10202000u, 0x04080810u, 0x00000004u,
    0x243C3C00u, 0x3C3C247Eu, 0x00000000u, 0x18181C00u, 0x7C181818u, 0x00000000u,
    0x30303C00u, 0x3E0C1830u, 0x00000000u, 0x38303C00u, 0x3E202030u, 0x00000000u,
    0x3C383000u, 0x30307E34u, 0x00000000u, 0x3C043C00u, 0x1C302030u, 0x00000000u,
    0x3C0C3800u, 0x382C642Cu, 0x00000000u, 0x30303C00u, 0x0C181810u, 0x00000000u,
    0x24243C00u, 0x3C24243Cu, 0x00000000u, 0x26341C00u, 0x1C303C34u, 0x00000000u,
    0x18000000u, 0x18180018u, 0x00000000u, 0x18000000u, 0x18180018u, 0x00000008u,
    0x3C600000u, 0x00603C0Eu, 0x00000000u, 0x7E000000u, 0x00007E00u, 0x00000000u,
    0x3C060000u, 0x00063C70u, 0x00000000u, 0x30243800u, 0x18001818u, 0x00000000u,
    0x7A643C00u, 0x047A6A6Au, 0x00000038u, 0x3C181800u, 0x66663C3Cu, 0x00000000u,
    0x26263E00u, 0x3E66663Eu, 0x00000000u, 0x040C3800u, 0x380C0404u, 0x00000000u,
    0x64341C00u, 0x1C346464u, 0x00000000u, 0x04043C00u, 0x3C04043Cu, 0x00000000u,
    0x04047C00u, 0x0404043Cu, 0x00000000u, 0x040C3800u, 0x386C6476u, 0x00000000u,
    0x24242400u, 0x2424243Cu, 0x00000000u, 0x18183C00u, 0x3C181818u, 0x00000000u,
    0x30303800u, 0x1C303030u, 0x00000000u, 0x1E366600u, 0x6636361Eu, 0x00000000u,
    0x0C0C0C00u, 0x7C0C0C0Cu, 0x00000000u, 0x7E7E6600u, 0x6666667Eu, 0x00000000u,
    0x6E6E6600u, 0x6676767Eu, 0x00000000u, 0x66243C00u, 0x3C246666u, 0x00000000u,
    0x64643C00u, 0x04043C64u, 0x00000000u, 0x66243C00u, 0x3C246666u, 0x00000020u,
    0x24243C00u, 0x6424343Cu, 0x00000000u, 0x0C243C00u, 0x3C24303Cu, 0x00000000u,
    0x18187E00u, 0x18181818u, 0x00000000u, 0x66666600u, 0x3C246666u, 0x00000000u,
    0x24646600u, 0x18383C3Cu, 0x00000000u, 0x7E464200u, 0x243C7E7Eu, 0x00000000u,
    0x183C6600u, 0x663C3818u, 0x00000000u, 0x3C246600u, 0x18181818u, 0x00000000u,
    0x30307C00u, 0x7E0C0C18u, 0x00000000u, 0x08080838u, 0x08080808u, 0x00000038u,
    0x08040400u, 0x20101008u, 0x00000020u, 0x1010101Cu, 0x10101010u, 0x0000001Cu,
    0x643C1800u, 0x00000000u, 0x00000000u, 0x00000000u, 0x00000000u, 0x00007E00u,
    0x0000180Cu, 0x00000000u, 0x00000000u, 0x3C000000u, 0x7C667C20u, 0x00000000u,
    0x3C040404u, 0x3C6C646Cu, 0x00000000u, 0x38000000u, 0x380C040Cu, 0x00000000u,
    0x3C202020u, 0x3C362636u, 0x00000000u, 0x3C000000u, 0x7C047E64u, 0x00000000u,
    0x3C181830u, 0x18181818u, 0x00000000u, 0x3C000000u, 0x3C342634u, 0x00003C20u,
    0x3C040404u, 0x2424242Cu, 0x00000000u, 0x1C001818u, 0x7C181818u, 0x00000000u,
    0x1C001010u, 0x10101010u, 0x00001C18u, 0x34040404u, 0x64341C1Cu, 0x00000000u,
    0x0808080Eu, 0x38180808u, 0x00000000u, 0x3E000000u, 0x7E7E7E7Eu, 0x00000000u,
    0x3C000000u, 0x2424242Cu, 0x00000000u, 0x3C000000u, 0x3C246624u, 0x00000000u,
    0x3C000000u, 0x3C6C646Cu, 0x00000404u, 0x3C000000u, 0x3C362636u, 0x00002020u,
    0x7C000000u, 0x0C0C0C0Cu, 0x00000000u, 0x3C000000u, 0x3C303C0Cu, 0x00000000u,
    0x3E181800u, 0x38181818u, 0x00000000u, 0x24000000u, 0x3C342424u, 0x00000000u,
    0x66000000u, 0x183C3C24u, 0x00000000u, 0x42000000u, 0x3C3C7E7Eu, 0x00000000u,
    0x3C000000u, 0x243C183Cu, 0x00000000u, 0x66000000u, 0x18183C24u, 0x00000E18u,
    0x3C000000u, 0x3C0C1830u, 0x00000000u, 0x18181830u, 0x1818180Cu, 0x00000030u,
    0x18181818u, 0x18181818u, 0x00001818u, 0x1818180Cu, 0x18181830u, 0x0000000Cu,
    0x00000000u, 0x0000304Cu, 0x00000000u
);

int glyphPixel(int glyph, ivec2 position) {
    if (glyph < 0 || glyph >= 95 ||
        position.x < 0 || position.x >= 8 ||
        position.y < 0 || position.y >= 12) {
        return 0;
    }

    int bitIndex = position.y * 8 + position.x;
    uint packedWord = FONT_BITS[glyph * 3 + (bitIndex >> 5)];
    return int((packedWord >> uint(bitIndex & 31)) & 1u);
}

float glyphCoverage(int glyph, vec2 pixelPosition, float blurAmount) {
    float center = float(glyphPixel(glyph, ivec2(floor(pixelPosition))));
    float radius = clamp(blurAmount, 0.0, 1.5);
    if (radius <= 0.001) {
        return center;
    }

    vec2 horizontal = vec2(radius, 0.0);
    vec2 vertical = vec2(0.0, radius);
    vec2 diagonal = vec2(radius * 0.70710678);

    float coverage = center * 0.36;
    coverage += float(glyphPixel(glyph, ivec2(floor(pixelPosition + horizontal)))) * 0.10;
    coverage += float(glyphPixel(glyph, ivec2(floor(pixelPosition - horizontal)))) * 0.10;
    coverage += float(glyphPixel(glyph, ivec2(floor(pixelPosition + vertical)))) * 0.10;
    coverage += float(glyphPixel(glyph, ivec2(floor(pixelPosition - vertical)))) * 0.10;
    coverage += float(glyphPixel(glyph, ivec2(floor(pixelPosition + diagonal)))) * 0.06;
    coverage += float(glyphPixel(glyph, ivec2(floor(pixelPosition - diagonal)))) * 0.06;
    coverage += float(glyphPixel(glyph, ivec2(floor(pixelPosition + vec2(diagonal.x, -diagonal.y))))) * 0.06;
    coverage += float(glyphPixel(glyph, ivec2(floor(pixelPosition + vec2(-diagonal.x, diagonal.y))))) * 0.06;

    return clamp(coverage, 0.0, 1.0);
}

void main() {
    float cellWidth = uCellSize > 0.0 ? uCellSize : 12.0;
    vec2 cellSizePixels = vec2(cellWidth, cellWidth * 1.4);

    ivec2 cell = ivec2(floor(gl_FragCoord.xy / cellSizePixels));
    ivec2 textureSizePixels = textureSize(uSymbolMap, 0);
    ivec2 safeCell = clamp(cell, ivec2(0), textureSizePixels - ivec2(1));
    vec4 symbol = texelFetch(uSymbolMap, safeCell, 0);
    int glyph = clamp(int(floor(symbol.a * 255.0 + 0.5)), 0, 94);

    vec2 localPosition = fract(gl_FragCoord.xy / cellSizePixels);
    float glyphGap = clamp(uGlyphSpacing, 0.0, 0.16);
    vec2 glyphMargin = vec2(glyphGap * 0.5, glyphGap * 0.35);
    vec2 glyphScale = vec2(1.0 - glyphGap, 1.0 - glyphGap * 0.7);
    vec2 fontPosition = (localPosition - glyphMargin) / glyphScale;

    if (fontPosition.x < 0.0 || fontPosition.x >= 1.0 ||
        fontPosition.y < 0.0 || fontPosition.y >= 1.0) {
        fragColor = vec4(uBackgroundColor, 1.0);
        return;
    }

    vec2 glyphPixelPosition = vec2(
        fontPosition.x * 8.0,
        (1.0 - fontPosition.y) * 12.0 - 0.0001
    );
    float glyphAlpha = glyphCoverage(glyph, glyphPixelPosition, uGlyphBlur);
    vec3 background = max(uBackgroundColor, vec3(0.0));
    vec3 glyphColor = max(symbol.rgb, vec3(0.0));

    fragColor = vec4(mix(background, glyphColor, glyphAlpha), 1.0);
}
