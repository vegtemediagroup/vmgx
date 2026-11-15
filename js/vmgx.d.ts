// Type definitions for vmgx 1.0.1
// Copyright (c) 2026 Vegte Media Group. SPDX-License-Identifier: MIT

declare namespace VMGX {
  /** Any value a VMGX document can hold. */
  type Value =
    | string
    | number
    | boolean
    | null
    | VDate
    | VDateTime
    | Link
    | Value[]
    | { [key: string]: Value };

  /** A VMGX document: always an object at the top level. */
  type Document = { [key: string]: Value };

  /** A calendar date with no time, such as 2027-03-01. */
  class VDate {
    constructor(year: number, month: number, day: number);
    readonly year: number;
    readonly month: number;
    readonly day: number;
    toString(): string;
    toJSON(): string;
    /** Midnight UTC on this date. */
    toDate(): Date;
  }

  /** A date and time, such as 2026-11-14T22:30:00+01:00. */
  class VDateTime {
    constructor(year: number, month: number, day: number, hour: number, minute: number,
                second: number, fraction: string, offset: number | null);
    readonly year: number;
    readonly month: number;
    readonly day: number;
    readonly hour: number;
    readonly minute: number;
    readonly second: number;
    /** Digits after the decimal point, up to 6, or "" for none. */
    readonly fraction: string;
    /** Minutes east of UTC, or null when no time zone is given. */
    readonly offset: number | null;
    /** Canonical form: seconds always present, Z for UTC. */
    toString(): string;
    toJSON(): string;
    /** As a JavaScript Date. A date-time without a time zone is read as UTC. */
    toDate(): Date;
  }

  /** A URL or URI, written as <https://...> in VMGX. */
  class Link {
    constructor(href: string);
    readonly href: string;
    toString(): string;
    toJSON(): string;
  }

  /** Thrown for invalid VMGX text. */
  class VMGXError extends SyntaxError {
    readonly reason: string;
    readonly line: number;
    readonly column: number;
  }

  interface StringifyOptions {
    /** Write the "@vmgx 1.0" header. Default true. */
    header?: boolean;
    /** Spaces per indentation level. Default 2. */
    indent?: number;
  }

  interface JSONOptions {
    /** Spaces per indentation level in the JSON. Default 2. */
    indent?: number;
    /** Typed JSON: dates and links become {"@date": …}, {"@datetime": …} and {"@link": …}. Default false. */
    typed?: boolean;
  }

  interface FromJSONOptions extends StringifyOptions {
    /** Read {"@date": …}, {"@datetime": …} and {"@link": …} objects as native values. Default false. */
    typed?: boolean;
  }

  /** Language version written in headers ("1.0"). */
  const VERSION: string;
  /** Specification version this parser follows ("1.0.1"). */
  const SPEC_VERSION: string;
  /** Deepest nesting of objects and lists accepted (256). */
  const MAX_DEPTH: number;

  /** Parse VMGX text. Throws VMGXError on invalid input. */
  function parse(text: string): Document;
  /** Write a document as VMGX text. */
  function stringify(data: Document, options?: StringifyOptions): string;
  /** Check VMGX text without throwing. */
  function validate(text: string): { valid: true; error: null } | { valid: false; error: VMGXError };
  /** Convert VMGX text or a parsed document to JSON text. A number is read as the indent. */
  function toJSON(input: string | Document, options?: JSONOptions | number): string;
  /** Convert JSON text (an object at the top level) to VMGX text. */
  function fromJSON(jsonText: string, options?: FromJSONOptions): string;
}

export = VMGX;
