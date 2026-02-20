import SwiftUI
import UniformTypeIdentifiers
import WallpaperSetterCore

struct ContentView: View {
    @ObservedObject var store: WallpaperStateStore

    @State private var selectedTab: Tab = .library
    @State private var showDetail = false
    @State private var detailEntry: WallpaperHistoryEntry?
    @State private var showImagePicker = false
    @State private var toastMessage: String?
    @State private var showClearHistoryConfirm = false

    enum Tab: String, CaseIterable {
        case library = "Library"
        case goals = "Goals"
    }

    var body: some View {
        ZStack {
            VStack(spacing: 0) {
                toolbar
                Divider()
                tabContent
            }

            if showDetail {
                WallpaperDetailView(
                    store: store,
                    onDismiss: dismissDetail,
                    onDelete: detailEntry != nil ? { deleteAndDismiss() } : nil
                )
                .transition(.opacity.animation(.easeInOut(duration: 0.2)))
                .zIndex(1)
            }
        }
        .overlay(alignment: .top) {
            if let error = store.lastError {
                ErrorBanner(error: error) { store.clearError() }
                    .transition(.move(edge: .top).combined(with: .opacity))
                    .padding(.horizontal, 20)
                    .padding(.top, 8)
            }
        }
        .overlay(alignment: .bottom) {
            if let message = toastMessage {
                ToastView(message: message)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
                    .padding(.bottom, 20)
            }
        }
        .animation(.easeInOut(duration: 0.25), value: store.lastError != nil)
        .animation(.easeInOut(duration: 0.25), value: toastMessage != nil)
        .onAppear { store.bootstrap() }
        .onChange(of: store.applyStatus) { status in
            if case let .success(message) = status {
                showToast(message)
            }
        }
        .fileImporter(
            isPresented: $showImagePicker,
            allowedContentTypes: [.image],
            allowsMultipleSelection: false
        ) { result in
            switch result {
            case let .success(urls):
                if let url = urls.first {
                    store.selectImage(url: url)
                    showDetail = true
                    detailEntry = nil
                }
            case .failure:
                store.lastError = .permissionDenied(operation: "import image")
            }
        }
        .confirmationDialog("Clear all history?", isPresented: $showClearHistoryConfirm) {
            Button("Clear All", role: .destructive) { store.clearHistory() }
        } message: {
            Text("This action cannot be undone.")
        }
    }

    // MARK: - Toolbar

    private var toolbar: some View {
        HStack(spacing: 16) {
            Picker("", selection: $selectedTab) {
                ForEach(Tab.allCases, id: \.self) { tab in
                    Text(tab.rawValue).tag(tab)
                }
            }
            .pickerStyle(.segmented)
            .frame(width: 180)

            Spacer()

            if selectedTab == .library && !store.history.isEmpty {
                Button(action: { showClearHistoryConfirm = true }) {
                    Image(systemName: "trash")
                        .font(.system(size: 11))
                        .foregroundStyle(.secondary)
                        .frame(width: 28, height: 28)
                        .background(.quaternary, in: RoundedRectangle(cornerRadius: 6))
                }
                .buttonStyle(.plain)
                .help("Clear history")
            }

            Button(action: { showImagePicker = true }) {
                Image(systemName: "plus")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(.secondary)
                    .frame(width: 28, height: 28)
                    .background(.quaternary, in: RoundedRectangle(cornerRadius: 6))
            }
            .buttonStyle(.plain)
            .keyboardShortcut("o", modifiers: [.command])
            .help("Import image")
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 10)
    }

    // MARK: - Tab Content

    @ViewBuilder
    private var tabContent: some View {
        switch selectedTab {
        case .library:
            LibraryView(
                store: store,
                onSelectEntry: { entry in
                    store.restoreHistoryEntry(entry)
                    detailEntry = entry
                    showDetail = true
                },
                onImportImage: { showImagePicker = true }
            )
        case .goals:
            GoalsView(store: store)
        }
    }

    // MARK: - Actions

    private func dismissDetail() {
        withAnimation(.easeInOut(duration: 0.2)) {
            showDetail = false
        }
        detailEntry = nil
    }

    private func deleteAndDismiss() {
        if let entry = detailEntry {
            store.deleteHistoryEntry(entry)
        }
        dismissDetail()
    }

    private func showToast(_ message: String) {
        toastMessage = message
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.5) {
            withAnimation { toastMessage = nil }
        }
    }
}

// MARK: - Toast

private struct ToastView: View {
    let message: String

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 14))
                .foregroundStyle(.green)
            Text(message)
                .font(.system(size: 13, weight: .medium))
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(.ultraThickMaterial, in: Capsule())
        .shadow(color: .black.opacity(0.1), radius: 8, y: 4)
    }
}

// MARK: - Error Banner

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
