import Foundation
import AppKit

public protocol WallpaperAdapter {
    func validateImage(at url: URL) throws
    func applyWallpaper(from url: URL, to screens: [NSScreen]) throws
    func currentWallpaperURL(for screen: NSScreen) throws -> URL?
}
