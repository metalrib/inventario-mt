import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  getFirestore,
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  writeBatch
} from 'firebase/firestore';
import configJson from '../../firebase-applet-config.json';
import { PerfilItem, BumperItem, GeralItem, ProductCatalogItem, AppConfig } from '../types';
import { DEFAULT_PRODUCT_CATALOG } from '../data/catalog';

// Firebase initialization
const firebaseConfig = {
  projectId: configJson.projectId,
  appId: configJson.appId,
  apiKey: configJson.apiKey,
  authDomain: configJson.authDomain,
  storageBucket: configJson.storageBucket,
  messagingSenderId: configJson.messagingSenderId,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Use the databaseId specified in config if available, otherwise default
const databaseId = configJson.firestoreDatabaseId && configJson.firestoreDatabaseId !== '(default)'
  ? configJson.firestoreDatabaseId
  : undefined;

// Robust Firestore instance with long-polling fallback and persistent cache
function initFirestoreInstance() {
  try {
    return initializeFirestore(app, {
      experimentalAutoDetectLongPolling: true,
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    }, databaseId);
  } catch {
    try {
      return databaseId ? getFirestore(app, databaseId) : getFirestore(app);
    } catch {
      return getFirestore(app);
    }
  }
}

export const db = initFirestoreInstance();

// Collection Names
const COL_PERFIS = 'inventario';
const COL_BUMPERS = 'inventario_bumpers';
const COL_GERAIS = 'inventario_geral';
const COL_CATALOGO = 'catalogo_produtos';

// Local storage keys for instant offline fallback
const STORAGE_KEY_PERFIS = 'metalrib_perfis_v2';
const STORAGE_KEY_BUMPERS = 'metalrib_bumpers_v2';
const STORAGE_KEY_GERAIS = 'metalrib_gerais_v1';
const STORAGE_KEY_CATALOG = 'metalrib_product_catalog_v2';
const CONFIG_KEY = 'metalrib_app_config_v1';

export function getLocalPerfis(): PerfilItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PERFIS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalPerfis(items: PerfilItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_PERFIS, JSON.stringify(items));
  } catch (e) {
    console.error('Erro ao salvar perfis localmente:', e);
  }
}

export function getLocalBumpers(): BumperItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BUMPERS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalBumpers(items: BumperItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_BUMPERS, JSON.stringify(items));
  } catch (e) {
    console.error('Erro ao salvar bumpers localmente:', e);
  }
}

export function getLocalGerais(): GeralItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_GERAIS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalGerais(items: GeralItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_GERAIS, JSON.stringify(items));
  } catch (e) {
    console.error('Erro ao salvar gerais localmente:', e);
  }
}

export function getLocalCatalog(): ProductCatalogItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CATALOG);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}
  return DEFAULT_PRODUCT_CATALOG;
}

export function saveLocalCatalog(items: ProductCatalogItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_CATALOG, JSON.stringify(items));
  } catch (e) {
    console.error('Erro ao salvar catálogo localmente:', e);
  }
}

// ----------------- REAL-TIME SUBSCRIPTIONS -----------------

export function subscribeToPerfis(onUpdate: (items: PerfilItem[]) => void): () => void {
  try {
    const q = query(collection(db, COL_PERFIS), orderBy('created_at', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const items: PerfilItem[] = snapshot.docs.map(d => ({
        id: d.id,
        ...(d.data() as Omit<PerfilItem, 'id'>)
      }));
      saveLocalPerfis(items);
      onUpdate(items);
    }, (err) => {
      console.warn('Realtime perfis fallback to local:', err);
      onUpdate(getLocalPerfis());
    });
  } catch (err) {
    console.warn('Subscription to perfis failed, using local:', err);
    onUpdate(getLocalPerfis());
    return () => {};
  }
}

export function subscribeToBumpers(onUpdate: (items: BumperItem[]) => void): () => void {
  try {
    const q = query(collection(db, COL_BUMPERS), orderBy('created_at', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const items: BumperItem[] = snapshot.docs.map(d => ({
        id: d.id,
        ...(d.data() as Omit<BumperItem, 'id'>)
      }));
      saveLocalBumpers(items);
      onUpdate(items);
    }, (err) => {
      console.warn('Realtime bumpers fallback to local:', err);
      onUpdate(getLocalBumpers());
    });
  } catch (err) {
    console.warn('Subscription to bumpers failed, using local:', err);
    onUpdate(getLocalBumpers());
    return () => {};
  }
}

export function subscribeToGerais(onUpdate: (items: GeralItem[]) => void): () => void {
  try {
    const q = query(collection(db, COL_GERAIS), orderBy('created_at', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const items: GeralItem[] = snapshot.docs.map(d => ({
        id: d.id,
        ...(d.data() as Omit<GeralItem, 'id'>)
      }));
      saveLocalGerais(items);
      onUpdate(items);
    }, (err) => {
      console.warn('Realtime gerais fallback to local:', err);
      onUpdate(getLocalGerais());
    });
  } catch (err) {
    console.warn('Subscription to gerais failed, using local:', err);
    onUpdate(getLocalGerais());
    return () => {};
  }
}

export function subscribeToCatalog(onUpdate: (items: ProductCatalogItem[]) => void): () => void {
  try {
    const q = query(collection(db, COL_CATALOGO), orderBy('codigo', 'asc'));
    return onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        // Se ainda não houver catálogo no Firebase, sincroniza com o catálogo local/padrão
        const local = getLocalCatalog();
        onUpdate(local);
        return;
      }
      const remoteItems: ProductCatalogItem[] = snapshot.docs.map(d => ({
        id: d.id,
        ...(d.data() as Omit<ProductCatalogItem, 'id'>)
      }));

      // Merge com catálogo padrão para garantir que itens base não sumam
      const map = new Map<string, ProductCatalogItem>();
      for (const def of DEFAULT_PRODUCT_CATALOG) {
        if (def.codigo) map.set(def.codigo.trim().toUpperCase(), def);
      }
      for (const rem of remoteItems) {
        if (rem.codigo) map.set(rem.codigo.trim().toUpperCase(), rem);
      }
      const merged = Array.from(map.values());
      saveLocalCatalog(merged);
      onUpdate(merged);
    }, (err) => {
      console.warn('Realtime catalog fallback to local:', err);
      onUpdate(getLocalCatalog());
    });
  } catch (err) {
    console.warn('Subscription to catalog failed, using local:', err);
    onUpdate(getLocalCatalog());
    return () => {};
  }
}

// ----------------- CRUD PERFIS -----------------

export async function fetchPerfis(): Promise<PerfilItem[]> {
  try {
    const q = query(collection(db, COL_PERFIS), orderBy('created_at', 'desc'));
    const snap = await getDocs(q);
    const items: PerfilItem[] = snap.docs.map(d => ({
      id: d.id,
      ...(d.data() as Omit<PerfilItem, 'id'>)
    }));
    saveLocalPerfis(items);
    return items;
  } catch (err) {
    console.warn('Erro ao buscar perfis no Firebase, usando local:', err);
    return getLocalPerfis();
  }
}

export async function addPerfil(item: Omit<PerfilItem, 'id' | 'created_at'> & { created_at?: string }): Promise<PerfilItem> {
  const docId = `perfil_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const now = item.created_at || new Date().toISOString();
  const fullItem: PerfilItem = {
    ...item,
    id: docId,
    created_at: now
  };

  // Salva no Firestore
  try {
    if (fullItem.id_nomus) {
      registerUsedNomusId(fullItem.id_nomus);
    }
    await setDoc(doc(db, COL_PERFIS, docId), {
      id_nomus: fullItem.id_nomus,
      codigo_perfil: fullItem.codigo_perfil,
      descricao_perfil: fullItem.descricao_perfil,
      medida_mm: Number(fullItem.medida_mm),
      quantidade: Number(fullItem.quantidade),
      status: fullItem.status || 'ESTOQUE',
      operador: fullItem.operador || 'Operador',
      created_at: now
    });
  } catch (err) {
    console.error('Erro ao adicionar perfil no Firebase:', err);
  }

  // Atualiza local
  const current = getLocalPerfis();
  saveLocalPerfis([fullItem, ...current.filter(p => String(p.id) !== String(docId))]);
  return fullItem;
}

export async function updatePerfil(id: string | number, updates: Partial<PerfilItem>): Promise<void> {
  const docId = String(id);
  try {
    await setDoc(doc(db, COL_PERFIS, docId), updates, { merge: true });
  } catch (err) {
    console.error('Erro ao atualizar perfil no Firebase:', err);
  }

  const current = getLocalPerfis();
  const updated = current.map(item => String(item.id) === docId ? { ...item, ...updates } : item);
  saveLocalPerfis(updated);
}

export async function deletePerfil(id: string | number): Promise<void> {
  const docId = String(id);
  try {
    await deleteDoc(doc(db, COL_PERFIS, docId));
  } catch (err) {
    console.error('Erro ao deletar perfil no Firebase:', err);
  }

  const current = getLocalPerfis();
  saveLocalPerfis(current.filter(item => String(item.id) !== docId));
}

// ----------------- CRUD BUMPERS -----------------

export async function fetchBumpers(): Promise<BumperItem[]> {
  try {
    const q = query(collection(db, COL_BUMPERS), orderBy('created_at', 'desc'));
    const snap = await getDocs(q);
    const items: BumperItem[] = snap.docs.map(d => ({
      id: d.id,
      ...(d.data() as Omit<BumperItem, 'id'>)
    }));
    saveLocalBumpers(items);
    return items;
  } catch (err) {
    console.warn('Erro ao buscar bumpers no Firebase, usando local:', err);
    return getLocalBumpers();
  }
}

export async function addBumper(item: Omit<BumperItem, 'id' | 'created_at'> & { created_at?: string }): Promise<BumperItem> {
  const docId = `bumper_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const now = item.created_at || new Date().toISOString();
  const fullItem: BumperItem = {
    ...item,
    id: docId,
    created_at: now
  };

  try {
    if (fullItem.id_nomus) {
      registerUsedNomusId(fullItem.id_nomus);
    } else if (fullItem.tipo === 'ID' && fullItem.codigo) {
      registerUsedNomusId(fullItem.codigo);
    }
    await setDoc(doc(db, COL_BUMPERS, docId), {
      tipo: fullItem.tipo,
      codigo: fullItem.codigo,
      medida_mm: Number(fullItem.medida_mm),
      quantidade: Number(fullItem.quantidade),
      id_nomus: fullItem.id_nomus || '',
      operador: fullItem.operador || 'Operador',
      created_at: now
    });
  } catch (err) {
    console.error('Erro ao adicionar bumper no Firebase:', err);
  }

  const current = getLocalBumpers();
  saveLocalBumpers([fullItem, ...current.filter(b => String(b.id) !== String(docId))]);
  return fullItem;
}

export async function updateBumper(id: string | number, updates: Partial<BumperItem>): Promise<void> {
  const docId = String(id);
  try {
    await setDoc(doc(db, COL_BUMPERS, docId), updates, { merge: true });
  } catch (err) {
    console.error('Erro ao atualizar bumper no Firebase:', err);
  }

  const current = getLocalBumpers();
  const updated = current.map(item => String(item.id) === docId ? { ...item, ...updates } : item);
  saveLocalBumpers(updated);
}

export async function deleteBumper(id: string | number): Promise<void> {
  const docId = String(id);
  try {
    await deleteDoc(doc(db, COL_BUMPERS, docId));
  } catch (err) {
    console.error('Erro ao deletar bumper no Firebase:', err);
  }

  const current = getLocalBumpers();
  saveLocalBumpers(current.filter(item => String(item.id) !== docId));
}

// ----------------- CRUD GERAIS (CHAPAS & INSUMOS) -----------------

export async function fetchGerais(): Promise<GeralItem[]> {
  try {
    const q = query(collection(db, COL_GERAIS), orderBy('created_at', 'desc'));
    const snap = await getDocs(q);
    const items: GeralItem[] = snap.docs.map(d => ({
      id: d.id,
      ...(d.data() as Omit<GeralItem, 'id'>)
    }));
    saveLocalGerais(items);
    return items;
  } catch (err) {
    console.warn('Erro ao buscar gerais no Firebase, usando local:', err);
    return getLocalGerais();
  }
}

export async function addGeral(item: Omit<GeralItem, 'id' | 'created_at'> & { created_at?: string }): Promise<GeralItem> {
  const docId = `geral_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const now = item.created_at || new Date().toISOString();
  const fullItem: GeralItem = {
    ...item,
    id: docId,
    created_at: now
  };

  try {
    if (fullItem.id_nomus) {
      registerUsedNomusId(fullItem.id_nomus);
    }
    await setDoc(doc(db, COL_GERAIS, docId), {
      id_nomus: fullItem.id_nomus,
      codigo_item: fullItem.codigo_item,
      descricao_item: fullItem.descricao_item,
      comprimento_mm: Number(fullItem.comprimento_mm || 0),
      largura_mm: Number(fullItem.largura_mm || 0),
      espessura_mm: Number(fullItem.espessura_mm || 0),
      quantidade: Number(fullItem.quantidade),
      unidade: fullItem.unidade || 'm²',
      operador: fullItem.operador || 'Operador',
      created_at: now
    });
  } catch (err) {
    console.error('Erro ao adicionar item geral no Firebase:', err);
  }

  const current = getLocalGerais();
  saveLocalGerais([fullItem, ...current.filter(g => String(g.id) !== String(docId))]);
  return fullItem;
}

export async function updateGeral(id: string | number, updates: Partial<GeralItem>): Promise<void> {
  const docId = String(id);
  try {
    await setDoc(doc(db, COL_GERAIS, docId), updates, { merge: true });
  } catch (err) {
    console.error('Erro ao atualizar item geral no Firebase:', err);
  }

  const current = getLocalGerais();
  const updated = current.map(item => String(item.id) === docId ? { ...item, ...updates } : item);
  saveLocalGerais(updated);
}

export async function deleteGeral(id: string | number): Promise<void> {
  const docId = String(id);
  try {
    await deleteDoc(doc(db, COL_GERAIS, docId));
  } catch (err) {
    console.error('Erro ao deletar item geral no Firebase:', err);
  }

  const current = getLocalGerais();
  saveLocalGerais(current.filter(item => String(item.id) !== docId));
}

// ----------------- CRUD CATÁLOGO DE PRODUTOS -----------------

export async function fetchCatalog(): Promise<ProductCatalogItem[]> {
  try {
    const q = query(collection(db, COL_CATALOGO), orderBy('codigo', 'asc'));
    const snap = await getDocs(q);
    const remoteItems: ProductCatalogItem[] = snap.docs.map(d => ({
      id: d.id,
      ...(d.data() as Omit<ProductCatalogItem, 'id'>)
    }));

    const map = new Map<string, ProductCatalogItem>();
    for (const def of DEFAULT_PRODUCT_CATALOG) {
      if (def.codigo) map.set(def.codigo.trim().toUpperCase(), def);
    }
    for (const loc of getLocalCatalog()) {
      if (loc.codigo) map.set(loc.codigo.trim().toUpperCase(), loc);
    }
    for (const rem of remoteItems) {
      if (rem.codigo) map.set(rem.codigo.trim().toUpperCase(), rem);
    }

    const merged = Array.from(map.values());
    saveLocalCatalog(merged);
    return merged;
  } catch (err) {
    console.warn('Erro ao buscar catálogo no Firebase, usando local:', err);
    return getLocalCatalog();
  }
}

export async function saveCatalogProduct(item: Omit<ProductCatalogItem, 'id'> & { id?: string | number }): Promise<ProductCatalogItem> {
  const code = (item.codigo || '').trim().toUpperCase();
  const docId = item.id ? String(item.id) : `prod_${code.replace(/[^A-Z0-9]/g, '_')}`;
  const now = item.created_at || new Date().toISOString();

  const fullItem: ProductCatalogItem = {
    id: docId,
    codigo: code,
    descricao: (item.descricao || code).trim(),
    categoria: item.categoria || 'Geral',
    unidade: item.unidade || 'peças',
    comprimento_padrao_mm: item.comprimento_padrao_mm ? Number(item.comprimento_padrao_mm) : undefined,
    largura_padrao_mm: item.largura_padrao_mm ? Number(item.largura_padrao_mm) : undefined,
    espessura_padrao_mm: item.espessura_padrao_mm ? Number(item.espessura_padrao_mm) : undefined,
    medida_padrao_mm: item.medida_padrao_mm ? Number(item.medida_padrao_mm) : undefined,
    created_at: now
  };

  try {
    await setDoc(doc(db, COL_CATALOGO, docId), {
      codigo: fullItem.codigo,
      descricao: fullItem.descricao,
      categoria: fullItem.categoria,
      unidade: fullItem.unidade,
      comprimento_padrao_mm: fullItem.comprimento_padrao_mm || null,
      largura_padrao_mm: fullItem.largura_padrao_mm || null,
      espessura_padrao_mm: fullItem.espessura_padrao_mm || null,
      medida_padrao_mm: fullItem.medida_padrao_mm || null,
      created_at: now
    }, { merge: true });
  } catch (err) {
    console.error('Erro ao salvar produto no catálogo Firebase:', err);
  }

  const current = getLocalCatalog();
  const updated = [fullItem, ...current.filter(p => (p.codigo || '').trim().toUpperCase() !== code && String(p.id) !== docId)];
  saveLocalCatalog(updated);
  return fullItem;
}

export async function deleteCatalogProduct(id: string | number): Promise<void> {
  const docId = String(id);
  try {
    await deleteDoc(doc(db, COL_CATALOGO, docId));
  } catch (err) {
    console.error('Erro ao deletar produto no catálogo Firebase:', err);
  }

  const current = getLocalCatalog();
  saveLocalCatalog(current.filter(p => String(p.id) !== docId));
}

// ----------------- BULK SYNC / SEED -----------------

export async function syncAllToFirebase(
  perfis: PerfilItem[],
  bumpers: BumperItem[],
  gerais: GeralItem[],
  catalogo: ProductCatalogItem[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const batch = writeBatch(db);

    // Sync perfis
    for (const p of perfis) {
      const docId = String(p.id).startsWith('perfil_') ? String(p.id) : `perfil_${p.id}`;
      const ref = doc(db, COL_PERFIS, docId);
      batch.set(ref, {
        id_nomus: p.id_nomus || '',
        codigo_perfil: p.codigo_perfil || '',
        descricao_perfil: p.descricao_perfil || '',
        medida_mm: Number(p.medida_mm || 0),
        quantidade: Number(p.quantidade || 0),
        status: p.status || 'ESTOQUE',
        operador: p.operador || 'Operador',
        created_at: p.created_at || new Date().toISOString()
      }, { merge: true });
    }

    // Sync bumpers
    for (const b of bumpers) {
      const docId = String(b.id).startsWith('bumper_') ? String(b.id) : `bumper_${b.id}`;
      const ref = doc(db, COL_BUMPERS, docId);
      batch.set(ref, {
        tipo: b.tipo,
        codigo: b.codigo || '',
        medida_mm: Number(b.medida_mm || 0),
        quantidade: Number(b.quantidade || 0),
        id_nomus: b.id_nomus || '',
        operador: b.operador || 'Operador',
        created_at: b.created_at || new Date().toISOString()
      }, { merge: true });
    }

    // Sync gerais
    for (const g of gerais) {
      const docId = String(g.id).startsWith('geral_') ? String(g.id) : `geral_${g.id}`;
      const ref = doc(db, COL_GERAIS, docId);
      batch.set(ref, {
        id_nomus: g.id_nomus || '',
        codigo_item: g.codigo_item || '',
        descricao_item: g.descricao_item || '',
        comprimento_mm: Number(g.comprimento_mm || 0),
        largura_mm: Number(g.largura_mm || 0),
        espessura_mm: Number(g.espessura_mm || 0),
        quantidade: Number(g.quantidade || 0),
        unidade: g.unidade || 'm²',
        operador: g.operador || 'Operador',
        created_at: g.created_at || new Date().toISOString()
      }, { merge: true });
    }

    // Sync catalogo
    for (const c of catalogo) {
      const code = (c.codigo || '').trim().toUpperCase();
      if (!code) continue;
      const docId = String(c.id).startsWith('prod_') ? String(c.id) : `prod_${code.replace(/[^A-Z0-9]/g, '_')}`;
      const ref = doc(db, COL_CATALOGO, docId);
      batch.set(ref, {
        codigo: code,
        descricao: c.descricao || code,
        categoria: c.categoria || 'Geral',
        unidade: c.unidade || 'peças',
        comprimento_padrao_mm: c.comprimento_padrao_mm || null,
        largura_padrao_mm: c.largura_padrao_mm || null,
        espessura_padrao_mm: c.espessura_padrao_mm || null,
        medida_padrao_mm: c.medida_padrao_mm || null,
        created_at: c.created_at || new Date().toISOString()
      }, { merge: true });
    }

    await batch.commit();
    return { success: true };
  } catch (err: any) {
    console.error('Erro ao sincronizar lote no Firebase:', err);
    return { success: false, error: err?.message || 'Falha na sincronização' };
  }
}

// ----------------- NOMUS ID & CATALOG HELPERS -----------------

// Set to keep track of recently generated / reserved IDs in this session
const recentlyUsedIds = new Set<string>();

export function registerUsedNomusId(id: string): void {
  if (!id) return;
  const clean = id.trim();
  if (clean) {
    recentlyUsedIds.add(clean);
    try {
      const stored = JSON.parse(sessionStorage.getItem('metalrib_reserved_ids') || '[]');
      if (Array.isArray(stored) && !stored.includes(clean)) {
        stored.push(clean);
        if (stored.length > 500) stored.shift();
        sessionStorage.setItem('metalrib_reserved_ids', JSON.stringify(stored));
      }
    } catch {
      // ignore storage errors
    }
  }
}

export function getAllKnownNomusIds(extraIds: string[] = []): Set<string> {
  const ids = new Set<string>();

  // 1. Extra IDs passed as arguments
  for (const id of extraIds) {
    if (id && id.trim()) ids.add(id.trim());
  }

  // 2. In-memory recently used IDs
  for (const id of recentlyUsedIds) {
    if (id && id.trim()) ids.add(id.trim());
  }

  // 3. SessionStorage reserved IDs
  try {
    const stored = JSON.parse(sessionStorage.getItem('metalrib_reserved_ids') || '[]');
    if (Array.isArray(stored)) {
      for (const id of stored) {
        if (id && typeof id === 'string') ids.add(id.trim());
      }
    }
  } catch {}

  // 4. LocalStorage collections
  try {
    const perfis = getLocalPerfis();
    for (const p of perfis) {
      if (p.id_nomus) ids.add(p.id_nomus.trim());
    }
    const bumpers = getLocalBumpers();
    for (const b of bumpers) {
      if (b.id_nomus) ids.add(b.id_nomus.trim());
      if (b.tipo === 'ID' && b.codigo) ids.add(b.codigo.trim());
    }
    const gerais = getLocalGerais();
    for (const g of gerais) {
      if (g.id_nomus) ids.add(g.id_nomus.trim());
    }
  } catch {}

  return ids;
}

export function generateUniqueNomusId(existingIds: string[] = [], currentId?: string): string {
  const idsToAvoid = getAllKnownNomusIds(existingIds);
  if (currentId && currentId.trim()) {
    idsToAvoid.add(currentId.trim());
  }

  const d = new Date();
  d.setSeconds(0, 0);

  const pad = (n: number) => String(n).padStart(2, '0');
  let base = `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}.${pad(d.getHours())}${pad(d.getMinutes())}`;

  let minutesToAdd = 0;
  while (idsToAvoid.has(base)) {
    minutesToAdd++;
    const nextDate = new Date(d.getTime() + minutesToAdd * 60000);
    base = `${nextDate.getFullYear()}.${pad(nextDate.getMonth() + 1)}.${pad(nextDate.getDate())}.${pad(nextDate.getHours())}${pad(nextDate.getMinutes())}`;
  }

  // Immediately register this generated ID in session cache so rapid subsequent calls get the next minute
  registerUsedNomusId(base);

  return base;
}

export function formatNomusIdInput(value: string): string {
  const raw = value.replace(/\D/g, '');
  if (!raw) return '';
  const trimmed = raw.slice(0, 12);
  let formatted = '';
  if (trimmed.length > 0) formatted += trimmed.substring(0, 4);
  if (trimmed.length > 4) formatted += '.' + trimmed.substring(4, 6);
  if (trimmed.length > 6) formatted += '.' + trimmed.substring(6, 8);
  if (trimmed.length > 8) formatted += '.' + trimmed.substring(8, 12);
  return formatted;
}

export function findCatalogProductByCode(code: string, catalog?: ProductCatalogItem[]): ProductCatalogItem | undefined {
  const clean = code.trim().toUpperCase();
  if (!clean) return undefined;
  const list = catalog || getLocalCatalog();
  return list.find(p => (p.codigo || '').trim().toUpperCase() === clean);
}


export const DEFAULT_CONFIG: AppConfig = {
  supabaseUrl: '',
  supabaseKey: '',
  operadorPadrao: 'Operador Metalrib',
  autoImprimirAoSalvar: false,
  manterMedidaBumpers: false,
  manterMedidaPerfis: false,
  autoGerarIdNomus: true,
  fixarProdutoGeral: false
};

export function getAppConfig(): AppConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    return raw ? { ...DEFAULT_CONFIG, ...JSON.parse(raw) } : DEFAULT_CONFIG;
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveAppConfig(cfg: AppConfig): void {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
  } catch (e) {
    console.error('Erro ao salvar configurações:', e);
  }
}
