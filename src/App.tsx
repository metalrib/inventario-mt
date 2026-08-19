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
import { ScanResultModal } from './components/ScanResultModal';
import { SettingsModal } from './components/SettingsModal';
import { MetricsDashboard } from './components/MetricsDashboard';
import { PerfilItem, BumperItem, GeralItem, ProfileCatalogItem, ProductCatalogItem, AppConfig } from './types';
import {
  fetchPerfis,
  fetchBumpers,
  fetchGerais,
  fetchCatalog,
  saveCatalogProduct,
  deleteCatalogProduct,
  resetCatalogToDefaults,
  insertPerfil,
  insertBumper,
  insertGeral,
  updatePerfil,
  updateBumper,
  updateGeral,
  deletePerfil,
  deleteBumper,
  deleteGeral,
  deleteGeraisBatch,
  clearAllPerfis,
  clearAllBumpers,
  clearAllGerais,
  getAppConfig,
  saveAppConfig,
  saveLocalPerfis,
  saveLocalBumpers,
  saveLocalGerais
} from './services/supabase';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('perfis');
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [config, setConfig] = useState<AppConfig>(getAppConfig());

  // Data states
  const [perfis, setPerfis] = useState<PerfilItem[]>([]);
  const [bumpers, setBumpers] = useState<BumperItem[]>([]);
  const [gerais, setGerais] = useState<GeralItem[]>([]);
  const [productCatalog, setProductCatalog] = useState<ProductCatalogItem[]>([]);

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
  const [scannedCodeForModal, setScannedCodeForModal] = useState<string | null>(null);
  const [isScanResultOpen, setIsScanResultOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load data on mount and interval
  const loadData = async (showLoadingState = false) => {
    if (showLoadingState) setIsSyncing(true);
    try {
      const resPerfis = await fetchPerfis();
      const resBumpers = await fetchBumpers();
      const resGerais = await fetchGerais();
      const catalogData = await fetchCatalog();

      setPerfis(resPerfis.data);
      setBumpers(resBumpers.data);
      setGerais(resGerais.data);
      setProductCatalog(catalogData);
      setIsOnline(resPerfis.isOnline || resBumpers.isOnline || resGerais.isOnline);
    } finally {
      if (showLoadingState) setIsSyncing(false);
    }
  };

  const handleManualSync = () => {
    loadData(true);
  };

  useEffect(() => {
    loadData();

    // Fast polling every 5 seconds for live multi-device sync
    const interval = setInterval(() => {
      loadData();
    }, 5000);

    // Sync immediately when mobile screen unlocks or browser tab comes back to focus
    const handleFocusOrVisible = () => {
      if (document.visibilityState === 'visible') {
        loadData();
      }
    };

    window.addEventListener('focus', handleFocusOrVisible);
    document.addEventListener('visibilitychange', handleFocusOrVisible);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocusOrVisible);
      document.removeEventListener('visibilitychange', handleFocusOrVisible);
    };
  }, []);

  // Handlers for Perfis
  const handleSavePerfil = async (data: {
    id_nomus: string;
    codigo_perfil: string;
    descricao_perfil: string;
    medida_mm: number;
    quantidade: number;
  }) => {
    const saved = await insertPerfil({
      ...data,
      status: 'Com ID Nomus',
      operador: config.operadorPadrao
    });
    setPerfis(prev => [saved, ...prev]);

    if (config.autoImprimirAoSalvar) {
      handlePrintSinglePerfil(saved);
    }
  };

  const handleEditPerfil = async (id: string | number, updated: Partial<PerfilItem>) => {
    await updatePerfil(id, updated);
    setPerfis(prev => prev.map(p => p.id === id ? { ...p, ...updated } : p));
  };

  const handleDeletePerfil = async (id: string | number) => {
    await deletePerfil(id);
    setPerfis(prev => prev.filter(p => p.id !== id));
  };

  const handleClearPerfis = async () => {
    await clearAllPerfis();
    setPerfis([]);
  };

  // Handlers for Bumpers
  const handleSaveBumper = async (data: {
    tipo: 'ID' | 'OP';
    codigo: string;
    medida_mm: number;
    quantidade: number;
  }) => {
    const saved = await insertBumper({
      ...data,
      operador: config.operadorPadrao
    });
    setBumpers(prev => [saved, ...prev]);

    if (config.autoImprimirAoSalvar) {
      handlePrintSingleBumper(saved);
    }
  };

  const handleEditBumper = async (id: string | number, updated: Partial<BumperItem>) => {
    await updateBumper(id, updated);
    setBumpers(prev => prev.map(b => b.id === id ? { ...b, ...updated } : b));
  };

  const handleDeleteBumper = async (id: string | number) => {
    await deleteBumper(id);
    setBumpers(prev => prev.filter(b => b.id !== id));
  };

  const handleClearBumpers = async () => {
    await clearAllBumpers();
    setBumpers([]);
  };

  // Handlers for Chapas & Gerais
  const handleSaveGeral = async (itemData: Omit<GeralItem, 'id'>) => {
    const saved = await insertGeral(itemData);
    setGerais(prev => [saved, ...prev]);
    return saved;
  };

  const handleEditGeral = async (id: string | number, updated: Partial<GeralItem>) => {
    await updateGeral(id, updated);
    setGerais(prev => prev.map(g => g.id === id ? { ...g, ...updated } : g));
  };

  const handleDeleteGeral = async (id: string | number) => {
    await deleteGeral(id);
    setGerais(prev => prev.filter(g => g.id !== id));
  };

  const handleClearGerais = async () => {
    await clearAllGerais();
    setGerais([]);
  };

  const handleDeleteBatchGerais = async (ids: (string | number)[]) => {
    await deleteGeraisBatch(ids);
    setGerais(prev => prev.filter(g => !ids.includes(g.id)));
  };

  // Product Catalog Handlers
  const handleSaveCatalogProduct = async (item: Omit<ProductCatalogItem, 'id'> & { id?: string | number }) => {
    const saved = await saveCatalogProduct(item);
    setProductCatalog(prev => {
      const idx = prev.findIndex(p => p.codigo.toUpperCase() === saved.codigo.toUpperCase());
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });
  };

  const handleDeleteCatalogProduct = async (id: string | number) => {
    await deleteCatalogProduct(id);
    setProductCatalog(prev => prev.filter(p => p.id !== id));
  };

  const handleResetCatalogDefaults = async () => {
    const defaults = await resetCatalogToDefaults();
    setProductCatalog(defaults);
  };

  const handleImportCatalogProducts = async (items: ProductCatalogItem[]) => {
    for (const item of items) {
      await saveCatalogProduct(item);
    }
    const updated = await fetchCatalog();
    setProductCatalog(updated);
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
    if (parts.length === 0) return '';
    
    let baseDim = `${parts.join(' x ')} MM`;
    if (item.comprimento_mm && item.largura_mm) {
      const m2 = ((item.comprimento_mm * item.largura_mm) / 1000000).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
      baseDim += ` (${m2} m²)`;
    }
    return baseDim;
  };

  const handlePrintSingleGeral = (item: GeralItem) => {
    const dim = formatGeralDimension(item);
    setPrintItems([{
      idNomus: item.id_nomus || '',
      idNomusOrCode: item.id_nomus || item.codigo_item,
      codigoItem: item.codigo_item,
      descricaoItem: item.descricao_item,
      medidaFormatted: dim,
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
    }));
    setPrintItems(formatted);
    setIsPrintModalOpen(true);
  };

  // Restored Backup Handler
  const handleRestoredBackup = (newPerfis: PerfilItem[], newBumpers: BumperItem[], newGerais: GeralItem[] = []) => {
    setPerfis(newPerfis);
    setBumpers(newBumpers);
    setGerais(newGerais);
    saveLocalPerfis(newPerfis);
    saveLocalBumpers(newBumpers);
    saveLocalGerais(newGerais);
  };

  // Full Inventory Report Print
  const handlePrintFullReport = () => {
    window.print();
  };

  const totalPerfisMeters = perfis.reduce((acc, p) => acc + (p.medida_mm * p.quantidade) / 1000, 0);
  const totalBumpersQty = bumpers.reduce((acc, b) => acc + b.quantidade, 0);
  const totalGeraisM2 = gerais.reduce((acc, g) => {
    if (g.comprimento_mm && g.largura_mm) {
      return acc + ((g.comprimento_mm * g.largura_mm) / 1000000) * (g.quantidade || 1);
    }
    return acc;
  }, 0);

  const allExistingNomusIds = [
    ...perfis.map(p => p.id_nomus || ''),
    ...gerais.map(g => g.id_nomus || ''),
    ...bumpers.map(b => b.id_nomus || (b.tipo === 'ID' ? b.codigo : ''))
  ].map(id => id.trim()).filter(Boolean);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 p-2 sm:p-4 max-w-7xl mx-auto font-sans">
      {/* App Header */}
      <Header
        isOnline={isOnline}
        isSyncing={isSyncing}
        onSyncNow={handleManualSync}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenScanner={() => setIsScannerOpen(true)}
        onOpenCatalog={() => setIsProductCatalogOpen(true)}
        catalogCount={productCatalog.length}
        totalPerfisMeters={totalPerfisMeters}
        totalBumpersQty={totalBumpersQty}
        totalGeraisM2={totalGeraisM2}
      />

      {/* Backup & History Bar */}
      <BackupBar
        perfis={perfis}
        bumpers={bumpers}
        gerais={gerais}
        onRestoredBackup={handleRestoredBackup}
        onPrintFullReport={handlePrintFullReport}
      />

      {/* Navigation Tabs */}
      <TabsNav
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        perfisCount={perfis.length}
        bumpersCount={bumpers.length}
        geraisCount={gerais.length}
      />

      {/* Main Tab Views */}
      <main>
        {activeTab === 'perfis' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-5 xl:col-span-4">
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
              />
            </div>

            <div className="lg:col-span-7 xl:col-span-8">
              <PerfilTable
                perfis={perfis}
                onRefresh={loadData}
                onPrintLabel={handlePrintSinglePerfil}
                onPrintBatchLabels={handlePrintBatchPerfis}
                onEditItem={item => {
                  setEditingItem(item);
                  setEditingItemType('perfil');
                  setIsEditModalOpen(true);
                }}
                onDeleteItem={handleDeletePerfil}
                onClearAll={handleClearPerfis}
              />
            </div>
          </div>
        )}

        {activeTab === 'bumpers' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-5 xl:col-span-4">
              <BumperForm
                onSaveBumper={handleSaveBumper}
                manterMedidaBumpers={config.manterMedidaBumpers}
                onToggleManterMedida={val => {
                  const newCfg = { ...config, manterMedidaBumpers: val };
                  setConfig(newCfg);
                  saveAppConfig(newCfg);
                }}
                existingNomusIds={allExistingNomusIds}
              />
            </div>

            <div className="lg:col-span-7 xl:col-span-8">
              <BumperTable
                bumpers={bumpers}
                onRefresh={loadData}
                onPrintLabel={handlePrintSingleBumper}
                onPrintBatchLabels={handlePrintBatchBumpers}
                onEditItem={item => {
                  setEditingItem(item);
                  setEditingItemType('bumper');
                  setIsEditModalOpen(true);
                }}
                onDeleteItem={handleDeleteBumper}
                onClearAll={handleClearBumpers}
              />
            </div>
          </div>
        )}

        {activeTab === 'gerais' && (
          <div className="space-y-4">
            <GeralForm
              onAddItem={handleSaveGeral}
              operadorPadrao={config.operadorPadrao}
              autoImprimirAoSalvar={config.autoImprimirAoSalvar}
              onOpenPrintModal={handlePrintSingleGeral}
              catalog={productCatalog}
              onOpenCatalog={() => setIsProductCatalogOpen(true)}
              onSaveToCatalog={handleSaveCatalogProduct}
              prefilledItem={prefilledProductItem}
              existingNomusIds={allExistingNomusIds}
            />

            <GeralTable
              items={gerais}
              onRefresh={loadData}
              onDeleteItem={handleDeleteGeral}
              onDeleteBatch={handleDeleteBatchGerais}
              onClearAll={handleClearGerais}
              onUpdateItem={handleEditGeral}
              onOpenBatchPrint={handlePrintBatchGerais}
              onOpenSinglePrint={handlePrintSingleGeral}
            />
          </div>
        )}

        {activeTab === 'metrics' && (
          <MetricsDashboard perfis={perfis} bumpers={bumpers} gerais={gerais} />
        )}
      </main>

      {/* Modals */}
      <CatalogModal
        isOpen={isCatalogOpen}
        onClose={() => setIsCatalogOpen(false)}
        onSelectProfile={item => setSelectedCatalogItem(item)}
      />

      <ProductCatalogModal
        isOpen={isProductCatalogOpen}
        onClose={() => setIsProductCatalogOpen(false)}
        catalog={productCatalog}
        onSaveItem={handleSaveCatalogProduct}
        onDeleteItem={handleDeleteCatalogProduct}
        onResetDefaults={handleResetCatalogDefaults}
        onImportItems={handleImportCatalogProducts}
        onSelectForUse={item => {
          setPrefilledProductItem(item);
          setActiveTab('gerais');
        }}
      />

      <LabelPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        itemsToPrint={printItems}
      />

      <EditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        item={editingItem}
        itemType={editingItemType}
        onSavePerfil={handleEditPerfil}
        onSaveBumper={handleEditBumper}
      />

      <ScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanResult={scanned => {
          setIsScannerOpen(false);
          setScannedCodeForModal(scanned);
          setIsScanResultOpen(true);
        }}
      />

      <ScanResultModal
        isOpen={isScanResultOpen}
        onClose={() => {
          setIsScanResultOpen(false);
          setScannedCodeForModal(null);
        }}
        scannedCode={scannedCodeForModal}
        perfis={perfis}
        bumpers={bumpers}
        gerais={gerais}
        onAddPerfil={async p => {
          const saved = await insertPerfil({ ...p, operador: config.operadorPadrao });
          setPerfis(prev => [saved, ...prev.filter(i => String(i.id) !== String(saved.id))]);
          setActiveTab('perfis');
        }}
        onAddBumper={async b => {
          const saved = await insertBumper({ ...b, operador: config.operadorPadrao });
          setBumpers(prev => [saved, ...prev.filter(i => String(i.id) !== String(saved.id))]);
          setActiveTab('bumpers');
        }}
        onAddGeral={async g => {
          const saved = await insertGeral({ ...g, operador: config.operadorPadrao });
          setGerais(prev => [saved, ...prev.filter(i => String(i.id) !== String(saved.id))]);
          setActiveTab('gerais');
        }}
        onIncrementPerfil={async (id, newQty) => {
          await handleEditPerfil(id, { quantidade: newQty });
        }}
        onIncrementBumper={async (id, newQty) => {
          await handleEditBumper(id, { quantidade: newQty });
        }}
        onIncrementGeral={async (id, newQty) => {
          await handleEditGeral(id, { quantidade: newQty });
        }}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        onSaveConfig={newCfg => {
          setConfig(newCfg);
          saveAppConfig(newCfg);
          loadData();
        }}
      />
    </div>
  );
}

