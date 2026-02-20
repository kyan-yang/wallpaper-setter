import AppKit
import SwiftUI
import WallpaperSetterCore

struct GoalsView: View {
    @ObservedObject var store: WallpaperStateStore

    var body: some View {
        HStack(spacing: 0) {
            // MARK: - Preview (left side)
            VStack {
                Spacer()
                if let image = store.previewImage {
                    Image(nsImage: image)
                        .resizable()
                        .scaledToFit()
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                        .shadow(color: .black.opacity(0.15), radius: 16, y: 6)
                } else if store.isBusy {
                    VStack(spacing: 12) {
                        ProgressView()
                        Text("Generating preview...")
                            .font(.system(size: 13))
                            .foregroundStyle(.secondary)
                    }
                } else {
                    VStack(spacing: 10) {
                        Image(systemName: "text.below.photo")
                            .font(.system(size: 44, weight: .ultraLight))
                            .foregroundStyle(.quaternary)
                        Text("Preview will appear here")
                            .font(.system(size: 13))
                            .foregroundStyle(.tertiary)
                    }
                }
                Spacer()
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .padding(32)

            // MARK: - Form (right side)
            HStack(spacing: 0) {
                Divider()

                VStack(alignment: .leading, spacing: 20) {
                    // Title
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Title")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundStyle(.tertiary)

                        TextField("My Goals", text: $store.goalsDraft.title)
                            .textFieldStyle(.plain)
                            .font(.system(size: 13))
                            .padding(.horizontal, 10)
                            .padding(.vertical, 7)
                            .background(Color(nsColor: .controlBackgroundColor))
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                            .overlay(
                                RoundedRectangle(cornerRadius: 8)
                                    .stroke(Color.secondary.opacity(0.12))
                            )
                    }

                    // Theme
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Theme")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundStyle(.tertiary)

                        HStack(spacing: 8) {
                            ForEach(GoalsTheme.allCases) { theme in
                                GoalsThemeChip(
                                    theme: theme,
                                    isSelected: store.goalsDraft.theme == theme
                                ) {
                                    store.goalsDraft.theme = theme
                                }
                            }
                        }
                    }

                    // Goals text
                    VStack(alignment: .leading, spacing: 6) {
                        HStack {
                            Text("Goals")
                                .font(.system(size: 11, weight: .medium))
                                .foregroundStyle(.tertiary)
                            Text("One per line")
                                .font(.system(size: 10))
                                .foregroundStyle(.tertiary)
                        }

                        TextEditor(text: $store.goalsDraft.goalsText)
                            .font(.system(size: 13))
                            .scrollContentBackground(.hidden)
                            .padding(8)
                            .background(Color(nsColor: .controlBackgroundColor))
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                            .overlay(
                                RoundedRectangle(cornerRadius: 8)
                                    .stroke(Color.secondary.opacity(0.12))
                            )
                            .frame(minHeight: 180)
                    }

                    Spacer()

                    // Apply button
                    HStack(spacing: 8) {
                        Button {
                            store.applySelectedImage()
                        } label: {
                            HStack(spacing: 6) {
                                Image(systemName: "desktopcomputer")
                                Text("Apply as Wallpaper")
                            }
                            .padding(.vertical, 10)
                            .frame(maxWidth: .infinity)
                            .background(
                                applyButtonDisabled
                                    ? Color.accentColor.opacity(0.35)
                                    : Color.accentColor
                            )
                            .foregroundStyle(.white)
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                            .font(.system(size: 13, weight: .semibold))
                        }
                        .buttonStyle(.plain)
                        .disabled(applyButtonDisabled)

                        if store.isBusy {
                            ProgressView()
                                .controlSize(.small)
                        }
                    }
                }
                .padding(24)
                .frame(width: 280)
            }
            .background(Color(nsColor: .windowBackgroundColor).opacity(0.5))
        }
    }

    private var applyButtonDisabled: Bool {
        store.selectedImageURL == nil || store.isBusy
    }
}

struct GoalsThemeChip: View {
    let theme: GoalsTheme
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 4) {
                RoundedRectangle(cornerRadius: 8)
                    .fill(fillColor)
                    .frame(width: 44, height: 28)
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(
                                isSelected
                                    ? Color.accentColor
                                    : Color.secondary.opacity(0.2),
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

    private var fillColor: Color {
        switch theme {
        case .minimalLight:
            return Color(white: 0.92)
        case .minimalDark:
            return Color(white: 0.15)
        }
    }
}
