// swift-tools-version: 5.10
import PackageDescription

let package = Package(
    name: "wallpaper-setter",
    platforms: [
        .macOS(.v13),
    ],
    products: [
        .executable(name: "WallpaperSetter", targets: ["WallpaperSetter"]),
    ],
    targets: [
        .executableTarget(
            name: "WallpaperSetter",
            path: "Sources/WallpaperSetter"
        ),
        .testTarget(
            name: "WallpaperSetterTests",
            dependencies: ["WallpaperSetter"],
            path: "Tests/WallpaperSetterTests"
        ),
    ]
)
