import Foundation

public enum WallpaperError: Error, LocalizedError, Sendable, Equatable {
    case fileNotFound(path: String)
    case unsupportedFormat(path: String, supported: [String])
    case applyFailed(reason: String, underlying: String?)
    case permissionDenied(operation: String)
    case persistenceFailed(operation: String, underlying: String?)
    case renderFailed(reason: String, underlying: String?)
    case emptyGoals

    public var errorDescription: String? {
        switch self {
        case .fileNotFound:
            return "File not found"
        case .unsupportedFormat:
            return "Unsupported image format"
        case .applyFailed:
            return "Could not apply wallpaper"
        case .permissionDenied:
            return "Permission denied"
        case .persistenceFailed:
            return "Could not save app data"
        case .renderFailed:
            return "Could not generate goals wallpaper"
        case .emptyGoals:
            return "No goals provided"
        }
    }

    public var recoverySuggestion: String? {
        switch self {
        case let .fileNotFound(path):
            return "Verify that the file still exists at \(path)."
        case let .unsupportedFormat(_, supported):
            return "Use one of these formats: \(supported.joined(separator: ", "))."
        case .applyFailed:
            return "Try another image or retry apply."
        case let .permissionDenied(operation):
            return "Grant required access and retry \(operation)."
        case .persistenceFailed:
            return "Retry after checking available disk space and permissions."
        case .renderFailed:
            return "Adjust goals text/theme and try again."
        case .emptyGoals:
            return "Add at least one goal line before generating."
        }
    }
}
