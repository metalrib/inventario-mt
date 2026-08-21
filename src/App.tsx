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
  updateGeral,
  deleteGeral,
  saveCatalogProduct,
  deleteCatalogProduct,
  getAppConfig,
  saveAppConfig,
  saveLocalPerfis,
  saveLocalBumpers,
  saveLocalGerais,
  saveLocalCatalog,
  syncAllToFirebase
} from './services/firebase';
import { DEFAULT_PRODUCT_CATALOG } from './data/catalog';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('gerais');
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

    const unsubGerais = subscribeToGerais((items) => {
      setGerais(items);
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

    if (config.autoImprimirAoSalvar) {
      handlePrintSinglePerfil(saved);
    }
  };

  const handleEditPerfil = async (id: string | number, updated: Partial<PerfilItem>) => {
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
  }) => {
    const saved = await addBumper({
      ...data,
      operador: data.operador || config.operadorPadrao || 'Operador Produção'
    });

    if (config.autoImprimirAoSalvar) {
      handlePrintSingleBumper(saved);
    }
  };

  const handleEditBumper = async (id: string | number, updated: Partial<BumperItem>) => {
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
    return saved;
  };

  const handleEditGeral = async (id: string | number, updated: Partial<GeralItem>) => {
    await updateGeral(id, updated);
  };

  const handleDeleteGeral = async (id: string | number) => {
    setGerais(prev => prev.filter(g => String(g.id) !== String(id)));
    await deleteGeral(id);
  };

  const handleClearGerais = async () => {
    const itemsToDelete = [...gerais];
    setGerais([]);
    for (const g of itemsToDelete) {
      await deleteGeral(g.id);
    }
  };

  const handleDeleteBatchGerais = async (ids: (string | number)[]) => {
    const stringIds = ids.map(String);
    setGerais(prev => prev.filter(g => !stringIds.includes(String(g.id))));
    for (const id of ids) {
      await deleteGeral(id);
    }
  };

  // Product Catalog Handlers
  const handleSaveCatalogProduct = async (item: Omit<ProductCatalogItem, 'id'> & { id?: string | number }) => {
    await saveCatalogProduct(item);
  };

  const handleDeleteCatalogProduct = async (id: string | number) => {
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

  const handleUpdateOperador = (newOperador: string) => {
    const updated: AppConfig = {
      ...config,
      operadorPadrao: newOperador.trim() || 'Operador Produção'
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
        onOpenCatalog={() => setIsProductCatalogOpen(true)}
        catalogCount={safeCatalog.length}
        totalPerfisMeters={totalPerfisMeters}
        totalBumpersQty={totalBumpersQty}
        totalGeraisM2={totalGeraisM2}
        operador={config.operadorPadrao}
        onChangeOperador={handleUpdateOperador}
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
      />

      {/* Main Tab Views */}
      <main className="w-full">
        {activeTab === 'perfis' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 xl:gap-6 w-full items-start">
            <div className="lg:col-span-5 2xl:col-span-4 lg:sticky lg:top-4 lg:self-start">
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
            <div className="lg:col-span-7 2xl:col-span-8 min-w-0">
              <PerfilTable
                perfis={perfis}
                onEditPerfil={(item) => {
                  setEditingItem(item);
                  setEditingItemType('perfil');
                  setIsEditModalOpen(true);
                }}
                onDeletePerfil={handleDeletePerfil}
                onClearPerfis={handleClearPerfis}
                onPrintSingle={handlePrintSinglePerfil}
                onPrintBatch={handlePrintBatchPerfis}
              />
            </div>
          </div>
        )}

        {activeTab === 'bumpers' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 xl:gap-6 w-full items-start">
            <div className="lg:col-span-5 2xl:col-span-4 lg:sticky lg:top-4 lg:self-start">
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
            <div className="lg:col-span-7 2xl:col-span-8 min-w-0">
              <BumperTable
                bumpers={bumpers}
                onEditBumper={(item) => {
                  setEditingItem(item);
                  setEditingItemType('bumper');
                  setIsEditModalOpen(true);
                }}
                onDeleteBumper={handleDeleteBumper}
                onClearBumpers={handleClearBumpers}
                onPrintSingle={handlePrintSingleBumper}
                onPrintBatch={handlePrintBatchBumpers}
              />
            </div>
          </div>
        )}

        {activeTab === 'gerais' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 xl:gap-6 w-full items-start">
            <div className="lg:col-span-5 2xl:col-span-4 lg:sticky lg:top-4 lg:self-start">
              <GeralForm
                onSaveGeral={handleSaveGeral}
                productCatalog={productCatalog}
                prefilledProductItem={prefilledProductItem}
                onClearPrefilledProduct={() => setPrefilledProductItem(null)}
                existingNomusIds={allExistingNomusIds}
                onOpenCatalogModal={() => setIsProductCatalogOpen(true)}
                operadorPadrao={config.operadorPadrao}
                onPrintGeralItem={handlePrintSingleGeral}
              />
            </div>
            <div className="lg:col-span-7 2xl:col-span-8 min-w-0">
              <GeralTable
                gerais={gerais}
                onEditGeral={handleEditGeral}
                onDeleteGeral={handleDeleteGeral}
                onClearGerais={handleClearGerais}
                onPrintSingle={handlePrintSingleGeral}
                onPrintBatch={handlePrintBatchGerais}
                onDeleteBatch={handleDeleteBatchGerais}
              />
            </div>
          </div>
        )}

        {activeTab === 'metricas' && (
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
        onScan={(code) => {
          setScannedCodeForModal(code);
          setIsScanResultOpen(true);
        }}
      />

      {/* Scan Result Modal */}
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
