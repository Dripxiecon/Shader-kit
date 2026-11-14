#version 330 core

layout(location = 0) out vec4 outSymbol;

uniform sampler2D uSceneColor;
uniform sampler2D uSceneNormal;
uniform int uSampleScale;
uniform int uColorMode;
uniform int uGlyphSet;
uniform float uExposure;
uniform float uContrast;
uniform float uEdgeBoost;
uniform float uSymbolVariation;
uniform int uInvert;

const uint GLYPH_COVERAGE_2[48] = uint[48](
    0x11330000u, 0x11760044u, 0x30363144u, 0x00224246u, 0x12322123u, 0x11440055u,
    0x00111200u, 0x02211100u, 0x22342266u, 0x22621362u, 0x21432074u, 0x12522245u,
    0x21552244u, 0x12111111u, 0x00441044u, 0x11420144u, 0x22553276u, 0x12142358u,
    0x12242264u, 0x22440134u, 0x22441144u, 0x22582161u, 0x22882206u, 0x22663288u,
    0x22660164u, 0x22442154u, 0x22661144u, 0x22782165u, 0x11442254u, 0x12142353u,
    0x21412012u, 0x22000032u, 0x32420012u, 0x12122245u, 0x22442254u, 0x43331154u,
    0x22341125u, 0x21252231u, 0x44562105u, 0x22331123u, 0x42342443u, 0x21240224u,
    0x22222144u, 0x22442233u, 0x24332233u, 0x21441232u, 0x12442244u, 0x00000021u
);

const uint GLYPH_COVERAGE_3[107] = uint[107](
    0x00000000u, 0x00800800u, 0x0004B000u, 0xC2662000u, 0x01900004u, 0x1660104Bu,
    0x90000680u, 0x00009C40u, 0x00000008u, 0x10080080u, 0x00800800u, 0x1404B001u,
    0x92050000u, 0x00000002u, 0x00001005u, 0x00000140u, 0x00000500u, 0x01005021u,
    0x006C2490u, 0x02B00900u, 0x2A246000u, 0x52480000u, 0x24800005u, 0x29000069u,
    0x90000460u, 0x00006902u, 0x00009046u, 0x005A0460u, 0x04B02820u, 0x08002000u,
    0x80020000u, 0x24400100u, 0x24200046u, 0x52000242u, 0x00004621u, 0x00008045u,
    0x20866682u, 0x08A41901u, 0x8A846600u, 0x80160000u, 0x04800001u, 0x16000069u,
    0x600002A0u, 0x00001802u, 0x00099216u, 0x00580440u, 0x01B01900u, 0x48045000u,
    0xA8486000u, 0x00800005u, 0x8960002Bu, 0x66000A88u, 0x2000AA88u, 0x00088456u,
    0x00480660u, 0x08845620u, 0x69046010u, 0xA0280000u, 0x02920005u, 0x8460000Au,
    0x42000884u, 0x60004C06u, 0x0008C455u, 0x005A2482u, 0x00A05620u, 0x2B256000u,
    0x50160000u, 0x00401200u, 0x08010014u, 0x80040050u, 0x00000004u, 0x24200000u,
    0x00000050u, 0x09921400u, 0x9A018000u, 0x90120000u, 0x65400001u, 0x1400005Au,
    0xA00008A2u, 0x00000A02u, 0x2405A214u, 0x00560180u, 0x02B00900u, 0x05006000u,
    0xB0160060u, 0x00620004u, 0x14200018u, 0x40000AF8u, 0x00005601u, 0x00068214u,
    0x209A0140u, 0x05A61400u, 0x0A024020u, 0xB0140000u, 0x01920004u, 0x1100001Au,
    0x12000590u, 0x20004B02u, 0x0008F410u, 0x004B0140u, 0x22A02120u, 0x2A014005u,
    0xA0190000u, 0x00A01100u, 0x0A00500Au, 0x00020190u, 0x00002400u
);

float candidateCoverage(int glyph, int sampleIndex, int sampleScale) {
    if (sampleScale == 2) {
        int packedIndex = glyph * 4 + sampleIndex;
        uint packedWord = GLYPH_COVERAGE_2[packedIndex >> 3];
        uint coverage = (packedWord >> uint((packedIndex & 7) * 4)) & 15u;
        return float(coverage) / 15.0;
    }

    int packedIndex = glyph * 9 + sampleIndex;
    uint packedWord = GLYPH_COVERAGE_3[packedIndex >> 3];
    uint coverage = (packedWord >> uint((packedIndex & 7) * 4)) & 15u;
    return float(coverage) / 15.0;
}

uint variationHash(ivec2 cell, int glyph) {
    uint value = uint(cell.x) * 1664525u
        + uint(cell.y) * 1013904223u
        + uint(glyph) * 374761393u;
    value ^= value >> 16;
    value *= 2246822519u;
    value ^= value >> 13;
    return value;
}

void main() {
    int sampleScale = clamp(uSampleScale, 2, 3);
    ivec2 cell = ivec2(gl_FragCoord.xy);
    ivec2 textureSizePixels = textureSize(uSceneColor, 0);
    ivec2 sampleBase = cell * sampleScale;

    float sampleDensity[9];
    vec3 colorSum = vec3(0.0);
    vec3 normalSum = vec3(0.0);
    float densitySum = 0.0;
    float hitCount = 0.0;

    for (int y = 0; y < 3; ++y) {
        if (y >= sampleScale) break;
        for (int x = 0; x < 3; ++x) {
            if (x >= sampleScale) break;

            int sampleIndex = y * 3 + x;
            ivec2 samplePosition = clamp(
                sampleBase + ivec2(x, y),
                ivec2(0),
                textureSizePixels - ivec2(1)
            );

            vec4 sceneSample = texelFetch(uSceneColor, samplePosition, 0);
            vec4 normalSample = texelFetch(uSceneNormal, samplePosition, 0);
            sampleDensity[sampleIndex] = 0.0;

            if (normalSample.a < 0.5) continue;

            vec3 viewNormal = normalize(normalSample.rgb * 2.0 - 1.0);
            float luminance = dot(sceneSample.rgb, vec3(0.2126, 0.7152, 0.0722));
            float density = clamp(
                (luminance - 0.035) * max(uExposure, 0.01) * max(uContrast, 0.01),
                0.0,
                1.0
            );
            float silhouette = 1.0 - abs(viewNormal.z);
            density = clamp(
                density + silhouette * max(uEdgeBoost, 0.0) * 0.35,
                0.0,
                1.0
            );

            if (uGlyphSet == 1) {
                density = pow(density, 0.78);
            } else if (uGlyphSet == 2) {
                density = pow(density, 1.28);
            }
            if (uInvert != 0) density = 1.0 - density;

            sampleDensity[sampleIndex] = density;
            colorSum += sceneSample.rgb;
            normalSum += viewNormal;
            densitySum += density;
            hitCount += 1.0;
        }
    }

    if (hitCount < 0.5) {
        outSymbol = vec4(0.0);
        return;
    }

    float bestScore = 1e20;
    int bestGlyph = 0;
    float variation = clamp(uSymbolVariation, 0.0, 1.0);

    for (int glyph = 0; glyph < 95; ++glyph) {
        float score = 0.0;

        for (int y = 0; y < 3; ++y) {
            if (y >= sampleScale) break;
            for (int x = 0; x < 3; ++x) {
                if (x >= sampleScale) break;

                int sampleIndex = y * 3 + x;
                int coverageIndex = y * sampleScale + x;
                float difference = sampleDensity[sampleIndex]
                    - candidateCoverage(glyph, coverageIndex, sampleScale);
                score += difference * difference;
            }
        }

        uint hashValue = variationHash(cell, glyph);
        float tieBreak = float(hashValue & 0x00FFFFFFu) / 16777215.0;
        score += tieBreak * variation * 0.0005;

        if (score < bestScore) {
            bestScore = score;
            bestGlyph = glyph;
        }
    }

    vec3 averageColor = colorSum / hitCount;
    vec3 averageNormal = normalize(normalSum / hitCount);
    float averageDensity = densitySum / hitCount;

    vec3 symbolColor;
    if (uColorMode == 1) {
        symbolColor = vec3(0.30, 1.0, 0.52) * (0.70 + 0.30 * averageDensity);
    } else if (uColorMode == 2) {
        symbolColor = averageNormal * 0.5 + 0.5;
    } else if (uColorMode == 3) {
        symbolColor = averageColor;
    } else {
        symbolColor = vec3(1.0);
    }

    outSymbol = vec4(max(symbolColor, 0.0), float(bestGlyph) / 255.0);
}
