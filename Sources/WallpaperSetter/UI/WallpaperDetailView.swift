import SwiftUI
import AppKit
import WallpaperSetterCore

struct WallpaperDetailView: View {
    @ObservedObject var store: WallpaperStateStore
    let onDismiss: () -> Void
    let onDelete: (() -> Void)?

    @State private var showDeleteConfirm = false

    private var screenAspectRatio: CGFloat {
        let size = NSScreen.main?.frame.size ?? CGSize(width: 1920, height: 1080)
        return size.width / size.height
    }

    var body: some View {
        VStack(spacing: 0) {
            topBar
            previewArea
            bottomBar
        }
        .background(Color(nsColor: .windowBackgroundColor))
        .onExitCommand { onDismiss() }
    }

    // MARK: - Top Bar

    private var topBar: some View {
        HStack {
            Button(action: onDismiss) {
                HStack(spacing: 4) {
                    Image(systemName: "chevron.left")
                        .font(.system(size: 13, weight: .semibold))
                    Text("Back")
                        .font(.system(size: 13, weight: .medium))
                }
            }
            .foregroundStyle(.secondary)
            .buttonStyle(.plain)

            Spacer()

            Text(store.selectedImageURL?.lastPathComponent ?? "")
                .font(.system(size: 12))
                .foregroundStyle(.tertiary)
                .lineLimit(1)
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 12)
    }

    // MARK: - Preview Area

    private var previewArea: some View {
        Group {
            if let image = store.previewImage {
                CropPreviewView(
                    image: image,
                    screenAspectRatio: screenAspectRatio,
                    cropState: $store.cropState
                )
            } else {
                Image(systemName: "photo")
                    .font(.system(size: 44, weight: .ultraLight))
                    .foregroundStyle(.quaternary)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
    }

    // MARK: - Bottom Bar

    private var bottomBar: some View {
        HStack {
            applyButton

            if !store.cropState.isDefault {
                Button(action: { store.resetCrop() }) {
                    HStack(spacing: 4) {
                        Image(systemName: "arrow.counterclockwise")
                            .font(.system(size: 10))
                        Text("Reset Crop")
                            .font(.system(size: 12))
                    }
                }
                .foregroundStyle(.secondary)
                .buttonStyle(.plain)
                .transition(.opacity)
            }

            if store.isBusy {
                ProgressView()
                    .controlSize(.small)
            }

            Spacer()

            if store.cropState.zoom > 1.0 {
                Text("\(Int(store.cropState.zoom * 100))%")
                    .font(.system(size: 11, design: .monospaced))
                    .foregroundStyle(.tertiary)
            }

            if let onDelete {
                Button(action: { showDeleteConfirm = true }) {
                    Image(systemName: "trash")
                        .font(.system(size: 11))
                }
                .foregroundStyle(.red.opacity(0.7))
                .buttonStyle(.plain)
                .confirmationDialog(
                    "Delete this wallpaper from history?",
                    isPresented: $showDeleteConfirm,
                    titleVisibility: .visible
                ) {
                    Button("Delete", role: .destructive) {
                        onDelete()
                    }
                    Button("Cancel", role: .cancel) {}
                }
            }
        }
        .padding(.horizontal, 24)
        .padding(.vertical, 14)
        .background(.bar)
        .animation(.easeInOut(duration: 0.15), value: store.cropState.isDefault)
    }

    private var applyButton: some View {
        let disabled = store.selectedImageURL == nil || store.isBusy
        return Button(action: { store.applySelectedImage() }) {
            HStack(spacing: 6) {
                Image(systemName: "desktopcomputer")
                    .font(.system(size: 11))
                Text("Apply")
                    .font(.system(size: 13, weight: .medium))
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 8)
            .background(Color.accentColor.opacity(disabled ? 0.35 : 1.0))
            .foregroundStyle(.white)
            .clipShape(RoundedRectangle(cornerRadius: 8))
        }
        .buttonStyle(.plain)
        .disabled(disabled)
        .keyboardShortcut(.return, modifiers: .command)
    }
}
