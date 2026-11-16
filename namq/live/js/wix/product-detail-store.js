// Declarations of product-detail-store.ts: what this file exports, their arguments and what they return.
// import type { OptionChoice, ProductDetail, ProductOption, ProductVariant, SubscriptionPlan } from "./storefront-types.js";
// export interface ProductDetailStoreOptions {
//     initial?: ProductDetail | null;
//     slug?: string;
// }
// export declare const ONE_TIME_PLAN = "one-time";
// export interface OptionGroupView extends ProductOption {
//     choices: (OptionChoice & {
//         selected: boolean;
//         exists: boolean;
//     })[];
// }
// export interface PlanView extends SubscriptionPlan {
//     price: string;
//     selected: boolean;
// }
// export interface ProductDetailState {
//     product: ProductDetail | null;
//     notFound: boolean;
//     optionGroups: OptionGroupView[];
//     modifierValues: Record<string, string>;
//     variant: ProductVariant | null;
//     imageUrl: string | null;
//     price: string;
//     compareAtPrice: string | null;
//     pricePerUnit: string | null;
//     plans: PlanView[];
//     subscriptionPlanId: string | null;
//     isPreorder: boolean;
//     preorderMessage: string | null;
//     remaining: number | null;
//     maxQuantity: number;
//     canAdd: boolean;
//     blockedReason: string | null;
//     quantity: number;
//     adding: boolean;
//     error: string | null;
//     canNotify: boolean;
//     notifying: boolean;
//     notifyResult: "created" | "already-subscribed" | null;
//     notifyError: string | null;
// }
// export interface ProductDetailStore {
//     getState(): ProductDetailState;
//     subscribe(listener: (state: ProductDetailState) => void): () => void;
//     start(): void;
//     stop(): void;
//     selectOption(optionId: string, choiceId: string): void;
//     setModifier(key: string, value: string): void;
//     setQuantity(n: number): void;
//     selectPlan(planId: string): void;
//     add(): Promise<void>;
//     notify(email: string): Promise<"created" | "already-subscribed">;
// }
// export declare function createProductDetailStore({ initial, slug }: ProductDetailStoreOptions): ProductDetailStore;
// Product detail as a framework-free store — the logic behind useProductDetail, usable from React
// (useProductDetail wraps it), from a static page's PDP and quick-add picker, from Vue/Svelte, or as
// the specification for a port. Option selection → variant resolution → add-to-cart, plus modifier
// inputs, the plan picker for a subscription product, the live inventory (stock left, purchase
// cap, pre-order message) and "notify me" for a sold-out item. This is where the "adds variants[0]
// regardless of the buyer's choice" class of bugs comes from — always drive a purchase surface
// through this store, never resolve variants by hand.
//
// Selections start EMPTY (a buyer who never noticed a pre-picked default buys the wrong colour).
// Pass the server-fetched ProductDetail as `initial` (SSR) or a `slug` (the store fetches on start).
// One store per product surface: createProductDetailStore(), not a singleton.
import { fetchBackInStockEnabled, fetchInventory, fetchProductBySlug, requestBackInStock, resolveVariant } from "./catalog.js";
import { choiceAvailability, maxPurchasable, mergeInventory } from "./catalog-core.js";
import { addLine } from "./cart-store.js";
/** The buyer's choice for "buy once" on a product that also sells plans. */
export const ONE_TIME_PLAN = "one-time";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function createProductDetailStore({ initial, slug }) {
    let product = initial ?? null;
    let notFound = false;
    let selections = {}; // optionId -> choiceId
    let lastPicked = null; // the option picked most recently — its choice's image wins
    let modifierValues = {};
    let subscriptionPlanId = null;
    let quantity = 1;
    let adding = false;
    let error = null;
    let notifyEnabled = false;
    let notifying = false;
    let notifyResult = null;
    let notifyError = null;
    let started = false;
    let enriched = null; // product id whose inventory was loaded
    const listeners = new Set();
    let snapshot = null;
    const emit = () => { snapshot = null; for (const fn of listeners)
        fn(); };
    function getState() {
        if (snapshot)
            return snapshot;
        const variant = product ? resolveVariant(product, selections) : null;
        const availability = product ? choiceAvailability(product, selections) : {};
        const optionGroups = (product?.options ?? []).map((o) => ({
            ...o,
            choices: o.choices.map((c) => {
                const a = availability[o.id]?.[c.choiceId];
                return { ...c, selected: selections[o.id] === c.choiceId, inStock: a ? a.inStock : c.inStock, exists: a ? a.exists : true };
            }),
        }));
        const pickedImage = (optionId) => {
            const o = product?.options.find((x) => x.id === optionId);
            return o?.choices.find((c) => c.choiceId === selections[optionId])?.imageUrl ?? null;
        };
        const pickedImages = (product?.options ?? []).map((o) => pickedImage(o.id)).filter((u) => !!u);
        const imageUrl = (lastPicked ? pickedImage(lastPicked) : null) ?? pickedImages[pickedImages.length - 1] ?? variant?.imageUrl ?? null;
        const missingOptions = (product?.options ?? []).filter((o) => !selections[o.id]).map((o) => o.name);
        const selectionComplete = missingOptions.length === 0;
        const missingModifier = (product?.modifiers ?? []).find((m) => m.mandatory && (modifierValues[m.key] ?? "").trim().length === 0);
        const shortText = (product?.modifiers ?? []).find((m) => m.type === "text" && m.minChars && (modifierValues[m.key] ?? "").length > 0 && (modifierValues[m.key] ?? "").length < m.minChars);
        const plans = product?.subscriptions ?? [];
        const plan = subscriptionPlanId && subscriptionPlanId !== ONE_TIME_PLAN ? plans.find((p) => p.id === subscriptionPlanId) ?? null : null;
        const planMissing = plans.length > 0 && (!subscriptionPlanId || (subscriptionPlanId === ONE_TIME_PLAN && !product?.allowOneTimePurchase) || (subscriptionPlanId !== ONE_TIME_PLAN && !plan));
        // In stock OR pre-orderable counts as buyable; a preorder add carries preOrderRequested.
        const isPreorder = !!variant && !variant.inStock && variant.preorderEnabled;
        const available = !!variant && (variant.inStock || variant.preorderEnabled);
        const canAdd = !!product && available && !missingModifier && !shortText && !planMissing;
        // Wix's own precedence: unavailable > pre-order > sold out > the inputs still needed.
        const blockedReason = !product
            ? null
            : !selectionComplete ? `Choose ${missingOptions.join(" and ")}`
                : !variant ? "This combination isn't available"
                    : !available ? "Out of stock"
                        : missingModifier ? `Add ${missingModifier.title || missingModifier.name}`
                            : shortText ? `${shortText.title || shortText.name} needs at least ${shortText.minChars} characters`
                                : planMissing ? "Choose a plan"
                                    : null;
        // Before every option is picked, the range — never an empty price, never a lone struck minimum.
        const isRange = !!product && product.price !== product.maxPrice && !!product.maxPrice;
        const rangeDisplay = product ? (product.fromPrice ? `From ${product.price}` : isRange ? `${product.price} – ${product.maxPrice}` : product.price) : "";
        const planPrice = plan && variant ? variant.subscriptionPrices[plan.id] ?? "" : "";
        snapshot = {
            product, notFound, optionGroups, modifierValues, variant, imageUrl,
            price: planPrice || variant?.price || rangeDisplay,
            // a plan price is its own thing — never strike the one-time price beside it
            compareAtPrice: plan ? null : variant ? variant.compareAtPrice : isRange ? null : (product?.compareAtPrice ?? null),
            pricePerUnit: variant?.pricePerUnit ?? product?.pricePerUnit ?? null,
            plans: plans.map((p) => ({ ...p, price: variant?.subscriptionPrices[p.id] ?? "", selected: subscriptionPlanId === p.id })),
            subscriptionPlanId,
            isPreorder,
            preorderMessage: isPreorder ? variant?.preorderMessage ?? null : null,
            remaining: variant?.quantity ?? null,
            maxQuantity: maxPurchasable(variant),
            canAdd, blockedReason, quantity, adding, error,
            canNotify: !!product && !!variant && !available && notifyEnabled,
            notifying, notifyResult, notifyError,
        };
        return snapshot;
    }
    // The live inventory (stock left, pre-order allowance and message) refines the catalog's flags;
    // "notify me" only shows when the merchant collects requests. Both are non-blocking niceties.
    function enrich() {
        if (!product || enriched === product.id)
            return;
        const id = enriched = product.id;
        fetchInventory(id).then((inv) => {
            if (!started || !product || product.id !== id || !Object.keys(inv).length)
                return;
            product = { ...product, variants: mergeInventory(product.variants, inv) };
            emit();
        });
        if (product.variants.some((v) => !v.inStock && !v.preorderEnabled) || product.availability !== "IN_STOCK") {
            fetchBackInStockEnabled().then((on) => { if (started && on !== notifyEnabled) {
                notifyEnabled = on;
                emit();
            } });
        }
    }
    return {
        getState,
        subscribe(fn) {
            const listener = () => { try {
                fn(getState());
            }
            catch (e) {
                console.error("product-detail-store listener failed", e);
            } };
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        start() {
            if (started)
                return;
            started = true;
            if (product) {
                enrich();
                return;
            }
            if (!slug)
                return;
            fetchProductBySlug(slug)
                .then((p) => { if (!started)
                return; product = p; notFound = p === null; emit(); enrich(); })
                .catch(() => { if (started) {
                notFound = true;
                emit();
            } });
        },
        stop() { started = false; },
        selectOption(optionId, choiceId) {
            selections = { ...selections, [optionId]: choiceId };
            lastPicked = optionId;
            quantity = 1; // the ceiling belongs to the newly resolved variant
            notifyResult = null;
            notifyError = null;
            emit();
        },
        setModifier(key, value) { modifierValues = { ...modifierValues, [key]: value }; emit(); },
        setQuantity(n) {
            const max = getState().maxQuantity;
            quantity = Math.min(Math.max(1, Math.floor(Number(n) || 1)), max);
            emit();
        },
        selectPlan(planId) { subscriptionPlanId = planId; emit(); },
        async add() {
            const s = getState();
            if (!product || !s.variant)
                return;
            adding = true;
            error = null;
            emit();
            try {
                // The variant id AND every option's key/choice-key pair, as Wix's own storefront sends them.
                const optionChoices = {};
                for (const o of product.options) {
                    const choice = o.choices.find((c) => c.choiceId === s.variant.choiceIds[o.id]);
                    if (o.key && choice?.key)
                        optionChoices[o.key] = choice.key;
                }
                const modifierChoices = {};
                const customTextFields = {};
                for (const m of product.modifiers) {
                    const value = modifierValues[m.key];
                    if (!value)
                        continue;
                    if (m.type === "text")
                        customTextFields[m.key] = value;
                    else
                        modifierChoices[m.key] = value;
                }
                const plan = subscriptionPlanId && subscriptionPlanId !== ONE_TIME_PLAN ? subscriptionPlanId : undefined;
                await addLine(product.id, s.variant.variantId, quantity, { optionChoices, modifierChoices, customTextFields, preorder: s.isPreorder, subscriptionOptionId: plan });
            }
            catch (e) {
                error = e instanceof Error ? e.message : String(e);
                throw e;
            }
            finally {
                adding = false;
                emit();
            }
        },
        async notify(email) {
            const s = getState();
            if (!product)
                throw new Error("No product.");
            if (!EMAIL.test(email.trim())) {
                notifyError = "Enter a valid email address.";
                emit();
                throw new Error(notifyError);
            }
            notifying = true;
            notifyError = null;
            notifyResult = null;
            emit();
            try {
                const result = await requestBackInStock(product.id, s.variant?.variantId ?? null, email.trim(), {
                    name: product.name,
                    price: String(s.variant?.priceAmount ?? product.variants[0]?.priceAmount ?? 0),
                    imageUrl: product.imageUrl || undefined,
                });
                notifyResult = result;
                return result;
            }
            catch (e) {
                notifyError = e instanceof Error && e.message ? e.message : "Couldn't save your request. Please try again.";
                throw e;
            }
            finally {
                notifying = false;
                emit();
            }
        },
    };
}
