import SwiftUI
import WallpaperSetterCore

// MARK: - Design Tokens

enum WS {
    // MARK: Colors
    enum Colors {
        static let bg = Color(nsColor: .windowBackgroundColor)
        static let surface = Color(white: 0.5, opacity: 0.06)
        static let surfaceHover = Color(white: 0.5, opacity: 0.10)
        static let surfaceActive = Color(white: 0.5, opacity: 0.14)
        static let border = Color(white: 0.5, opacity: 0.10)
        static let borderSubtle = Color(white: 0.5, opacity: 0.06)

        static let textPrimary = Color.primary
        static let textSecondary = Color.primary.opacity(0.55)
        static let textTertiary = Color.primary.opacity(0.35)

        static let accent = Color.accentColor
        static let accentSubtle = Color.accentColor.opacity(0.12)
        static let destructive = Color.red.opacity(0.8)

        static let success = Color.green
        static let warning = Color.orange
    }

    // MARK: Radii
    enum Radius {
        static let xs: CGFloat = 4
        static let sm: CGFloat = 6
        static let md: CGFloat = 8
        static let lg: CGFloat = 10
        static let xl: CGFloat = 12
    }

    // MARK: Spacing
    enum Space {
        static let xs: CGFloat = 4
        static let sm: CGFloat = 8
        static let md: CGFloat = 12
        static let lg: CGFloat = 16
        static let xl: CGFloat = 20
        static let xxl: CGFloat = 24
        static let xxxl: CGFloat = 32
    }

    // MARK: Typography
    enum Font {
        static let caption = SwiftUI.Font.system(size: 11)
        static let captionMedium = SwiftUI.Font.system(size: 11, weight: .medium)
        static let body = SwiftUI.Font.system(size: 13)
        static let bodyMedium = SwiftUI.Font.system(size: 13, weight: .medium)
        static let bodySemibold = SwiftUI.Font.system(size: 13, weight: .semibold)
        static let heading = SwiftUI.Font.system(size: 15, weight: .semibold)
        static let title = SwiftUI.Font.system(size: 18, weight: .semibold)
        static let mono = SwiftUI.Font.system(size: 11, design: .monospaced)
    }
}

// MARK: - Custom Tab Button

struct WSTabButton: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(WS.Font.bodyMedium)
                .foregroundStyle(isSelected ? WS.Colors.textPrimary : WS.Colors.textTertiary)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(
                    isSelected ? WS.Colors.surface : Color.clear,
                    in: RoundedRectangle(cornerRadius: WS.Radius.sm)
                )
                .contentShape(RoundedRectangle(cornerRadius: WS.Radius.sm))
        }
        .buttonStyle(.plain)
        .animation(.easeOut(duration: 0.15), value: isSelected)
    }
}

// MARK: - Icon Button (toolbar actions)

struct WSIconButton: View {
    let icon: String
    let size: CGFloat
    let action: () -> Void

    @State private var isHovered = false

    init(_ icon: String, size: CGFloat = 12, action: @escaping () -> Void) {
        self.icon = icon
        self.size = size
        self.action = action
    }

    var body: some View {
        Button(action: action) {
            Image(systemName: icon)
                .font(.system(size: size, weight: .medium))
                .foregroundStyle(WS.Colors.textSecondary)
                .frame(width: 28, height: 28)
                .background(
                    isHovered ? WS.Colors.surfaceHover : WS.Colors.surface,
                    in: RoundedRectangle(cornerRadius: WS.Radius.sm)
                )
                .contentShape(RoundedRectangle(cornerRadius: WS.Radius.sm))
        }
        .buttonStyle(.plain)
        .onHover { isHovered = $0 }
    }
}

// MARK: - Primary Action Button

struct WSPrimaryButton: View {
    let title: String
    let icon: String?
    let isDisabled: Bool
    let action: () -> Void

    @State private var isHovered = false

    init(_ title: String, icon: String? = nil, disabled: Bool = false, action: @escaping () -> Void) {
        self.title = title
        self.icon = icon
        self.isDisabled = disabled
        self.action = action
    }

    var body: some View {
        Button(action: action) {
            HStack(spacing: 6) {
                if let icon {
                    Image(systemName: icon)
                        .font(.system(size: 11, weight: .semibold))
                }
                Text(title)
                    .font(WS.Font.bodySemibold)
            }
            .padding(.horizontal, 18)
            .padding(.vertical, 8)
            .foregroundStyle(.white)
            .background(
                isDisabled
                    ? WS.Colors.accent.opacity(0.35)
                    : (isHovered ? WS.Colors.accent.opacity(0.85) : WS.Colors.accent),
                in: RoundedRectangle(cornerRadius: WS.Radius.md)
            )
            .contentShape(RoundedRectangle(cornerRadius: WS.Radius.md))
        }
        .buttonStyle(.plain)
        .disabled(isDisabled)
        .onHover { isHovered = $0 }
    }
}

// MARK: - Ghost Button

struct WSGhostButton: View {
    let title: String
    let icon: String?
    let action: () -> Void

    @State private var isHovered = false

    init(_ title: String, icon: String? = nil, action: @escaping () -> Void) {
        self.title = title
        self.icon = icon
        self.action = action
    }

    var body: some View {
        Button(action: action) {
            HStack(spacing: 5) {
                if let icon {
                    Image(systemName: icon)
                        .font(.system(size: 10, weight: .medium))
                }
                Text(title)
                    .font(WS.Font.body)
            }
            .foregroundStyle(WS.Colors.textSecondary)
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(
                isHovered ? WS.Colors.surfaceHover : Color.clear,
                in: RoundedRectangle(cornerRadius: WS.Radius.sm)
            )
            .contentShape(RoundedRectangle(cornerRadius: WS.Radius.sm))
        }
        .buttonStyle(.plain)
        .onHover { isHovered = $0 }
    }
}

// MARK: - Text Field

struct WSTextField: View {
    let placeholder: String
    @Binding var text: String

    var body: some View {
        TextField(placeholder, text: $text)
            .textFieldStyle(.plain)
            .font(WS.Font.body)
            .padding(.horizontal, 10)
            .padding(.vertical, 8)
            .background(WS.Colors.surface, in: RoundedRectangle(cornerRadius: WS.Radius.md))
            .overlay(
                RoundedRectangle(cornerRadius: WS.Radius.md)
                    .stroke(WS.Colors.border, lineWidth: 1)
            )
    }
}

// MARK: - Label

struct WSLabel: View {
    let text: String

    var body: some View {
        Text(text)
            .font(WS.Font.captionMedium)
            .foregroundStyle(WS.Colors.textTertiary)
            .textCase(.uppercase)
            .tracking(0.5)
    }
}
