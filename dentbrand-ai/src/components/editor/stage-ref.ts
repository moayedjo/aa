import type Konva from "konva";

/**
 * Module-level handle to the mounted Konva Stage so the shell (export)
 * can reach it without prop-drilling through the dynamic import boundary.
 * Client-only module.
 */
export const stageRef: { current: Konva.Stage | null } = { current: null };
