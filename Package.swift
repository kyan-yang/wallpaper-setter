// swift-tools-version: 5.10
import PackageDescription

let package = Package(
    name: "wallpaper-setter",
    platforms: [
        .macOS(.v13),
    ],
    products: [
        .executable(name: "WallpaperSetterCLI", targets: ["WallpaperSetterCLI"]),
        .library(name: "WallpaperSetterCore", targets: ["WallpaperSetterCore"]),
    ],
    targets: [
        .target(
            name: "WallpaperSetterCore",
            path: "Sources/WallpaperSetterCore"
        ),
        .executableTarget(
            name: "WallpaperSetterCLI",
            dependencies: ["WallpaperSetterCore"],
            path: "Sources/WallpaperSetterCLI"
        ),
        .testTarget(
            name: "WallpaperSetterTests",
            dependencies: ["WallpaperSetterCore"],
            path: "Tests/WallpaperSetterTests"
        ),
    ]
)
