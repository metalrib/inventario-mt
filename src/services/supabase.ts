import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { PerfilItem, BumperItem, GeralItem, AppConfig, ProductCatalogItem } from '../types';
import { DEFAULT_PRODUCT_CATALOG } from '../data/catalog';

const DEFAULT_SUPABASE_URL = "https://mzpmvmuthgnrlcrqpvru.supabase.co"; 
const DEFAULT_SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16cG12bXV0aGducmxjcnFwdnJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU1MTExOTcsImV4cCI6MjEwMTA4NzE5N30.zHErOtDt_zECvOct7ZwX4934BCI23ZuKRaHfdmj9fzg";

export function getAppConfig(): AppConfig {
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const saved = localStorage.getItem('metalrib_config');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      return {
        ...parsed,
        supabaseUrl: parsed.supabaseUrl || envUrl || DEFAULT_SUPABASE_URL,
        supabaseKey: parsed.supabaseKey || envKey || DEFAULT_SUPABASE_KEY
      };
    } catch {
      // fallback
    }
  }
  return {
    supabaseUrl: envUrl || DEFAULT_SUPABASE_URL,
    supabaseKey: envKey || DEFAULT_SUPABASE_KEY,
    operadorPadrao: 'Operador PCP',
    autoImprimirAoSalvar: false,
    manterMedidaBumpers: true,
    manterMedidaPerfis: false
  };
}

export function saveAppConfig(config: AppConfig) {
  localStorage.setItem('metalrib_config', JSON.stringify(config));
}

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const config = getAppConfig();
  if (!config.supabaseUrl || !config.supabaseKey) return null;
  
  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(config.supabaseUrl, config.supabaseKey);
    } catch (e) {
      console.warn("Failed to initialize Supabase client:", e);
      return null;
    }
  }
  return supabaseInstance;
}

export function resetSupabaseClient() {
  supabaseInstance = null;
}

export async function checkSupabaseStatus(): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const timeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), 3000)
    );
    const query = client.from('inventario').select('id').limit(1);
    await Promise.race([query, timeout]);
    return true;
  } catch {
    return false;
  }
}

// Data operations with LocalStorage fallback & cache
export function getLocalPerfis(): PerfilItem[] {
  try {
    const raw = localStorage.getItem('metalrib_perfis');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalPerfis(items: PerfilItem[]) {
  localStorage.setItem('metalrib_perfis', JSON.stringify(items));
}

export function getLocalBumpers(): BumperItem[] {
  try {
    const raw = localStorage.getItem('metalrib_bumpers');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalBumpers(items: BumperItem[]) {
  localStorage.setItem('metalrib_bumpers', JSON.stringify(items));
}

export async function syncPendingItems(): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  // 1. Sync pending local perfis
  const localPerfis = getLocalPerfis();
  const pendingPerfis = localPerfis.filter(p => String(p.id).startsWith('local_'));
  for (const item of pendingPerfis) {
    try {
      const payload = {
        id_nomus: item.id_nomus || '',
        codigo_perfil: item.codigo_perfil,
        descricao_perfil: item.descricao_perfil,
        medida_mm: item.medida_mm,
        quantidade: item.quantidade,
        status: item.status || 'Com ID Nomus'
      };

      const { data, error } = await client.from('inventario').insert([payload]).select().single();

      if (!error && data) {
        const current = getLocalPerfis();
        const updated = current.map(p => p.id === item.id ? { ...p, id: data.id } : p);
        saveLocalPerfis(updated);
      } else if (error) {
        console.warn("Failed sync pending perfil:", error);
      }
    } catch (e) {
      console.warn("Failed to sync pending perfil:", e);
    }
  }

  // 2. Sync pending local bumpers
  const localBumpers = getLocalBumpers();
  const pendingBumpers = localBumpers.filter(b => String(b.id).startsWith('local_'));
  for (const item of pendingBumpers) {
    try {
      const payload = {
        tipo: item.tipo,
        codigo: item.codigo,
        medida_mm: item.medida_mm,
        quantidade: item.quantidade
      };

      const { data, error } = await client.from('inventario_bumpers').insert([payload]).select().single();

      if (!error && data) {
        const current = getLocalBumpers();
        const updated = current.map(b => b.id === item.id ? { ...b, id: data.id } : b);
        saveLocalBumpers(updated);
      } else if (error) {
        console.warn("Failed sync pending bumper:", error);
      }
    } catch (e) {
      console.warn("Failed to sync pending bumper:", e);
    }
  }

  // 3. Sync pending local gerais
  const localGerais = getLocalGerais();
  const pendingGerais = localGerais.filter(g => String(g.id).startsWith('local_'));
  for (const item of pendingGerais) {
    try {
      const payload = {
        id_nomus: item.id_nomus || '',
        codigo_item: item.codigo_item,
        descricao_item: item.descricao_item,
        comprimento_mm: item.comprimento_mm,
        largura_mm: item.largura_mm,
        espessura_mm: item.espessura_mm,
        quantidade: item.quantidade,
        unidade: item.unidade,
        operador: item.operador || 'Operador PCP'
      };

      const { data, error } = await client.from('inventario_geral').insert([payload]).select().single();

      if (!error && data) {
        const current = getLocalGerais();
        const updated = current.map(g => g.id === item.id ? { ...g, id: data.id } : g);
        saveLocalGerais(updated);
      } else if (error) {
        console.warn("Failed sync pending geral:", error);
      }
    } catch (e) {
      console.warn("Failed to sync pending geral:", e);
    }
  }
}

export async function fetchPerfis(): Promise<{ data: PerfilItem[]; isOnline: boolean }> {
  const client = getSupabaseClient();
  if (!client) {
    return { data: getLocalPerfis(), isOnline: false };
  }

  try {
    await syncPendingItems();

    const { data, error } = await client
      .from('inventario')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) {
      throw error || new Error('No data');
    }

    const mapped: PerfilItem[] = data.map(d => ({
      id: d.id,
      id_nomus: d.id_nomus || '',
      codigo_perfil: d.codigo_perfil || '',
      descricao_perfil: d.descricao_perfil || '',
      medida_mm: Number(d.medida_mm) || 0,
      quantidade: Number(d.quantidade) || 1,
      status: d.status || 'Com ID Nomus',
      created_at: d.created_at || new Date().toISOString(),
      operador: d.operador || 'Operador PCP'
    }));

    const localItems = getLocalPerfis();
    const localPending = localItems.filter(p => String(p.id).startsWith('local_'));
    const remoteIds = new Set(mapped.map(m => String(m.id)));
    const merged = [...localPending.filter(p => !remoteIds.has(String(p.id))), ...mapped];

    saveLocalPerfis(merged);
    return { data: merged, isOnline: true };
  } catch (err) {
    console.warn("Using offline perfis fallback:", err);
    return { data: getLocalPerfis(), isOnline: false };
  }
}

export async function fetchBumpers(): Promise<{ data: BumperItem[]; isOnline: boolean }> {
  const client = getSupabaseClient();
  if (!client) {
    return { data: getLocalBumpers(), isOnline: false };
  }

  try {
    await syncPendingItems();

    const { data, error } = await client
      .from('inventario_bumpers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) {
      throw error || new Error('No data');
    }

    const mapped: BumperItem[] = data.map(d => ({
      id: d.id,
      id_nomus: d.id_nomus || '',
      tipo: d.tipo as 'ID' | 'OP',
      codigo: d.codigo || '',
      medida_mm: Number(d.medida_mm) || 0,
      quantidade: Number(d.quantidade) || 1,
      created_at: d.created_at || new Date().toISOString(),
      operador: d.operador || 'Operador PCP'
    }));

    const localItems = getLocalBumpers();
    const localPending = localItems.filter(b => String(b.id).startsWith('local_'));
    const remoteIds = new Set(mapped.map(m => String(m.id)));
    const merged = [...localPending.filter(b => !remoteIds.has(String(b.id))), ...mapped];

    saveLocalBumpers(merged);
    return { data: merged, isOnline: true };
  } catch (err) {
    console.warn("Using offline bumpers fallback:", err);
    return { data: getLocalBumpers(), isOnline: false };
  }
}

export async function insertPerfil(item: Omit<PerfilItem, 'id'>): Promise<PerfilItem> {
  const client = getSupabaseClient();
  const newItem: PerfilItem = {
    ...item,
    id: 'local_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    created_at: new Date().toISOString()
  };

  if (client) {
    try {
      const payload = {
        id_nomus: item.id_nomus || '',
        codigo_perfil: item.codigo_perfil,
        descricao_perfil: item.descricao_perfil,
        medida_mm: item.medida_mm,
        quantidade: item.quantidade,
        status: item.status || 'Com ID Nomus'
      };

      const { data, error } = await client
        .from('inventario')
        .insert([payload])
        .select()
        .single();

      if (!error && data) {
        newItem.id = data.id;
      } else if (error) {
        console.warn("Supabase insertPerfil error:", error);
      }
    } catch (err) {
      console.warn("Cloud insert failed, queued locally:", err);
    }
  }

  const current = getLocalPerfis();
  const updated = [newItem, ...current.filter(c => String(c.id) !== String(newItem.id))];
  saveLocalPerfis(updated);
  return newItem;
}

export async function insertBumper(item: Omit<BumperItem, 'id'>): Promise<BumperItem> {
  const client = getSupabaseClient();
  const newItem: BumperItem = {
    ...item,
    id: 'local_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    created_at: new Date().toISOString()
  };

  if (client) {
    try {
      const payload = {
        tipo: item.tipo,
        codigo: item.codigo,
        medida_mm: item.medida_mm,
        quantidade: item.quantidade
      };

      const { data, error } = await client
        .from('inventario_bumpers')
        .insert([payload])
        .select()
        .single();

      if (!error && data) {
        newItem.id = data.id;
      } else if (error) {
        console.warn("Supabase insertBumper error:", error);
      }
    } catch (err) {
      console.warn("Cloud insert failed, queued locally:", err);
    }
  }

  const current = getLocalBumpers();
  const updated = [newItem, ...current.filter(c => String(c.id) !== String(newItem.id))];
  saveLocalBumpers(updated);
  return newItem;
}

export async function updatePerfil(id: string | number, item: Partial<PerfilItem>): Promise<void> {
  const client = getSupabaseClient();
  if (client && (typeof id !== 'string' || !String(id).startsWith('local_'))) {
    try {
      await client.from('inventario').update({
        id_nomus: item.id_nomus,
        codigo_perfil: item.codigo_perfil,
        descricao_perfil: item.descricao_perfil,
        medida_mm: item.medida_mm,
        quantidade: item.quantidade
      }).eq('id', id);
    } catch (e) {
      console.warn("Cloud update error:", e);
    }
  }

  const current = getLocalPerfis();
  const updated = current.map(p => p.id === id ? { ...p, ...item } : p);
  saveLocalPerfis(updated);
}

export async function updateBumper(id: string | number, item: Partial<BumperItem>): Promise<void> {
  const client = getSupabaseClient();
  if (client && (typeof id !== 'string' || !String(id).startsWith('local_'))) {
    try {
      await client.from('inventario_bumpers').update({
        tipo: item.tipo,
        codigo: item.codigo,
        medida_mm: item.medida_mm,
        quantidade: item.quantidade
      }).eq('id', id);
    } catch (e) {
      console.warn("Cloud update error:", e);
    }
  }

  const current = getLocalBumpers();
  const updated = current.map(b => b.id === id ? { ...b, ...item } : b);
  saveLocalBumpers(updated);
}

export async function deletePerfil(id: string | number): Promise<void> {
  const client = getSupabaseClient();
  if (client && (typeof id === 'number' || !String(id).startsWith('local_'))) {
    try {
      await client.from('inventario').delete().eq('id', id);
    } catch (e) {
      console.warn("Cloud delete failed:", e);
    }
  }

  const current = getLocalPerfis();
  const updated = current.filter(p => p.id !== id);
  saveLocalPerfis(updated);
}

export async function deleteBumper(id: string | number): Promise<void> {
  const client = getSupabaseClient();
  if (client && (typeof id === 'number' || !String(id).startsWith('local_'))) {
    try {
      await client.from('inventario_bumpers').delete().eq('id', id);
    } catch (e) {
      console.warn("Cloud delete failed:", e);
    }
  }

  const current = getLocalBumpers();
  const updated = current.filter(b => b.id !== id);
  saveLocalBumpers(updated);
}

export async function clearAllPerfis(): Promise<void> {
  const current = getLocalPerfis();
  const client = getSupabaseClient();
  if (client) {
    const realIds = current.filter(p => typeof p.id === 'number' || !String(p.id).startsWith('local_')).map(p => p.id);
    if (realIds.length > 0) {
      try {
        await client.from('inventario').delete().in('id', realIds);
      } catch (e) {
        console.warn("Cloud clear failed:", e);
      }
    }
  }
  saveLocalPerfis([]);
}

export async function clearAllBumpers(): Promise<void> {
  const current = getLocalBumpers();
  const client = getSupabaseClient();
  if (client) {
    const realIds = current.filter(b => typeof b.id === 'number' || !String(b.id).startsWith('local_')).map(b => b.id);
    if (realIds.length > 0) {
      try {
        await client.from('inventario_bumpers').delete().in('id', realIds);
      } catch (e) {
        console.warn("Cloud clear failed:", e);
      }
    }
  }
  saveLocalBumpers([]);
}

// Geral / Chapas Data Operations
export function getLocalGerais(): GeralItem[] {
  try {
    const raw = localStorage.getItem('metalrib_gerais');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalGerais(items: GeralItem[]) {
  localStorage.setItem('metalrib_gerais', JSON.stringify(items));
}

export async function fetchGerais(): Promise<{ data: GeralItem[]; isOnline: boolean }> {
  const client = getSupabaseClient();
  if (!client) {
    return { data: getLocalGerais(), isOnline: false };
  }

  try {
    await syncPendingItems();

    const { data, error } = await client
      .from('inventario_geral')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) {
      throw error || new Error('No data');
    }

    const mapped: GeralItem[] = data.map(d => ({
      id: d.id,
      id_nomus: d.id_nomus || '',
      codigo_item: d.codigo_item || '',
      descricao_item: d.descricao_item || '',
      comprimento_mm: Number(d.comprimento_mm) || 0,
      largura_mm: Number(d.largura_mm) || 0,
      espessura_mm: Number(d.espessura_mm) || 0,
      quantidade: Number(d.quantidade) || 1,
      unidade: d.unidade || 'peças',
      created_at: d.created_at || new Date().toISOString(),
      operador: d.operador || 'Operador PCP'
    }));

    const localItems = getLocalGerais();
    const localPending = localItems.filter(g => String(g.id).startsWith('local_'));
    const remoteIds = new Set(mapped.map(m => String(m.id)));
    const merged = [...localPending.filter(g => !remoteIds.has(String(g.id))), ...mapped];

    saveLocalGerais(merged);
    return { data: merged, isOnline: true };
  } catch (err) {
    console.warn("Using offline gerais fallback:", err);
    return { data: getLocalGerais(), isOnline: false };
  }
}

export async function insertGeral(item: Omit<GeralItem, 'id'>): Promise<GeralItem> {
  const client = getSupabaseClient();
  const newItem: GeralItem = {
    ...item,
    id: 'local_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    created_at: new Date().toISOString()
  };

  if (client) {
    try {
      const payload: any = {
        id_nomus: item.id_nomus || '',
        codigo_item: item.codigo_item,
        descricao_item: item.descricao_item,
        comprimento_mm: item.comprimento_mm,
        largura_mm: item.largura_mm,
        espessura_mm: item.espessura_mm,
        quantidade: item.quantidade,
        unidade: item.unidade,
        operador: item.operador
      };

      let { data, error } = await client
        .from('inventario_geral')
        .insert([payload])
        .select()
        .single();

      if (error) {
        console.warn("Supabase insertGeral error, retrying without id_nomus...", error);
        delete payload.id_nomus;
        const retryRes = await client
          .from('inventario_geral')
          .insert([payload])
          .select()
          .single();
        data = retryRes.data;
        error = retryRes.error;
      }

      if (!error && data) {
        newItem.id = data.id;
      } else if (error) {
        console.warn("Supabase insertGeral failed permanently:", error);
      }
    } catch (err) {
      console.warn("Cloud insert failed, queued locally:", err);
    }
  }

  const current = getLocalGerais();
  const updated = [newItem, ...current.filter(c => String(c.id) !== String(newItem.id))];
  saveLocalGerais(updated);
  return newItem;
}

export async function updateGeral(id: string | number, item: Partial<GeralItem>): Promise<void> {
  const client = getSupabaseClient();
  if (client && typeof id !== 'string' || !String(id).startsWith('local_')) {
    try {
      await client.from('inventario_geral').update({
        id_nomus: item.id_nomus,
        codigo_item: item.codigo_item,
        descricao_item: item.descricao_item,
        comprimento_mm: item.comprimento_mm,
        largura_mm: item.largura_mm,
        espessura_mm: item.espessura_mm,
        quantidade: item.quantidade,
        unidade: item.unidade
      }).eq('id', id);
    } catch (e) {
      console.warn("Cloud update error:", e);
    }
  }

  const current = getLocalGerais();
  const updated = current.map(g => g.id === id ? { ...g, ...item } : g);
  saveLocalGerais(updated);
}

export async function deleteGeral(id: string | number): Promise<void> {
  const client = getSupabaseClient();
  if (client && (typeof id === 'number' || !String(id).startsWith('local_'))) {
    try {
      await client.from('inventario_geral').delete().eq('id', id);
    } catch (e) {
      console.warn("Cloud delete failed:", e);
    }
  }

  const current = getLocalGerais();
  const updated = current.filter(g => g.id !== id);
  saveLocalGerais(updated);
}

export async function deleteGeraisBatch(ids: (string | number)[]): Promise<void> {
  const current = getLocalGerais();
  const client = getSupabaseClient();
  if (client) {
    const realIds = ids.filter(id => typeof id === 'number' || !String(id).startsWith('local_'));
    if (realIds.length > 0) {
      try {
        await client.from('inventario_geral').delete().in('id', realIds);
      } catch (e) {
        console.warn("Cloud batch delete failed:", e);
      }
    }
  }

  const idSet = new Set(ids.map(String));
  const updated = current.filter(g => !idSet.has(String(g.id)));
  saveLocalGerais(updated);
}

export async function clearAllGerais(): Promise<void> {
  const current = getLocalGerais();
  const client = getSupabaseClient();
  if (client) {
    const realIds = current.filter(g => typeof g.id === 'number' || !String(g.id).startsWith('local_')).map(g => g.id);
    if (realIds.length > 0) {
      try {
        await client.from('inventario_geral').delete().in('id', realIds);
      } catch (e) {
        console.warn("Cloud clear failed:", e);
      }
    }
  }
  saveLocalGerais([]);
}

// ----------------------------------------------------
// PRODUCT CATALOG (BASE DE ITENS / PRODUTOS)
// ----------------------------------------------------

export function getLocalCatalog(): ProductCatalogItem[] {
  try {
    const raw = localStorage.getItem('metalrib_product_catalog');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Error reading local catalog:", e);
  }
  // Initialize with DEFAULT_PRODUCT_CATALOG if empty
  saveLocalCatalog(DEFAULT_PRODUCT_CATALOG);
  return DEFAULT_PRODUCT_CATALOG;
}

export function saveLocalCatalog(items: ProductCatalogItem[]) {
  localStorage.setItem('metalrib_product_catalog', JSON.stringify(items));
}

export async function fetchCatalog(): Promise<ProductCatalogItem[]> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('catalogo_produtos')
        .select('*')
        .order('codigo', { ascending: true });

      if (!error && data && data.length > 0) {
        saveLocalCatalog(data);
        return data;
      }
    } catch (e) {
      console.warn("Supabase fetch catalog exception (using local fallback):", e);
    }
  }
  return getLocalCatalog();
}

export async function saveCatalogProduct(item: Omit<ProductCatalogItem, 'id'> & { id?: string | number }): Promise<ProductCatalogItem> {
  const current = getLocalCatalog();
  const client = getSupabaseClient();

  const formattedCode = item.codigo.trim().toUpperCase();
  const existingIdx = current.findIndex(p => p.codigo.trim().toUpperCase() === formattedCode);

  let savedItem: ProductCatalogItem;

  if (item.id && existingIdx !== -1) {
    savedItem = {
      ...current[existingIdx],
      ...item,
      id: item.id,
      codigo: formattedCode
    };
    current[existingIdx] = savedItem;
  } else if (existingIdx !== -1) {
    savedItem = {
      ...current[existingIdx],
      ...item,
      codigo: formattedCode
    };
    current[existingIdx] = savedItem;
  } else {
    savedItem = {
      ...item,
      id: item.id || `local_prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      codigo: formattedCode,
      created_at: item.created_at || new Date().toISOString()
    };
    current.unshift(savedItem);
  }

  saveLocalCatalog(current);

  // Try saving to Supabase if connected
  if (client) {
    try {
      const payload = {
        codigo: savedItem.codigo,
        descricao: savedItem.descricao,
        categoria: savedItem.categoria || 'Geral',
        unidade: savedItem.unidade || 'peças',
        comprimento_padrao_mm: savedItem.comprimento_padrao_mm || null,
        largura_padrao_mm: savedItem.largura_padrao_mm || null,
        espessura_padrao_mm: savedItem.espessura_padrao_mm || null,
        medida_padrao_mm: savedItem.medida_padrao_mm || null
      };

      const { data, error } = await client
        .from('catalogo_produtos')
        .upsert(payload, { onConflict: 'codigo' })
        .select()
        .single();

      if (!error && data) {
        savedItem.id = data.id;
        const updated = getLocalCatalog().map(p => p.codigo.toUpperCase() === formattedCode ? { ...p, id: data.id } : p);
        saveLocalCatalog(updated);
      }
    } catch (e) {
      console.warn("Supabase save catalog item exception:", e);
    }
  }

  return savedItem;
}

export async function deleteCatalogProduct(id: string | number): Promise<void> {
  const current = getLocalCatalog();
  const target = current.find(p => p.id === id);

  const client = getSupabaseClient();
  if (client && target) {
    try {
      await client.from('catalogo_produtos').delete().or(`id.eq.${id},codigo.eq.${target.codigo}`);
    } catch (e) {
      console.warn("Supabase delete catalog item exception:", e);
    }
  }

  const updated = current.filter(p => p.id !== id);
  saveLocalCatalog(updated);
}

export async function resetCatalogToDefaults(): Promise<ProductCatalogItem[]> {
  saveLocalCatalog(DEFAULT_PRODUCT_CATALOG);
  return DEFAULT_PRODUCT_CATALOG;
}

export function findCatalogProductByCode(code: string): ProductCatalogItem | undefined {
  if (!code) return undefined;
  const clean = code.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const catalog = getLocalCatalog();

  // 1. Exact match
  const exact = catalog.find(p => p.codigo.trim().toLowerCase() === code.trim().toLowerCase());
  if (exact) return exact;

  // 2. Normalized match (ignoring dots, dashes, spaces)
  const normalized = catalog.find(p => {
    const pClean = p.codigo.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    return pClean === clean;
  });
  if (normalized) return normalized;

  // 3. Substring match if clean has length >= 4
  if (clean.length >= 4) {
    const partial = catalog.find(p => {
      const pClean = p.codigo.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      return pClean.includes(clean) || clean.includes(pClean);
    });
    if (partial) return partial;
  }

  return undefined;
}


