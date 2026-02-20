import Foundation

final class InMemoryWallpaperPersistence: WallpaperPersistence {
    var history: [WallpaperHistoryEntry] = []
    var draft: GoalsDraft = .empty
    var lastApplied: URL?

    func loadHistory() throws -> [WallpaperHistoryEntry] { history }
    func saveHistory(_ entries: [WallpaperHistoryEntry]) throws { history = entries }
    func loadGoalsDraft() throws -> GoalsDraft { draft }
    func saveGoalsDraft(_ draft: GoalsDraft) throws { self.draft = draft }
    func loadLastApplied() throws -> URL? { lastApplied }
    func saveLastApplied(_ url: URL?) throws { lastApplied = url }
}
