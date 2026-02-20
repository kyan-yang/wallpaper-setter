import Foundation

public protocol WallpaperPersistence {
    func loadHistory() throws -> [WallpaperHistoryEntry]
    func saveHistory(_ entries: [WallpaperHistoryEntry]) throws

    func loadGoalsDraft() throws -> GoalsDraft
    func saveGoalsDraft(_ draft: GoalsDraft) throws

    func loadLastApplied() throws -> URL?
    func saveLastApplied(_ url: URL?) throws
}
