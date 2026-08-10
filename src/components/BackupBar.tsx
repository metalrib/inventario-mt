import React, { useRef } from 'react';
import { Download, Upload, Database, Printer, FileSpreadsheet } from 'lucide-react';
import { PerfilItem, BumperItem, GeralItem } from '../types';
import { exportBackupJSON, parseBackupJSON, exportAllToXLSX } from '../services/exporter';

interface BackupBarProps {
  perfis: PerfilItem[];
  bumpers: BumperItem[];
  gerais?: GeralItem[];
  onRestoredBackup: (perfis: PerfilItem[], bumpers: BumperItem[], gerais: GeralItem[]) => void;
  onPrintFullReport: () => void;
}

export const BackupBar: React.FC<BackupBarProps> = ({
  perfis,
  bumpers,
  gerais = [],
  onRestoredBackup,
  onPrintFullReport
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportJSON = () => {
    if (perfis.length === 0 && bumpers.length === 0 && gerais.length === 0) {
      alert("Não há registros cadastrados para gerar backup.");
      return;
    }
    exportBackupJSON(perfis, bumpers, gerais);
  };

  const handleExportExcelAll = () => {
    if (perfis.length === 0 && bumpers.length === 0 && gerais.length === 0) {
      alert("Não há registros cadastrados para exportar para Excel.");
      return;
    }
    exportAllToXLSX(perfis, bumpers, gerais);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const restored = await parseBackupJSON(file);
      const msg = `Deseja carregar este backup contendo ${restored.perfis.length} perfis, ${restored.bumpers.length} bumpers e ${restored.gerais.length} insumos?`;
      if (confirm(msg)) {
        onRestoredBackup(restored.perfis, restored.bumpers, restored.gerais);
        alert("Backup restaurado com sucesso no sistema!");
      }
    } catch (err: any) {
      alert(err.message || "Erro ao ler o arquivo de backup.");
    } finally {
      if (e.target) e.target.value = "";
    }
  };


  return (
    <div className="bg-white border border-slate-300 rounded-xl p-3 mb-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-xs font-black uppercase text-[#1b367c] tracking-wide">
        <Database size={16} className="text-[#1b367c]" />
        <span>Backup & Histórico do Inventário</span>
      </div>

      <div className="flex items-center flex-wrap justify-end gap-2 w-full sm:w-auto">
        <button
          type="button"
          onClick={handleExportExcelAll}
          className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg border border-emerald-700 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
          title="Exportar todas as abas do inventário para planilha Excel (.xlsx)"
        >
          <FileSpreadsheet size={14} />
          <span>Exportar Tudo (.XLSX)</span>
        </button>

        <button
          type="button"
          onClick={handleExportJSON}
          className="flex-1 sm:flex-initial bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-300 transition-colors flex items-center justify-center gap-1.5"
        >
          <Download size={14} className="text-[#1b367c]" />
          <span>Salvar Backup (.JSON)</span>
        </button>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 sm:flex-initial bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-300 transition-colors flex items-center justify-center gap-1.5"
        >
          <Upload size={14} className="text-[#1b367c]" />
          <span>Carregar Backup</span>
        </button>

        <button
          type="button"
          onClick={onPrintFullReport}
          className="flex-1 sm:flex-initial bg-blue-50 hover:bg-blue-100 text-[#1b367c] text-xs font-bold px-3 py-1.5 rounded-lg border border-blue-200 transition-colors flex items-center justify-center gap-1.5"
          title="Imprimir relatório completo de contagem"
        >
          <Printer size={14} />
          <span>Relatório Geral</span>
        </button>

        <input
          type="file"
          ref={fileInputRef}
          accept=".json"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    </div>
  );
};
