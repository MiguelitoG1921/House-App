"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";

type Store = string;
type Price = { store: Store; amount: number; date: string; unitSize?: string; unitPrice?: number };
type Item = { id: string; name: string; category: string; unit: string; units?: string[]; prices: Price[]; purchases?: Price[]; checked: boolean };
type BulletinComment = { id: string; author: string; body: string; createdAt: string; editedAt?: string };
type SharedSnapshot = { items: Item[]; catalogOnly: Item[]; purchasedItems: Item[]; deletedCatalogNames: string[]; stores: Store[]; comments: BulletinComment[] };

const defaultStores: Store[] = ["Costco", "Walmart", "Trader Joe's", "Target"];

function readBrowserSnapshot(): SharedSnapshot {
  const read = <T,>(key: string, fallback: T): T => {
    try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback; } catch { return fallback; }
  };
  const oldArchive = read<Item[]>("common-table-archive-v1", []);
  return {
    items: read<Item[]>("common-table-groceries-v1", initialItems),
    catalogOnly: read<Item[]>("greenhouse-catalog-v1", []),
    purchasedItems: read<Item[]>("greenhouse-purchased-v1", oldArchive.map((item) => ({ ...item, purchases: item.purchases ?? item.prices.slice(-1) }))),
    deletedCatalogNames: read<string[]>("greenhouse-deleted-catalog-v1", []),
    stores: read<Store[]>("greenhouse-stores-v1", defaultStores),
    comments: read<BulletinComment[]>("greenhouse-comments-v1", []),
  };
}

const initialItems: Item[] = [];
const money = (n: number) => `$${n.toFixed(2)}`;
function parseUnitSize(size: string) {
  const match = size.trim().match(/^(\d+(?:\.\d+)?)\s*(.+)$/);
  if (!match) return null;
  const quantity = Number(match[1]);
  const unit = match[2].trim().toLowerCase();
  return quantity > 0 && unit ? { quantity, unit } : null;
}
const unitRate = (price: Price) => price.unitPrice ?? (price.unitSize ? price.amount / (parseUnitSize(price.unitSize)?.quantity ?? 1) : price.amount);
const unitLabel = (price: Price) => parseUnitSize(price.unitSize ?? "")?.unit ?? "item";
const unitSizeSummary = (price: Price) => price.unitSize ?? "unit unavailable";
const priceLabel = (price: Price) => `${money(unitRate(price))} / ${unitLabel(price)}`;
const best = (item: Item) => {
  const prices = item.prices;
  if (!prices.length) return null;
  const comparisonUnit = unitLabel(prices[prices.length - 1]);
  const comparable = prices.filter((price) => unitLabel(price) === comparisonUnit);
  return comparable.reduce<Price | null>((min, price) => !min || unitRate(price) < unitRate(min) ? price : min, null);
};
const icons: Record<string, string> = { Produce: "🥑", Dairy: "🥛", Pantry: "🥫", Bakery: "🍞", Other: "🛒" };
const storeMarker = (store: Store) => store.split(/\s+/).map((word) => word[0]).join("").slice(0, 2).toUpperCase();
const storeBadgeClass = (store: Store) => store.toLowerCase().includes("costco") ? "costco" : store.toLowerCase().includes("walmart") ? "walmart" : store.toLowerCase().includes("trader") ? "trader" : "store-generic";

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const shared = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true as const };
  if (name === "search") return <svg {...shared}><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>;
  if (name === "plus") return <svg {...shared}><path d="M12 5v14M5 12h14"/></svg>;
  if (name === "chevron") return <svg {...shared}><path d="m6 9 6 6 6-6"/></svg>;
  if (name === "cart") return <svg {...shared}><path d="M2 3h2l2.7 12.2a2 2 0 0 0 2 1.6h8.8a2 2 0 0 0 2-1.6L21 8H5"/><circle cx="9" cy="21" r="1"/><circle cx="18" cy="21" r="1"/></svg>;
  if (name === "chart") return <svg {...shared}><path d="M4 19V5M4 19h17"/><path d="m7 15 4-4 3 2 6-7"/></svg>;
  if (name === "history") return <svg {...shared}><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l4 2"/></svg>;
  if (name === "upload") return <svg {...shared}><path d="M12 16V4m-4 4 4-4 4 4"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></svg>;
  if (name === "store") return <svg {...shared}><path d="M3 10v10h18V10M2 10l2-7h16l2 7"/><path d="M2 10a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0M9 20v-6h6v6"/></svg>;
  if (name === "community") return <svg {...shared}><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H7l-4 2 1.5-4A7.5 7.5 0 1 1 20 11.5Z"/><path d="M8 11h.01M12 11h.01M16 11h.01"/></svg>;
  if (name === "trash") return <svg {...shared}><path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6"/></svg>;
  return <svg {...shared}><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>;
}

export default function Home() {
  const [items, setItems] = useState<Item[]>(initialItems);
  const [activeTab, setActiveTab] = useState<"list" | "prices" | "items" | "stores" | "community">("list");
  const [catalogOnly, setCatalogOnly] = useState<Item[]>([]);
  const [deletedCatalogNames, setDeletedCatalogNames] = useState<string[]>([]);
  const [purchasedItems, setPurchasedItems] = useState<Item[]>([]);
  const [stores, setStores] = useState<Store[]>(defaultStores);
  const [comments, setComments] = useState<BulletinComment[]>([]);
  const [storageReady, setStorageReady] = useState(false);
  const [sharedConfigured, setSharedConfigured] = useState(false);
  const [sharedAuthorized, setSharedAuthorized] = useState(false);
  const [sharedReady, setSharedReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"checking" | "local" | "sign-in" | "connecting" | "synced" | "saving" | "offline">("checking");
  const [syncRevision, setSyncRevision] = useState(0);
  const [syncRetry, setSyncRetry] = useState(0);
  const [accessCode, setAccessCode] = useState("");
  const [accessError, setAccessError] = useState("");
  const lastSyncedSnapshot = useRef("");
  const revisionRef = useRef(0);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSave = useRef(false);
  const [catalogSort, setCatalogSort] = useState<"name" | "price-low" | "price-high" | "times">("name");
  const [selectedStore, setSelectedStore] = useState<Store>("Walmart");
  const [query, setQuery] = useState("");
  const [newItem, setNewItem] = useState("");
  const [newCatalogItem, setNewCatalogItem] = useState("");
  const [newStore, setNewStore] = useState("");
  const [commentAuthor, setCommentAuthor] = useState("");
  const [commentDraft, setCommentDraft] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentDraft, setEditingCommentDraft] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [modal, setModal] = useState<{ item: Item; bought: boolean } | null>(null);
  const [purchase, setPurchase] = useState({ store: "Walmart" as Store, amount: "", unitSize: "", priceMode: "total" as "total" | "per-unit" });
  const [showHistory, setShowHistory] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const browser = readBrowserSnapshot();
    setItems(browser.items);
    setCatalogOnly(browser.catalogOnly);
    setPurchasedItems(browser.purchasedItems);
    setDeletedCatalogNames(browser.deletedCatalogNames);
    setStores(browser.stores);
    setComments(browser.comments);
    setCommentAuthor(localStorage.getItem("greenhouse-comment-author-v1") ?? "");
    setStorageReady(true);
  }, []);
  useEffect(() => { if (storageReady) localStorage.setItem("common-table-groceries-v1", JSON.stringify(items)); }, [items, storageReady]);
  useEffect(() => { if (storageReady) localStorage.setItem("greenhouse-purchased-v1", JSON.stringify(purchasedItems)); }, [purchasedItems, storageReady]);
  useEffect(() => { if (storageReady) localStorage.setItem("greenhouse-catalog-v1", JSON.stringify(catalogOnly)); }, [catalogOnly, storageReady]);
  useEffect(() => { if (storageReady) localStorage.setItem("greenhouse-deleted-catalog-v1", JSON.stringify(deletedCatalogNames)); }, [deletedCatalogNames, storageReady]);
  useEffect(() => { if (storageReady) localStorage.setItem("greenhouse-stores-v1", JSON.stringify(stores)); }, [stores, storageReady]);
  useEffect(() => { if (storageReady) localStorage.setItem("greenhouse-comments-v1", JSON.stringify(comments)); }, [comments, storageReady]);

  function applySharedSnapshot(snapshot: SharedSnapshot, revision: number) {
    const normalized = { ...snapshot, stores: Array.isArray(snapshot.stores) ? snapshot.stores : defaultStores, comments: Array.isArray(snapshot.comments) ? snapshot.comments : [] };
    const serialized = JSON.stringify(normalized);
    lastSyncedSnapshot.current = serialized;
    revisionRef.current = revision;
    setSyncRevision(revision);
    setItems(normalized.items);
    setCatalogOnly(normalized.catalogOnly);
    setPurchasedItems(normalized.purchasedItems);
    setDeletedCatalogNames(normalized.deletedCatalogNames);
    setStores(normalized.stores);
    setComments(normalized.comments);
    setSharedReady(true);
    setSyncStatus("synced");
  }

  async function initializeOrLoadSharedData() {
    const response = await fetch("/api/household", { cache: "no-store" });
    if (!response.ok) throw new Error("Could not load Greenhouse’s shared data.");
    const result = await response.json() as { state: SharedSnapshot | null; revision: number; initialized: boolean };
    if (result.initialized && result.state) {
      applySharedSnapshot(result.state, result.revision);
      return;
    }
    const local = readBrowserSnapshot();
    const saved = await fetch("/api/household", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ state: local, revision: 0 }) });
    const written = await saved.json() as { ok?: boolean; revision?: number; state?: SharedSnapshot | null };
    if (saved.status === 409 && written.state) {
      applySharedSnapshot(written.state, written.revision ?? 0);
      return;
    }
    if (!saved.ok || !written.ok) throw new Error("Could not initialize Greenhouse’s shared list.");
    applySharedSnapshot(local, written.revision ?? 1);
  }

  useEffect(() => {
    if (!storageReady) return;
    let cancelled = false;
    void fetch("/api/household/session", { cache: "no-store" }).then(async (response) => {
      const session = await response.json() as { configured: boolean; authorized: boolean };
      if (cancelled) return;
      setSharedConfigured(session.configured);
      if (!session.configured) { setSyncStatus("local"); return; }
      if (!session.authorized) { setSyncStatus("sign-in"); return; }
      setSharedAuthorized(true);
      setSyncStatus("connecting");
      await initializeOrLoadSharedData();
    }).catch(() => { if (!cancelled) setSyncStatus("offline"); });
    return () => { cancelled = true; };
  }, [storageReady]);

  async function connectHousehold(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAccessError("");
    setSyncStatus("connecting");
    try {
      const response = await fetch("/api/household/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: accessCode }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not connect to Greenhouse.");
      setSharedAuthorized(true);
      await initializeOrLoadSharedData();
      setAccessCode("");
    } catch (error) {
      setSyncStatus("sign-in");
      setAccessError(error instanceof Error ? error.message : "Could not connect to Greenhouse.");
    }
  }

  const sharedSnapshot = JSON.stringify({ items, catalogOnly, purchasedItems, deletedCatalogNames, stores, comments });
  useEffect(() => {
    if (!sharedAuthorized || !sharedReady || sharedSnapshot === lastSyncedSnapshot.current) return;
    pendingSave.current = true;
    setSyncStatus("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void fetch("/api/household", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ state: JSON.parse(sharedSnapshot) as SharedSnapshot, revision: revisionRef.current }) })
        .then(async (response) => {
          const result = await response.json() as { ok?: boolean; revision?: number; state?: SharedSnapshot | null };
          if (response.status === 409 && result.state) {
            applySharedSnapshot(result.state, result.revision ?? 0);
            setNotice("Another member updated Greenhouse at the same time. The latest shared list is now shown.");
            window.setTimeout(() => setNotice(""), 5000);
            return;
          }
          if (!response.ok || !result.ok) throw new Error("Save failed");
          revisionRef.current = result.revision ?? revisionRef.current + 1;
          setSyncRevision(revisionRef.current);
          lastSyncedSnapshot.current = sharedSnapshot;
          pendingSave.current = false;
          setSyncStatus("synced");
        })
        .catch(() => {
          pendingSave.current = false;
          setSyncStatus("offline");
          window.setTimeout(() => setSyncRetry((retry) => retry + 1), 5000);
        });
    }, 400);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [sharedSnapshot, sharedAuthorized, sharedReady, syncRetry]);

  useEffect(() => {
    if (!sharedAuthorized || !sharedReady) return;
    const poll = setInterval(() => {
      if (pendingSave.current || sharedSnapshot !== lastSyncedSnapshot.current) return;
      void fetch("/api/household", { cache: "no-store" }).then(async (response) => {
        if (!response.ok) throw new Error("Sync unavailable");
        const result = await response.json() as { state: SharedSnapshot | null; revision: number; initialized: boolean };
        if (result.state && result.revision !== revisionRef.current) applySharedSnapshot(result.state, result.revision);
        else setSyncStatus("synced");
      }).catch(() => setSyncStatus("offline"));
    }, 5000);
    return () => clearInterval(poll);
  }, [sharedAuthorized, sharedReady, sharedSnapshot]);

  function addStore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newStore.trim();
    if (!name) return;
    if (stores.some((store) => store.toLowerCase() === name.toLowerCase())) {
      setNotice(`${name} is already in your stores`);
    } else {
      setStores((current) => [...current, name]);
      setNotice(`${name} added to stores`);
    }
    setNewStore("");
    window.setTimeout(() => setNotice(""), 2500);
  }

  function postComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = commentDraft.trim();
    const author = commentAuthor.trim();
    if (!body || !author) return;
    const createdAt = new Date().toISOString();
    setComments((current) => [{ id: crypto.randomUUID(), author, body, createdAt }, ...current]);
    localStorage.setItem("greenhouse-comment-author-v1", author);
    setCommentDraft("");
  }

  function saveCommentEdit(commentId: string) {
    const body = editingCommentDraft.trim();
    if (!body) return;
    setComments((current) => current.map((comment) => comment.id === commentId && comment.author.toLowerCase() === commentAuthor.trim().toLowerCase()
      ? { ...comment, body, editedAt: new Date().toISOString() }
      : comment));
    setEditingCommentId(null);
    setEditingCommentDraft("");
  }

  function deleteComment(comment: BulletinComment) {
    if (comment.author.toLowerCase() !== commentAuthor.trim().toLowerCase()) return;
    if (!window.confirm("Delete your comment? This can’t be undone.")) return;
    setComments((current) => current.filter((entry) => entry.id !== comment.id));
    if (editingCommentId === comment.id) setEditingCommentId(null);
  }

  const visibleItems = useMemo(() => items.filter((item) => item.name.toLowerCase().includes(query.toLowerCase())), [items, query]);
  const groups = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const item of visibleItems) {
      const store = best(item)?.store ?? "No price yet";
      map.set(store, [...(map.get(store) ?? []), item]);
    }
    return [...map.entries()].sort((a, b) => a[0] === "No price yet" ? 1 : b[0] === "No price yet" ? -1 : a[0].localeCompare(b[0]));
  }, [visibleItems]);
  const routeGroups = useMemo(() => {
    const grouped = new Map<Store, { item: Item; price: Price }[]>();
    for (const item of items) {
      const cheapest = best(item);
      if (!cheapest) continue;
      const cheapestStores = new Set(item.prices.filter((price) => unitLabel(price) === unitLabel(cheapest) && unitRate(price) === unitRate(cheapest)).map((price) => price.store));
      for (const store of cheapestStores) {
        const storePrice = item.prices.filter((price) => price.store === store && unitLabel(price) === unitLabel(cheapest)).sort((a, b) => unitRate(a) - unitRate(b))[0];
        if (storePrice) grouped.set(store, [...(grouped.get(store) ?? []), { item, price: storePrice }]);
      }
    }
    return [...grouped.entries()]
      .map(([store, entries]) => ({ store, entries, total: entries.reduce((sum, entry) => sum + entry.price.amount, 0) }))
      .sort((a, b) => b.entries.length - a.entries.length || a.total - b.total || a.store.localeCompare(b.store));
  }, [items]);
  const tracked = items.filter((item) => item.prices.length > 0).length;
  const catalogItems = useMemo(() => {
    const combined = [...catalogOnly, ...purchasedItems, ...items];
    const unique = new Map<string, Item>();
    for (const item of combined) {
      const key = item.name.toLowerCase();
      const prior = unique.get(key);
      unique.set(key, prior ? { ...prior, ...item, prices: item.prices.length ? item.prices : prior.prices, purchases: item.purchases?.length ? item.purchases : prior.purchases } : item);
    }
    return [...unique.values()].filter((item) => !deletedCatalogNames.includes(item.name.toLowerCase()));
  }, [catalogOnly, purchasedItems, items, deletedCatalogNames]);
  const visibleCatalog = useMemo(() => catalogItems.filter((item) => item.name.toLowerCase().includes(query.toLowerCase())).sort((a, b) => {
    const average = (item: Item) => { const purchases = item.purchases ?? []; return purchases.length ? purchases.reduce((sum, p) => sum + p.amount, 0) / purchases.length : Infinity; };
    if (catalogSort === "times") return (b.purchases?.length ?? 0) - (a.purchases?.length ?? 0);
    if (catalogSort === "price-low") return average(a) - average(b);
    if (catalogSort === "price-high") return average(b) - average(a);
    return a.name.localeCompare(b.name);
  }), [catalogItems, query, catalogSort]);
  const suggestions = useMemo(() => newItem.trim().length < 1 ? [] : catalogItems.filter((item) => item.name.toLowerCase().includes(newItem.trim().toLowerCase())).slice(0, 5), [catalogItems, newItem]);
  const visibleStores = stores.filter((store) => store.toLowerCase().includes(query.toLowerCase()));
  const visibleComments = comments.filter((comment) => `${comment.author} ${comment.body}`.toLowerCase().includes(query.toLowerCase()));
  const pageTitle = activeTab === "list" ? "Grocery list" : activeTab === "prices" ? "Price comparison" : activeTab === "items" ? "Items" : activeTab === "stores" ? "Stores" : "Community";
  const pageHeading = activeTab === "list" ? "The grocery list" : activeTab === "prices" ? "Price comparison" : activeTab === "items" ? "Household items" : activeTab === "stores" ? "Stores" : "Community bulletin board";
  const pageDescription = activeTab === "list" ? "Good food, good prices, good neighbors." : activeTab === "prices" ? "See how every store stacks up before you head out." : activeTab === "items" ? "Your house’s food catalog, with prices and purchase history." : activeTab === "stores" ? "Keep the stores Greenhouse shops at in one place." : "Share notes, questions, and updates with the household.";
  const panelHeading = activeTab === "list" ? "Things to pick up" : activeTab === "prices" ? "Compare your stores" : activeTab === "items" ? "Items the house buys" : activeTab === "stores" ? "Stores on file" : "Household comments";
  const panelDescription = activeTab === "list" ? "Grouped by where each item costs least" : activeTab === "prices" ? `Showing prices at ${selectedStore}` : activeTab === "items" ? `${catalogItems.length} items in the house catalog` : activeTab === "stores" ? `${stores.length} ${stores.length === 1 ? "store" : "stores"} available for prices and shopping routes` : "Latest comments first";

  function addItem(item?: Item) {
    if (item) {
      setItems((list) => list.some((entry) => entry.name.toLowerCase() === item.name.toLowerCase()) ? list : [{ ...item, id: crypto.randomUUID(), checked: false }, ...list]);
      setNewItem("");
      setShowSuggestions(false);
      setNotice(`${item.name} added to the grocery list`);
      window.setTimeout(() => setNotice(""), 2500);
      return;
    }
    const name = newItem.trim();
    if (!name) return;
    const newEntry = { id: crypto.randomUUID(), name, category: "Other", unit: "", checked: false, prices: [] };
    setCatalogOnly((list) => list.some((entry) => entry.name.toLowerCase() === name.toLowerCase()) ? list : [newEntry, ...list]);
    setItems((list) => [{ ...newEntry, id: crypto.randomUUID() }, ...list]);
    setNewItem("");
    setShowSuggestions(false);
  }
  function addCatalogItem() {
    const name = newCatalogItem.trim();
    if (!name) return;
    if (catalogItems.some((item) => item.name.toLowerCase() === name.toLowerCase())) {
      setNotice(`${name} is already in the items catalog`);
    } else {
      setDeletedCatalogNames((list) => list.filter((entry) => entry !== name.toLowerCase()));
      setCatalogOnly((list) => [{ id: crypto.randomUUID(), name, category: "Other", unit: "", prices: [], purchases: [], checked: false }, ...list]);
      setNotice(`${name} added to the items catalog`);
    }
    setNewCatalogItem("");
    window.setTimeout(() => setNotice(""), 2500);
  }
  function deleteCatalogItem(item: Item) {
    const key = item.name.toLowerCase();
    setDeletedCatalogNames((list) => list.includes(key) ? list : [...list, key]);
    setCatalogOnly((list) => list.filter((entry) => entry.name.toLowerCase() !== key));
    setItems((list) => list.filter((entry) => entry.name.toLowerCase() !== key));
    setNotice(`${item.name} removed from the items catalog`);
    window.setTimeout(() => setNotice(""), 3000);
  }
  function removeItem(item: Item) {
    setPurchase({ store: stores[0] ?? "Walmart", amount: "", unitSize: item.units?.[0] ?? "", priceMode: "total" });
    setModal({ item, bought: true });
  }
  function confirmRemoval() {
    if (!modal) return;
    const unitSize = purchase.unitSize.trim();
    const parsedSize = parseUnitSize(unitSize);
    if (modal.bought && (!purchase.amount || Number(purchase.amount) <= 0 || !parsedSize)) return;
    if (modal.bought) {
      if (!parsedSize) return;
      const size = parsedSize;
      setItems((list) => list.filter((item) => item.id !== modal.item.id));
      const enteredAmount = Number(purchase.amount);
      const total = purchase.priceMode === "per-unit" ? enteredAmount * size.quantity : enteredAmount;
      const purchaseEntry: Price = { store: purchase.store, amount: total, unitSize, unitPrice: purchase.priceMode === "per-unit" ? enteredAmount : enteredAmount / size.quantity, date: new Date().toISOString().slice(0, 10) };
      setPurchasedItems((list) => {
        const existing = list.find((entry) => entry.name.toLowerCase() === modal.item.name.toLowerCase());
        if (existing) return list.map((entry) => entry.id === existing.id ? { ...entry, units: [...new Set([...(entry.units ?? []), ...(modal.item.units ?? []), unitSize])], prices: [...entry.prices, purchaseEntry], purchases: [...(entry.purchases ?? []), purchaseEntry] } : entry);
        return [{ ...modal.item, units: [...new Set([...(modal.item.units ?? []), unitSize])], prices: [...modal.item.prices, purchaseEntry], purchases: [purchaseEntry] }, ...list];
      });
      setNotice(`${modal.item.name} purchase saved`);
    } else {
      setCatalogOnly((list) => list.some((entry) => entry.name.toLowerCase() === modal.item.name.toLowerCase()) ? list : [modal.item, ...list]);
      setItems((list) => list.filter((item) => item.id !== modal.item.id));
      setNotice(`${modal.item.name} removed from the list`);
    }
    setModal(null);
    window.setTimeout(() => setNotice(""), 3000);
  }
  function deletePurchase(itemId: string, purchaseIndex: number) {
    const archivedItem = purchasedItems.find((item) => item.id === itemId);
    if (!archivedItem) return;
    const purchaseHistory = archivedItem.purchases ?? archivedItem.prices;
    const removedPurchase = purchaseHistory[purchaseIndex];
    if (!removedPurchase) return;
    if (!window.confirm(`Remove ${archivedItem.name} from purchase history and add it back to the grocery list?`)) return;
    const remainingPurchases = purchaseHistory.filter((_, index) => index !== purchaseIndex);
    const removePurchasePrice = (prices: Price[]) => {
      const index = prices.findIndex((price) => price.store === removedPurchase.store && price.date === removedPurchase.date && price.amount === removedPurchase.amount && price.unitSize === removedPurchase.unitSize);
      return index < 0 ? prices : prices.filter((_, priceIndex) => priceIndex !== index);
    };
    setPurchasedItems((current) => current.map((item) => item.id === itemId ? { ...item, prices: removePurchasePrice(item.prices), purchases: remainingPurchases } : item));
    setItems((current) => {
      const existing = current.find((item) => item.name.toLowerCase() === archivedItem.name.toLowerCase());
      if (existing) return current.map((item) => item.id === existing.id ? { ...item, prices: removePurchasePrice(item.prices) } : item);
      return [{ ...archivedItem, id: crypto.randomUUID(), checked: false, prices: removePurchasePrice(archivedItem.prices), purchases: remainingPurchases }, ...current];
    });
    setNotice(`${archivedItem.name} added back to the grocery list`);
    window.setTimeout(() => setNotice(""), 3000);
  }
  function importPrices(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const rows = String(reader.result).split(/\r?\n/).map((row) => row.split(",").map((cell) => cell.trim().replace(/^"|"$/g, "")));
      let count = 0;
      setItems((list) => list.map((item) => {
        const row = rows.find((cells, i) => i > 0 && cells[0]?.toLowerCase() === item.name.toLowerCase());
        const unitSize = row?.[4]?.trim();
        const parsedSize = unitSize ? parseUnitSize(unitSize) : null;
        if (!row || !row[1] || !row[2] || !Number(row[2]) || Number(row[2]) <= 0 || !parsedSize) return item;
        const savedUnitSize = unitSize!;
        const size = parsedSize!;
        const store = stores.find((s) => s.toLowerCase() === row[1].toLowerCase());
        if (!store) return item;
        count++;
        const enteredAmount = Number(row[2]);
        const perUnit = row[5]?.trim().toLowerCase() === "per-unit";
        const amount = perUnit ? enteredAmount * size.quantity : enteredAmount;
        const unitPrice = perUnit ? enteredAmount : enteredAmount / size.quantity;
        const price: Price = { store, amount, unitSize: savedUnitSize, unitPrice, date: row[3] || new Date().toISOString().slice(0, 10) };
        return { ...item, units: [...new Set([...(item.units ?? []), savedUnitSize])], prices: [...item.prices, price] };
      }));
      setNotice(`${count} price${count === 1 ? "" : "s"} added. Each CSV row needs item, store, price, date, and unit size; use “per-unit” in column 6 for per-unit prices.`);
      window.setTimeout(() => setNotice(""), 3500);
    };
    reader.readAsText(file);
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#top"><span className="brand-icon">G</span><span>Greenhouse<small>COOPERATIVE GROCERIES</small></span></a>
        <div className="side-label">YOUR HOUSE</div>
        <div className="house-card"><span className="house-icon">⌂</span><span><strong>Greenhouse</strong><small>12 members</small></span><Icon name="chevron" size={15}/></div>
        <div className="side-label nav-label">WORKSPACE</div>
        <button className={`nav-item ${activeTab === "list" ? "active" : ""}`} onClick={() => setActiveTab("list")}><Icon name="cart"/><span>Grocery list</span><b>{items.length}</b></button>
        <button className={`nav-item ${activeTab === "prices" ? "active" : ""}`} onClick={() => setActiveTab("prices")}><Icon name="chart"/><span>Price comparison</span></button>
        <button className={`nav-item ${activeTab === "items" ? "active" : ""}`} onClick={() => setActiveTab("items")}><Icon name="history"/><span>Items</span><b>{catalogItems.length}</b></button>
        <button className={`nav-item ${activeTab === "stores" ? "active" : ""}`} onClick={() => setActiveTab("stores")}><Icon name="store"/><span>Stores</span><b>{stores.length}</b></button>
        <button className={`nav-item ${activeTab === "community" ? "active" : ""}`} onClick={() => setActiveTab("community")}><Icon name="community"/><span>Community</span><b>{comments.length}</b></button>
        <button className="nav-item" onClick={() => setShowHistory(showHistory ? null : "all")}><Icon name="history"/><span>Purchase history</span></button>
        <div className="sidebar-bottom"><span className="house-icon">⌂</span><div className="member-copy"><strong>12 coop members</strong><small>Shared household</small></div></div>
      </aside>

      <section className="main-area" id="top">
        <header className="topbar"><div className="breadcrumb">Greenhouse <span>/</span> <strong>{pageTitle}</strong></div><div className="top-actions"><span className={`sync-label ${syncStatus === "offline" ? "sync-offline" : ""}`}><i/> {syncStatus === "synced" ? "Synced" : syncStatus === "saving" || syncStatus === "connecting" ? "Syncing…" : syncStatus === "offline" ? "Sync paused" : sharedConfigured ? "Connect to sync" : "This device only"}</span></div></header>
        {!sharedConfigured && <div className="sync-banner"><strong>Changes are saved on this device only.</strong><span>To sync Greenhouse across phones and computers, configure the shared database and household access code.</span></div>}
        {sharedConfigured && syncStatus === "offline" && <div className="sync-banner"><strong>Can’t reach Greenhouse right now.</strong><span>Your changes are saved on this device and will sync when the connection returns.</span></div>}
        <div className="content">
          <div className="welcome-row"><div><div className="eyebrow">GREENHOUSE COOPERATIVE · 12 MEMBERS</div><h1>{pageHeading}</h1><p>{pageDescription}</p></div>{(activeTab === "list" || activeTab === "prices") && <label className="upload-button" title="CSV columns: item, store, price, date, unit size, optional per-unit"><Icon name="upload" size={17}/> Upload prices<input type="file" accept=".csv,text/csv" onChange={(e) => importPrices(e.target.files?.[0])}/></label>}</div>

          <div className="summary-grid"><div className="summary-card"><span className="summary-icon mint"><Icon name="cart"/></span><div><small>ON THE LIST</small><strong>{items.length} <em>items</em></strong></div></div><div className="summary-card"><span className="summary-icon peach"><Icon name="chart"/></span><div><small>PRICES TRACKED</small><strong>{tracked} <em>of {items.length} items</em></strong></div></div><div className="summary-card savings-card"><span className="summary-icon yellow"><Icon name="money"/></span><div><small>STORES WITH BEST PRICES</small><strong>{routeGroups.length} <em>{routeGroups.length === 1 ? "location" : "locations"}</em></strong></div></div></div>

          <div className="workspace-grid"><div className="list-panel panel">
            <div className="panel-heading"><div><h2>{activeTab === "community" ? "Community bulletin board" : panelHeading}</h2><p>{panelDescription}</p></div>{activeTab !== "community" && activeTab !== "stores" && <button className="icon-button" title="Purchase history" onClick={() => setShowHistory(showHistory ? null : "all")}><Icon name="history" size={17}/></button>}</div>
            {(activeTab === "list" || activeTab === "prices" || activeTab === "items" || activeTab === "stores" || activeTab === "community") && <div className="list-toolbar"><label className="search-box"><Icon name="search" size={16}/><input placeholder={activeTab === "stores" ? "Find a store…" : activeTab === "community" ? "Search comments…" : "Find something…"} value={query} onChange={(e) => setQuery(e.target.value)}/><kbd>⌘ K</kbd></label>{(activeTab === "list" || activeTab === "prices" || activeTab === "items") && <button className="filter-button">All items <Icon name="chevron" size={14}/></button>}</div>}

            {activeTab === "prices" && <div className="store-tabs">{stores.map((store) => <button key={store} className={selectedStore === store ? "selected" : ""} onClick={() => setSelectedStore(store)}>{store}</button>)}</div>}
            {activeTab === "items" && <div className="sort-bar"><span>Sort by</span><select value={catalogSort} onChange={(e) => setCatalogSort(e.target.value as typeof catalogSort)}><option value="name">Name</option><option value="price-low">Average price: low to high</option><option value="price-high">Average price: high to low</option><option value="times">Times bought</option></select></div>}
            <div className="list-body">
              {activeTab === "list" && (groups.length ? groups.map(([store, grouped]) => (
                <section className="store-group" key={store}>
                  <div className="group-header"><span className="store-marker">{store === "No price yet" ? "·" : storeMarker(store)}</span><strong>{store === "No price yet" ? "Still need a price" : `Cheapest at ${store}`}</strong><span className="group-count">{grouped.length}</span><span className="group-rule"/></div>
                  {grouped.map((item) => { const cheapest = best(item); return <article className="grocery-row" key={item.id}><button className="check-box" aria-label={`Mark ${item.name} bought`} onClick={() => removeItem(item)}><span/></button><div className="food-icon">{icons[item.category] ?? icons.Other}</div><div className="item-main"><strong>{item.name}</strong><small>{item.unit || item.category}</small></div>{cheapest ? <div className="best-price"><strong>{priceLabel(cheapest)}</strong><small>best unit price</small></div> : <div className="best-price"><strong>—</strong><small>add a price</small></div>}<button className="compare-link" onClick={() => { setSelectedStore(stores[0] ?? ""); setActiveTab("prices"); }}>Compare</button><button className="row-menu" title="Remove item" onClick={() => setModal({ item, bought: false })}><Icon name="trash" size={15}/></button></article>; })}
                </section>
              )) : <div className="empty-state">Your grocery list is clear. Add an item below when you need it.</div>)}
              {activeTab === "prices" && (visibleItems.length ? visibleItems.map((item) => { const cheapest = best(item); const price = item.prices.filter((p) => p.store === selectedStore).sort((a, b) => unitRate(a) - unitRate(b))[0]; const comparable = price && cheapest && unitLabel(price) === unitLabel(cheapest); return <article className="grocery-row compare-row" key={item.id}><div className="food-icon">{icons[item.category] ?? icons.Other}</div><div className="item-main"><strong>{item.name}</strong><small>{item.unit || item.category}</small></div><div className="best-price"><strong>{price ? priceLabel(price) : "—"}</strong><small>{price ? `${selectedStore} · ${money(price.amount)} total` : "no price yet"}</small></div>{price && cheapest && comparable && cheapest.store !== selectedStore ? <span className="price-diff">+{money(unitRate(price) - unitRate(cheapest))} / {unitLabel(price)}</span> : price && comparable ? <span className="best-tag">Best unit price</span> : price ? <span className="price-diff">Different unit</span> : <span className="price-diff">Not tracked</span>}<button className="row-menu" title="View price history" onClick={() => setShowHistory(showHistory === item.id ? null : item.id)}><Icon name="history" size={15}/></button></article>; }) : <div className="empty-state">Add grocery-list items to compare tracked store prices.</div>)}
              {activeTab === "items" && (visibleCatalog.length ? visibleCatalog.map((item) => { const purchases = item.purchases ?? []; const average = purchases.length ? purchases.reduce((sum, entry) => sum + entry.amount, 0) / purchases.length : null; const isListed = items.some((entry) => entry.name.toLowerCase() === item.name.toLowerCase()); return <article className="grocery-row compare-row catalog-row" key={item.id}><div className="food-icon">{icons[item.category] ?? icons.Other}</div><div className="item-main"><strong>{item.name}</strong><small>{item.unit || item.category} · {purchases.length} {purchases.length === 1 ? "purchase" : "purchases"}</small></div><div className="best-price"><strong>{average === null ? "—" : money(average)}</strong><small>{average === null ? "no purchase yet" : "average paid"}</small></div><button className={`catalog-add ${isListed ? "listed" : ""}`} disabled={isListed} onClick={() => addItem(item)}>{isListed ? "On list" : "+ Add to list"}</button><button className="row-menu" title="View price history" onClick={() => setShowHistory(showHistory === item.id ? null : item.id)}><Icon name="history" size={15}/></button><button className="row-menu catalog-delete" aria-label={`Delete ${item.name} from household items`} title="Delete from household items" onClick={() => deleteCatalogItem(item)}><Icon name="trash" size={15}/></button></article>; }) : <div className="empty-state">No household items yet. Add foods below to start your catalog.</div>)}
              {activeTab === "stores" && <div className="stores-workspace">{visibleStores.map((store) => { const priceCount = items.reduce((count, item) => count + item.prices.filter((price) => price.store === store).length, 0); const cheapestCount = routeGroups.find((route) => route.store === store)?.entries.length ?? 0; return <article className="store-entry" key={store}><span className="store-entry-marker">{storeMarker(store)}</span><span className="store-entry-copy"><strong>{store}</strong><small>{priceCount} tracked {priceCount === 1 ? "price" : "prices"} · {cheapestCount} list {cheapestCount === 1 ? "item" : "items"} cheapest here</small></span></article>; })}{visibleStores.length === 0 && <div className="empty-state">No matching stores. Add it below if Greenhouse shops there.</div>}<form className="store-add-form" onSubmit={addStore}><label className="field-label" htmlFor="new-store">Add a store</label><div className="store-add-controls"><input id="new-store" value={newStore} onChange={(event) => setNewStore(event.target.value)} maxLength={60} placeholder="Store name" required/><button className="primary-button" type="submit"><Icon name="plus" size={15}/> Add store</button></div></form></div>}
              {activeTab === "community" && <div className="bulletin-workspace"><form className="bulletin-form" onSubmit={postComment}><label className="field-label" htmlFor="comment-author">Your name<input id="comment-author" value={commentAuthor} onChange={(event) => setCommentAuthor(event.target.value)} maxLength={60} placeholder="Name shown with your comment" required/></label><label className="field-label" htmlFor="comment-body">Comment<textarea id="comment-body" value={commentDraft} onChange={(event) => setCommentDraft(event.target.value)} maxLength={1000} rows={4} placeholder="Share a note with the household…" required/></label><div className="bulletin-form-footer"><small>{commentDraft.length}/1000</small><button className="primary-button" type="submit">Post comment</button></div></form><div className="bulletin-list">{visibleComments.map((comment) => {
                const isOwnComment = Boolean(commentAuthor.trim()) && comment.author.toLowerCase() === commentAuthor.trim().toLowerCase();
                const isEditing = editingCommentId === comment.id;
                return <article className="bulletin-comment" key={comment.id}><header><strong>{comment.author}</strong><span className="bulletin-comment-meta"><time dateTime={comment.createdAt}>{new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(comment.createdAt))}</time>{comment.editedAt && <span className="edited-flair" title={`Edited ${new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(comment.editedAt))}`}>Edited</span>}</span></header>{isEditing ? <div className="comment-edit"><textarea aria-label="Edit your comment" value={editingCommentDraft} onChange={(event) => setEditingCommentDraft(event.target.value)} maxLength={1000} rows={4}/><div className="comment-edit-actions"><small>{editingCommentDraft.length}/1000</small><button type="button" className="quiet-button" onClick={() => setEditingCommentId(null)}>Cancel</button><button type="button" className="primary-button" disabled={!editingCommentDraft.trim()} onClick={() => saveCommentEdit(comment.id)}>Save edit</button></div></div> : <><p>{comment.body}</p>{isOwnComment && <div className="comment-actions"><button type="button" onClick={() => { setEditingCommentId(comment.id); setEditingCommentDraft(comment.body); }}>Edit</button><button type="button" onClick={() => deleteComment(comment)}>Delete</button></div>}</>}</article>;
              })}{visibleComments.length === 0 && <div className="empty-state">{comments.length ? "No comments match your search." : "No comments yet. Start the conversation with the household."}</div>}</div></div>}
            </div>

            {activeTab === "list" && <div className="add-item-wrap"><div className="add-item"><span className="add-plus"><Icon name="plus" size={16}/></span><input placeholder="Add something to the list…" value={newItem} onFocus={() => setShowSuggestions(true)} onBlur={() => window.setTimeout(() => setShowSuggestions(false), 150)} onChange={(e) => { setNewItem(e.target.value); setShowSuggestions(true); }} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addItem(suggestions[0]); } if (e.key === "Escape") setShowSuggestions(false); }}/><button onMouseDown={(e) => e.preventDefault()} onClick={() => addItem(suggestions[0])}>Add item</button></div>{showSuggestions && suggestions.length > 0 && <div className="autocomplete-menu">{suggestions.map((item) => { const price = best(item); return <button key={item.id} onMouseDown={(e) => e.preventDefault()} onClick={() => addItem(item)}><span className="food-icon">{icons[item.category] ?? icons.Other}</span><span><strong>{item.name}</strong><small>{item.unit || item.category}</small></span>{price && <b>{money(price.amount)} at {price.store}</b>}<em>+ Add</em></button>; })}</div>}</div>}
            {activeTab === "items" && <div className="catalog-create"><div><strong>Add a food to the catalog</strong><small>Keep it here for future lists, even if you don’t need it today.</small></div><div className="catalog-create-input"><input placeholder="Food item name" value={newCatalogItem} onChange={(e) => setNewCatalogItem(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addCatalogItem()}/><button onClick={addCatalogItem}><Icon name="plus" size={15}/> Add item</button></div></div>}
            {showHistory && <History items={showHistory === "all" ? items : items.filter((i) => i.id === showHistory)} purchasedItems={purchasedItems} onClose={() => setShowHistory(null)} onDeletePurchase={deletePurchase}/>}
          </div>

            <aside className="right-column">
              <div className="route-card">
                <div className="route-header"><span className="route-icon"><Icon name="cart" size={16}/></span><div><h3>Smart shopping route</h3><p>Ranked by how many list items are cheapest at each store</p></div></div>
                <div className="route-list">
                  {routeGroups.map(({ store, entries, total }, index) => <section className="route-stop route-stop-expanded" key={store}><div className="route-stop-heading"><span className="route-num">{index + 1}</span><span className={`route-store-logo ${storeBadgeClass(store)}`}>{storeMarker(store)}</span><span className="route-name"><strong>{store}</strong><small>{entries.length} {entries.length === 1 ? "item" : "items"} at the lowest tracked unit price</small></span><span className="route-total">{money(total)}</span></div><ul className="route-items">{entries.map(({ item, price }) => <li key={`${store}-${item.id}`}><span>{item.name} · {unitSizeSummary(price)}</span><strong>{priceLabel(price)}</strong></li>)}</ul></section>)}
                  {routeGroups.length === 0 && <p className="route-empty">Add prices to grocery-list items to build a route.</p>}
                </div>
                <button className="route-action" onClick={() => setActiveTab("prices")}>Compare store prices <span>→</span></button>
              </div>
            </aside>
          </div>
          <footer className="page-footer"><span>Made for sharing meals and making ends meet.</span><span><i/> {sharedAuthorized ? "Shared with Greenhouse" : "Saved on this device"}</span></footer>
        </div>
      </section>

      {modal && <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setModal(null)}><section className="purchase-modal"><button className="modal-close" onClick={() => setModal(null)}>×</button><span className="modal-icon">{modal.bought ? "🛍️" : "📝"}</span><h2>{modal.bought ? `Did you buy ${modal.item.name}?` : `Remove ${modal.item.name}?`}</h2><p>{modal.bought ? "Save the unit size and price so the household can compare value." : "This item will be removed from the shared list."}</p>{modal.bought && <><label className="field-label">Store<select value={purchase.store} onChange={(e) => setPurchase({ ...purchase, store: e.target.value as Store })}>{stores.map((s) => <option key={s}>{s}</option>)}</select></label><label className="field-label">Unit size<input className="unit-size-input" list={`saved-units-${modal.item.id}`} placeholder="For example, 2 lb or 1 dozen" value={purchase.unitSize} onChange={(e) => setPurchase({ ...purchase, unitSize: e.target.value })} required/><datalist id={`saved-units-${modal.item.id}`}>{modal.item.units?.map((unit) => <option key={unit} value={unit}/>)}</datalist><small className="unit-hint">New sizes are saved with this food for next time. Use a number and unit, like “2 lb”.</small></label><label className="field-label">Enter price as<select value={purchase.priceMode} onChange={(e) => setPurchase({ ...purchase, priceMode: e.target.value as "total" | "per-unit" })}><option value="total">Total package price</option><option value="per-unit">Price per {unitLabel({ amount: 0, store: purchase.store, date: "", unitSize: purchase.unitSize })}</option></select></label><label className="field-label">{purchase.priceMode === "per-unit" ? `Price per ${unitLabel({ amount: 0, store: purchase.store, date: "", unitSize: purchase.unitSize })}` : "Total price paid"}<span className="amount-input"><span>$</span><input type="number" min="0.01" step="0.01" placeholder="0.00" value={purchase.amount} onChange={(e) => setPurchase({ ...purchase, amount: e.target.value })} required/></span></label>{purchase.priceMode === "per-unit" && parseUnitSize(purchase.unitSize) && purchase.amount && <small className="unit-hint">Estimated total: {money(Number(purchase.amount) * parseUnitSize(purchase.unitSize)!.quantity)}</small>}</> }<div className="modal-actions">{modal.bought ? <button className="quiet-button" onClick={() => setModal({ ...modal, bought: false })}>Not bought</button> : <button className="quiet-button" onClick={() => setModal(null)}>Cancel</button>}<button className="primary-button" disabled={modal.bought && (!purchase.amount || Number(purchase.amount) <= 0 || !parseUnitSize(purchase.unitSize))} onClick={confirmRemoval}>{modal.bought ? "Save & remove" : "Remove item"}</button></div></section></div>}
      {sharedConfigured && !sharedAuthorized && <div className="modal-backdrop access-backdrop"><section className="purchase-modal access-modal"><span className="modal-icon"><Icon name="history"/></span><h2>Connect to Greenhouse</h2><p>Enter the household access code to load the shared grocery list, items, prices, and purchase history on this device.</p><form onSubmit={connectHousehold}><label className="field-label">Household access code<input className="access-code-input" type="password" autoComplete="current-password" value={accessCode} onChange={(e) => setAccessCode(e.target.value)} required/></label>{accessError && <p className="access-error">{accessError}</p>}<button className="primary-button access-submit" type="submit" disabled={syncStatus === "connecting"}>{syncStatus === "connecting" ? "Connecting…" : "Connect to shared data"}</button></form></section></div>}
      {notice && <div className="toast">✓ &nbsp;{notice}</div>}
    </main>
  );
}

function History({ items, purchasedItems, onClose, onDeletePurchase }: { items: Item[]; purchasedItems: Item[]; onClose: () => void; onDeletePurchase: (itemId: string, purchaseIndex: number) => void }) {
  const today = new Date();
  const [exportRange, setExportRange] = useState<"month" | "year" | "all">("month");
  const [exportMonth, setExportMonth] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`);
  const [exportYear, setExportYear] = useState(String(today.getFullYear()));
  const all = [...items, ...purchasedItems];
  const samePrice = (left: Price, right: Price) => left.store === right.store && left.date === right.date && left.amount === right.amount && left.unitSize === right.unitSize;
  const prices = all.flatMap((item) => item.prices.map((price) => {
    const archive = purchasedItems.find((entry) => entry.name.toLowerCase() === item.name.toLowerCase());
    const purchaseIndex = archive ? (archive.purchases ?? archive.prices).findIndex((purchase) => samePrice(purchase, price)) : -1;
    return { ...price, name: item.name, purchaseOwnerId: purchaseIndex >= 0 ? archive?.id : undefined, purchaseIndex };
  })).sort((a, b) => b.date.localeCompare(a.date));
  const purchaseRows = purchasedItems.flatMap((item) => (item.purchases ?? item.prices).map((price) => ({ ...price, name: item.name })));
  const years = [...new Set([String(today.getFullYear()), ...purchaseRows.map((row) => row.date.slice(0, 4))])].sort((a, b) => b.localeCompare(a));
  const exportableRows = purchaseRows.filter((row) => exportRange === "all" || (exportRange === "month" ? row.date.slice(0, 7) === exportMonth : row.date.slice(0, 4) === exportYear));
  function exportToGoogleSheets() {
    const selectedRows = exportableRows;
    if (!selectedRows.length) return;
    const cell = (value: string | number) => {
      const raw = String(value);
      const safe = typeof value === "string" && /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
      return `"${safe.replace(/"/g, '""')}"`;
    };
    const lines = [["Date", "Food item", "Store", "Unit size", "Unit", "Price per unit", "Total paid"], ...selectedRows
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((row) => [row.date, row.name, row.store, row.unitSize ?? "", row.unitSize ? unitLabel(row) : "", row.unitSize ? unitRate(row).toFixed(2) : "", row.amount.toFixed(2)])];
    const csv = `\uFEFF${lines.map((line) => line.map((value) => cell(value)).join(",")).join("\r\n")}`;
    const blobUrl = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    const period = exportRange === "month" ? exportMonth : exportRange === "year" ? exportYear : "all-time";
    link.href = blobUrl;
    link.download = `greenhouse-purchases-${period}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  }
  return <div className="history-popover"><div className="history-head"><strong>Purchase history</strong><button onClick={onClose}>×</button></div><section className="history-export"><strong>Export for Google Sheets</strong><small>Download a CSV you can open in Google Sheets.</small><div className="history-export-controls"><select aria-label="Export date range" value={exportRange} onChange={(event) => setExportRange(event.target.value as typeof exportRange)}><option value="month">By month</option><option value="year">By year</option><option value="all">Total to date</option></select>{exportRange === "month" && <input aria-label="Choose month" type="month" value={exportMonth} onChange={(event) => setExportMonth(event.target.value)}/>}{exportRange === "year" && <select aria-label="Choose year" value={exportYear} onChange={(event) => setExportYear(event.target.value)}>{years.map((year) => <option key={year} value={year}>{year}</option>)}</select>}<button type="button" className="primary-button" onClick={exportToGoogleSheets} disabled={!exportableRows.length}>Export</button></div></section>{prices.slice(0, 12).map((p, i) => <div className="history-line" key={`${p.name}-${p.store}-${p.date}-${i}`}><span><strong>{p.name}</strong><small>{p.store} · {p.date}{p.unitSize ? ` · ${p.unitSize} (${priceLabel(p)})` : ""}</small></span><div className="history-line-actions"><b>{money(p.amount)}</b>{p.purchaseOwnerId && <button type="button" className="history-delete" title="Delete this purchase and add the item back to the grocery list" aria-label={`Delete ${p.name} purchase and return it to the grocery list`} onClick={() => onDeletePurchase(p.purchaseOwnerId!, p.purchaseIndex)}><Icon name="trash" size={14}/></button>}</div></div>)}{prices.length === 0 && <p className="history-empty">Your household’s purchases will show up here.</p>}</div>;
}
