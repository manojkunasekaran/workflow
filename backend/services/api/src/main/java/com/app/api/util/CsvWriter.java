package com.app.api.util;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

/**
 * Minimal RFC 4180 CSV builder for insight exports (no external dependencies).
 */
public final class CsvWriter {

    private static final DateTimeFormatter ISO_INSTANT =
            DateTimeFormatter.ISO_INSTANT.withZone(ZoneOffset.UTC);

    private final List<String[]> rows = new ArrayList<>();

    private CsvWriter() {
    }

    public static CsvWriter create() {
        return new CsvWriter();
    }

    public CsvWriter header(String... columns) {
        rows.add(columns);
        return this;
    }

    public CsvWriter row(String... values) {
        rows.add(values);
        return this;
    }

    public byte[] toUtf8BytesWithBom() {
        String body = toString();
        byte[] bom = new byte[] {(byte) 0xEF, (byte) 0xBB, (byte) 0xBF};
        byte[] content = body.getBytes(java.nio.charset.StandardCharsets.UTF_8);
        byte[] combined = new byte[bom.length + content.length];
        System.arraycopy(bom, 0, combined, 0, bom.length);
        System.arraycopy(content, 0, combined, bom.length, content.length);
        return combined;
    }

    @Override
    public String toString() {
        StringBuilder sb = new StringBuilder();
        for (String[] row : rows) {
            for (int i = 0; i < row.length; i++) {
                if (i > 0) {
                    sb.append(',');
                }
                sb.append(escape(row[i]));
            }
            sb.append('\n');
        }
        return sb.toString();
    }

    public static String formatInstant(Instant instant) {
        if (instant == null) {
            return "";
        }
        return ISO_INSTANT.format(instant);
    }

    public static String formatLong(long value) {
        return Long.toString(value);
    }

    private static String escape(String value) {
        if (value == null) {
            return "";
        }
        boolean mustQuote = value.indexOf(',') >= 0
                || value.indexOf('"') >= 0
                || value.indexOf('\n') >= 0
                || value.indexOf('\r') >= 0;
        if (!mustQuote) {
            return value;
        }
        return '"' + value.replace("\"", "\"\"") + '"';
    }
}
