#include <glad/gl.h>

#define GLFW_INCLUDE_NONE
#include <GLFW/glfw3.h>

#include <algorithm>
#include <array>
#include <cmath>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <sstream>
#include <stdexcept>
#include <string>
#include <vector>

#ifndef ASCII3D_SHADER_DIR
#define ASCII3D_SHADER_DIR "../"
#endif

namespace {

struct Settings {
    float cellSize = 12.0f;
    float exposure = 1.15f;
    float contrast = 1.0f;
    float edgeBoost = 0.25f;
    int colorMode = 3;
    int glyphSet = 0;
    int shape = 0;
    bool invert = false;
    bool paused = false;
};

struct Resources {
    GLuint sceneProgram = 0;
    GLuint asciiProgram = 0;
    GLuint vertexArray = 0;
    GLuint sceneFramebuffer = 0;
    std::array<GLuint, 2> sceneTextures{0, 0};
    int gridWidth = 0;
    int gridHeight = 0;

    ~Resources() {
        if (sceneTextures[0] != 0 || sceneTextures[1] != 0) {
            glDeleteTextures(2, sceneTextures.data());
        }
        if (sceneFramebuffer != 0) {
            glDeleteFramebuffers(1, &sceneFramebuffer);
        }
        if (vertexArray != 0) {
            glDeleteVertexArrays(1, &vertexArray);
        }
        if (sceneProgram != 0) {
            glDeleteProgram(sceneProgram);
        }
        if (asciiProgram != 0) {
            glDeleteProgram(asciiProgram);
        }
    }
};

struct SceneUniforms {
    GLint outputResolution;
    GLint gridResolution;
    GLint cellSize;
    GLint time;
    GLint cameraDistance;
    GLint rotationSpeed;
    GLint animate;
    GLint shape;
    GLint lightDirection;
    GLint ambient;
    GLint specular;
    GLint fog;

    explicit SceneUniforms(GLuint program)
        : outputResolution(glGetUniformLocation(program, "uOutputResolution")),
          gridResolution(glGetUniformLocation(program, "uGridResolution")),
          cellSize(glGetUniformLocation(program, "uCellSize")),
          time(glGetUniformLocation(program, "uTime")),
          cameraDistance(glGetUniformLocation(program, "uCameraDistance")),
          rotationSpeed(glGetUniformLocation(program, "uRotationSpeed")),
          animate(glGetUniformLocation(program, "uAnimate")),
          shape(glGetUniformLocation(program, "uShape")),
          lightDirection(glGetUniformLocation(program, "uLightDirection")),
          ambient(glGetUniformLocation(program, "uAmbient")),
          specular(glGetUniformLocation(program, "uSpecular")),
          fog(glGetUniformLocation(program, "uFog")) {}
};

struct AsciiUniforms {
    GLint sceneColor;
    GLint sceneNormal;
    GLint cellSize;
    GLint colorMode;
    GLint glyphSet;
    GLint exposure;
    GLint contrast;
    GLint edgeBoost;
    GLint invert;
    GLint backgroundColor;

    explicit AsciiUniforms(GLuint program)
        : sceneColor(glGetUniformLocation(program, "uSceneColor")),
          sceneNormal(glGetUniformLocation(program, "uSceneNormal")),
          cellSize(glGetUniformLocation(program, "uCellSize")),
          colorMode(glGetUniformLocation(program, "uColorMode")),
          glyphSet(glGetUniformLocation(program, "uGlyphSet")),
          exposure(glGetUniformLocation(program, "uExposure")),
          contrast(glGetUniformLocation(program, "uContrast")),
          edgeBoost(glGetUniformLocation(program, "uEdgeBoost")),
          invert(glGetUniformLocation(program, "uInvert")),
          backgroundColor(glGetUniformLocation(program, "uBackgroundColor")) {}
};

void glfwErrorCallback(int code, const char* description) {
    std::cerr << "GLFW error " << code << ": " << description << '\n';
}

std::string readTextFile(const std::filesystem::path& path) {
    std::ifstream file(path, std::ios::binary);
    if (!file) {
        throw std::runtime_error("Could not open shader file: " + path.string());
    }

    std::ostringstream contents;
    contents << file.rdbuf();
    return contents.str();
}

GLuint compileShader(GLenum type, const std::string& source, const std::string& label) {
    const GLuint shader = glCreateShader(type);
    const char* sourcePointer = source.c_str();
    const GLint sourceLength = static_cast<GLint>(source.size());

    glShaderSource(shader, 1, &sourcePointer, &sourceLength);
    glCompileShader(shader);

    GLint compiled = GL_FALSE;
    glGetShaderiv(shader, GL_COMPILE_STATUS, &compiled);
    if (compiled == GL_TRUE) {
        return shader;
    }

    GLint logLength = 0;
    glGetShaderiv(shader, GL_INFO_LOG_LENGTH, &logLength);
    std::vector<char> log(static_cast<std::size_t>(std::max(logLength, 1)));
    glGetShaderInfoLog(shader, logLength, nullptr, log.data());
    glDeleteShader(shader);

    throw std::runtime_error("Shader compile failed (" + label + "):\n" + log.data());
}

GLuint createProgram(
    const std::filesystem::path& vertexPath,
    const std::filesystem::path& fragmentPath
) {
    const GLuint vertexShader = compileShader(
        GL_VERTEX_SHADER,
        readTextFile(vertexPath),
        vertexPath.string()
    );

    GLuint fragmentShader = 0;
    try {
        fragmentShader = compileShader(
            GL_FRAGMENT_SHADER,
            readTextFile(fragmentPath),
            fragmentPath.string()
        );
    } catch (...) {
        glDeleteShader(vertexShader);
        throw;
    }

    const GLuint program = glCreateProgram();
    glAttachShader(program, vertexShader);
    glAttachShader(program, fragmentShader);
    glLinkProgram(program);

    glDeleteShader(vertexShader);
    glDeleteShader(fragmentShader);

    GLint linked = GL_FALSE;
    glGetProgramiv(program, GL_LINK_STATUS, &linked);
    if (linked == GL_TRUE) {
        return program;
    }

    GLint logLength = 0;
    glGetProgramiv(program, GL_INFO_LOG_LENGTH, &logLength);
    std::vector<char> log(static_cast<std::size_t>(std::max(logLength, 1)));
    glGetProgramInfoLog(program, logLength, nullptr, log.data());
    glDeleteProgram(program);

    throw std::runtime_error(
        "Program link failed (" + fragmentPath.string() + "):\n" + log.data()
    );
}

const char* shapeName(int shape) {
    static constexpr std::array<const char*, 4> names{
        "Sculpture", "Sphere", "Torus", "Box"
    };
    return names[static_cast<std::size_t>(std::clamp(shape, 0, 3))];
}

const char* colorName(int mode) {
    static constexpr std::array<const char*, 4> names{
        "Monochrome", "Terminal green", "Normal RGB", "Full color"
    };
    return names[static_cast<std::size_t>(std::clamp(mode, 0, 3))];
}

const char* glyphName(int set) {
    static constexpr std::array<const char*, 3> names{
        "Classic", "Soft", "Bold"
    };
    return names[static_cast<std::size_t>(std::clamp(set, 0, 2))];
}

void updateWindowTitle(GLFWwindow* window, const Settings& settings) {
    std::ostringstream title;
    title << "3D ASCII Preview | " << shapeName(settings.shape)
          << " | " << colorName(settings.colorMode)
          << " | " << glyphName(settings.glyphSet)
          << " | cell " << static_cast<int>(settings.cellSize) << "px"
          << " | exposure " << settings.exposure
          << (settings.paused ? " | PAUSED" : "");
    glfwSetWindowTitle(window, title.str().c_str());
}

void resetSettings(Settings& settings) {
    settings = Settings{};
}

void keyCallback(GLFWwindow* window, int key, int, int action, int) {
    if (action != GLFW_PRESS) {
        return;
    }

    auto* settings = static_cast<Settings*>(glfwGetWindowUserPointer(window));
    if (settings == nullptr) {
        return;
    }

    bool changed = true;

    switch (key) {
        case GLFW_KEY_ESCAPE:
            glfwSetWindowShouldClose(window, GLFW_TRUE);
            return;
        case GLFW_KEY_1:
        case GLFW_KEY_2:
        case GLFW_KEY_3:
        case GLFW_KEY_4:
            settings->shape = key - GLFW_KEY_1;
            break;
        case GLFW_KEY_C:
            settings->colorMode = (settings->colorMode + 1) % 4;
            break;
        case GLFW_KEY_G:
            settings->glyphSet = (settings->glyphSet + 1) % 3;
            break;
        case GLFW_KEY_LEFT_BRACKET:
            settings->cellSize = std::max(6.0f, settings->cellSize - 1.0f);
            break;
        case GLFW_KEY_RIGHT_BRACKET:
            settings->cellSize = std::min(32.0f, settings->cellSize + 1.0f);
            break;
        case GLFW_KEY_MINUS:
            settings->exposure = std::max(0.1f, settings->exposure - 0.1f);
            break;
        case GLFW_KEY_EQUAL:
            settings->exposure = std::min(3.0f, settings->exposure + 0.1f);
            break;
        case GLFW_KEY_COMMA:
            settings->contrast = std::max(0.1f, settings->contrast - 0.1f);
            break;
        case GLFW_KEY_PERIOD:
            settings->contrast = std::min(3.0f, settings->contrast + 0.1f);
            break;
        case GLFW_KEY_I:
            settings->invert = !settings->invert;
            break;
        case GLFW_KEY_SPACE:
            settings->paused = !settings->paused;
            break;
        case GLFW_KEY_R:
            resetSettings(*settings);
            break;
        default:
            changed = false;
            break;
    }

    if (changed) {
        updateWindowTitle(window, *settings);
    }
}

void createSceneTargets(Resources& resources, int width, int height) {
    if (resources.sceneTextures[0] != 0 || resources.sceneTextures[1] != 0) {
        glDeleteTextures(2, resources.sceneTextures.data());
        resources.sceneTextures = {0, 0};
    }

    if (resources.sceneFramebuffer == 0) {
        glGenFramebuffers(1, &resources.sceneFramebuffer);
    }

    glBindFramebuffer(GL_FRAMEBUFFER, resources.sceneFramebuffer);
    glGenTextures(2, resources.sceneTextures.data());

    for (int index = 0; index < 2; ++index) {
        glBindTexture(GL_TEXTURE_2D, resources.sceneTextures[static_cast<std::size_t>(index)]);
        glTexImage2D(
            GL_TEXTURE_2D,
            0,
            GL_RGBA16F,
            width,
            height,
            0,
            GL_RGBA,
            GL_FLOAT,
            nullptr
        );
        glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_NEAREST);
        glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_NEAREST);
        glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_CLAMP_TO_EDGE);
        glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_EDGE);
        glFramebufferTexture2D(
            GL_FRAMEBUFFER,
            GL_COLOR_ATTACHMENT0 + static_cast<GLenum>(index),
            GL_TEXTURE_2D,
            resources.sceneTextures[static_cast<std::size_t>(index)],
            0
        );
    }

    const std::array<GLenum, 2> drawBuffers{
        GL_COLOR_ATTACHMENT0,
        GL_COLOR_ATTACHMENT1
    };
    glDrawBuffers(static_cast<GLsizei>(drawBuffers.size()), drawBuffers.data());

    const GLenum status = glCheckFramebufferStatus(GL_FRAMEBUFFER);
    glBindFramebuffer(GL_FRAMEBUFFER, 0);

    if (status != GL_FRAMEBUFFER_COMPLETE) {
        std::ostringstream message;
        message << "Scene framebuffer is incomplete (status 0x"
                << std::hex << status << ").";
        throw std::runtime_error(message.str());
    }

    resources.gridWidth = width;
    resources.gridHeight = height;
}

} // namespace

int main(int argc, char** argv) {
    glfwSetErrorCallback(glfwErrorCallback);
    if (glfwInit() != GLFW_TRUE) {
        std::cerr << "Could not initialize GLFW.\n";
        return 1;
    }

    GLFWwindow* window = nullptr;

    try {
        glfwWindowHint(GLFW_CONTEXT_VERSION_MAJOR, 3);
        glfwWindowHint(GLFW_CONTEXT_VERSION_MINOR, 3);
        glfwWindowHint(GLFW_OPENGL_PROFILE, GLFW_OPENGL_CORE_PROFILE);
#ifdef __APPLE__
        glfwWindowHint(GLFW_OPENGL_FORWARD_COMPAT, GLFW_TRUE);
#endif

        window = glfwCreateWindow(1280, 800, "3D ASCII Preview", nullptr, nullptr);
        if (window == nullptr) {
            throw std::runtime_error("Could not create an OpenGL 3.3 window.");
        }

        glfwMakeContextCurrent(window);
        if (gladLoadGL(glfwGetProcAddress) == 0) {
            throw std::runtime_error("Could not load OpenGL functions through GLAD.");
        }

        glfwSwapInterval(1);
        glDisable(GL_DEPTH_TEST);
        glDisable(GL_BLEND);
        glDisable(GL_CULL_FACE);

        const auto* version = reinterpret_cast<const char*>(glGetString(GL_VERSION));
        std::cout << "OpenGL: " << (version != nullptr ? version : "unknown") << '\n';

        {
            Settings settings;
            glfwSetWindowUserPointer(window, &settings);
            glfwSetKeyCallback(window, keyCallback);
            updateWindowTitle(window, settings);

            const std::filesystem::path shaderDirectory =
                argc > 1 ? std::filesystem::path(argv[1])
                         : std::filesystem::path(ASCII3D_SHADER_DIR);

            Resources resources;
            resources.sceneProgram = createProgram(
                shaderDirectory / "fullscreen.vert",
                shaderDirectory / "ascii3d_scene.frag"
            );
            resources.asciiProgram = createProgram(
                shaderDirectory / "fullscreen.vert",
                shaderDirectory / "ascii3d.frag"
            );

            glGenVertexArrays(1, &resources.vertexArray);
            glBindVertexArray(resources.vertexArray);

            const SceneUniforms sceneUniforms(resources.sceneProgram);
            const AsciiUniforms asciiUniforms(resources.asciiProgram);

            double previousTime = glfwGetTime();
            double sceneTime = 0.0;

            while (glfwWindowShouldClose(window) == GLFW_FALSE) {
                glfwPollEvents();

                const double currentTime = glfwGetTime();
                const double deltaTime = std::clamp(currentTime - previousTime, 0.0, 0.1);
                previousTime = currentTime;
                if (!settings.paused) {
                    sceneTime += deltaTime;
                }

                int outputWidth = 0;
                int outputHeight = 0;
                glfwGetFramebufferSize(window, &outputWidth, &outputHeight);

                if (outputWidth <= 0 || outputHeight <= 0) {
                    glfwWaitEventsTimeout(0.05);
                    continue;
                }

                const int gridWidth = std::max(
                    1,
                    static_cast<int>(std::ceil(outputWidth / settings.cellSize))
                );
                const int gridHeight = std::max(
                    1,
                    static_cast<int>(std::ceil(outputHeight / (settings.cellSize * 1.4f)))
                );

                if (gridWidth != resources.gridWidth || gridHeight != resources.gridHeight) {
                    createSceneTargets(resources, gridWidth, gridHeight);
                }

                glBindVertexArray(resources.vertexArray);

                glBindFramebuffer(GL_FRAMEBUFFER, resources.sceneFramebuffer);
                glViewport(0, 0, resources.gridWidth, resources.gridHeight);
                glClearColor(0.0f, 0.0f, 0.0f, 0.0f);
                glClear(GL_COLOR_BUFFER_BIT);

                glUseProgram(resources.sceneProgram);
                glUniform2f(
                    sceneUniforms.outputResolution,
                    static_cast<float>(outputWidth),
                    static_cast<float>(outputHeight)
                );
                glUniform2f(
                    sceneUniforms.gridResolution,
                    static_cast<float>(resources.gridWidth),
                    static_cast<float>(resources.gridHeight)
                );
                glUniform1f(sceneUniforms.cellSize, settings.cellSize);
                glUniform1f(sceneUniforms.time, static_cast<float>(sceneTime));
                glUniform1f(sceneUniforms.cameraDistance, 5.2f);
                glUniform1f(sceneUniforms.rotationSpeed, 0.55f);
                glUniform1i(sceneUniforms.animate, 1);
                glUniform1i(sceneUniforms.shape, settings.shape);
                glUniform3f(sceneUniforms.lightDirection, -0.45f, 0.80f, 0.55f);
                glUniform1f(sceneUniforms.ambient, 0.20f);
                glUniform1f(sceneUniforms.specular, 0.18f);
                glUniform1f(sceneUniforms.fog, 0.0f);
                glDrawArrays(GL_TRIANGLES, 0, 3);

                glBindFramebuffer(GL_FRAMEBUFFER, 0);
                glViewport(0, 0, outputWidth, outputHeight);
                glClearColor(0.0f, 0.0f, 0.0f, 1.0f);
                glClear(GL_COLOR_BUFFER_BIT);

                glUseProgram(resources.asciiProgram);
                glActiveTexture(GL_TEXTURE0);
                glBindTexture(GL_TEXTURE_2D, resources.sceneTextures[0]);
                glActiveTexture(GL_TEXTURE1);
                glBindTexture(GL_TEXTURE_2D, resources.sceneTextures[1]);

                glUniform1i(asciiUniforms.sceneColor, 0);
                glUniform1i(asciiUniforms.sceneNormal, 1);
                glUniform1f(asciiUniforms.cellSize, settings.cellSize);
                glUniform1i(asciiUniforms.colorMode, settings.colorMode);
                glUniform1i(asciiUniforms.glyphSet, settings.glyphSet);
                glUniform1f(asciiUniforms.exposure, settings.exposure);
                glUniform1f(asciiUniforms.contrast, settings.contrast);
                glUniform1f(asciiUniforms.edgeBoost, settings.edgeBoost);
                glUniform1i(asciiUniforms.invert, settings.invert ? 1 : 0);
                glUniform3f(asciiUniforms.backgroundColor, 0.0f, 0.0f, 0.0f);
                glDrawArrays(GL_TRIANGLES, 0, 3);

                glfwSwapBuffers(window);
            }
        }

        glfwDestroyWindow(window);
        window = nullptr;
        glfwTerminate();
        return 0;
    } catch (const std::exception& error) {
        if (window != nullptr) {
            glfwDestroyWindow(window);
        }
        glfwTerminate();
        std::cerr << "Preview error: " << error.what() << '\n';
        return 1;
    }
}
