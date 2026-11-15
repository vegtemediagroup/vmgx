// Copyright (c) 2026 Vegte Media Group. SPDX-License-Identifier: MIT
// VMGXDocument.swift — reads and writes .vmgx files as UTF-8 text.

import SwiftUI
import UniformTypeIdentifiers

extension UTType {
    /// Declared in the app's Info.plist (UTExportedTypeDeclarations).
    static let vmgx = UTType(exportedAs: "org.vegte.vmgx")
}

struct VMGXDocument: FileDocument {
    static var readableContentTypes: [UTType] { [.vmgx] }
    static var writableContentTypes: [UTType] { [.vmgx] }

    var text: String

    init(text: String? = nil) {
        if let text {
            self.text = text
        } else {
            let formatter = ISO8601DateFormatter()
            formatter.formatOptions = [.withInternetDateTime]
            formatter.timeZone = .current
            let now = formatter.string(from: Date())
            self.text = """
            @vmgx 1.0

            @id: "new-record"
            @created: \(now)

            title: "Untitled"

            """
        }
    }

    init(configuration: ReadConfiguration) throws {
        guard let data = configuration.file.regularFileContents else {
            throw CocoaError(.fileReadCorruptFile)
        }
        guard let text = String(data: data, encoding: .utf8) else {
            throw CocoaError(.fileReadInapplicableStringEncoding)
        }
        self.text = text
    }

    func fileWrapper(configuration: WriteConfiguration) throws -> FileWrapper {
        FileWrapper(regularFileWithContents: Data(text.utf8))
    }
}
