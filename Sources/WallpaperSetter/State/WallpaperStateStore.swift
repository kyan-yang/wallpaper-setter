import Foundation
import AppKit
import Combine

@MainActor
final class WallpaperStateStore: ObservableObject {
    @Published var selectedImageURL: URL?
    @Published var previewImage: NSImage?
    @Published var applyStatus: ApplyStatus = .idle
    @Published var lastError: WallpaperError?
    @Published var history: [WallpaperHistoryEntry] = []
    @Published var goalsDraft: GoalsDraft = .empty
    @Published var lastAppliedURL: URL?
    @Published var isBusy = false

    private let adapter: WallpaperAdapter
    private let renderer: GoalsRenderer
    private let persistence: WallpaperPersistence
    private let screenProvider: () -> [NSScreen]
    private let renderSizeProvider: () -> CGSize

    init(
        adapter: WallpaperAdapter,
        renderer: GoalsRenderer,
        persistence: WallpaperPersistence,
        screenProvider: @escaping () -> [NSScreen] = { NSScreen.screens },
        renderSizeProvider: @escaping () -> CGSize = {
            NSScreen.main?.frame.size ?? CGSize(width: 1920, height: 1080)
        }
    ) {
        self.adapter = adapter
        self.renderer = renderer
        self.persistence = persistence
        self.screenProvider = screenProvider
        self.renderSizeProvider = renderSizeProvider
    }

    func bootstrap() {
        do {
            history = try persistence.loadHistory().sorted(by: { $0.createdAt > $1.createdAt })
            goalsDraft = try persistence.loadGoalsDraft()
            lastAppliedURL = try persistence.loadLastApplied()
            if let lastAppliedURL {
                selectedImageURL = lastAppliedURL
                previewImage = NSImage(contentsOf: lastAppliedURL)
            }
        } catch let error as WallpaperError {
            lastError = error
        } catch {
            lastError = .persistenceFailed(operation: "bootstrap", underlying: String(describing: error))
        }
    }

    func selectImage(url: URL) {
        selectedImageURL = url
        previewImage = NSImage(contentsOf: url)
        applyStatus = .idle
    }

    func applySelectedImage() {
        guard let selectedImageURL else {
            lastError = .fileNotFound(path: "No file selected")
            return
        }
        apply(url: selectedImageURL, source: .localImage, metadata: [:])
    }

    func generateAndSelectGoalsWallpaper() {
        isBusy = true
        defer { isBusy = false }

        do {
            let rendered = try renderer.render(draft: goalsDraft, outputSize: renderSizeProvider())
            selectedImageURL = rendered.fileURL
            previewImage = NSImage(contentsOf: rendered.fileURL)
            try persistence.saveGoalsDraft(goalsDraft)
            applyStatus = .success(message: "Goals wallpaper generated.")
        } catch let error as WallpaperError {
            lastError = error
            applyStatus = .failure(message: error.errorDescription ?? "Generation failed")
        } catch {
            let wrapped = WallpaperError.renderFailed(reason: error.localizedDescription, underlying: String(describing: error))
            lastError = wrapped
            applyStatus = .failure(message: wrapped.errorDescription ?? "Generation failed")
        }
    }

    func restoreHistoryEntry(_ entry: WallpaperHistoryEntry) {
        selectImage(url: entry.fileURL)
    }

    func deleteHistoryEntry(_ entry: WallpaperHistoryEntry) {
        history.removeAll(where: { $0.id == entry.id })
        do {
            try persistence.saveHistory(history)
        } catch let error as WallpaperError {
            lastError = error
        } catch {
            lastError = .persistenceFailed(operation: "deleteHistoryEntry", underlying: String(describing: error))
        }
    }

    func clearHistory() {
        history = []
        do {
            try persistence.saveHistory(history)
        } catch let error as WallpaperError {
            lastError = error
        } catch {
            lastError = .persistenceFailed(operation: "clearHistory", underlying: String(describing: error))
        }
    }

    func clearError() {
        lastError = nil
        if case .failure = applyStatus {
            applyStatus = .idle
        }
    }

    private func apply(url: URL, source: WallpaperHistoryEntry.Source, metadata: [String: String]) {
        isBusy = true
        applyStatus = .applying
        defer { isBusy = false }

        do {
            try adapter.applyWallpaper(from: url, to: screenProvider())
            let entry = WallpaperHistoryEntry(
                id: UUID(),
                fileURL: url,
                createdAt: Date(),
                source: source,
                metadata: metadata
            )
            history.insert(entry, at: 0)
            lastAppliedURL = url
            applyStatus = .success(message: "Wallpaper applied.")
            try persistence.saveHistory(history)
            try persistence.saveLastApplied(url)
        } catch let error as WallpaperError {
            lastError = error
            applyStatus = .failure(message: error.errorDescription ?? "Apply failed")
        } catch {
            let wrapped = WallpaperError.applyFailed(reason: error.localizedDescription, underlying: String(describing: error))
            lastError = wrapped
            applyStatus = .failure(message: wrapped.errorDescription ?? "Apply failed")
        }
    }
}
