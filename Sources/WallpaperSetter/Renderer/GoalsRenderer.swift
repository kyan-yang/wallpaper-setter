import Foundation
import CoreGraphics

protocol GoalsRenderer {
    func render(draft: GoalsDraft, outputSize: CGSize) throws -> RenderedWallpaper
}
