import Foundation
import CoreGraphics

enum GoalsTheme: String, Codable, CaseIterable, Identifiable, Sendable {
    case minimalLight
    case minimalDark

    var id: String { rawValue }
    var displayName: String {
        switch self {
        case .minimalLight: return "Minimal Light"
        case .minimalDark: return "Minimal Dark"
        }
    }
}

struct GoalsDraft: Codable, Sendable, Equatable {
    var title: String
    var goalsText: String
    var theme: GoalsTheme

    static let empty = GoalsDraft(title: "", goalsText: "", theme: .minimalDark)
}

struct WallpaperHistoryEntry: Codable, Identifiable, Sendable, Equatable {
    let id: UUID
    let fileURL: URL
    let createdAt: Date
    let source: Source
    let metadata: [String: String]

    enum Source: String, Codable, Sendable {
        case localImage
        case generatedGoals
    }
}

struct RenderedWallpaper: Sendable {
    let fileURL: URL
    let size: CGSize
}

enum ApplyStatus: Sendable, Equatable {
    case idle
    case applying
    case success(message: String)
    case failure(message: String)
}
