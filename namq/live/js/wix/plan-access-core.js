// Declarations of plan-access-core.ts: what this file exports, their arguments and what they return.
// import type { Raw } from "./plans-core.js";
// export declare const ACCESS_ORDER_STATUSES: readonly ["ACTIVE"];
// export interface MemberOrdersQuery {
//     planIds: string[];
//     orderStatuses: readonly ("ACTIVE")[];
// }
// export declare function memberOrdersQuery(requiredPlanIds: string[]): MemberOrdersQuery;
// export declare function hasPlanAccess(orders: Raw[] | null | undefined, requiredPlanIds: string[]): boolean;
/** The one order status that grants access: purchased, started, not paused/ended/canceled. */
export const ACCESS_ORDER_STATUSES = ["ACTIVE"];
/** The filter for "the current member's ACTIVE orders for these plans"; throws on an empty plan list. */
export function memberOrdersQuery(requiredPlanIds) {
    if (!requiredPlanIds.length)
        throw new Error("At least one required plan id is needed to check access.");
    return { planIds: requiredPlanIds, orderStatuses: ACCESS_ORDER_STATUSES };
}
/**
 * Access = the member has at least one order with status ACTIVE whose planId is one of the required
 * plans. Re-checked here even though the query already filtered (a caller may pass orders it read
 * for another reason). Visitors never reach this: they have no orders to list.
 */
export function hasPlanAccess(orders, requiredPlanIds) {
    return (orders ?? []).some((o) => o?.status === "ACTIVE" && requiredPlanIds.includes(o?.planId));
}
