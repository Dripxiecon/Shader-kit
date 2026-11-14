#version 330 core

layout(location = 0) out vec4 outSceneColor;
layout(location = 1) out vec4 outSceneNormal;

uniform vec2 uOutputResolution;
uniform vec2 uGridResolution;
uniform float uCellSize;
uniform float uTime;
uniform float uCameraDistance;
uniform float uCameraYaw;
uniform float uCameraPitch;
uniform vec3 uCameraTarget;
uniform float uRotationSpeed;
uniform int uAnimate;
uniform int uShape;
uniform vec3 uLightDirection;
uniform float uAmbient;
uniform float uSpecular;
uniform float uFog;

const int MAX_STEPS = 96;
const float MAX_DISTANCE = 24.0;
const float SURFACE_EPSILON = 0.0015;

mat2 rotate2D(float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return mat2(c, s, -s, c);
}

float sdSphere(vec3 p, float radius) {
    return length(p) - radius;
}

float sdBox(vec3 p, vec3 bounds) {
    vec3 q = abs(p) - bounds;
    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

float sdTorus(vec3 p, vec2 radii) {
    return length(vec2(length(p.xz) - radii.x, p.y)) - radii.y;
}

float smoothUnion(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
}

vec2 mapScene(vec3 p) {
    float rotation = (uAnimate != 0 ? uTime * max(uRotationSpeed, 0.0) : 0.0);

    vec3 q = p;
    q.xz = rotate2D(rotation) * q.xz;
    q.xy = rotate2D(rotation * 0.63) * q.xy;

    float distanceToObject;
    float materialId;

    if (uShape == 1) {
        distanceToObject = sdSphere(q, 0.78);
        materialId = 0.0;
    } else if (uShape == 2) {
        distanceToObject = sdTorus(q, vec2(0.78, 0.16));
        materialId = 1.0;
    } else if (uShape == 3) {
        distanceToObject = sdBox(q, vec3(0.62));
        materialId = 2.0;
    } else {
        float sphereDistance = sdSphere(q, 0.72);

        vec3 torusPoint = q;
        torusPoint.xy = rotate2D(0.95) * torusPoint.xy;
        float torusDistance = sdTorus(torusPoint, vec2(0.88, 0.13));

        float orbDistance = sdSphere(q - vec3(0.0, 0.92, 0.0), 0.20);

        distanceToObject = smoothUnion(sphereDistance, torusDistance, 0.18);
        materialId = sphereDistance < torusDistance ? 0.0 : 1.0;

        if (orbDistance < distanceToObject) {
            materialId = 2.0;
        }

        distanceToObject = smoothUnion(distanceToObject, orbDistance, 0.12);
    }

    float floorDistance = p.y + 1.05;
    if (floorDistance < distanceToObject) {
        distanceToObject = floorDistance;
        materialId = 3.0;
    }

    return vec2(distanceToObject, materialId);
}

vec3 estimateNormal(vec3 p) {
    const vec2 e = vec2(0.0015, 0.0);
    return normalize(vec3(
        mapScene(p + e.xyy).x - mapScene(p - e.xyy).x,
        mapScene(p + e.yxy).x - mapScene(p - e.yxy).x,
        mapScene(p + e.yyx).x - mapScene(p - e.yyx).x
    ));
}

float softShadow(vec3 origin, vec3 direction) {
    float result = 1.0;
    float distanceAlongRay = 0.025;

    for (int i = 0; i < 28; ++i) {
        float distanceToScene = mapScene(origin + direction * distanceAlongRay).x;
        result = min(result, 12.0 * distanceToScene / distanceAlongRay);
        distanceAlongRay += clamp(distanceToScene, 0.025, 0.22);

        if (result < 0.015 || distanceAlongRay > 6.0) {
            break;
        }
    }

    return clamp(result, 0.0, 1.0);
}

vec3 materialColor(float materialId) {
    if (materialId < 0.5) {
        return vec3(0.20, 0.58, 0.96);
    }
    if (materialId < 1.5) {
        return vec3(0.98, 0.40, 0.17);
    }
    if (materialId < 2.5) {
        return vec3(0.24, 0.88, 0.63);
    }
    return vec3(0.24, 0.27, 0.33);
}

void main() {
    vec2 safeOutputResolution = max(uOutputResolution, vec2(1.0));
    vec2 safeGridResolution = max(uGridResolution, vec2(1.0));
    float cellWidth = uCellSize > 0.0 ? uCellSize : 12.0;
    vec2 cellSizePixels = vec2(cellWidth, cellWidth * 1.4);

    vec2 pixelOffset = (gl_FragCoord.xy - 0.5 * safeGridResolution) * cellSizePixels;
    vec2 screenPosition = pixelOffset / safeOutputResolution.y;

    float cameraDistance = uCameraDistance > 0.1 ? uCameraDistance : 5.2;
    float cameraYaw = uCameraYaw;
    float cameraPitch = clamp(uCameraPitch, -1.45, 1.45);
    vec3 cameraTarget = uCameraTarget;
    vec3 cameraOffset = vec3(
        sin(cameraYaw) * cos(cameraPitch),
        sin(cameraPitch),
        cos(cameraYaw) * cos(cameraPitch)
    ) * cameraDistance;
    vec3 rayOrigin = cameraTarget + cameraOffset;

    vec3 cameraForward = normalize(cameraTarget - rayOrigin);
    vec3 cameraRight = normalize(cross(cameraForward, vec3(0.0, 1.0, 0.0)));
    vec3 cameraUp = normalize(cross(cameraRight, cameraForward));

    vec3 rayDirection = normalize(
        screenPosition.x * cameraRight +
        screenPosition.y * cameraUp +
        1.75 * cameraForward
    );

    float travelDistance = 0.0;
    float materialId = 0.0;
    bool hit = false;

    for (int i = 0; i < MAX_STEPS; ++i) {
        vec3 samplePosition = rayOrigin + rayDirection * travelDistance;
        vec2 sceneSample = mapScene(samplePosition);

        if (sceneSample.x < SURFACE_EPSILON) {
            materialId = sceneSample.y;
            hit = true;
            break;
        }

        travelDistance += max(sceneSample.x * 0.82, 0.001);
        if (travelDistance > MAX_DISTANCE) {
            break;
        }
    }

    if (!hit) {
        outSceneColor = vec4(0.0, 0.0, 0.0, 0.0);
        outSceneNormal = vec4(0.5, 0.5, 1.0, 0.0);
        return;
    }

    vec3 hitPosition = rayOrigin + rayDirection * travelDistance;
    vec3 normal = estimateNormal(hitPosition);

    vec3 lightDirection = length(uLightDirection) > 0.001
        ? normalize(uLightDirection)
        : normalize(vec3(-0.45, 0.80, 0.55));

    float diffuse = max(dot(normal, lightDirection), 0.0);
    float shadow = softShadow(hitPosition + normal * 0.008, lightDirection);
    float ambient = max(uAmbient, 0.08);
    float ambientOcclusion = clamp(0.78 + 0.22 * normal.y, 0.35, 1.0);

    vec3 halfDirection = normalize(lightDirection - rayDirection);
    float specular = pow(max(dot(normal, halfDirection), 0.0), 48.0)
        * max(uSpecular, 0.0);

    vec3 baseColor = materialColor(materialId);
    vec3 shadedColor = baseColor
        * (ambient + diffuse * shadow * 0.95)
        * ambientOcclusion
        + vec3(specular);

    if (uFog > 0.0) {
        float fogAmount = 1.0 - exp(-travelDistance * uFog);
        shadedColor = mix(shadedColor, vec3(0.0), clamp(fogAmount, 0.0, 1.0));
    }

    vec3 viewNormal = normalize(vec3(
        dot(normal, cameraRight),
        dot(normal, cameraUp),
        dot(normal, cameraForward)
    ));

    outSceneColor = vec4(max(shadedColor, 0.0), 1.0);
    outSceneNormal = vec4(viewNormal * 0.5 + 0.5, 1.0);
}
