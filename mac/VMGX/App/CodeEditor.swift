// Copyright (c) 2026 Vegte Media Group. SPDX-License-Identifier: MIT
// CodeEditor.swift — a plain-text editor (NSTextView) with VMGX syntax colors.
// Smart quotes, dashes and autocorrect are off, because they would break VMGX syntax.

import SwiftUI
import AppKit

struct CodeEditor: NSViewRepresentable {
    @Binding var text: String
    var tokens: [VMGXToken]
    /// The text the tokens were computed from. Colors are applied only when it
    /// matches what is in the editor, so stale tokens never land in the wrong place.
    var tokensSource: String
    var errorOffset: Int?
    var jumpRequest: Int

    static let font = NSFont.monospacedSystemFont(ofSize: 13, weight: .regular)
    static let boldFont = NSFont.monospacedSystemFont(ofSize: 13, weight: .semibold)

    func makeCoordinator() -> Coordinator { Coordinator(self) }

    func makeNSView(context: Context) -> NSScrollView {
        let scrollView = NSTextView.scrollableTextView()
        guard let textView = scrollView.documentView as? NSTextView else { return scrollView }

        textView.delegate = context.coordinator
        textView.isRichText = false
        textView.importsGraphics = false
        textView.allowsUndo = true
        textView.usesFindBar = true
        textView.isIncrementalSearchingEnabled = true
        textView.isAutomaticQuoteSubstitutionEnabled = false
        textView.isAutomaticDashSubstitutionEnabled = false
        textView.isAutomaticTextReplacementEnabled = false
        textView.isAutomaticSpellingCorrectionEnabled = false
        textView.isAutomaticLinkDetectionEnabled = false
        textView.isAutomaticDataDetectionEnabled = false
        textView.isContinuousSpellCheckingEnabled = false
        textView.isGrammarCheckingEnabled = false
        textView.smartInsertDeleteEnabled = false
        textView.font = Self.font
        textView.textColor = .textColor
        textView.backgroundColor = .textBackgroundColor
        textView.textContainerInset = NSSize(width: 10, height: 12)
        textView.typingAttributes = [.font: Self.font, .foregroundColor: NSColor.textColor]
        textView.string = text

        context.coordinator.textView = textView
        context.coordinator.applyHighlighting(tokens: tokens, source: tokensSource, errorOffset: errorOffset)
        return scrollView
    }

    func updateNSView(_ scrollView: NSScrollView, context: Context) {
        let coordinator = context.coordinator
        coordinator.parent = self
        guard let textView = coordinator.textView else { return }

        // The document changed from outside the editor (for example, Format).
        // Replace the text as one undoable edit.
        if textView.string != text {
            let whole = NSRange(location: 0, length: (textView.string as NSString).length)
            if textView.shouldChangeText(in: whole, replacementString: text) {
                textView.textStorage?.replaceCharacters(in: whole, with: text)
                textView.didChangeText()
            }
        }

        coordinator.applyHighlighting(tokens: tokens, source: tokensSource, errorOffset: errorOffset)

        if jumpRequest != coordinator.lastJump {
            coordinator.lastJump = jumpRequest
            if let offset = errorOffset {
                let location = min(offset, (textView.string as NSString).length)
                let range = NSRange(location: location, length: 0)
                textView.window?.makeFirstResponder(textView)
                textView.setSelectedRange(range)
                textView.scrollRangeToVisible(range)
            }
        }
    }

    final class Coordinator: NSObject, NSTextViewDelegate {
        var parent: CodeEditor
        weak var textView: NSTextView?
        var lastJump = 0
        private var highlighted: String?

        init(_ parent: CodeEditor) {
            self.parent = parent
        }

        func textDidChange(_ notification: Notification) {
            guard let textView = notification.object as? NSTextView else { return }
            highlighted = nil
            if parent.text != textView.string {
                parent.text = textView.string
            }
        }

        func applyHighlighting(tokens: [VMGXToken], source: String, errorOffset: Int?) {
            guard let textView, let storage = textView.textStorage else { return }
            guard textView.string == source, highlighted != source else { return }
            highlighted = source

            let length = storage.length
            storage.beginEditing()
            storage.setAttributes(
                [.font: CodeEditor.font, .foregroundColor: NSColor.textColor],
                range: NSRange(location: 0, length: length))

            for token in tokens {
                guard token.s >= 0, token.l > 0, token.s + token.l <= length else { continue }
                let range = NSRange(location: token.s, length: token.l)
                storage.addAttribute(.foregroundColor, value: Palette.color(for: token.k), range: range)
                if token.k == "head" {
                    storage.addAttribute(.font, value: CodeEditor.boldFont, range: range)
                }
            }

            if let offset = errorOffset, offset <= length {
                let line = (storage.string as NSString).lineRange(for: NSRange(location: min(offset, max(length - 1, 0)), length: 0))
                if line.length > 0 {
                    storage.addAttribute(.backgroundColor, value: Palette.errorLine, range: line)
                }
            }
            storage.endEditing()
        }
    }
}

/// Navy-and-gold syntax colors that adapt to light and dark mode.
enum Palette {
    static func dynamic(light: UInt32, dark: UInt32) -> NSColor {
        NSColor(name: nil) { appearance in
            let isDark = appearance.bestMatch(from: [.darkAqua, .aqua]) == .darkAqua
            return NSColor(hex: isDark ? dark : light)
        }
    }

    static let key = dynamic(light: 0x8A6A1C, dark: 0xE2C77F)
    static let meta = dynamic(light: 0xB0561A, dark: 0xF0A868)
    static let string = dynamic(light: 0x2F7A3E, dark: 0x9FD3A8)
    static let number = dynamic(light: 0x1F5FA8, dark: 0x8FC1F0)
    static let date = dynamic(light: 0x7B3FA0, dark: 0xD6A8F0)
    static let link = dynamic(light: 0x137A86, dark: 0x7FD6E0)
    static let keyword = dynamic(light: 0xB03050, dark: 0xF08FA0)
    static let header = dynamic(light: 0xA8842F, dark: 0xE2C77F)
    static let errorLine = NSColor.systemRed.withAlphaComponent(0.14)

    static func color(for kind: String) -> NSColor {
        switch kind {
        case "key": return key
        case "meta": return meta
        case "str", "text": return string
        case "num": return number
        case "date": return date
        case "link": return link
        case "kw": return keyword
        case "head": return header
        case "com", "punc": return .secondaryLabelColor
        default: return .textColor
        }
    }
}

extension NSColor {
    convenience init(hex: UInt32) {
        self.init(
            srgbRed: CGFloat((hex >> 16) & 0xFF) / 255,
            green: CGFloat((hex >> 8) & 0xFF) / 255,
            blue: CGFloat(hex & 0xFF) / 255,
            alpha: 1)
    }
}
