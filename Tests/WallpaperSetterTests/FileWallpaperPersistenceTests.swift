import XCTest
@testable import WallpaperSetter

final class FileWallpaperPersistenceTests: XCTestCase {
    func testRoundTripHistoryDraftAndLastApplied() throws {
        let tmp = FileManager.default.temporaryDirectory
            .appendingPathComponent("WallpaperSetterTests-\(UUID().uuidString)", isDirectory: true)
        try FileManager.default.createDirectory(at: tmp, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: tmp) }

        let persistence = try FileWallpaperPersistence(
            appFolderName: "State",
            storageDirectory: tmp
        )

        let draft = GoalsDraft(title: "2026", goalsText: "Build\nShip", theme: .minimalLight)
        let history = [
            WallpaperHistoryEntry(
                id: UUID(),
                fileURL: URL(fileURLWithPath: "/tmp/wall-1.png"),
                createdAt: Date(),
                source: .localImage,
                metadata: ["name": "wall-1"]
            )
        ]
        let last = URL(fileURLWithPath: "/tmp/wall-1.png")

        try persistence.saveGoalsDraft(draft)
        try persistence.saveHistory(history)
        try persistence.saveLastApplied(last)

        XCTAssertEqual(try persistence.loadGoalsDraft(), draft)
        XCTAssertEqual(try persistence.loadHistory(), history)
        XCTAssertEqual(try persistence.loadLastApplied(), last)
    }
}
