cmake_minimum_required(VERSION 3.21)
project(ascii3d_preview LANGUAGES C CXX)

include(FetchContent)

set(GLFW_BUILD_DOCS OFF CACHE BOOL "" FORCE)
set(GLFW_BUILD_TESTS OFF CACHE BOOL "" FORCE)
set(GLFW_BUILD_EXAMPLES OFF CACHE BOOL "" FORCE)
set(GLFW_INSTALL OFF CACHE BOOL "" FORCE)

FetchContent_Declare(
    glfw
    GIT_REPOSITORY https://github.com/glfw/glfw.git
    GIT_TAG 3.4
    GIT_SHALLOW TRUE
)
FetchContent_MakeAvailable(glfw)

FetchContent_Declare(
    glad
    GIT_REPOSITORY https://github.com/Dav1dde/glad.git
    GIT_TAG v2.0.8
    GIT_SHALLOW TRUE
)
FetchContent_GetProperties(glad)
if(NOT glad_POPULATED)
    FetchContent_Populate(glad)
endif()
add_subdirectory("${glad_SOURCE_DIR}/cmake" "${CMAKE_CURRENT_BINARY_DIR}/glad_cmake")

glad_add_library(glad_gl_core_33 REPRODUCIBLE LOADER API gl:core=3.3)

find_package(OpenGL REQUIRED)

add_executable(ascii3d_preview
    src/main.cpp
)

target_compile_features(ascii3d_preview PRIVATE cxx_std_17)
target_link_libraries(ascii3d_preview PRIVATE glfw glad_gl_core_33 OpenGL::GL)

file(TO_CMAKE_PATH "${CMAKE_CURRENT_SOURCE_DIR}/.." ASCII3D_SHADER_DIR)
target_compile_definitions(
    ascii3d_preview
    PRIVATE ASCII3D_SHADER_DIR="${ASCII3D_SHADER_DIR}"
)

if(MSVC)
    target_compile_options(ascii3d_preview PRIVATE /W4 /permissive-)
else()
    target_compile_options(ascii3d_preview PRIVATE -Wall -Wextra -Wpedantic)
endif()
