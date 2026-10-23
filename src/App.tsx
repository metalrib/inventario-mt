import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { BackupBar } from './components/BackupBar';
import { TabsNav, TabType } from './components/TabsNav';
import { PerfilForm } from './components/PerfilForm';
import { PerfilTable } from './components/PerfilTable';
import { BumperForm } from './components/BumperForm';
import { BumperTable } from './components/BumperTable';
import { GeralForm } from './components/GeralForm';
import { GeralTable } from './components/GeralTable';
import { CatalogModal } from './components/CatalogModal';
import { ProductCatalogModal } from './components/ProductCatalogModal';
import { LabelPrintModal, PrintItem } from './components/LabelPrintModal';
import { EditModal } from './components/EditModal';
import { ScannerModal } from './components/ScannerModal';
import { BluetoothCollectorModal } from './components/BluetoothCollectorModal';
import { ScanResultModal } from './components/ScanResultModal';
import { SettingsModal } from './components/SettingsModal';
import { MetricsDashboard } from './components/MetricsDashboard';
import { PerfilItem, BumperItem, GeralItem, ProfileCatalogItem, ProductCatalogItem, AppConfig, AppMode } from './types';
import {
  subscribeToPerfis,
  subscribeToBumpers,
  subscribeToGerais,
  subscribeToCatalog,
  fetchPerfis,
  fetchBumpers,
  fetchGerais,
  fetchCatalog,
  addPerfil,
  updatePerfil,
  deletePerfil,
  addBumper,
  updateBumper,
  deleteBumper,
  addGeral,
  addMultipleGerais,
  updateGeral,
  updateMultipleGerais,
  deleteGeral,
  deleteMultipleGerais,
  saveCatalogProduct,
  deleteCatalogProduct,
  getAppConfig,
  saveAppConfig,
  getLocalPerfis,
  getLocalBumpers,
  getLocalGerais,
  getLocalCatalog,
  saveLocalPerfis,
  saveLocalBumpers,
  saveLocalGerais,
  saveLocalCatalog,
  syncAllToFirebase
} from './services/firebase';
import { DEFAULT_PRODUCT_CATALOG } from './data/catalog';

export default function App() {
  const [appMode, setAppMode] = useState<AppMode>(() => {
    const saved = localStorage.getItem('metalrib_app_mode') as AppMode;
    return saved === 'pcp' ? 'pcp' : 'fabrica';
  });
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const savedMode = localStorage.getItem('metalrib_app_mode');
    return savedMode === 'pcp' ? 'bumpers' : 'gerais';
  });
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [config, setConfig] = useState<AppConfig>(getAppConfig());

  // Data states - inicializados com dados locais imediatamente para zero atraso
  const [perfis, setPerfis] = useState<PerfilItem[]>(getLocalPerfis);
  const [bumpers, setBumpers] = useState<BumperItem[]>(getLocalBumpers);
  const [gerais, setGerais] = useState<GeralItem[]>(getLocalGerais);
  const [productCatalog, setProductCatalog] = useState<ProductCatalogItem[]>(getLocalCatalog);

  // Modals state
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<ProfileCatalogItem | null>(null);

  const [isProductCatalogOpen, setIsProductCatalogOpen] = useState(false);
  const [prefilledProductItem, setPrefilledProductItem] = useState<ProductCatalogItem | null>(null);

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printItems, setPrintItems] = useState<PrintItem[]>([]);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PerfilItem | BumperItem | null>(null);
  const [editingItemType, setEditingItemType] = useState<'perfil' | 'bumper'>('perfil');

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isBluetoothCollectorOpen, setIsBluetoothCollectorOpen] = useState(false);
  const [initialCollectorScan, setInitialCollectorScan] = useState<string | null>(null);
  const [scannedCodeForModal, setScannedCodeForModal] = useState<string | null>(null);
  const [isScanResultOpen, setIsScanResultOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Global Barcode Gun Keystroke Detector (HID keyboard emulation)
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      // If user is actively typing in a standard input or textarea, let normal typing happen
      const activeEl = document.activeElement;
      const isInput = activeEl && (
        activeEl.tagName === 'INPUT' || 
        activeEl.tagName === 'TEXTAREA' || 
        (activeEl as HTMLElement).isContentEditable
      );

      // If Bluetooth collector modal is already open, it handles its own input directly
      if (isBluetoothCollectorOpen) return;

      const now = Date.now();
      const diff = now - lastKeyTime;
      lastKeyTime = now;

      // Scanners typically send keystrokes < 50ms apart followed by Enter
      if (e.key === 'Enter') {
        if (buffer.length >= 3 && (diff < 90 || !isInput)) {
          const scannedCode = buffer.trim();
          buffer = '';
          if (scannedCode) {
            e.preventDefault();
            setInitialCollectorScan(scannedCode);
            setIsBluetoothCollectorOpen(true);
          }
        } else {
          buffer = '';
        }
        return;
      }

      if (e.key.length === 1) {
        if (diff > 120 && !isInput) {
          buffer = e.key;
        } else {
          buffer += e.key;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isBluetoothCollectorOpen]);

  // REAL-TIME FIRESTORE SUBSCRIPTIONS
  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Subscribe to all 4 collections in Real-time
    const unsubPerfis = subscribeToPerfis((items) => {
      setPerfis(items);
    });

    const unsubBumpers = subscribeToBumpers((items) => {
      setBumpers(items);
    });

    const healGeraisList = (items: GeralItem[]): GeralItem[] => {
      return items.map(item => {
        if ((item.codigo_item || '').toUpperCase().startsWith('ITEM-')) {
          if (
            (item.id_nomus || '').includes('2026.08.19.1715') ||
            (Math.abs((item.comprimento_mm || 0) - 1740) < 2 && Math.abs((item.largura_mm || 0) - 850) < 2)
          ) {
            const healed: GeralItem = {
              ...item,
              codigo_item: '023.0116',
              descricao_item: 'CHAPA INOX 304 ESC - M2'
            };
            updateGeral(item.id, {
              codigo_item: '023.0116',
              descricao_item: 'CHAPA INOX 304 ESC - M2'
            }).catch(() => {});
            return healed;
          }
        }
        return item;
      });
    };

    const unsubGerais = subscribeToGerais((items) => {
      setGerais(healGeraisList(items));
    });

    const unsubCatalog = subscribeToCatalog((items) => {
      setProductCatalog(items);
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubPerfis();
      unsubBumpers();
      unsubGerais();
      unsubCatalog();
    };
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const [p, b, g, c] = await Promise.all([
        fetchPerfis(),
        fetchBumpers(),
        fetchGerais(),
        fetchCatalog()
      ]);
      setPerfis(p);
      setBumpers(b);
      setGerais(g);
      setProductCatalog(c);
      setIsOnline(true);
    } catch {
      setIsOnline(false);
    } finally {
      setIsSyncing(false);
    }
  };

  // Handlers for Perfis
  const handleSavePerfil = async (data: {
    id_nomus: string;
    codigo_perfil: string;
    descricao_perfil: string;
    medida_mm: number;
    quantidade: number;
    operador?: string;
  }) => {
    const saved = await addPerfil({
      ...data,
      status: 'Com ID Nomus',
      operador: data.operador || config.operadorPadrao || 'Operador Produção'
    });
    setPerfis(prev => [saved, ...prev.filter(p => String(p.id) !== String(saved.id))]);

    if (config.autoImprimirAoSalvar) {
      handlePrintSinglePerfil(saved);
    }
    return saved;
  };

  const handleEditPerfil = async (id: string | number, updated: Partial<PerfilItem>) => {
    setPerfis(prev => prev.map(p => String(p.id) === String(id) ? { ...p, ...updated } : p));
    await updatePerfil(id, updated);
  };

  const handleDeletePerfil = async (id: string | number) => {
    setPerfis(prev => prev.filter(p => String(p.id) !== String(id)));
    await deletePerfil(id);
  };

  const handleClearPerfis = async () => {
    const itemsToDelete = [...perfis];
    setPerfis([]);
    for (const p of itemsToDelete) {
      await deletePerfil(p.id);
    }
  };

  // Handlers for Bumpers
  const handleSaveBumper = async (data: {
    tipo: 'ID' | 'OP';
    codigo: string;
    medida_mm: number;
    quantidade: number;
    operador?: string;
    id_nomus?: string;
  }) => {
    const saved = await addBumper({
      ...data,
      operador: data.operador || config.operadorPadrao || 'Operador Produção'
    });
    setBumpers(prev => [saved, ...prev.filter(b => String(b.id) !== String(saved.id))]);

    if (config.autoImprimirAoSalvar) {
      handlePrintSingleBumper(saved);
    }
    return saved;
  };

  const handleEditBumper = async (id: string | number, updated: Partial<BumperItem>) => {
    setBumpers(prev => prev.map(b => String(b.id) === String(id) ? { ...b, ...updated } : b));
    await updateBumper(id, updated);
  };

  const handleDeleteBumper = async (id: string | number) => {
    setBumpers(prev => prev.filter(b => String(b.id) !== String(id)));
    await deleteBumper(id);
  };

  const handleClearBumpers = async () => {
    const itemsToDelete = [...bumpers];
    setBumpers([]);
    for (const b of itemsToDelete) {
      await deleteBumper(b.id);
    }
  };

  // Handlers for Chapas & Gerais
  const handleSaveGeral = async (itemData: Omit<GeralItem, 'id'>) => {
    const saved = await addGeral(itemData);
    setGerais(prev => [saved, ...prev.filter(g => String(g.id) !== String(saved.id))]);
    return saved;
  };

  const handleSaveMultipleGerais = async (itemsData: Omit<GeralItem, 'id'>[]) => {
    const saved = await addMultipleGerais(itemsData);
    const savedIds = new Set(saved.map(s => String(s.id)));
    setGerais(prev => [...saved, ...prev.filter(g => !savedIds.has(String(g.id)))]);
    return saved;
  };

  const handleEditGeral = async (id: string | number, updated: Partial<GeralItem>) => {
    setGerais(prev => prev.map(item => String(item.id) === String(id) ? { ...item, ...updated } : item));
    await updateGeral(id, updated);
  };

  const handleUpdateBatchGerais = async (updates: { id: string | number; changes: Partial<GeralItem> }[]) => {
    const updateMap = new Map(updates.map(u => [String(u.id), u.changes]));
    setGerais(prev => prev.map(item => {
      const ch = updateMap.get(String(item.id));
      return ch ? { ...item, ...ch } : item;
    }));
    await updateMultipleGerais(updates);
  };

  const handleDeleteGeral = async (id: string | number) => {
    const strId = String(id);
    setGerais(prev => prev.filter(g => String(g.id) !== strId));
    await deleteGeral(id);
  };

  const handleClearGerais = async () => {
    const allIds = gerais.map(g => g.id);
    setGerais([]);
    await deleteMultipleGerais(allIds);
  };

  const handleDeleteBatchGerais = async (ids: (string | number)[]) => {
    const idSet = new Set(ids.map(String));
    setGerais(prev => prev.filter(g => !idSet.has(String(g.id))));
    await deleteMultipleGerais(ids);
  };

  // Product Catalog Handlers
  const handleSaveCatalogProduct = async (item: Omit<ProductCatalogItem, 'id'> & { id?: string | number }) => {
    const saved = await saveCatalogProduct(item);
    setProductCatalog(prev => [saved, ...prev.filter(p => String(p.id) !== String(saved.id) && p.codigo !== saved.codigo)]);
  };

  const handleDeleteCatalogProduct = async (id: string | number) => {
    const strId = String(id);
    setProductCatalog(prev => prev.filter(p => String(p.id) !== strId));
    await deleteCatalogProduct(id);
  };

  const handleResetCatalogDefaults = async () => {
    for (const def of DEFAULT_PRODUCT_CATALOG) {
      await saveCatalogProduct(def);
    }
  };

  const handleImportCatalogProducts = async (items: ProductCatalogItem[]) => {
    for (const item of items) {
      await saveCatalogProduct(item);
    }
  };

  // Label Printing Helpers
  const handlePrintSinglePerfil = (item: PerfilItem) => {
    setPrintItems([{
      idNomus: item.id_nomus || '',
      idNomusOrCode: item.id_nomus || item.codigo_perfil,
      codigoItem: item.codigo_perfil,
      descricaoItem: item.descricao_perfil,
      medidaFormatted: item.medida_mm ? `${item.medida_mm} MM` : '',
    }]);
    setIsPrintModalOpen(true);
  };

  const handlePrintBatchPerfis = (items: PerfilItem[]) => {
    const formatted: PrintItem[] = items.map(p => ({
      idNomus: p.id_nomus || '',
      idNomusOrCode: p.id_nomus || p.codigo_perfil,
      codigoItem: p.codigo_perfil,
      descricaoItem: p.descricao_perfil,
      medidaFormatted: p.medida_mm ? `${p.medida_mm} MM` : '',
    }));
    setPrintItems(formatted);
    setIsPrintModalOpen(true);
  };

  const handlePrintSingleBumper = (item: BumperItem) => {
    setPrintItems([{
      idNomus: '',
      idNomusOrCode: item.codigo,
      codigoItem: item.codigo,
      descricaoItem: `BUMPER (${item.tipo})`,
      medidaFormatted: item.medida_mm ? `${item.medida_mm} MM` : '',
    }]);
    setIsPrintModalOpen(true);
  };

  const handlePrintBatchBumpers = (items: BumperItem[]) => {
    const formatted: PrintItem[] = items.map(b => ({
      idNomus: '',
      idNomusOrCode: b.codigo,
      codigoItem: b.codigo,
      descricaoItem: `BUMPER (${b.tipo})`,
      medidaFormatted: b.medida_mm ? `${b.medida_mm} MM` : '',
    }));
    setPrintItems(formatted);
    setIsPrintModalOpen(true);
  };

  const formatGeralDimension = (item: GeralItem) => {
    const parts = [];
    if (item.comprimento_mm) parts.push(`${item.comprimento_mm}`);
    if (item.largura_mm) parts.push(`${item.largura_mm}`);
    if (item.espessura_mm) parts.push(`${item.espessura_mm}`);
    return parts.length > 0 ? `${parts.join(' x ')} MM` : '';
  };

  const handlePrintSingleGeral = (item: GeralItem) => {
    const dim = formatGeralDimension(item);
    setPrintItems([{
      idNomus: item.id_nomus || '',
      idNomusOrCode: item.id_nomus || item.codigo_item,
      codigoItem: item.codigo_item,
      descricaoItem: item.descricao_item,
      medidaFormatted: dim,
      medidaMm: item.comprimento_mm || 0,
      comprimentoMm: item.comprimento_mm || 0,
      larguraMm: item.largura_mm || 0,
      espessuraMm: item.espessura_mm || 0,
      unidade: item.unidade || '',
      quantidade: item.quantidade || 1,
    }]);
    setIsPrintModalOpen(true);
  };

  const handlePrintBatchGerais = (items: GeralItem[]) => {
    const formatted: PrintItem[] = items.map(g => ({
      idNomus: g.id_nomus || '',
      idNomusOrCode: g.id_nomus || g.codigo_item,
      codigoItem: g.codigo_item,
      descricaoItem: g.descricao_item,
      medidaFormatted: formatGeralDimension(g),
      medidaMm: g.comprimento_mm || 0,
      comprimentoMm: g.comprimento_mm || 0,
      larguraMm: g.largura_mm || 0,
      espessuraMm: g.espessura_mm || 0,
      unidade: g.unidade || '',
      quantidade: g.quantidade || 1,
    }));
    setPrintItems(formatted);
    setIsPrintModalOpen(true);
  };

  // Restored Backup Handler
  const handleRestoredBackup = async (
    newPerfis: PerfilItem[],
    newBumpers: BumperItem[],
    newGerais: GeralItem[] = [],
    newCatalogo?: ProductCatalogItem[]
  ) => {
    setPerfis(newPerfis);
    setBumpers(newBumpers);
    setGerais(newGerais);
    saveLocalPerfis(newPerfis);
    saveLocalBumpers(newBumpers);
    saveLocalGerais(newGerais);
    if (newCatalogo && newCatalogo.length > 0) {
      setProductCatalog(newCatalogo);
      saveLocalCatalog(newCatalogo);
    }
    // Sync restored batch straight into Firestore
    await syncAllToFirebase(newPerfis, newBumpers, newGerais, newCatalogo || []);
  };

  // Full Inventory Report Print
  const handlePrintFullReport = () => {
    window.print();
  };

  const handleModeChange = (mode: AppMode) => {
    setAppMode(mode);
    localStorage.setItem('metalrib_app_mode', mode);

    if (mode === 'pcp') {
      if (activeTab === 'perfis' || activeTab === 'gerais') {
        setActiveTab('bumpers');
      }
      const savedPcpOperador = localStorage.getItem('metalrib_operador_pcp') || 'PCP';
      const updated: AppConfig = {
        ...config,
        operadorPadrao: savedPcpOperador
      };
      setConfig(updated);
      saveAppConfig(updated);
    } else {
      const savedFabricaOperador = localStorage.getItem('metalrib_operador_fabrica') || 'Operador Produção';
      const updated: AppConfig = {
        ...config,
        operadorPadrao: savedFabricaOperador
      };
      setConfig(updated);
      saveAppConfig(updated);
    }
  };

  const handleUpdateOperador = (newOperador: string) => {
    const trimmed = newOperador.trim() || (appMode === 'pcp' ? 'PCP' : 'Operador Produção');
    if (appMode === 'pcp') {
      localStorage.setItem('metalrib_operador_pcp', trimmed);
    } else {
      localStorage.setItem('metalrib_operador_fabrica', trimmed);
    }
    const updated: AppConfig = {
      ...config,
      operadorPadrao: trimmed
    };
    setConfig(updated);
    saveAppConfig(updated);
  };

  const safePerfis = perfis || [];
  const safeBumpers = bumpers || [];
  const safeGerais = gerais || [];
  const safeCatalog = productCatalog || [];

  const totalPerfisMeters = safePerfis.reduce((acc, p) => acc + ((p.medida_mm || 0) * (p.quantidade || 0)) / 1000, 0);
  const totalBumpersQty = safeBumpers.reduce((acc, b) => acc + (b.quantidade || 0), 0);
  const totalGeraisM2 = safeGerais.reduce((acc, g) => {
    if (!g) return acc;
    const isM2 = g.unidade === 'm²' || g.unidade === 'metros quadrados' || g.unidade === 'm2';
    if (g.comprimento_mm && g.largura_mm) {
      if (isM2) {
        const val = Number(g.quantidade) || 0;
        if (val >= 1 && Number.isInteger(val)) {
          return acc + ((g.comprimento_mm * g.largura_mm) / 1000000) * val;
        }
        return acc + (val > 0 ? val : ((g.comprimento_mm * g.largura_mm) / 1000000));
      }
      return acc + ((g.comprimento_mm * g.largura_mm) / 1000000) * (Number(g.quantidade) || 1);
    }
    if (isM2) {
      return acc + (Number(g.quantidade) || 0);
    }
    return acc;
  }, 0);

  const allExistingNomusIds = [
    ...safePerfis.map(p => p?.id_nomus || ''),
    ...safeGerais.map(g => g?.id_nomus || ''),
    ...safeBumpers.map(b => b?.id_nomus || (b?.tipo === 'ID' ? b?.codigo : ''))
  ].map(id => (id || '').trim()).filter(Boolean);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 p-2 sm:p-3 md:p-5 lg:p-6 max-w-[1850px] mx-auto font-sans w-full box-border">
      {/* App Header */}
      <Header
        isOnline={isOnline}
        isSyncing={isSyncing}
        onSyncNow={handleManualSync}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenScanner={() => setIsScannerOpen(true)}
        onOpenBluetoothCollector={() => setIsBluetoothCollectorOpen(true)}
        onOpenCatalog={() => setIsProductCatalogOpen(true)}
        catalogCount={safeCatalog.length}
        totalPerfisMeters={totalPerfisMeters}
        totalBumpersQty={totalBumpersQty}
        totalGeraisM2={totalGeraisM2}
        operador={config.operadorPadrao}
        onChangeOperador={handleUpdateOperador}
        appMode={appMode}
        onChangeMode={handleModeChange}
      />

      {/* Backup & History Bar */}
      <BackupBar
        perfis={safePerfis}
        bumpers={safeBumpers}
        gerais={safeGerais}
        productCatalog={safeCatalog}
        onRestoredBackup={handleRestoredBackup}
        onPrintFullReport={handlePrintFullReport}
      />

      {/* Navigation Tabs */}
      <TabsNav
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        perfisCount={safePerfis.length}
        bumpersCount={safeBumpers.length}
        geraisCount={safeGerais.length}
        appMode={appMode}
        onChangeMode={handleModeChange}
      />

      {/* Main Tab Views */}
      <main className="w-full">
        {activeTab === 'perfis' && (
          <div className="w-full space-y-5">
            {/* Form Section - Top */}
            <div className="w-full">
              <PerfilForm
                onSavePerfil={handleSavePerfil}
                onOpenCatalog={() => setIsCatalogOpen(true)}
                selectedCatalogItem={selectedCatalogItem}
                manterMedidaPerfis={config.manterMedidaPerfis}
                onToggleManterMedida={val => {
                  const newCfg = { ...config, manterMedidaPerfis: val };
                  setConfig(newCfg);
                  saveAppConfig(newCfg);
                }}
                existingNomusIds={allExistingNomusIds}
                operadorPadrao={config.operadorPadrao}
              />
            </div>

            {/* Table Section - Bottom */}
            <div className="w-full">
              <PerfilTable
                perfis={perfis}
                onEditPerfil={(item) => {
                  setEditingItem(item);
                  setEditingItemType('perfil');
                  setIsEditModalOpen(true);
                }}
                onDeletePerfil={handleDeletePerfil}
                onDeleteItem={handleDeletePerfil}
                onClearPerfis={handleClearPerfis}
                onClearAll={handleClearPerfis}
                onPrintSingle={handlePrintSinglePerfil}
                onPrintBatch={handlePrintBatchPerfis}
              />
            </div>
          </div>
        )}

        {activeTab === 'bumpers' && (
          <div className="w-full space-y-5">
            {/* Form Section - Top */}
            <div className="w-full">
              <BumperForm
                onSaveBumper={handleSaveBumper}
                manterMedidaBumpers={config.manterMedidaBumpers}
                onToggleManterMedida={val => {
                  const newCfg = { ...config, manterMedidaBumpers: val };
                  setConfig(newCfg);
                  saveAppConfig(newCfg);
                }}
                existingNomusIds={allExistingNomusIds}
                operadorPadrao={config.operadorPadrao}
              />
            </div>

            {/* Table Section - Bottom */}
            <div className="w-full">
              <BumperTable
                bumpers={bumpers}
                onEditBumper={(item) => {
                  setEditingItem(item);
                  setEditingItemType('bumper');
                  setIsEditModalOpen(true);
                }}
                onDeleteBumper={handleDeleteBumper}
                onDeleteItem={handleDeleteBumper}
                onClearBumpers={handleClearBumpers}
                onClearAll={handleClearBumpers}
                onPrintSingle={handlePrintSingleBumper}
                onPrintBatch={handlePrintBatchBumpers}
              />
            </div>
          </div>
        )}

        {activeTab === 'gerais' && (
          <div className="w-full space-y-5">
            {/* Form Section - Top */}
            <div className="w-full">
              <GeralForm
                onSaveGeral={handleSaveGeral}
                onSaveMultipleGerais={handleSaveMultipleGerais}
                productCatalog={productCatalog}
                prefilledProductItem={prefilledProductItem}
                onClearPrefilledProduct={() => setPrefilledProductItem(null)}
                existingNomusIds={allExistingNomusIds}
                onOpenCatalogModal={() => setIsProductCatalogOpen(true)}
                operadorPadrao={config.operadorPadrao}
                onPrintGeralItem={handlePrintSingleGeral}
                gerais={gerais}
              />
            </div>

            {/* Table Section - Bottom */}
            <div className="w-full">
              <GeralTable
                gerais={gerais}
                productCatalog={safeCatalog}
                onEditGeral={handleEditGeral}
                onDeleteGeral={handleDeleteGeral}
                onDeleteItem={handleDeleteGeral}
                onClearGerais={handleClearGerais}
                onClearAll={handleClearGerais}
                onPrintSingle={handlePrintSingleGeral}
                onPrintBatch={handlePrintBatchGerais}
                onDeleteBatch={handleDeleteBatchGerais}
                onUpdateBatchGerais={handleUpdateBatchGerais}
              />
            </div>
          </div>
        )}

        {activeTab === 'metrics' && (
          <MetricsDashboard
            perfis={perfis}
            bumpers={bumpers}
            gerais={gerais}
          />
        )}
      </main>

      {/* Catalog Modals */}
      <CatalogModal
        isOpen={isCatalogOpen}
        onClose={() => setIsCatalogOpen(false)}
        onSelectPerfil={(item) => {
          setSelectedCatalogItem(item);
          setIsCatalogOpen(false);
        }}
      />

      <ProductCatalogModal
        isOpen={isProductCatalogOpen}
        onClose={() => setIsProductCatalogOpen(false)}
        catalog={productCatalog}
        onSaveItem={handleSaveCatalogProduct}
        onDeleteItem={handleDeleteCatalogProduct}
        onResetDefaults={handleResetCatalogDefaults}
        onImportItems={handleImportCatalogProducts}
        onSelectForUse={(item) => {
          setPrefilledProductItem(item);
          setIsProductCatalogOpen(false);
          setActiveTab('gerais');
        }}
      />

      {/* Printing Modal */}
      <LabelPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        items={printItems}
      />

      {/* Edit Item Modal */}
      <EditModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingItem(null);
        }}
        item={editingItem}
        itemType={editingItemType}
        onSavePerfil={handleEditPerfil}
        onSaveBumper={handleEditBumper}
      />

      {/* Barcode / QR Scanner Modal */}
      <ScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanResult={(code) => {
          setScannedCodeForModal(code);
          setIsScanResultOpen(true);
        }}
        onScan={(code) => {
          setScannedCodeForModal(code);
          setIsScanResultOpen(true);
        }}
        onOpenBluetoothCollector={() => {
          setIsScannerOpen(false);
          setIsBluetoothCollectorOpen(true);
        }}
      />

      {/* High-Speed Bluetooth Barcode Gun / Continuous Collector Modal */}
      <BluetoothCollectorModal
        isOpen={isBluetoothCollectorOpen}
        onClose={() => {
          setIsBluetoothCollectorOpen(false);
          setInitialCollectorScan(null);
        }}
        initialCode={initialCollectorScan}
        perfis={safePerfis}
        bumpers={safeBumpers}
        gerais={safeGerais}
        productCatalog={safeCatalog}
        appMode={appMode}
        operadorPadrao={config.operadorPadrao || 'Operador Produção'}
        onAddPerfil={handleSavePerfil}
        onAddBumper={async (b) => {
          await handleSaveBumper({
            tipo: b.tipo,
            codigo: b.codigo,
            medida_mm: b.medida_mm,
            quantidade: b.quantidade,
            operador: b.operador,
            id_nomus: b.id_nomus
          });
        }}
        onAddGeral={handleSaveGeral}
        onUpdatePerfil={handleEditPerfil}
        onUpdateBumper={handleEditBumper}
        onUpdateGeral={handleEditGeral}
        onOpenManualModal={(code) => {
          setScannedCodeForModal(code);
          setIsScanResultOpen(true);
        }}
        onOpenCameraScanner={() => {
          setIsBluetoothCollectorOpen(false);
          setIsScannerOpen(true);
        }}
      />

      {/* Scan Result Modal */}
      <ScanResultModal
        isOpen={isScanResultOpen}
        onClose={() => {
          setIsScanResultOpen(false);
          setScannedCodeForModal(null);
        }}
        onScanNext={() => {
          setIsScanResultOpen(false);
          setScannedCodeForModal(null);
          setIsScannerOpen(true);
        }}
        scannedCode={scannedCodeForModal}
        perfis={safePerfis}
        bumpers={safeBumpers}
        gerais={safeGerais}
        productCatalog={safeCatalog}
        appMode={appMode}
        onAddPerfil={async (item) => {
          await handleSavePerfil(item);
        }}
        onAddBumper={async (item) => {
          await handleSaveBumper({
            tipo: item.tipo || (item.codigo.toUpperCase().startsWith('OP') ? 'OP' : 'ID'),
            codigo: item.codigo,
            medida_mm: item.medida_mm,
            quantidade: item.quantidade,
            operador: item.operador || config.operadorPadrao,
            id_nomus: item.id_nomus
          });
        }}
        onAddGeral={async (item) => {
          await handleSaveGeral(item);
        }}
        onAddMultipleGerais={async (items) => {
          await handleSaveMultipleGerais(items);
        }}
        onUpdatePerfil={async (id, data) => {
          await handleEditPerfil(id, data);
        }}
        onUpdateBumper={async (id, data) => {
          await handleEditBumper(id, data);
        }}
        onUpdateGeral={async (id, data) => {
          await handleEditGeral(id, data);
        }}
        onIncrementPerfil={async (id, qty) => {
          await updatePerfil(id, { quantidade: qty });
        }}
        onIncrementBumper={async (id, qty) => {
          await updateBumper(id, { quantidade: qty });
        }}
        onIncrementGeral={async (id, qty) => {
          await updateGeral(id, { quantidade: qty });
        }}
        onNavigateToTab={(tab) => {
          setActiveTab(tab);
        }}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        onSaveConfig={(newConfig) => {
          setConfig(newConfig);
          saveAppConfig(newConfig);
        }}
      />
    </div>
  );
}
