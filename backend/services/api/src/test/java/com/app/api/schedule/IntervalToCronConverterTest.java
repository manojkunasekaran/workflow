package com.app.api.schedule;

import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class IntervalToCronConverterTest {

    @Test
    void subMinuteIntervalsRequireFixedRate() {
        assertTrue(IntervalToCronConverter.toCron(30).isEmpty());
        assertTrue(IntervalToCronConverter.toCron(45).isEmpty());
        assertTrue(IntervalToCronConverter.toCron(90).isEmpty());
    }

    @Test
    void minuteAlignedIntervalsConvertToCron() {
        assertEquals(Optional.of("0 * * * * *"), IntervalToCronConverter.toCron(60));
        assertEquals(Optional.of("0 */5 * * * *"), IntervalToCronConverter.toCron(300));
        assertEquals(Optional.of("0 */15 * * * *"), IntervalToCronConverter.toCron(900));
    }

    @Test
    void nonAlignedMinuteIntervalsRequireFixedRate() {
        assertTrue(IntervalToCronConverter.toCron(150).isEmpty());
    }

    @Test
    void hourAlignedIntervalsConvertToCron() {
        assertEquals(Optional.of("0 0 * * * *"), IntervalToCronConverter.toCron(3600));
        assertEquals(Optional.of("0 0 */6 * * *"), IntervalToCronConverter.toCron(21600));
    }

    @Test
    void dayAlignedIntervalsConvertToCron() {
        assertEquals(Optional.of("0 0 0 * * *"), IntervalToCronConverter.toCron(86400));
        assertEquals(Optional.of("0 0 0 */2 * *"), IntervalToCronConverter.toCron(172800));
    }
}
