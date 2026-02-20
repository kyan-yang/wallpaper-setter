import Foundation
import CoreGraphics

public protocol GoalsRenderer {
    func render(draft: GoalsDraft, outputSize: CGSize) throws -> RenderedWallpaper
}
