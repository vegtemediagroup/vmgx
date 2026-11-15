// Copyright (c) 2026 Vegte Media Group. SPDX-License-Identifier: MIT
// VMGXApp.swift — a document-based app for reading, viewing and editing .vmgx files.

import SwiftUI

@main
struct VMGXApp: App {
    var body: some Scene {
        DocumentGroup(newDocument: VMGXDocument()) { file in
            ContentView(document: file.$document, fileURL: file.fileURL)
                .frame(minWidth: 760, minHeight: 480)
        }
    }
}
