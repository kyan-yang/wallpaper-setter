import SwiftUI
import UniformTypeIdentifiers

struct ContentView: View {
    @ObservedObject var store: WallpaperStateStore

    @State private var showImagePicker = false
    @State private var deleteCandidate: WallpaperHistoryEntry?
    @State private var showDeleteHistoryConfirm = false
    @State private var showClearHistoryConfirm = false
    @State private var hoveredHistoryID: UUID?

    var body: some View {
        HStack(spacing: 0) {
            sidebar
            previewArea
            goalsPanel
        }
        .overlay(alignment: .top) {
            if let error = store.lastError {
                ErrorBanner(error: error) { store.clearError() }
                    .transition(.move(edge: .top).combined(with: .opacity))
                    .padding(.horizontal, 20)
                    .padding(.top, 8)
            }
        }
        .animation(.easeInOut(duration: 0.25), value: store.lastError != nil)
        .onAppear { store.bootstrap() }
        .fileImporter(
            isPresented: $showImagePicker,
            allowedContentTypes: [.image],
            allowsMultipleSelection: false
        ) { result in
            switch result {
            case let .success(urls):
                if let first = urls.first { store.selectImage(url: first) }
            case .failure:
                store.lastError = .permissionDenied(operation: "import image")
            }
        }
        .confirmationDialog("Delete history entry?", isPresented: $showDeleteHistoryConfirm) {
            Button("Delete", role: .destructive) {
                if let deleteCandidate { store.deleteHistoryEntry(deleteCandidate) }
                deleteCandidate = nil
            }
            Button("Cancel", role: .cancel) { deleteCandidate = nil }
        } message: {
            Text("Remove \(deleteCandidate?.fileURL.lastPathComponent ?? "this item") from history?")
        }
        .confirmationDialog("Clear all history?", isPresented: $showClearHistoryConfirm) {
            Button("Clear All", role: .destructive) { store.clearHistory() }
        } message: {
            Text("This action cannot be undone.")
        }
    }

    // MARK: - Sidebar

    private var sidebar: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Text("Library")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(.secondary)
                    .textCase(.uppercase)
                    .tracking(0.8)
                Spacer()
                Button(action: { showImagePicker = true }) {
                    Image(systemName: "plus")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(.secondary)
                        .frame(width: 24, height: 24)
                        .background(.quaternary, in: RoundedRectangle(cornerRadius: 6))
                }
                .buttonStyle(.plain)
                .keyboardShortcut("o", modifiers: [.command])
                .help("Add image")
            }
            .padding(.horizontal, 16)
            .padding(.top, 16)
            .padding(.bottom, 12)

            if let url = store.selectedImageURL {
                HStack(spacing: 6) {
                    Circle()
                        .fill(.green)
                        .frame(width: 6, height: 6)
                    Text(url.lastPathComponent)
                        .font(.system(size: 11))
                        .lineLimit(1)
                        .truncationMode(.middle)
                        .foregroundStyle(.primary)
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 12)
            }

            Divider().padding(.horizontal, 12)

            HStack {
                Text("History")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(.secondary)
                    .textCase(.uppercase)
                    .tracking(0.8)
                Spacer()
                if !store.history.isEmpty {
                    Button("Clear") { showClearHistoryConfirm = true }
                        .font(.system(size: 11))
                        .foregroundStyle(.secondary)
                        .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 12)
            .padding(.bottom, 8)

            if store.history.isEmpty {
                VStack(spacing: 8) {
                    Image(systemName: "clock")
                        .font(.system(size: 28, weight: .ultraLight))
                        .foregroundStyle(.quaternary)
                    Text("No history yet")
                        .font(.system(size: 12))
                        .foregroundStyle(.tertiary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
                    LazyVStack(spacing: 2) {
                        ForEach(store.history) { entry in
                            HistoryRow(
                                entry: entry,
                                isHovered: hoveredHistoryID == entry.id,
                                onUse: { store.restoreHistoryEntry(entry) },
                                onDelete: {
                                    deleteCandidate = entry
                                    showDeleteHistoryConfirm = true
                                }
                            )
                            .onHover { isHovered in
                                hoveredHistoryID = isHovered ? entry.id : nil
                            }
                        }
                    }
                    .padding(.horizontal, 8)
                    .padding(.bottom, 8)
                }
            }
        }
        .frame(width: 260)
        .background(.ultraThinMaterial)
    }

    // MARK: - Preview Area

    private var screenAspectRatio: CGFloat {
        let size = NSScreen.main?.frame.size ?? CGSize(width: 1920, height: 1080)
        return size.width / size.height
    }

    private var previewArea: some View {
        VStack(spacing: 0) {
            ZStack {
                Color(nsColor: .windowBackgroundColor)

                if let image = store.previewImage {
                    CropPreviewView(
                        image: image,
                        screenAspectRatio: screenAspectRatio,
                        cropState: $store.cropState
                    )
                    .transition(.opacity)
                } else {
                    VStack(spacing: 14) {
                        Image(systemName: "photo.on.rectangle")
                            .font(.system(size: 44, weight: .ultraLight))
                            .foregroundStyle(.quaternary)
                        Text("Select an image or generate a goals wallpaper")
                            .font(.system(size: 13))
                            .foregroundStyle(.tertiary)
                    }
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)

            HStack(spacing: 12) {
                Button(action: { store.applySelectedImage() }) {
                    HStack(spacing: 6) {
                        Image(systemName: "desktopcomputer")
                            .font(.system(size: 11))
                        Text("Apply")
                            .font(.system(size: 13, weight: .medium))
                    }
                    .padding(.horizontal, 18)
                    .padding(.vertical, 7)
                    .background(
                        store.selectedImageURL == nil || store.isBusy
                            ? Color.accentColor.opacity(0.35)
                            : Color.accentColor
                    )
                    .foregroundStyle(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                }
                .buttonStyle(.plain)
                .disabled(store.selectedImageURL == nil || store.isBusy)
                .keyboardShortcut(.return, modifiers: [.command])

                if !store.cropState.isDefault {
                    Button(action: { store.resetCrop() }) {
                        HStack(spacing: 4) {
                            Image(systemName: "arrow.counterclockwise")
                                .font(.system(size: 10))
                            Text("Reset Crop")
                                .font(.system(size: 12))
                        }
                        .foregroundStyle(.secondary)
                    }
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

                statusPill
            }
            .padding(.horizontal, 24)
            .padding(.vertical, 12)
            .background(.bar)
            .animation(.easeInOut(duration: 0.15), value: store.cropState.isDefault)
        }
    }

    @ViewBuilder
    private var statusPill: some View {
        switch store.applyStatus {
        case .idle:
            EmptyView()
        case .applying:
            StatusPill(text: "Applying…", color: .secondary)
        case let .success(message):
            StatusPill(text: message, color: .green)
        case let .failure(message):
            StatusPill(text: message, color: .red)
        }
    }

    // MARK: - Goals Panel

    private var goalsPanel: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Goals Wallpaper")
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(.secondary)
                .textCase(.uppercase)
                .tracking(0.8)

            VStack(alignment: .leading, spacing: 5) {
                Text("Title")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(.tertiary)
                TextField("My Goals", text: $store.goalsDraft.title)
                    .textFieldStyle(.plain)
                    .font(.system(size: 13))
                    .padding(.horizontal, 10)
                    .padding(.vertical, 7)
                    .background(Color(nsColor: .controlBackgroundColor))
                    .clipShape(RoundedRectangle(cornerRadius: 6))
                    .overlay(
                        RoundedRectangle(cornerRadius: 6)
                            .stroke(Color.secondary.opacity(0.12))
                    )
            }

            VStack(alignment: .leading, spacing: 5) {
                Text("Theme")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(.tertiary)
                HStack(spacing: 8) {
                    ForEach(GoalsTheme.allCases) { theme in
                        ThemeChip(
                            theme: theme,
                            isSelected: store.goalsDraft.theme == theme
                        ) {
                            store.goalsDraft.theme = theme
                        }
                    }
                }
            }

            VStack(alignment: .leading, spacing: 5) {
                Text("Goals")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(.tertiary)
                TextEditor(text: $store.goalsDraft.goalsText)
                    .font(.system(size: 13, design: .rounded))
                    .scrollContentBackground(.hidden)
                    .padding(8)
                    .background(Color(nsColor: .controlBackgroundColor))
                    .clipShape(RoundedRectangle(cornerRadius: 6))
                    .overlay(
                        RoundedRectangle(cornerRadius: 6)
                            .stroke(Color.secondary.opacity(0.12))
                    )
                    .frame(minHeight: 180)
            }

            Spacer()
        }
        .padding(16)
        .frame(width: 260)
        .background(.ultraThinMaterial)
    }
}

// MARK: - Components

private struct HistoryRow: View {
    let entry: WallpaperHistoryEntry
    let isHovered: Bool
    let onUse: () -> Void
    let onDelete: () -> Void

    var body: some View {
        HStack(spacing: 10) {
            Thumbnail(url: entry.fileURL)
                .frame(width: 36, height: 36)
                .clipShape(RoundedRectangle(cornerRadius: 5))

            VStack(alignment: .leading, spacing: 2) {
                Text(entry.fileURL.lastPathComponent)
                    .font(.system(size: 12, weight: .medium))
                    .lineLimit(1)
                    .truncationMode(.middle)
                Text(entry.createdAt.formatted(date: .abbreviated, time: .shortened))
                    .font(.system(size: 10))
                    .foregroundStyle(.tertiary)
            }

            Spacer(minLength: 4)

            if isHovered {
                HStack(spacing: 4) {
                    IconButton(systemName: "arrow.uturn.left", action: onUse)
                        .help("Use this wallpaper")
                    IconButton(systemName: "trash", color: .red.opacity(0.7), action: onDelete)
                        .help("Delete")
                }
                .transition(.opacity)
            }
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 5)
        .background(
            RoundedRectangle(cornerRadius: 6)
                .fill(isHovered ? Color.primary.opacity(0.04) : .clear)
        )
        .animation(.easeInOut(duration: 0.15), value: isHovered)
    }
}

private struct Thumbnail: View {
    let url: URL
    @State private var image: NSImage?

    var body: some View {
        Group {
            if let image {
                Image(nsImage: image)
                    .resizable()
                    .scaledToFill()
            } else {
                Rectangle()
                    .fill(.quaternary)
                    .overlay {
                        Image(systemName: "photo")
                            .font(.system(size: 11))
                            .foregroundStyle(.tertiary)
                    }
            }
        }
        .task { await loadThumbnail() }
    }

    private func loadThumbnail() async {
        let fileURL = url
        let img: NSImage? = await withCheckedContinuation { continuation in
            DispatchQueue.global(qos: .utility).async {
                continuation.resume(returning: NSImage(contentsOf: fileURL))
            }
        }
        await MainActor.run { image = img }
    }
}

private struct ThemeChip: View {
    let theme: GoalsTheme
    let isSelected: Bool
    let action: () -> Void

    private var fill: Color {
        switch theme {
        case .minimalLight: return Color(white: 0.92)
        case .minimalDark: return Color(white: 0.15)
        }
    }

    var body: some View {
        Button(action: action) {
            VStack(spacing: 4) {
                RoundedRectangle(cornerRadius: 6)
                    .fill(fill)
                    .frame(width: 44, height: 28)
                    .overlay(
                        RoundedRectangle(cornerRadius: 6)
                            .strokeBorder(
                                isSelected ? Color.accentColor : Color.secondary.opacity(0.2),
                                lineWidth: isSelected ? 2 : 1
                            )
                    )
                Text(theme.displayName)
                    .font(.system(size: 10))
                    .foregroundStyle(.secondary)
            }
        }
        .buttonStyle(.plain)
    }
}

private struct IconButton: View {
    let systemName: String
    var color: Color = .primary
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Image(systemName: systemName)
                .font(.system(size: 10, weight: .medium))
                .foregroundStyle(color)
                .frame(width: 22, height: 22)
                .background(.quaternary, in: RoundedRectangle(cornerRadius: 5))
        }
        .buttonStyle(.plain)
    }
}

private struct StatusPill: View {
    let text: String
    let color: Color

    var body: some View {
        Text(text)
            .font(.system(size: 11, weight: .medium))
            .foregroundStyle(color)
            .padding(.horizontal, 10)
            .padding(.vertical, 4)
            .background(color.opacity(0.1), in: Capsule())
    }
}

private struct ErrorBanner: View {
    let error: WallpaperError
    let dismiss: () -> Void

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 14))
                .foregroundStyle(.orange)
            VStack(alignment: .leading, spacing: 1) {
                Text(error.errorDescription ?? "Error")
                    .font(.system(size: 13, weight: .medium))
                if let suggestion = error.recoverySuggestion {
                    Text(suggestion)
                        .font(.system(size: 11))
                        .foregroundStyle(.secondary)
                }
            }
            Spacer()
            Button(action: dismiss) {
                Image(systemName: "xmark")
                    .font(.system(size: 9, weight: .bold))
                    .foregroundStyle(.secondary)
                    .frame(width: 20, height: 20)
                    .background(.quaternary, in: Circle())
            }
            .buttonStyle(.plain)
        }
        .padding(12)
        .background(.regularMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 10))
        .shadow(color: .black.opacity(0.08), radius: 8, y: 2)
    }
}
