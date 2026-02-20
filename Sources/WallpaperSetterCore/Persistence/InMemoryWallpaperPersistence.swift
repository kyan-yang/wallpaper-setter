import Foundation

public final class InMemoryWallpaperPersistence: WallpaperPersistence {
    public var history: [WallpaperHistoryEntry] = []
    public var draft: GoalsDraft = .empty
    public var lastApplied: URL?

    public init() {}

    public func loadHistory() throws -> [WallpaperHistoryEntry] { history }
    public func saveHistory(_ entries: [WallpaperHistoryEntry]) throws { history = entries }
    public func loadGoalsDraft() throws -> GoalsDraft { draft }
    public func saveGoalsDraft(_ draft: GoalsDraft) throws { self.draft = draft }
    public func loadLastApplied() throws -> URL? { lastApplied }
    public func saveLastApplied(_ url: URL?) throws { lastApplied = url }
}
