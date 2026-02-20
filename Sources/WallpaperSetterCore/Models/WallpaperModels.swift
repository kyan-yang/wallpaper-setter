import Foundation
import CoreGraphics

public enum GoalsTheme: String, Codable, CaseIterable, Identifiable, Sendable {
    case minimalLight
    case minimalDark

    public var id: String { rawValue }
    public var displayName: String {
        switch self {
        case .minimalLight: return "Minimal Light"
        case .minimalDark: return "Minimal Dark"
        }
    }
}

public struct GoalsDraft: Codable, Sendable, Equatable {
    public var title: String
    public var goalsText: String
    public var theme: GoalsTheme

    public static let empty = GoalsDraft(title: "", goalsText: "", theme: .minimalDark)

    public init(title: String, goalsText: String, theme: GoalsTheme) {
        self.title = title
        self.goalsText = goalsText
        self.theme = theme
    }
}

public struct WallpaperHistoryEntry: Codable, Identifiable, Sendable, Equatable {
    public let id: UUID
    public let fileURL: URL
    public let createdAt: Date
    public let source: Source
    public let metadata: [String: String]

    public enum Source: String, Codable, Sendable {
        case localImage
        case generatedGoals
    }

    public init(id: UUID, fileURL: URL, createdAt: Date, source: Source, metadata: [String: String]) {
        self.id = id
        self.fileURL = fileURL
        self.createdAt = createdAt
        self.source = source
        self.metadata = metadata
    }
}

public struct RenderedWallpaper: Sendable {
    public let fileURL: URL
    public let size: CGSize

    public init(fileURL: URL, size: CGSize) {
        self.fileURL = fileURL
        self.size = size
    }
}

public struct CropState: Equatable {
    public var offset: CGSize = .zero
    public var zoom: CGFloat = 1.0
    public var containerSize: CGSize = .zero

    public static let initial = CropState()

    public var isDefault: Bool {
        offset == .zero && zoom == 1.0
    }

    public init(offset: CGSize = .zero, zoom: CGFloat = 1.0, containerSize: CGSize = .zero) {
        self.offset = offset
        self.zoom = zoom
        self.containerSize = containerSize
    }
}

public enum ApplyStatus: Sendable, Equatable {
    case idle
    case applying
    case success(message: String)
    case failure(message: String)
}
