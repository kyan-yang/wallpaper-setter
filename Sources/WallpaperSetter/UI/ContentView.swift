import SwiftUI
import UniformTypeIdentifiers

struct ContentView: View {
    @ObservedObject var store: WallpaperStateStore

    @State private var showImagePicker = false
    @State private var deleteCandidate: WallpaperHistoryEntry?
    @State private var showDeleteHistoryConfirm = false
    @State private var showClearHistoryConfirm = false

    var body: some View {
        HStack(spacing: 0) {
            libraryPanel
            Divider()
            previewPanel
            Divider()
            goalsPanel
        }
        .overlay(alignment: .top) {
            if let error = store.lastError {
                ErrorBanner(error: error) { store.clearError() }
                    .padding()
            }
        }
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
                if let deleteCandidate {
                    store.deleteHistoryEntry(deleteCandidate)
                }
                deleteCandidate = nil
            }
            Button("Cancel", role: .cancel) {
                deleteCandidate = nil
            }
        } message: {
            Text("Remove \(deleteCandidate?.fileURL.lastPathComponent ?? "this item") from history?")
        }
        .confirmationDialog("Clear all history?", isPresented: $showClearHistoryConfirm) {
            Button("Clear", role: .destructive) {
                store.clearHistory()
            }
        } message: {
            Text("This action cannot be undone.")
        }
    }

    private var libraryPanel: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Text("Library")
                    .font(.title2.bold())
                Spacer()
                Button("Add Image") { showImagePicker = true }
                    .keyboardShortcut("o", modifiers: [.command])
            }

            Text("Selected")
                .font(.headline)
            Text(store.selectedImageURL?.lastPathComponent ?? "None")
                .foregroundStyle(.secondary)
                .lineLimit(2)

            Divider()

            HStack {
                Text("History")
                    .font(.headline)
                Spacer()
                Button("Clear All", role: .destructive) {
                    showClearHistoryConfirm = true
                }
                .disabled(store.history.isEmpty)
            }

            if store.history.isEmpty {
                Text("No wallpapers applied yet.")
                    .foregroundStyle(.secondary)
                    .padding(.top, 16)
            } else {
                List(store.history) { entry in
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(entry.fileURL.lastPathComponent)
                                .lineLimit(1)
                            Text(entry.createdAt.formatted(date: .abbreviated, time: .shortened))
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        Spacer()
                        Button("Use") { store.restoreHistoryEntry(entry) }
                        Button("Delete", role: .destructive) {
                            deleteCandidate = entry
                            showDeleteHistoryConfirm = true
                        }
                    }
                    .buttonStyle(.borderless)
                }
                .listStyle(.inset)
            }
            Spacer()
        }
        .padding(18)
        .frame(minWidth: 320, maxWidth: 360)
    }

    private var previewPanel: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Preview")
                .font(.title2.bold())

            ZStack {
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color(nsColor: .windowBackgroundColor))
                    .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.secondary.opacity(0.2)))

                if let image = store.previewImage {
                    Image(nsImage: image)
                        .resizable()
                        .scaledToFit()
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                        .padding(10)
                } else {
                    VStack(spacing: 8) {
                        Image(systemName: "photo")
                            .font(.system(size: 26, weight: .medium))
                            .foregroundStyle(.secondary)
                        Text("Pick an image or generate goals wallpaper.")
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)

            HStack(spacing: 10) {
                PrimaryButton(title: "Apply", isDisabled: store.selectedImageURL == nil || store.isBusy) {
                    store.applySelectedImage()
                }
                .keyboardShortcut(.return, modifiers: [.command])

                if store.isBusy {
                    ProgressView()
                        .controlSize(.small)
                }

                Spacer()
                statusText
            }
        }
        .padding(18)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    @ViewBuilder
    private var statusText: some View {
        switch store.applyStatus {
        case .idle:
            EmptyView()
        case .applying:
            Text("Applying...")
                .foregroundStyle(.secondary)
        case let .success(message):
            Text(message)
                .foregroundStyle(.green)
        case let .failure(message):
            Text(message)
                .foregroundStyle(.red)
        }
    }

    private var goalsPanel: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Create Goals Wallpaper")
                .font(.title2.bold())

            TextField("Title (optional)", text: $store.goalsDraft.title)

            Picker("Theme", selection: $store.goalsDraft.theme) {
                ForEach(GoalsTheme.allCases) { theme in
                    Text(theme.displayName).tag(theme)
                }
            }
            .pickerStyle(.segmented)

            Text("Goals (one per line)")
                .font(.subheadline.weight(.medium))

            TextEditor(text: $store.goalsDraft.goalsText)
                .font(.system(size: 14, design: .rounded))
                .frame(minHeight: 220)
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(Color.secondary.opacity(0.2))
                )

            HStack {
                Button("Generate Preview") { store.generateAndSelectGoalsWallpaper() }
                    .keyboardShortcut("g", modifiers: [.command])
                    .disabled(store.isBusy)
                Spacer()
            }

            Spacer()
        }
        .padding(18)
        .frame(minWidth: 300, maxWidth: 360)
    }
}

private struct PrimaryButton: View {
    let title: String
    let isDisabled: Bool
    let action: () -> Void

    var body: some View {
        Button(title, action: action)
            .buttonStyle(.borderedProminent)
            .disabled(isDisabled)
    }
}

private struct ErrorBanner: View {
    let error: WallpaperError
    let dismiss: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundStyle(.yellow)
            VStack(alignment: .leading, spacing: 2) {
                Text(error.errorDescription ?? "Error")
                    .font(.headline)
                if let suggestion = error.recoverySuggestion {
                    Text(suggestion)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            Spacer()
            Button("Dismiss", action: dismiss)
                .buttonStyle(.borderless)
        }
        .padding(12)
        .background(.thinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 10))
        .shadow(radius: 2)
    }
}
