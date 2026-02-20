import SwiftUI
import AppKit
import UniformTypeIdentifiers
import WallpaperSetterCore

struct LibraryView: View {
    @ObservedObject var store: WallpaperStateStore
    let onSelectEntry: (WallpaperHistoryEntry) -> Void
    let onImportImage: () -> Void

    @State private var hoveredID: UUID?
    @State private var isDropTargeted = false

    var body: some View {
        Group {
            if store.history.isEmpty {
                emptyState
            } else {
                gridContent
            }
        }
        .onDrop(of: [.fileURL], isTargeted: $isDropTargeted) { providers in
            handleDrop(providers)
        }
        .overlay {
            if isDropTargeted {
                RoundedRectangle(cornerRadius: 12)
                    .strokeBorder(style: StrokeStyle(lineWidth: 2, dash: [8, 4]))
                    .foregroundStyle(Color.accentColor.opacity(0.3))
                    .background(Color.accentColor.opacity(0.05))
                    .overlay {
                        Text("Drop to import")
                            .font(.system(size: 15, weight: .medium))
                            .foregroundStyle(.secondary)
                    }
            }
        }
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "photo.on.rectangle.angled")
                .font(.system(size: 48, weight: .ultraLight))
                .foregroundStyle(.tertiary)
            Text("No wallpapers yet")
                .font(.title3.weight(.medium))
                .foregroundStyle(.secondary)
            Text("Drop images here or click + to import")
                .font(.system(size: 13))
                .foregroundStyle(.tertiary)
            Button("Import Image", action: onImportImage)
                .buttonStyle(.borderedProminent)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Grid

    private var gridContent: some View {
        ScrollView {
            LazyVGrid(
                columns: [GridItem(.adaptive(minimum: 200, maximum: 300), spacing: 16)],
                spacing: 16
            ) {
                ForEach(store.history) { entry in
                    WallpaperCard(
                        entry: entry,
                        isActive: entry.fileURL == store.lastAppliedURL,
                        isHovered: hoveredID == entry.id
                    )
                    .onHover { hovering in
                        hoveredID = hovering ? entry.id : nil
                    }
                    .onTapGesture {
                        onSelectEntry(entry)
                    }
                }
            }
            .padding(24)
        }
    }

    // MARK: - Drop

    private func handleDrop(_ providers: [NSItemProvider]) -> Bool {
        for provider in providers {
            provider.loadItem(forTypeIdentifier: UTType.fileURL.identifier, options: nil) { item, _ in
                guard let data = item as? Data,
                      let url = URL(dataRepresentation: data, relativeTo: nil) else { return }
                Task { @MainActor in
                    store.selectImage(url: url)
                    let entry = WallpaperHistoryEntry(
                        id: UUID(),
                        fileURL: url,
                        createdAt: Date(),
                        source: .localImage,
                        metadata: [:]
                    )
                    onSelectEntry(entry)
                }
            }
        }
        return true
    }
}

// MARK: - WallpaperCard

struct WallpaperCard: View {
    let entry: WallpaperHistoryEntry
    let isActive: Bool
    let isHovered: Bool

    @State private var thumbnail: NSImage?

    var body: some View {
        ZStack(alignment: .bottomLeading) {
            // Thumbnail or placeholder
            Group {
                if let thumbnail {
                    Image(nsImage: thumbnail)
                        .resizable()
                        .scaledToFill()
                } else {
                    Rectangle()
                        .fill(.quaternary)
                        .overlay {
                            ProgressView()
                                .controlSize(.small)
                        }
                }
            }

            // Hover overlay
            if isHovered {
                LinearGradient(
                    colors: [.clear, .black.opacity(0.5)],
                    startPoint: .top,
                    endPoint: .bottom
                )

                VStack(alignment: .leading, spacing: 2) {
                    Text(entry.fileURL.lastPathComponent)
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(.white)
                        .lineLimit(1)
                        .truncationMode(.middle)
                    Text(entry.createdAt.formatted(date: .abbreviated, time: .shortened))
                        .font(.system(size: 10))
                        .foregroundStyle(.white.opacity(0.7))
                }
                .padding(10)
            }
        }
        .aspectRatio(16.0 / 10.0, contentMode: .fit)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay {
            if isActive {
                RoundedRectangle(cornerRadius: 12)
                    .strokeBorder(Color.accentColor, lineWidth: 2)
            }
        }
        .contentShape(RoundedRectangle(cornerRadius: 12))
        .shadow(
            color: .black.opacity(isHovered ? 0.15 : 0.06),
            radius: isHovered ? 12 : 6,
            y: isHovered ? 4 : 2
        )
        .scaleEffect(isHovered ? 1.02 : 1.0)
        .animation(.easeOut(duration: 0.2), value: isHovered)
        .task { await loadThumbnail() }
    }

    private func loadThumbnail() async {
        let fileURL = entry.fileURL
        let img: NSImage? = await withCheckedContinuation { continuation in
            DispatchQueue.global(qos: .utility).async {
                continuation.resume(returning: NSImage(contentsOf: fileURL))
            }
        }
        await MainActor.run { thumbnail = img }
    }
}
