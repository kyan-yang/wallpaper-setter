import SwiftUI

@main
struct WallpaperSetterApp: App {
    @StateObject private var store: WallpaperStateStore

    init() {
        let persistence: WallpaperPersistence
        do {
            persistence = try FileWallpaperPersistence()
        } catch {
            persistence = InMemoryWallpaperPersistence()
        }

        let appSupport = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
            ?? URL(fileURLWithPath: NSTemporaryDirectory(), isDirectory: true)
        let generatedDirectory = appSupport
            .appendingPathComponent("WallpaperSetter", isDirectory: true)
            .appendingPathComponent("Generated", isDirectory: true)

        let renderer = GoalsPNGRenderer(outputDirectory: generatedDirectory)
        let adapter = MacOSWallpaperAdapter()

        _store = StateObject(
            wrappedValue: WallpaperStateStore(
                adapter: adapter,
                renderer: renderer,
                persistence: persistence
            )
        )
    }

    var body: some Scene {
        WindowGroup {
            ContentView(store: store)
                .frame(minWidth: 980, minHeight: 680)
        }
    }
}
