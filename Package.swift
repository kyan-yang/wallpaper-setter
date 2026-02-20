// swift-tools-version: 5.10
import PackageDescription

let package = Package(
    name: "wallpaper-setter",
    platforms: [
        .macOS(.v13),
    ],
    products: [
        .executable(name: "WallpaperSetter", targets: ["WallpaperSetter"]),
        .executable(name: "WallpaperSetterCLI", targets: ["WallpaperSetterCLI"]),
        .library(name: "WallpaperSetterCore", targets: ["WallpaperSetterCore"]),
    ],
    targets: [
        .target(
            name: "WallpaperSetterCore",
            path: "Sources/WallpaperSetterCore"
        ),
        .executableTarget(
            name: "WallpaperSetter",
            dependencies: ["WallpaperSetterCore"],
            path: "Sources/WallpaperSetter"
        ),
        .executableTarget(
            name: "WallpaperSetterCLI",
            dependencies: ["WallpaperSetterCore"],
            path: "Sources/WallpaperSetterCLI"
        ),
        .testTarget(
            name: "WallpaperSetterTests",
            dependencies: ["WallpaperSetter", "WallpaperSetterCore"],
            path: "Tests/WallpaperSetterTests"
        ),
    ]
)
