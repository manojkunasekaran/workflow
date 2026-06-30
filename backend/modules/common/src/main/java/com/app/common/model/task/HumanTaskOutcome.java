package com.app.common.model.task;

/**
 * Defines the engine-level outcomes for a human task action.
 * Each HumanTaskAction maps to one of these outcomes.
 * This is metadata — NOT a task/workflow status.
 *
 * Engine translation:
 * - APPROVED → Task becomes COMPLETED, workflow resumes
 * - REJECTED → Task becomes FAILED, workflow resumes (or takes rejection path)
 * - PENDING → Task stays PAUSED, workflow stays PAUSED
 */
public enum HumanTaskOutcome {
    APPROVED,
    REJECTED,
    PENDING
}
