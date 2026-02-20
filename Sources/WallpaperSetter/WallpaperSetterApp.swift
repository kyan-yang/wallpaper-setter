import SwiftUI

class AppDelegate: NSObject, NSApplicationDelegate {
    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        return true
    }
}

@main
struct WallpaperSetterApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
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
                .frame(minWidth: 860, minHeight: 600)
        }
        .windowStyle(.titleBar)
        .windowToolbarStyle(.unified(showsTitle: false))
    }
}
