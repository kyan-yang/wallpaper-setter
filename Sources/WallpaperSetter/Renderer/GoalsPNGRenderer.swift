import Foundation
import AppKit
import CoreGraphics

struct GoalsPNGRenderer: GoalsRenderer {
    private let outputDirectory: URL
    private let fileManager: FileManager

    init(outputDirectory: URL, fileManager: FileManager = .default) {
        self.outputDirectory = outputDirectory
        self.fileManager = fileManager
    }

    func render(draft: GoalsDraft, outputSize: CGSize) throws -> RenderedWallpaper {
        let trimmed = draft.goalsText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else {
            throw WallpaperError.emptyGoals
        }

        try fileManager.createDirectory(at: outputDirectory, withIntermediateDirectories: true)

        let width = max(1, Int(outputSize.width))
        let height = max(1, Int(outputSize.height))

        guard let rep = NSBitmapImageRep(
            bitmapDataPlanes: nil,
            pixelsWide: width,
            pixelsHigh: height,
            bitsPerSample: 8,
            samplesPerPixel: 4,
            hasAlpha: true,
            isPlanar: false,
            colorSpaceName: .deviceRGB,
            bytesPerRow: 0,
            bitsPerPixel: 0
        ) else {
            throw WallpaperError.renderFailed(reason: "Could not allocate bitmap", underlying: nil)
        }

        NSGraphicsContext.saveGraphicsState()
        guard let context = NSGraphicsContext(bitmapImageRep: rep) else {
            NSGraphicsContext.restoreGraphicsState()
            throw WallpaperError.renderFailed(reason: "Could not create graphics context", underlying: nil)
        }
        NSGraphicsContext.current = context

        drawBackground(theme: draft.theme, in: CGRect(x: 0, y: 0, width: outputSize.width, height: outputSize.height))
        drawText(draft: draft, outputSize: outputSize)

        context.flushGraphics()
        NSGraphicsContext.restoreGraphicsState()

        guard let png = rep.representation(using: .png, properties: [:]) else {
            throw WallpaperError.renderFailed(reason: "Could not encode PNG", underlying: nil)
        }

        let formatter = DateFormatter()
        formatter.dateFormat = "yyyyMMdd-HHmmss"
        let filename = "goals-\(formatter.string(from: Date())).png"
        let fileURL = outputDirectory.appendingPathComponent(filename)

        do {
            try png.write(to: fileURL, options: .atomic)
        } catch {
            throw WallpaperError.renderFailed(reason: "Could not write output file", underlying: String(describing: error))
        }

        return RenderedWallpaper(fileURL: fileURL, size: outputSize)
    }

    private func drawBackground(theme: GoalsTheme, in rect: CGRect) {
        let (start, end): (NSColor, NSColor) = {
            switch theme {
            case .minimalLight:
                return (NSColor(calibratedWhite: 0.95, alpha: 1.0), NSColor(calibratedWhite: 0.84, alpha: 1.0))
            case .minimalDark:
                return (NSColor(calibratedWhite: 0.12, alpha: 1.0), NSColor(calibratedWhite: 0.20, alpha: 1.0))
            }
        }()

        guard let gradient = NSGradient(starting: start, ending: end) else {
            start.setFill()
            rect.fill()
            return
        }
        gradient.draw(in: rect, angle: 270)
    }

    private func drawText(draft: GoalsDraft, outputSize: CGSize) {
        let paragraph = NSMutableParagraphStyle()
        paragraph.lineSpacing = 10
        paragraph.alignment = .left

        let textColor: NSColor = draft.theme == .minimalDark ? .white : .black
        let goalFont = NSFont.systemFont(ofSize: 36, weight: .medium)
        let titleFont = NSFont.systemFont(ofSize: 56, weight: .bold)

        let horizontalInset = outputSize.width * 0.08
        let maxWidth = outputSize.width - (horizontalInset * 2)
        var y = outputSize.height * 0.72

        if !draft.title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            let title = NSAttributedString(
                string: draft.title,
                attributes: [
                    .font: titleFont,
                    .foregroundColor: textColor.withAlphaComponent(0.95),
                    .paragraphStyle: paragraph,
                ]
            )
            let rect = CGRect(x: horizontalInset, y: y, width: maxWidth, height: outputSize.height * 0.20)
            title.draw(in: rect)
            y -= 90
        }

        let lines = draft.goalsText
            .split(whereSeparator: \.isNewline)
            .map { $0.trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty }

        for line in lines {
            let attributed = NSAttributedString(
                string: "• \(line)",
                attributes: [
                    .font: goalFont,
                    .foregroundColor: textColor.withAlphaComponent(0.90),
                    .paragraphStyle: paragraph,
                ]
            )
            let rect = CGRect(x: horizontalInset, y: y, width: maxWidth, height: 72)
            attributed.draw(in: rect)
            y -= 62
        }
    }
}
