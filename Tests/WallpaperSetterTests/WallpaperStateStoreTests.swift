import XCTest
import AppKit
@testable import WallpaperSetter

final class WallpaperStateStoreTests: XCTestCase {
    @MainActor
    func testApplySelectedImageSuccessAddsHistoryAndPersistsLastApplied() throws {
        let adapter = MockWallpaperAdapter()
        let renderer = MockGoalsRenderer()
        let persistence = InMemoryWallpaperPersistence()
        let store = WallpaperStateStore(
            adapter: adapter,
            renderer: renderer,
            persistence: persistence,
            screenProvider: { [] },
            renderSizeProvider: { CGSize(width: 1920, height: 1080) }
        )

        let url = URL(fileURLWithPath: "/tmp/wallpaper.png")
        store.selectImage(url: url)
        store.applySelectedImage()

        XCTAssertEqual(store.lastAppliedURL, url)
        XCTAssertEqual(store.history.count, 1)
        XCTAssertEqual(store.history.first?.fileURL, url)
        XCTAssertEqual(persistence.lastApplied, url)
    }

    @MainActor
    func testApplySelectedImageFailureSetsError() throws {
        let adapter = MockWallpaperAdapter()
        adapter.shouldFailApply = true
        let renderer = MockGoalsRenderer()
        let persistence = InMemoryWallpaperPersistence()
        let store = WallpaperStateStore(
            adapter: adapter,
            renderer: renderer,
            persistence: persistence,
            screenProvider: { [] }
        )

        let url = URL(fileURLWithPath: "/tmp/wallpaper.png")
        store.selectImage(url: url)
        store.applySelectedImage()

        XCTAssertNotNil(store.lastError)
        if case .failure = store.applyStatus {
            XCTAssertTrue(true)
        } else {
            XCTFail("Expected failure apply status")
        }
    }

    @MainActor
    func testGenerateGoalsWallpaperUpdatesSelection() throws {
        let adapter = MockWallpaperAdapter()
        let renderer = MockGoalsRenderer()
        let persistence = InMemoryWallpaperPersistence()
        let store = WallpaperStateStore(
            adapter: adapter,
            renderer: renderer,
            persistence: persistence,
            screenProvider: { [] }
        )
        store.goalsDraft = GoalsDraft(title: "Focus", goalsText: "Ship MVP", theme: .minimalDark)

        store.generateAndSelectGoalsWallpaper()

        XCTAssertNotNil(store.selectedImageURL)
        XCTAssertEqual(store.goalsDraft, persistence.draft)
    }
}

private final class MockWallpaperAdapter: WallpaperAdapter, @unchecked Sendable {
    var shouldFailApply = false

    func validateImage(at url: URL) throws {}

    func applyWallpaper(from url: URL, to screens: [NSScreen]) throws {
        if shouldFailApply {
            throw WallpaperError.applyFailed(reason: "simulated", underlying: nil)
        }
    }

    func currentWallpaperURL(for screen: NSScreen) throws -> URL? {
        nil
    }
}

private struct MockGoalsRenderer: GoalsRenderer {
    func render(draft: GoalsDraft, outputSize: CGSize) throws -> RenderedWallpaper {
        guard !draft.goalsText.isEmpty else {
            throw WallpaperError.emptyGoals
        }
        return RenderedWallpaper(fileURL: URL(fileURLWithPath: "/tmp/generated.png"), size: outputSize)
    }
}
