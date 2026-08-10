import * as XLSX from 'xlsx';
import { PerfilItem, BumperItem, GeralItem } from '../types';

export function exportPerfisXLSX(items: PerfilItem[]) {
  if (items.length === 0) return;

  const dataToExport = items.map((item, idx) => ({
    'Nº Item': items.length - idx,
    'ID Nomus': item.id_nomus,
    'Status': item.status || 'Com ID Nomus',
    'Código Perfil': item.codigo_perfil,
    'Descrição Perfil': item.descricao_perfil,
    'Medida (mm)': item.medida_mm,
    'Quantidade': item.quantidade,
    'Total Lineares (m)': Number(((item.medida_mm * item.quantidade) / 1000).toFixed(2)),
    'Data/Hora Cadastro': item.created_at ? new Date(item.created_at).toLocaleString('pt-BR') : '',
    'Operador': item.operador || 'Operador PCP'
  }));

  const worksheet = XLSX.utils.json_to_sheet(dataToExport);
  worksheet['!cols'] = [
    { wch: 8 },
    { wch: 18 },
    { wch: 16 },
    { wch: 18 },
    { wch: 32 },
    { wch: 14 },
    { wch: 12 },
    { wch: 18 },
    { wch: 22 },
    { wch: 16 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Retalhos de Perfis");

  XLSX.writeFile(workbook, `Metalrib_Inventario_Perfis_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportPerfisCSV(items: PerfilItem[]) {
  if (items.length === 0) return;

  let csv = "\uFEFFID Nomus;Status;Codigo Perfil;Descricao Perfil;Medida (mm);Quantidade;Metros Lineares (m);Data Cadastro;Operador\n";
  
  items.forEach(i => {
    const metros = ((i.medida_mm * i.quantidade) / 1000).toFixed(2);
    const dateStr = i.created_at ? new Date(i.created_at).toLocaleString('pt-BR') : '';
    csv += `"${i.id_nomus}";"${i.status || 'Com ID Nomus'}";"${i.codigo_perfil}";"${i.descricao_perfil}";${i.medida_mm};${i.quantidade};${metros};"${dateStr}";"${i.operador || 'Operador PCP'}"\n`;
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Metalrib_Inventario_Perfis_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportAllToXLSX(perfis: PerfilItem[], bumpers: BumperItem[], gerais: GeralItem[]) {
  if (perfis.length === 0 && bumpers.length === 0 && gerais.length === 0) return;

  const workbook = XLSX.utils.book_new();

  if (perfis.length > 0) {
    const perfisData = perfis.map((item, idx) => ({
      'Nº Item': perfis.length - idx,
      'ID Nomus': item.id_nomus,
      'Status': item.status || 'Com ID Nomus',
      'Código Perfil': item.codigo_perfil,
      'Descrição Perfil': item.descricao_perfil,
      'Medida (mm)': item.medida_mm,
      'Quantidade': item.quantidade,
      'Total Lineares (m)': Number(((item.medida_mm * item.quantidade) / 1000).toFixed(2)),
      'Data/Hora Cadastro': item.created_at ? new Date(item.created_at).toLocaleString('pt-BR') : '',
      'Operador': item.operador || 'Operador PCP'
    }));
    const wsPerfis = XLSX.utils.json_to_sheet(perfisData);
    wsPerfis['!cols'] = [
      { wch: 8 }, { wch: 18 }, { wch: 16 }, { wch: 18 }, { wch: 32 }, { wch: 14 }, { wch: 12 }, { wch: 18 }, { wch: 22 }, { wch: 16 }
    ];
    XLSX.utils.book_append_sheet(workbook, wsPerfis, "Retalhos de Perfis");
  }

  if (bumpers.length > 0) {
    const bumpersData = bumpers.map((item, idx) => ({
      'Nº Item': bumpers.length - idx,
      'Tipo': item.tipo,
      'Identificador (ID / OP)': item.codigo,
      'Medida (mm)': item.medida_mm,
      'Quantidade': item.quantidade,
      'Total Lineares (m)': Number(((item.medida_mm * item.quantidade) / 1000).toFixed(2)),
      'Data/Hora Cadastro': item.created_at ? new Date(item.created_at).toLocaleString('pt-BR') : '',
      'Operador': item.operador || 'Operador PCP'
    }));
    const wsBumpers = XLSX.utils.json_to_sheet(bumpersData);
    wsBumpers['!cols'] = [
      { wch: 8 }, { wch: 8 }, { wch: 22 }, { wch: 14 }, { wch: 12 }, { wch: 18 }, { wch: 22 }, { wch: 16 }
    ];
    XLSX.utils.book_append_sheet(workbook, wsBumpers, "Bumpers");
  }

  if (gerais.length > 0) {
    const geraisData = gerais.map((item, idx) => ({
      'Nº Item': gerais.length - idx,
      'ID Tag / Barcode': item.id_nomus,
      'Código Item': item.codigo_item,
      'Descrição': item.descricao_item,
      'Comprimento (mm)': item.comprimento_mm,
      'Largura (mm)': item.largura_mm,
      'Espessura (mm)': item.espessura_mm,
      'Quantidade': item.quantidade,
      'Unidade': item.unidade,
      'Data Cadastro': item.created_at ? new Date(item.created_at).toLocaleString('pt-BR') : '',
      'Operador': item.operador || 'Operador PCP'
    }));
    const wsGerais = XLSX.utils.json_to_sheet(geraisData);
    wsGerais['!cols'] = [
      { wch: 8 }, { wch: 18 }, { wch: 18 }, { wch: 30 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 10 }, { wch: 20 }, { wch: 16 }
    ];
    XLSX.utils.book_append_sheet(workbook, wsGerais, "Chapas e Insumos");
  }

  XLSX.writeFile(workbook, `Metalrib_Inventario_Completo_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportBumpersXLSX(items: BumperItem[]) {
  if (items.length === 0) return;

  const dataToExport = items.map((item, idx) => ({
    'Item Nº': items.length - idx,
    'Tipo': item.tipo,
    'Identificador (ID / OP)': item.codigo,
    'Medida (mm)': item.medida_mm,
    'Quantidade': item.quantidade,
    'Total Lineares (m)': Number(((item.medida_mm * item.quantidade) / 1000).toFixed(2)),
    'Data/Hora Cadastro': item.created_at ? new Date(item.created_at).toLocaleString('pt-BR') : '',
    'Operador': item.operador || 'Operador PCP'
  }));

  const worksheet = XLSX.utils.json_to_sheet(dataToExport);
  worksheet['!cols'] = [
    { wch: 8 },
    { wch: 8 },
    { wch: 22 },
    { wch: 14 },
    { wch: 12 },
    { wch: 18 },
    { wch: 22 },
    { wch: 16 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Bumpers Metalrib");

  XLSX.writeFile(workbook, `Metalrib_Cadastro_Bumpers_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportGeraisXLSX(items: GeralItem[]) {
  if (items.length === 0) return;

  const dataToExport = items.map((item, idx) => ({
    'Nº Item': items.length - idx,
    'ID Tag / Barcode': item.id_nomus,
    'Código Item': item.codigo_item,
    'Descrição': item.descricao_item,
    'Comprimento (mm)': item.comprimento_mm,
    'Largura (mm)': item.largura_mm,
    'Espessura (mm)': item.espessura_mm,
    'Quantidade': item.quantidade,
    'Unidade': item.unidade,
    'Data Cadastro': item.created_at ? new Date(item.created_at).toLocaleString('pt-BR') : '',
    'Operador': item.operador || 'Operador PCP'
  }));

  const worksheet = XLSX.utils.json_to_sheet(dataToExport);
  worksheet['!cols'] = [
    { wch: 8 },
    { wch: 18 },
    { wch: 18 },
    { wch: 30 },
    { wch: 16 },
    { wch: 14 },
    { wch: 14 },
    { wch: 12 },
    { wch: 10 },
    { wch: 20 },
    { wch: 16 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Chapas e Insumos");

  XLSX.writeFile(workbook, `Metalrib_Insumos_Chapas_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportBackupJSON(perfis: PerfilItem[], bumpers: BumperItem[], gerais: GeralItem[] = []) {
  const backupObj = {
    sistema: "Metalrib Coleta PCP",
    versao: "2.5.0",
    data_backup: new Date().toISOString(),
    empresa: "Metalrib Portas Frigoríficas",
    total_perfis: perfis.length,
    total_bumpers: bumpers.length,
    total_gerais: gerais.length,
    perfis,
    bumpers,
    gerais
  };

  const jsonString = JSON.stringify(backupObj, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Backup_PCP_Metalrib_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function parseBackupJSON(file: File): Promise<{ perfis: PerfilItem[]; bumpers: BumperItem[]; gerais: GeralItem[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        
        const perfis: PerfilItem[] = Array.isArray(data.perfis) ? data.perfis : [];
        const bumpers: BumperItem[] = Array.isArray(data.bumpers) ? data.bumpers : [];
        const gerais: GeralItem[] = Array.isArray(data.gerais) ? data.gerais : [];
        
        resolve({ perfis, bumpers, gerais });
      } catch (err) {
        reject(new Error("Arquivo JSON inválido ou corrompido."));
      }
    };
    reader.onerror = () => reject(new Error("Falha ao ler arquivo de backup."));
    reader.readAsText(file);
  });
}

