import SwiftUI

struct CropPreviewView: View {
    let image: NSImage
    let screenAspectRatio: CGFloat
    @Binding var cropState: CropState

    @GestureState private var activeDrag: CGSize = .zero
    @GestureState private var activeMagnification: CGFloat = 1.0
    @State private var isHovered = false

    private let maxZoom: CGFloat = 5.0

    var body: some View {
        GeometryReader { geo in
            let fitted = fittedSize(in: geo.size)
            let effectiveZoom = clampedZoom(cropState.zoom * activeMagnification)
            let effectiveOffset = clampedOffset(
                CGSize(
                    width: cropState.offset.width + activeDrag.width,
                    height: cropState.offset.height + activeDrag.height
                ),
                containerSize: fitted,
                zoom: effectiveZoom
            )

            ZStack {
                Image(nsImage: image)
                    .resizable()
                    .scaledToFill()
                    .scaleEffect(effectiveZoom)
                    .offset(effectiveOffset)
            }
            .frame(width: fitted.width, height: fitted.height)
            .clipped()
            .clipShape(RoundedRectangle(cornerRadius: 8))
            .shadow(color: .black.opacity(0.15), radius: 16, y: 6)
            .contentShape(Rectangle())
            .gesture(dragGesture(containerSize: fitted))
            .simultaneousGesture(magnifyGesture(containerSize: fitted))
            .overlay(
                ScrollWheelCaptureView { delta in
                    handleScrollZoom(delta: delta, containerSize: fitted)
                }
                .allowsHitTesting(false)
            )
            .onHover { hovering in
                isHovered = hovering
                if hovering {
                    NSCursor.openHand.push()
                } else {
                    NSCursor.pop()
                }
            }
            .overlay(alignment: .bottom) {
                if isHovered && cropState.isDefault {
                    Text("Drag to reposition · Scroll to zoom")
                        .font(.system(size: 11))
                        .foregroundStyle(.white.opacity(0.8))
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(.black.opacity(0.5), in: Capsule())
                        .padding(.bottom, 12)
                        .transition(.opacity)
                        .allowsHitTesting(false)
                }
            }
            .animation(.easeInOut(duration: 0.2), value: isHovered)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .onAppear { cropState.containerSize = fitted }
            .onChange(of: geo.size) { _ in
                cropState.containerSize = fittedSize(in: geo.size)
            }
        }
        .padding(28)
    }

    // MARK: - Layout

    private func fittedSize(in available: CGSize) -> CGSize {
        guard available.width > 0, available.height > 0, screenAspectRatio > 0 else {
            return CGSize(width: 100, height: 100)
        }
        let availableRatio = available.width / available.height
        if screenAspectRatio > availableRatio {
            let w = available.width
            return CGSize(width: w, height: w / screenAspectRatio)
        } else {
            let h = available.height
            return CGSize(width: h * screenAspectRatio, height: h)
        }
    }

    // MARK: - Gestures

    private func dragGesture(containerSize: CGSize) -> some Gesture {
        DragGesture()
            .updating($activeDrag) { value, state, _ in
                state = value.translation
            }
            .onEnded { value in
                cropState.offset = clampedOffset(
                    CGSize(
                        width: cropState.offset.width + value.translation.width,
                        height: cropState.offset.height + value.translation.height
                    ),
                    containerSize: containerSize,
                    zoom: cropState.zoom
                )
            }
    }

    private func magnifyGesture(containerSize: CGSize) -> some Gesture {
        MagnificationGesture()
            .updating($activeMagnification) { value, state, _ in
                state = value
            }
            .onEnded { value in
                cropState.zoom = clampedZoom(cropState.zoom * value)
                cropState.offset = clampedOffset(
                    cropState.offset, containerSize: containerSize, zoom: cropState.zoom
                )
            }
    }

    private func handleScrollZoom(delta: CGFloat, containerSize: CGSize) {
        let zoomFactor = 1.0 + delta
        cropState.zoom = clampedZoom(cropState.zoom * zoomFactor)
        cropState.offset = clampedOffset(
            cropState.offset, containerSize: containerSize, zoom: cropState.zoom
        )
        cropState.containerSize = containerSize
    }

    // MARK: - Clamping

    private func clampedZoom(_ zoom: CGFloat) -> CGFloat {
        min(maxZoom, max(1.0, zoom))
    }

    private func clampedOffset(_ offset: CGSize, containerSize: CGSize, zoom: CGFloat) -> CGSize {
        let imgW = image.size.width
        let imgH = image.size.height
        guard imgW > 0, imgH > 0,
              containerSize.width > 0, containerSize.height > 0 else { return .zero }

        let fillScale = max(containerSize.width / imgW, containerSize.height / imgH)
        let displayedW = imgW * fillScale * zoom
        let displayedH = imgH * fillScale * zoom

        let maxX = max(0, (displayedW - containerSize.width) / 2)
        let maxY = max(0, (displayedH - containerSize.height) / 2)

        return CGSize(
            width: min(max(offset.width, -maxX), maxX),
            height: min(max(offset.height, -maxY), maxY)
        )
    }
}

// MARK: - Scroll Wheel Capture

private struct ScrollWheelCaptureView: NSViewRepresentable {
    let onScroll: (CGFloat) -> Void

    func makeNSView(context: Context) -> ScrollWheelNSView {
        ScrollWheelNSView(onScroll: onScroll)
    }

    func updateNSView(_ nsView: ScrollWheelNSView, context: Context) {
        nsView.onScroll = onScroll
    }
}

private class ScrollWheelNSView: NSView {
    var onScroll: (CGFloat) -> Void
    private var monitor: Any?

    init(onScroll: @escaping (CGFloat) -> Void) {
        self.onScroll = onScroll
        super.init(frame: .zero)
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { fatalError() }

    override func hitTest(_ point: NSPoint) -> NSView? {
        nil
    }

    override func viewDidMoveToWindow() {
        super.viewDidMoveToWindow()
        if window != nil {
            monitor = NSEvent.addLocalMonitorForEvents(matching: .scrollWheel) { [weak self] event in
                guard let self = self else { return event }
                let loc = self.convert(event.locationInWindow, from: nil)
                guard self.bounds.contains(loc) else { return event }
                let delta = event.scrollingDeltaY
                let sensitivity: CGFloat = event.hasPreciseScrollingDeltas ? 0.005 : 0.03
                self.onScroll(delta * sensitivity)
                return nil
            }
        } else {
            if let monitor = monitor {
                NSEvent.removeMonitor(monitor)
                self.monitor = nil
            }
        }
    }

    deinit {
        if let monitor = monitor {
            NSEvent.removeMonitor(monitor)
        }
    }
}
