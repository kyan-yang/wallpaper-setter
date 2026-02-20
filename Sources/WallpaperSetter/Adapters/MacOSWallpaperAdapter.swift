import Foundation
import AppKit

struct MacOSWallpaperAdapter: WallpaperAdapter {
    private let workspace: NSWorkspace
    private let supportedExtensions = ["jpg", "jpeg", "png", "gif", "heic", "bmp", "tiff", "webp"]

    init(workspace: NSWorkspace = .shared) {
        self.workspace = workspace
    }

    func validateImage(at url: URL) throws {
        guard FileManager.default.fileExists(atPath: url.path) else {
            throw WallpaperError.fileNotFound(path: url.path)
        }

        let ext = url.pathExtension.lowercased()
        guard supportedExtensions.contains(ext) else {
            throw WallpaperError.unsupportedFormat(path: url.path, supported: supportedExtensions)
        }
    }

    func applyWallpaper(from url: URL, to screens: [NSScreen]) throws {
        do {
            try validateImage(at: url)
            for screen in screens {
                try workspace.setDesktopImageURL(url, for: screen, options: [:])
            }
        } catch let error as WallpaperError {
            throw error
        } catch {
            throw WallpaperError.applyFailed(reason: error.localizedDescription, underlying: String(describing: error))
        }
    }

    func currentWallpaperURL(for screen: NSScreen) throws -> URL? {
        workspace.desktopImageURL(for: screen)
    }
}
