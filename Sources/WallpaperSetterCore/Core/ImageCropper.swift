import AppKit
import CoreGraphics

public enum ImageCropper {
    public static func crop(
        image: NSImage,
        cropState: CropState,
        screenSize: CGSize
    ) -> NSImage? {
        guard let cgImage = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else { return nil }

        let imgW = image.size.width
        let imgH = image.size.height
        let containerSize = cropState.containerSize

        guard imgW > 0, imgH > 0,
              containerSize.width > 0, containerSize.height > 0 else { return nil }

        let fillScale = max(containerSize.width / imgW, containerSize.height / imgH)
        let totalScale = fillScale * cropState.zoom

        let cropW = containerSize.width / totalScale
        let cropH = containerSize.height / totalScale
        let cropCenterX = imgW / 2 - cropState.offset.width / totalScale
        let cropCenterY = imgH / 2 - cropState.offset.height / totalScale

        let cropRectPoints = CGRect(
            x: cropCenterX - cropW / 2,
            y: cropCenterY - cropH / 2,
            width: cropW,
            height: cropH
        )

        let scaleX = CGFloat(cgImage.width) / imgW
        let scaleY = CGFloat(cgImage.height) / imgH
        let pixelRect = CGRect(
            x: cropRectPoints.origin.x * scaleX,
            y: cropRectPoints.origin.y * scaleY,
            width: cropRectPoints.width * scaleX,
            height: cropRectPoints.height * scaleY
        ).intersection(CGRect(x: 0, y: 0, width: cgImage.width, height: cgImage.height))

        guard !pixelRect.isEmpty,
              let cropped = cgImage.cropping(to: pixelRect) else { return nil }

        let outputW = Int(screenSize.width)
        let outputH = Int(screenSize.height)

        guard let rep = NSBitmapImageRep(
            bitmapDataPlanes: nil,
            pixelsWide: outputW,
            pixelsHigh: outputH,
            bitsPerSample: 8,
            samplesPerPixel: 4,
            hasAlpha: true,
            isPlanar: false,
            colorSpaceName: .deviceRGB,
            bytesPerRow: 0,
            bitsPerPixel: 0
        ) else { return nil }

        NSGraphicsContext.saveGraphicsState()
        guard let ctx = NSGraphicsContext(bitmapImageRep: rep) else {
            NSGraphicsContext.restoreGraphicsState()
            return nil
        }
        NSGraphicsContext.current = ctx
        ctx.imageInterpolation = .high

        let src = NSImage(cgImage: cropped, size: NSSize(width: pixelRect.width, height: pixelRect.height))
        src.draw(in: NSRect(x: 0, y: 0, width: outputW, height: outputH))

        ctx.flushGraphics()
        NSGraphicsContext.restoreGraphicsState()

        let result = NSImage(size: NSSize(width: outputW, height: outputH))
        result.addRepresentation(rep)
        return result
    }

    public static func savePNG(_ image: NSImage, to url: URL) throws {
        guard let tiffData = image.tiffRepresentation,
              let rep = NSBitmapImageRep(data: tiffData),
              let pngData = rep.representation(using: .png, properties: [:]) else {
            throw WallpaperError.renderFailed(reason: "Could not encode cropped image", underlying: nil)
        }
        try pngData.write(to: url, options: .atomic)
    }
}
