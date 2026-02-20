import Foundation

public struct FileWallpaperPersistence: WallpaperPersistence {
    private struct PersistenceEnvelope: Codable {
        var history: [WallpaperHistoryEntry]
        var goalsDraft: GoalsDraft
        var lastAppliedPath: String?
    }

    private let fileManager: FileManager
    private let storageURL: URL
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()

    public init(
        fileManager: FileManager = .default,
        appFolderName: String = "WallpaperSetter",
        storageDirectory: URL? = nil
    ) throws {
        self.fileManager = fileManager
        let rootDirectory: URL
        if let storageDirectory {
            rootDirectory = storageDirectory
        } else {
            rootDirectory = try fileManager.url(
                for: .applicationSupportDirectory,
                in: .userDomainMask,
                appropriateFor: nil,
                create: true
            )
        }
        storageURL = rootDirectory
            .appendingPathComponent(appFolderName, isDirectory: true)
            .appendingPathComponent("state.json", isDirectory: false)
        try createParentDirectoryIfNeeded()
    }

    public func loadHistory() throws -> [WallpaperHistoryEntry] {
        try loadEnvelope().history
    }

    public func saveHistory(_ entries: [WallpaperHistoryEntry]) throws {
        var envelope = try loadEnvelope()
        envelope.history = entries
        try saveEnvelope(envelope)
    }

    public func loadGoalsDraft() throws -> GoalsDraft {
        try loadEnvelope().goalsDraft
    }

    public func saveGoalsDraft(_ draft: GoalsDraft) throws {
        var envelope = try loadEnvelope()
        envelope.goalsDraft = draft
        try saveEnvelope(envelope)
    }

    public func loadLastApplied() throws -> URL? {
        let path = try loadEnvelope().lastAppliedPath
        guard let path else { return nil }
        return URL(fileURLWithPath: path)
    }

    public func saveLastApplied(_ url: URL?) throws {
        var envelope = try loadEnvelope()
        envelope.lastAppliedPath = url?.path
        try saveEnvelope(envelope)
    }

    private func createParentDirectoryIfNeeded() throws {
        let directory = storageURL.deletingLastPathComponent()
        do {
            try fileManager.createDirectory(at: directory, withIntermediateDirectories: true)
        } catch {
            throw WallpaperError.persistenceFailed(operation: "createDirectory", underlying: String(describing: error))
        }
    }

    private func loadEnvelope() throws -> PersistenceEnvelope {
        guard fileManager.fileExists(atPath: storageURL.path) else {
            return PersistenceEnvelope(history: [], goalsDraft: .empty, lastAppliedPath: nil)
        }

        do {
            let data = try Data(contentsOf: storageURL)
            return try decoder.decode(PersistenceEnvelope.self, from: data)
        } catch {
            throw WallpaperError.persistenceFailed(operation: "loadState", underlying: String(describing: error))
        }
    }

    private func saveEnvelope(_ envelope: PersistenceEnvelope) throws {
        do {
            let data = try encoder.encode(envelope)
            try data.write(to: storageURL, options: .atomic)
        } catch {
            throw WallpaperError.persistenceFailed(operation: "saveState", underlying: String(describing: error))
        }
    }
}
