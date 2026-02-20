import Foundation
import AppKit
import WallpaperSetterCore

// MARK: - JSON Helpers

func printJSON(_ value: Any) {
    guard let data = try? JSONSerialization.data(withJSONObject: value, options: []),
          let str = String(data: data, encoding: .utf8) else {
        fputs("{\"error\":true,\"code\":\"internal\",\"message\":\"Failed to encode response\"}\n", stderr)
        exit(1)
    }
    print(str)
}

func printError(_ error: WallpaperError) {
    let obj: [String: Any] = [
        "error": true,
        "code": errorCode(error),
        "message": error.errorDescription ?? "Unknown error",
        "suggestion": error.recoverySuggestion ?? "",
    ]
    guard let data = try? JSONSerialization.data(withJSONObject: obj, options: []),
          let str = String(data: data, encoding: .utf8) else {
        fputs("{\"error\":true,\"code\":\"internal\",\"message\":\"Failed to encode error\"}\n", stderr)
        exit(1)
    }
    fputs(str + "\n", stderr)
    exit(1)
}

func printGenericError(_ message: String) {
    fputs("{\"error\":true,\"code\":\"internal\",\"message\":\"\(message)\"}\n", stderr)
    exit(1)
}

func errorCode(_ error: WallpaperError) -> String {
    switch error {
    case .fileNotFound: return "file_not_found"
    case .unsupportedFormat: return "unsupported_format"
    case .applyFailed: return "apply_failed"
    case .permissionDenied: return "permission_denied"
    case .persistenceFailed: return "persistence_failed"
    case .renderFailed: return "render_failed"
    case .emptyGoals: return "empty_goals"
    }
}

func historyEntryToDict(_ entry: WallpaperHistoryEntry) -> [String: Any] {
    [
        "id": entry.id.uuidString,
        "fileURL": entry.fileURL.path,
        "createdAt": ISO8601DateFormatter().string(from: entry.createdAt),
        "source": entry.source.rawValue,
        "metadata": entry.metadata,
    ]
}

func goalsDraftToDict(_ draft: GoalsDraft) -> [String: Any] {
    [
        "title": draft.title,
        "goalsText": draft.goalsText,
        "theme": draft.theme.rawValue,
    ]
}

// MARK: - Persistence helper

func makePersistence() -> WallpaperPersistence {
    do {
        return try FileWallpaperPersistence()
    } catch {
        printGenericError("Could not initialize persistence: \(error)")
        fatalError()
    }
}

// MARK: - Commands

let args = CommandLine.arguments
guard args.count >= 2 else {
    printGenericError("Usage: WallpaperSetterCLI <command> [args]")
    fatalError()
}

let command = args[1]

switch command {
case "bootstrap":
    let persistence = makePersistence()
    do {
        let history = try persistence.loadHistory()
        let draft = try persistence.loadGoalsDraft()
        let lastApplied = try persistence.loadLastApplied()
        let result: [String: Any] = [
            "history": history.map(historyEntryToDict),
            "goalsDraft": goalsDraftToDict(draft),
            "lastAppliedPath": lastApplied?.path as Any,
        ]
        printJSON(result)
    } catch let error as WallpaperError {
        printError(error)
    } catch {
        printGenericError(error.localizedDescription)
    }

case "apply":
    guard args.count >= 3 else {
        printGenericError("Usage: WallpaperSetterCLI apply <path>")
        fatalError()
    }
    let path = args[2]
    let url = URL(fileURLWithPath: path)
    let adapter = MacOSWallpaperAdapter()
    let persistence = makePersistence()

    do {
        let screens = NSScreen.screens
        try adapter.applyWallpaper(from: url, to: screens)

        let entry = WallpaperHistoryEntry(
            id: UUID(),
            fileURL: url,
            createdAt: Date(),
            source: .localImage,
            metadata: [:]
        )
        var history = try persistence.loadHistory()
        history.insert(entry, at: 0)
        try persistence.saveHistory(history)
        try persistence.saveLastApplied(url)

        let result: [String: Any] = [
            "success": true,
            "message": "Wallpaper applied.",
            "entry": historyEntryToDict(entry),
        ]
        printJSON(result)
    } catch let error as WallpaperError {
        printError(error)
    } catch {
        printGenericError(error.localizedDescription)
    }

case "generate-goals":
    guard args.count >= 3 else {
        printGenericError("Usage: WallpaperSetterCLI generate-goals '<json>'")
        fatalError()
    }
    let jsonString = args[2]
    guard let jsonData = jsonString.data(using: .utf8),
          let json = try? JSONSerialization.jsonObject(with: jsonData) as? [String: Any],
          let title = json["title"] as? String,
          let goalsText = json["goalsText"] as? String,
          let themeRaw = json["theme"] as? String,
          let theme = GoalsTheme(rawValue: themeRaw) else {
        printGenericError("Invalid JSON. Expected: {\"title\":\"...\",\"goalsText\":\"...\",\"theme\":\"minimalDark|minimalLight\"}")
        fatalError()
    }

    let draft = GoalsDraft(title: title, goalsText: goalsText, theme: theme)
    let screenSize = NSScreen.main?.frame.size ?? CGSize(width: 1920, height: 1080)

    let appSupport = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
        ?? URL(fileURLWithPath: NSTemporaryDirectory(), isDirectory: true)
    let generatedDir = appSupport
        .appendingPathComponent("WallpaperSetter", isDirectory: true)
        .appendingPathComponent("Generated", isDirectory: true)

    let renderer = GoalsPNGRenderer(outputDirectory: generatedDir)

    do {
        let rendered = try renderer.render(draft: draft, outputSize: screenSize)
        let persistence = makePersistence()
        try persistence.saveGoalsDraft(draft)

        let result: [String: Any] = [
            "success": true,
            "fileURL": rendered.fileURL.path,
            "width": rendered.size.width,
            "height": rendered.size.height,
        ]
        printJSON(result)
    } catch let error as WallpaperError {
        printError(error)
    } catch {
        printGenericError(error.localizedDescription)
    }

case "save-draft":
    guard args.count >= 3 else {
        printGenericError("Usage: WallpaperSetterCLI save-draft '<json>'")
        fatalError()
    }
    let jsonString = args[2]
    guard let jsonData = jsonString.data(using: .utf8),
          let json = try? JSONSerialization.jsonObject(with: jsonData) as? [String: Any],
          let title = json["title"] as? String,
          let goalsText = json["goalsText"] as? String,
          let themeRaw = json["theme"] as? String,
          let theme = GoalsTheme(rawValue: themeRaw) else {
        printGenericError("Invalid JSON for save-draft")
        fatalError()
    }
    let draft = GoalsDraft(title: title, goalsText: goalsText, theme: theme)
    let persistence = makePersistence()
    do {
        try persistence.saveGoalsDraft(draft)
        printJSON(["success": true])
    } catch let error as WallpaperError {
        printError(error)
    } catch {
        printGenericError(error.localizedDescription)
    }

case "delete-history":
    guard args.count >= 3 else {
        printGenericError("Usage: WallpaperSetterCLI delete-history <uuid>")
        fatalError()
    }
    let idString = args[2]
    guard let targetID = UUID(uuidString: idString) else {
        printGenericError("Invalid UUID: \(idString)")
        fatalError()
    }
    let persistence = makePersistence()
    do {
        var history = try persistence.loadHistory()
        history.removeAll { $0.id == targetID }
        try persistence.saveHistory(history)
        printJSON(["success": true])
    } catch let error as WallpaperError {
        printError(error)
    } catch {
        printGenericError(error.localizedDescription)
    }

case "clear-history":
    let persistence = makePersistence()
    do {
        try persistence.saveHistory([])
        printJSON(["success": true])
    } catch let error as WallpaperError {
        printError(error)
    } catch {
        printGenericError(error.localizedDescription)
    }

case "screen-info":
    let mainScreen = NSScreen.main ?? NSScreen.screens.first
    let size = mainScreen?.frame.size ?? CGSize(width: 1920, height: 1080)
    printJSON([
        "width": size.width,
        "height": size.height,
    ])

default:
    printGenericError("Unknown command: \(command). Available: bootstrap, apply, generate-goals, save-draft, delete-history, clear-history, screen-info")
}
