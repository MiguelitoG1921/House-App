"use client";

import { useEffect, useMemo, useState } from "react";

type Store = "Costco" | "Walmart" | "Trader Joe's" | "Target";
type Price = { store: Store; amount: number; date: string };
type Item = { id: string; name: string; category: string; unit: string; prices: Price[]; checked: boolean };

const initialItems: Item[] = [
  { id: "1", name: "Organic whole milk", category: "Dairy", unit: "½ gallon", checked: false, prices: [{ store: "Costco", amount: 3.49, date: "2026-10-22" }, { store: "Walmart", amount: 3.78, date: "2026-10-20" }, { store: "Target", amount: 4.29, date: "2026-10-12" }] },
  { id: "2", name: "Rolled oats", category: "Pantry", unit: "42 oz", checked: false, prices: [{ store: "Costco", amount: 6.99, date: "2026-10-22" }, { store: "Walmart", amount: 7.48, date: "2026-10-18" }] },
  { id: "3", name: "Avocados", category: "Produce", unit: "bag of 6", checked: false, prices: [{ store: "Costco", amount: 5.99, date: "2026-10-22" }, { store: "Walmart", amount: 1.18, date: "2026-10-20" }, { store: "Trader Joe's", amount: 4.49, date: "2026-10-16" }] },
  { id: "4", name: "Baby spinach", category: "Produce", unit: "5 oz", checked: false, prices: [{ store: "Walmart", amount: 2.48, date: "2026-10-20" }, { store: "Costco", amount: 4.99, date: "2026-10-22" }] },
  { id: "5", name: "Free-range eggs", category: "Dairy", unit: "dozen", checked: false, prices: [{ store: "Costco", amount: 5.49, date: "2026-10-22" }, { store: "Walmart", amount: 5.96, date: "2026-10-20" }, { store: "Trader Joe's", amount: 4.99, date: "2026-10-16" }] },
  { id: "6", name: "Sourdough bread", category: "Bakery", unit: "loaf", checked: false, prices: [{ store: "Trader Joe's", amount: 3.99, date: "2026-10-16" }, { store: "Walmart", amount: 4.48, date: "2026-10-20" }] },
  { id: "7", name: "Black beans", category: "Pantry", unit: "15 oz can", checked: false, prices: [{ store: "Costco", amount: 1.29, date: "2026-10-22" }, { store: "Walmart", amount: 1.48, date: "2026-10-20" }] },
  { id: "8", name: "Bananas", category: "Produce", unit: "bunch", checked: false, prices: [{ store: "Walmart", amount: 1.76, date: "2026-10-20" }, { store: "Costco", amount: 1.99, date: "2026-10-22" }] },
];

const stores: Store[] = ["Costco", "Walmart", "Trader Joe's", "Target"];
const money = (n: number) => `$${n.toFixed(2)}`;
const best = (item: Item) => item.prices.reduce<Price | null>((min, p) => !min || p.amount < min.amount ? p : min, null);
const icons: Record<string, string> = { Produce: "🥑", Dairy: "🥛", Pantry: "🥫", Bakery: "🍞", Other: "🛒" };

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const shared = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true as const };
  if (name === "search") return <svg {...shared}><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>;
  if (name === "plus") return <svg {...shared}><path d="M12 5v14M5 12h14"/></svg>;
  if (name === "chevron") return <svg {...shared}><path d="m6 9 6 6 6-6"/></svg>;
  if (name === "cart") return <svg {...shared}><path d="M2 3h2l2.7 12.2a2 2 0 0 0 2 1.6h8.8a2 2 0 0 0 2-1.6L21 8H5"/><circle cx="9" cy="21" r="1"/><circle cx="18" cy="21" r="1"/></svg>;
  if (name === "chart") return <svg {...shared}><path d="M4 19V5M4 19h17"/><path d="m7 15 4-4 3 2 6-7"/></svg>;
  if (name === "history") return <svg {...shared}><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l4 2"/></svg>;
  if (name === "upload") return <svg {...shared}><path d="M12 16V4m-4 4 4-4 4 4"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></svg>;
  if (name === "trash") return <svg {...shared}><path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6"/></svg>;
  return <svg {...shared}><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>;
}

export default function Home() {
  const [items, setItems] = useState<Item[]>(initialItems);
  const [activeTab, setActiveTab] = useState<"list" | "prices">("list");
  const [selectedStore, setSelectedStore] = useState<Store>("Walmart");
  const [query, setQuery] = useState("");
  const [newItem, setNewItem] = useState("");
  const [modal, setModal] = useState<{ item: Item; bought: boolean } | null>(null);
  const [purchase, setPurchase] = useState({ store: "Walmart" as Store, amount: "" });
  const [showHistory, setShowHistory] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("common-table-groceries-v1");
    if (saved) { try { setItems(JSON.parse(saved) as Item[]); } catch { /* use starter list */ } }
  }, []);
  useEffect(() => { localStorage.setItem("common-table-groceries-v1", JSON.stringify(items)); }, [items]);

  const visibleItems = useMemo(() => items.filter((item) => item.name.toLowerCase().includes(query.toLowerCase())), [items, query]);
  const groups = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const item of visibleItems) {
      const store = best(item)?.store ?? "No price yet";
      map.set(store, [...(map.get(store) ?? []), item]);
    }
    return [...map.entries()].sort((a, b) => a[0] === "No price yet" ? 1 : b[0] === "No price yet" ? -1 : a[0].localeCompare(b[0]));
  }, [visibleItems]);
  const tracked = items.filter((item) => item.prices.length > 0).length;

  function addItem() {
    const name = newItem.trim();
    if (!name) return;
    setItems((list) => [{ id: crypto.randomUUID(), name, category: "Other", unit: "", checked: false, prices: [] }, ...list]);
    setNewItem("");
  }
  function removeItem(item: Item) {
    setPurchase({ store: "Walmart", amount: "" });
    setModal({ item, bought: true });
  }
  function confirmRemoval() {
    if (!modal) return;
    if (modal.bought && purchase.amount && Number(purchase.amount) > 0) {
      setItems((list) => list.filter((item) => item.id !== modal.item.id));
      // Keep a removed purchase in a separate history archive so it remains available.
      const archive = JSON.parse(localStorage.getItem("common-table-archive-v1") ?? "[]") as Item[];
      archive.unshift({ ...modal.item, prices: [...modal.item.prices, { store: purchase.store, amount: Number(purchase.amount), date: new Date().toISOString().slice(0, 10) }] });
      localStorage.setItem("common-table-archive-v1", JSON.stringify(archive));
      setNotice(`${modal.item.name} purchase saved`);
    } else {
      setItems((list) => list.filter((item) => item.id !== modal.item.id));
      setNotice(`${modal.item.name} removed from the list`);
    }
    setModal(null);
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
        if (!row || !row[1] || !row[2] || !Number(row[2])) return item;
        const store = stores.find((s) => s.toLowerCase() === row[1].toLowerCase());
        if (!store) return item;
        count++;
        return { ...item, prices: [...item.prices, { store, amount: Number(row[2]), date: row[3] || new Date().toISOString().slice(0, 10) }] };
      }));
      setNotice(`${count} price${count === 1 ? "" : "s"} added from ${file.name}`);
      window.setTimeout(() => setNotice(""), 3500);
    };
    reader.readAsText(file);
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#top"><span className="brand-icon">c</span><span>common<span className="brand-light">table</span><small>YOUR HOUSEHOLD, IN SYNC</small></span></a>
        <div className="side-label">YOUR HOUSE</div>
        <div className="house-card"><span className="house-icon">⌂</span><span><strong>Maple Street House</strong><small>12 members</small></span><Icon name="chevron" size={15}/></div>
        <div className="side-label nav-label">WORKSPACE</div>
        <button className={`nav-item ${activeTab === "list" ? "active" : ""}`} onClick={() => setActiveTab("list")}><Icon name="cart"/><span>Grocery list</span><b>{items.length}</b></button>
        <button className={`nav-item ${activeTab === "prices" ? "active" : ""}`} onClick={() => setActiveTab("prices")}><Icon name="chart"/><span>Price comparison</span></button>
        <button className="nav-item" onClick={() => setShowHistory(showHistory ? null : "all")}><Icon name="history"/><span>Purchase history</span></button>
        <div className="sidebar-bottom"><div className="member-stack"><span>J</span><span>M</span><span>A</span><span>+9</span></div><div className="member-copy"><strong>12 members</strong><small>Shopping together</small></div><span className="presence-dot"/></div>
      </aside>

      <section className="main-area" id="top">
        <header className="topbar"><div className="breadcrumb">Maple Street House <span>/</span> <strong>{activeTab === "list" ? "Grocery list" : "Price comparison"}</strong></div><div className="top-actions"><span className="sync-label"><i/> Up to date</span><button className="avatar" aria-label="Your profile">E</button></div></header>
        <div className="content">
          <div className="welcome-row"><div><div className="eyebrow">MONDAY, OCTOBER 26, 2026</div><h1>{activeTab === "list" ? "The grocery list" : "Price comparison"}</h1><p>{activeTab === "list" ? "Good food, good prices, good neighbors." : "See how every store stacks up before you head out."}</p></div><label className="upload-button"><Icon name="upload" size={17}/> Upload prices<input type="file" accept=".csv,text/csv" onChange={(e) => importPrices(e.target.files?.[0])}/></label></div>

          <div className="summary-grid"><div className="summary-card"><span className="summary-icon mint"><Icon name="cart"/></span><div><small>ON THE LIST</small><strong>{items.length} <em>items</em></strong></div></div><div className="summary-card"><span className="summary-icon peach"><Icon name="chart"/></span><div><small>PRICES TRACKED</small><strong>{tracked} <em>of {items.length} items</em></strong></div></div><div className="summary-card savings-card"><span className="summary-icon yellow"><Icon name="money"/></span><div><small>BEST SHOPPING ROUTE</small><strong>3 <em>stores this week</em></strong></div><span className="sparkline">⌁</span></div></div>

          <div className="workspace-grid"><div className="list-panel panel">
            <div className="panel-heading"><div><h2>{activeTab === "list" ? "Things to pick up" : "Compare your stores"}</h2><p>{activeTab === "list" ? "Grouped by where each item costs least" : `Showing prices at ${selectedStore}`}</p></div><button className="icon-button" title="Purchase history" onClick={() => setShowHistory(showHistory ? null : "all")}><Icon name="history" size={17}/></button></div>
            <div className="list-toolbar"><label className="search-box"><Icon name="search" size={16}/><input placeholder="Find something…" value={query} onChange={(e) => setQuery(e.target.value)}/><kbd>⌘ K</kbd></label><button className="filter-button">All items <Icon name="chevron" size={14}/></button></div>

            {activeTab === "prices" && <div className="store-tabs">{stores.map((store) => <button key={store} className={selectedStore === store ? "selected" : ""} onClick={() => setSelectedStore(store)}>{store}</button>)}</div>}
            <div className="list-body">
              {activeTab === "list" ? groups.map(([store, grouped]) => <section className="store-group" key={store}><div className="group-header"><span className="store-marker">{store === "Costco" ? "C" : store === "Walmart" ? "W" : store === "Target" ? "T" : store === "Trader Joe's" ? "TJ" : "·"}</span><strong>{store === "No price yet" ? "Still need a price" : `Cheapest at ${store}`}</strong><span className="group-count">{grouped.length}</span><span className="group-rule"/></div>{grouped.map((item) => { const cheapest = best(item); return <article className="grocery-row" key={item.id}><button className="check-box" aria-label={`Mark ${item.name} bought`} onClick={() => removeItem(item)}><span/></button><div className="food-icon">{icons[item.category] ?? icons.Other}</div><div className="item-main"><strong>{item.name}</strong><small>{item.unit || item.category}</small></div>{cheapest ? <div className="best-price"><strong>{money(cheapest.amount)}</strong><small>best price</small></div> : <div className="best-price"><strong>—</strong><small>add a price</small></div>}<button className="compare-link" onClick={() => { setSelectedStore("Walmart"); setActiveTab("prices"); }}>Compare</button><button className="row-menu" title="Remove item" onClick={() => setModal({ item, bought: false })}><Icon name="trash" size={15}/></button></article>; })}</section>) : visibleItems.map((item) => { const cheapest = best(item); const price = item.prices.filter((p) => p.store === selectedStore).sort((a, b) => a.amount - b.amount)[0]; return <article className="grocery-row compare-row" key={item.id}><div className="food-icon">{icons[item.category] ?? icons.Other}</div><div className="item-main"><strong>{item.name}</strong><small>{item.unit || item.category}</small></div><div className="best-price"><strong>{price ? money(price.amount) : "—"}</strong><small>{price ? `at ${selectedStore}` : "no price yet"}</small></div>{price && cheapest && cheapest.store !== selectedStore ? <span className="price-diff">+{money(price.amount - cheapest.amount)} vs best</span> : price ? <span className="best-tag">Best price</span> : <span className="price-diff">Not tracked</span>}<button className="row-menu" title="View price history" onClick={() => setShowHistory(showHistory === item.id ? null : item.id)}><Icon name="history" size={15}/></button></article>; })}
              {visibleItems.length === 0 && <div className="empty-state">No items found. Try another search.</div>}
            </div>

            {activeTab === "list" && <div className="add-item"><span className="add-plus"><Icon name="plus" size={16}/></span><input placeholder="Add something to the list…" value={newItem} onChange={(e) => setNewItem(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addItem()}/><button onClick={addItem}>Add item</button></div>}
            {showHistory && <History items={showHistory === "all" ? items : items.filter((i) => i.id === showHistory)} onClose={() => setShowHistory(null)}/>}
          </div>

            <aside className="right-column"><div className="route-card"><div className="route-header"><span className="route-icon"><Icon name="cart" size={16}/></span><div><h3>Smart shopping route</h3><p>Fewer stops, better prices</p></div><span className="route-badge">THIS WEEK</span></div><div className="route-list"><div className="route-stop"><span className="route-num">1</span><span className="route-store-logo costco">C</span><span className="route-name"><strong>Costco</strong><small>5 items · save up to $4.80</small></span><span className="route-chevron">›</span></div><div className="route-stop"><span className="route-num">2</span><span className="route-store-logo walmart">W</span><span className="route-name"><strong>Walmart</strong><small>2 items · save up to $1.14</small></span><span className="route-chevron">›</span></div><div className="route-stop"><span className="route-num">3</span><span className="route-store-logo trader">TJ</span><span className="route-name"><strong>Trader Joe's</strong><small>1 item · save up to $0.49</small></span><span className="route-chevron">›</span></div></div><button className="route-action" onClick={() => setActiveTab("prices")}>See all store prices <span>→</span></button></div>
            <div className="activity-card"><div className="activity-heading"><h3>Recent price updates</h3><button onClick={() => setShowHistory("all")}>View all</button></div><div className="activity-item"><span className="activity-avatar avatar-lilac">M</span><div><strong>Maya added a price</strong><small>Organic whole milk · Costco</small></div><time>2h</time></div><div className="activity-item"><span className="activity-avatar avatar-sky">J</span><div><strong>Jordan updated a price</strong><small>Avocados · Walmart</small></div><time>Yesterday</time></div><div className="activity-item"><span className="activity-avatar avatar-rose">A</span><div><strong>Alex added a price</strong><small>Sourdough bread · Trader Joe's</small></div><time>Oct 16</time></div></div>
            <div className="tip-card"><span className="tip-sun">✳</span><div><strong>A little tip</strong><p>Upload a CSV after your next shopping trip to keep everyone’s prices fresh.</p></div></div></aside>
          </div>
          <footer className="page-footer"><span>Made for sharing meals and making ends meet.</span><span><i/> All changes saved automatically</span></footer>
        </div>
      </section>

      {modal && <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setModal(null)}><section className="purchase-modal"><button className="modal-close" onClick={() => setModal(null)}>×</button><span className="modal-icon">{modal.bought ? "🛍️" : "📝"}</span><h2>{modal.bought ? `Did you buy ${modal.item.name}?` : `Remove ${modal.item.name}?`}</h2><p>{modal.bought ? "If you picked it up, save the price for the whole house." : "This item will be removed from the shared list."}</p>{modal.bought && <><label className="field-label">Store<select value={purchase.store} onChange={(e) => setPurchase({ ...purchase, store: e.target.value as Store })}>{stores.map((s) => <option key={s}>{s}</option>)}</select></label><label className="field-label">What did it cost?<span className="amount-input"><span>$</span><input type="number" min="0.01" step="0.01" placeholder="0.00" value={purchase.amount} onChange={(e) => setPurchase({ ...purchase, amount: e.target.value })}/></span></label></>}<div className="modal-actions">{modal.bought ? <button className="quiet-button" onClick={() => setModal({ ...modal, bought: false })}>Not bought</button> : <button className="quiet-button" onClick={() => setModal(null)}>Cancel</button>}<button className="primary-button" onClick={confirmRemoval}>{modal.bought ? "Save & remove" : "Remove item"}</button></div></section></div>}
      {notice && <div className="toast">✓ &nbsp;{notice}</div>}
    </main>
  );
}

function History({ items, onClose }: { items: Item[]; onClose: () => void }) {
  const archived = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("common-table-archive-v1") ?? "[]") as Item[] : [];
  const all = [...items, ...archived];
  const prices = all.flatMap((item) => item.prices.map((price) => ({ ...price, name: item.name }))).sort((a, b) => b.date.localeCompare(a.date));
  return <div className="history-popover"><div className="history-head"><strong>Purchase history</strong><button onClick={onClose}>×</button></div>{prices.slice(0, 12).map((p, i) => <div className="history-line" key={`${p.name}-${p.store}-${p.date}-${i}`}><span><strong>{p.name}</strong><small>{p.store} · {p.date}</small></span><b>{money(p.amount)}</b></div>)}{prices.length === 0 && <p className="history-empty">Your household’s purchases will show up here.</p>}</div>;
}
