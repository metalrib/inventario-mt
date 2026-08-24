import * as XLSX from 'xlsx';
import { PerfilItem, BumperItem, GeralItem, ProductCatalogItem } from '../types';

/**
 * Cria a aba de instruções e painel de controle do PCP
 */
function createPcpGuideSheet(
  totalPerfis: number,
  perfisMeters: number,
  totalBumpers: number,
  totalGerais: number,
  geraisM2: number
) {
  const guideData = [
    { 'INSTRUÇÃO OPERACIONAL': 'PAINEL E GUIA DE ENTRADA DO INVENTÁRIO - PCP METALRIB', 'DETALHE / PROCEDIMENTO': '' },
    { 'INSTRUÇÃO OPERACIONAL': '1. Objetivo da Planilha', 'DETALHE / PROCEDIMENTO': 'Conferência e lançamento linha a linha dos retalhos e insumos coletados no chão de fábrica no sistema Nomus ERP.' },
    { 'INSTRUÇÃO OPERACIONAL': '2. Como usar o Checklist', 'DETALHE / PROCEDIMENTO': 'Na coluna "STATUS LANÇAMENTO PCP", utilize os status: ⏳ PENDENTE, ✅ LANÇADO NO NOMUS ou ⚠️ DIVERGÊNCIA.' },
    { 'INSTRUÇÃO OPERACIONAL': '3. Registro de Documento', 'DETALHE / PROCEDIMENTO': 'Anote na coluna "Nº DOC / LOTE NOMUS" o número da movimentação ou lote gerado no ERP para rastreabilidade.' },
    { 'INSTRUÇÃO OPERACIONAL': '4. Lançamento por Saldo Acumulado', 'DETALHE / PROCEDIMENTO': 'Consulte as abas de "Resumo Consolidado" caso deseje lançar o saldo total somado por código de produto.' },
    { 'INSTRUÇÃO OPERACIONAL': '', 'DETALHE / PROCEDIMENTO': '' },
    { 'INSTRUÇÃO OPERACIONAL': '--- RESUMO DO LOTE DE INVENTÁRIO COLETADO ---', 'DETALHE / PROCEDIMENTO': '' },
    { 'INSTRUÇÃO OPERACIONAL': 'Data da Geração da Planilha', 'DETALHE / PROCEDIMENTO': new Date().toLocaleString('pt-BR') },
    { 'INSTRUÇÃO OPERACIONAL': 'Total de Retalhos de Perfis', 'DETALHE / PROCEDIMENTO': `${totalPerfis} peças (${perfisMeters.toFixed(2)} metros lineares)` },
    { 'INSTRUÇÃO OPERACIONAL': 'Total de Chapas e Insumos', 'DETALHE / PROCEDIMENTO': `${totalGerais} peças/itens (${geraisM2.toFixed(3)} m² de chapas)` },
    { 'INSTRUÇÃO OPERACIONAL': 'Total de Bumpers (Calços)', 'DETALHE / PROCEDIMENTO': `${totalBumpers} unidades registradas` },
    { 'INSTRUÇÃO OPERACIONAL': 'Status Geral Inicial', 'DETALHE / PROCEDIMENTO': 'AGUARDANDO CONFERÊNCIA E ENTRADA PCP' }
  ];

  const ws = XLSX.utils.json_to_sheet(guideData);
  ws['!cols'] = [{ wch: 42 }, { wch: 78 }];
  return ws;
}

export function exportPerfisXLSX(items: PerfilItem[]) {
  if (items.length === 0) return;

  const totalPerfisMeters = items.reduce((acc, p) => acc + ((p.medida_mm || 0) * (p.quantidade || 0)) / 1000, 0);

  // 1. Dados detalhados com colunas de Checklist PCP
  const dataToExport = items.map((item, idx) => ({
    'STATUS LANÇAMENTO PCP': '⏳ PENDENTE',
    'Nº DOC / LOTE NOMUS': '',
    'RESPONSÁVEL PCP': '',
    'DATA ENTRADA PCP': '',
    'OBSERVAÇÕES PCP': '',
    'Nº Item': items.length - idx,
    'ID Nomus / Etiqueta': item.id_nomus,
    'Status Etiqueta': item.status || 'Com ID Nomus',
    'Código Perfil': item.codigo_perfil,
    'Descrição Perfil': item.descricao_perfil,
    'Medida (mm)': item.medida_mm,
    'Quantidade (un)': item.quantidade,
    'Metros Lineares (m)': Number(((item.medida_mm * item.quantidade) / 1000).toFixed(2)),
    'Data/Hora Coleta': item.created_at ? new Date(item.created_at).toLocaleString('pt-BR') : '',
    'Operador Coleta': item.operador || 'Operador PCP'
  }));

  const worksheet = XLSX.utils.json_to_sheet(dataToExport);
  worksheet['!cols'] = [
    { wch: 22 }, // Status PCP
    { wch: 20 }, // Doc Nomus
    { wch: 18 }, // Resp PCP
    { wch: 18 }, // Data PCP
    { wch: 25 }, // Obs PCP
    { wch: 8 },  // Nº Item
    { wch: 20 }, // ID Nomus
    { wch: 16 }, // Status Etiqueta
    { wch: 18 }, // Código Perfil
    { wch: 35 }, // Descrição Perfil
    { wch: 14 }, // Medida (mm)
    { wch: 14 }, // Quantidade
    { wch: 18 }, // Metros Lineares
    { wch: 20 }, // Data Coleta
    { wch: 18 }  // Operador
  ];

  // 2. Resumo consolidado agrupado por código para lançamento fácil no ERP
  const profileMap: Record<string, { desc: string; totalPecas: number; totalMetros: number; totalLotes: number }> = {};
  items.forEach(p => {
    const code = (p.codigo_perfil || 'SEM_CODIGO').toUpperCase();
    if (!profileMap[code]) {
      profileMap[code] = {
        desc: p.descricao_perfil || '',
        totalPecas: 0,
        totalMetros: 0,
        totalLotes: 0
      };
    }
    const qty = p.quantidade || 0;
    const meters = ((p.medida_mm || 0) * qty) / 1000;
    profileMap[code].totalPecas += qty;
    profileMap[code].totalMetros += meters;
    profileMap[code].totalLotes += 1;
  });

  const summaryData = Object.entries(profileMap)
    .sort((a, b) => b[1].totalMetros - a[1].totalMetros)
    .map(([codigo, data], idx) => ({
      'STATUS PCP': '⏳ PENDENTE',
      'Nº': idx + 1,
      'Código do Perfil': codigo,
      'Descrição do Perfil': data.desc,
      'Total Peças / Barras': data.totalPecas,
      'Metros Lineares Totais (m)': Number(data.totalMetros.toFixed(2)),
      'Qtd de Retalhos / Lotes': data.totalLotes,
      'Conferência / Lote ERP': ''
    }));

  const wsSummary = XLSX.utils.json_to_sheet(summaryData);
  wsSummary['!cols'] = [
    { wch: 18 },
    { wch: 6 },
    { wch: 20 },
    { wch: 35 },
    { wch: 20 },
    { wch: 24 },
    { wch: 22 },
    { wch: 25 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "1. Checklist Retalhos PCP");
  XLSX.utils.book_append_sheet(workbook, wsSummary, "2. Resumo por Código");

  XLSX.writeFile(workbook, `Metalrib_PCP_Inventario_Perfis_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportPerfisCSV(items: PerfilItem[]) {
  if (items.length === 0) return;

  let csv = "\uFEFFStatus PCP;Doc ERP;Resp PCP;ID Nomus;Status Etiqueta;Codigo Perfil;Descricao Perfil;Medida (mm);Quantidade;Metros Lineares (m);Data Coleta;Operador\n";
  
  items.forEach(i => {
    const metros = ((i.medida_mm * i.quantidade) / 1000).toFixed(2);
    const dateStr = i.created_at ? new Date(i.created_at).toLocaleString('pt-BR') : '';
    csv += `"PENDENTE";"";"";"${i.id_nomus}";"${i.status || 'Com ID Nomus'}";"${i.codigo_perfil}";"${i.descricao_perfil}";${i.medida_mm};${i.quantidade};${metros};"${dateStr}";"${i.operador || 'Operador PCP'}"\n`;
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Metalrib_PCP_Inventario_Perfis_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportAllToXLSX(perfis: PerfilItem[], bumpers: BumperItem[], gerais: GeralItem[]) {
  if (perfis.length === 0 && bumpers.length === 0 && gerais.length === 0) return;

  const totalPerfisMeters = perfis.reduce((acc, p) => acc + ((p.medida_mm || 0) * (p.quantidade || 0)) / 1000, 0);
  const totalPerfisQty = perfis.reduce((acc, p) => acc + (p.quantidade || 0), 0);
  const totalBumpersQty = bumpers.reduce((acc, b) => acc + (b.quantidade || 0), 0);
  const totalGeraisQty = gerais.reduce((acc, g) => acc + (g.quantidade || 0), 0);
  const totalGeraisM2 = gerais.reduce((acc, item) => {
    const c = item.comprimento_mm || 0;
    const l = item.largura_mm || 0;
    const q = item.quantidade || 1;
    return (c > 0 && l > 0) ? acc + ((c * l) / 1000000) * q : acc;
  }, 0);

  const workbook = XLSX.utils.book_new();

  // Aba 1: Guia e Instruções PCP
  const wsGuide = createPcpGuideSheet(totalPerfisQty, totalPerfisMeters, totalBumpersQty, totalGeraisQty, totalGeraisM2);
  XLSX.utils.book_append_sheet(workbook, wsGuide, "📊 PAINEL E GUIA PCP");

  // Aba 2: Perfis Detalhado com Checklist
  if (perfis.length > 0) {
    const perfisData = perfis.map((item, idx) => ({
      'STATUS LANÇAMENTO PCP': '⏳ PENDENTE',
      'Nº DOC / LOTE NOMUS': '',
      'RESPONSÁVEL PCP': '',
      'DATA ENTRADA PCP': '',
      'OBSERVAÇÕES PCP': '',
      'Nº Item': perfis.length - idx,
      'ID Nomus / Etiqueta': item.id_nomus,
      'Status Etiqueta': item.status || 'Com ID Nomus',
      'Código Perfil': item.codigo_perfil,
      'Descrição Perfil': item.descricao_perfil,
      'Medida (mm)': item.medida_mm,
      'Quantidade (un)': item.quantidade,
      'Total Lineares (m)': Number(((item.medida_mm * item.quantidade) / 1000).toFixed(2)),
      'Data/Hora Coleta': item.created_at ? new Date(item.created_at).toLocaleString('pt-BR') : '',
      'Operador Coleta': item.operador || 'Operador PCP'
    }));
    const wsPerfis = XLSX.utils.json_to_sheet(perfisData);
    wsPerfis['!cols'] = [
      { wch: 22 }, { wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 25 },
      { wch: 8 }, { wch: 20 }, { wch: 16 }, { wch: 18 }, { wch: 35 },
      { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 20 }, { wch: 18 }
    ];
    XLSX.utils.book_append_sheet(workbook, wsPerfis, "Retalhos de Perfis");

    // Resumo de Perfis por Código
    const profileMap: Record<string, { desc: string; totalPecas: number; totalMetros: number; totalLotes: number }> = {};
    perfis.forEach(p => {
      const code = (p.codigo_perfil || 'SEM_CODIGO').toUpperCase();
      if (!profileMap[code]) {
        profileMap[code] = { desc: p.descricao_perfil || '', totalPecas: 0, totalMetros: 0, totalLotes: 0 };
      }
      const qty = p.quantidade || 0;
      profileMap[code].totalPecas += qty;
      profileMap[code].totalMetros += ((p.medida_mm || 0) * qty) / 1000;
      profileMap[code].totalLotes += 1;
    });

    const summaryPerfis = Object.entries(profileMap)
      .sort((a, b) => b[1].totalMetros - a[1].totalMetros)
      .map(([codigo, data], idx) => ({
        'STATUS PCP': '⏳ PENDENTE',
        'Nº': idx + 1,
        'Código do Perfil': codigo,
        'Descrição': data.desc,
        'Total Peças / Barras': data.totalPecas,
        'Metros Lineares Totais (m)': Number(data.totalMetros.toFixed(2)),
        'Qtd de Retalhos / Lotes': data.totalLotes,
        'Conferência ERP': ''
      }));

    const wsSummaryPerfis = XLSX.utils.json_to_sheet(summaryPerfis);
    wsSummaryPerfis['!cols'] = [
      { wch: 18 }, { wch: 6 }, { wch: 20 }, { wch: 35 }, { wch: 20 }, { wch: 24 }, { wch: 22 }, { wch: 25 }
    ];
    XLSX.utils.book_append_sheet(workbook, wsSummaryPerfis, "Resumo Perfis por Código");
  }

  // Aba 3: Chapas e Insumos com Checklist
  if (gerais.length > 0) {
    const geraisData = gerais.map((item, idx) => {
      const areaUnit = (item.comprimento_mm && item.largura_mm)
        ? Number(((item.comprimento_mm * item.largura_mm) / 1000000).toFixed(4))
        : null;
      let areaTotal: number | null = null;
      if (areaUnit !== null) {
        if (item.unidade === 'm²') {
          const val = Number(item.quantidade) || 0;
          if (val >= 1 && Number.isInteger(val)) {
            areaTotal = Number((areaUnit * val).toFixed(4));
          } else {
            areaTotal = val > 0 ? val : areaUnit;
          }
        } else {
          areaTotal = Number((areaUnit * (item.quantidade || 1)).toFixed(4));
        }
      }

      return {
        'STATUS LANÇAMENTO PCP': '⏳ PENDENTE',
        'Nº DOC / LOTE NOMUS': '',
        'RESPONSÁVEL PCP': '',
        'DATA ENTRADA PCP': '',
        'OBSERVAÇÕES PCP': '',
        'Nº Item': gerais.length - idx,
        'ID Tag / Barcode': item.id_nomus,
        'Código Item': item.codigo_item,
        'Descrição': item.descricao_item,
        'Comprimento (mm)': item.comprimento_mm || '-',
        'Largura (mm)': item.largura_mm || '-',
        'Espessura (mm)': item.espessura_mm || '-',
        'Área Unitária (m²)': areaUnit !== null ? areaUnit : '-',
        'Área Total (m²)': areaTotal !== null ? areaTotal : '-',
        'Quantidade': item.quantidade,
        'Unidade': item.unidade,
        'Data Cadastro': item.created_at ? new Date(item.created_at).toLocaleString('pt-BR') : '',
        'Operador Coleta': item.operador || 'Operador PCP'
      };
    });
    const wsGerais = XLSX.utils.json_to_sheet(geraisData);
    wsGerais['!cols'] = [
      { wch: 22 }, { wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 25 },
      { wch: 8 }, { wch: 18 }, { wch: 18 }, { wch: 32 }, { wch: 16 },
      { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 12 },
      { wch: 10 }, { wch: 20 }, { wch: 18 }
    ];
    XLSX.utils.book_append_sheet(workbook, wsGerais, "Chapas e Insumos");

    // Resumo de Chapas por Código
    const geraisMap: Record<string, { desc: string; totalQty: number; totalM2: number; totalLotes: number; unid: string }> = {};
    gerais.forEach(g => {
      const code = (g.codigo_item || 'OUTROS').toUpperCase();
      if (!geraisMap[code]) {
        geraisMap[code] = { desc: g.descricao_item || '', totalQty: 0, totalM2: 0, totalLotes: 0, unid: g.unidade || 'UN' };
      }
      const c = g.comprimento_mm || 0;
      const l = g.largura_mm || 0;
      const q = g.quantidade || 1;
      const area = (c > 0 && l > 0) ? ((c * l) / 1000000) * q : 0;
      geraisMap[code].totalQty += q;
      geraisMap[code].totalM2 += area;
      geraisMap[code].totalLotes += 1;
    });

    const summaryGerais = Object.entries(geraisMap)
      .sort((a, b) => b[1].totalM2 - a[1].totalM2)
      .map(([codigo, data], idx) => ({
        'STATUS PCP': '⏳ PENDENTE',
        'Nº': idx + 1,
        'Código Item': codigo,
        'Descrição': data.desc,
        'Total Peças / Itens': data.totalQty,
        'Área Total (m²)': Number(data.totalM2.toFixed(3)),
        'Unidade Padrão': data.unid,
        'Qtd de Lotes': data.totalLotes,
        'Conferência ERP': ''
      }));

    const wsSummaryGerais = XLSX.utils.json_to_sheet(summaryGerais);
    wsSummaryGerais['!cols'] = [
      { wch: 18 }, { wch: 6 }, { wch: 20 }, { wch: 35 }, { wch: 18 }, { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 25 }
    ];
    XLSX.utils.book_append_sheet(workbook, wsSummaryGerais, "Resumo Chapas por Código");
  }

  // Aba 4: Bumpers
  if (bumpers.length > 0) {
    const bumpersData = bumpers.map((item, idx) => ({
      'STATUS LANÇAMENTO PCP': '⏳ PENDENTE',
      'Nº DOC / LOTE NOMUS': '',
      'RESPONSÁVEL PCP': '',
      'DATA ENTRADA PCP': '',
      'OBSERVAÇÕES PCP': '',
      'Nº Item': bumpers.length - idx,
      'Tipo': item.tipo,
      'Identificador (ID / OP)': item.codigo,
      'Medida (mm)': item.medida_mm,
      'Quantidade (un)': item.quantidade,
      'Total Lineares (m)': Number(((item.medida_mm * item.quantidade) / 1000).toFixed(2)),
      'Data/Hora Cadastro': item.created_at ? new Date(item.created_at).toLocaleString('pt-BR') : '',
      'Operador Coleta': item.operador || 'Operador PCP'
    }));
    const wsBumpers = XLSX.utils.json_to_sheet(bumpersData);
    wsBumpers['!cols'] = [
      { wch: 22 }, { wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 25 },
      { wch: 8 }, { wch: 8 }, { wch: 22 }, { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 22 }, { wch: 18 }
    ];
    XLSX.utils.book_append_sheet(workbook, wsBumpers, "Bumpers");
  }

  XLSX.writeFile(workbook, `Metalrib_PCP_Inventario_Completo_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportBumpersXLSX(items: BumperItem[]) {
  if (items.length === 0) return;

  const dataToExport = items.map((item, idx) => ({
    'STATUS LANÇAMENTO PCP': '⏳ PENDENTE',
    'Nº DOC / LOTE NOMUS': '',
    'RESPONSÁVEL PCP': '',
    'DATA ENTRADA PCP': '',
    'OBSERVAÇÕES PCP': '',
    'Item Nº': items.length - idx,
    'Tipo': item.tipo,
    'Identificador (ID / OP)': item.codigo,
    'Medida (mm)': item.medida_mm,
    'Quantidade (un)': item.quantidade,
    'Total Lineares (m)': Number(((item.medida_mm * item.quantidade) / 1000).toFixed(2)),
    'Data/Hora Cadastro': item.created_at ? new Date(item.created_at).toLocaleString('pt-BR') : '',
    'Operador Coleta': item.operador || 'Operador PCP'
  }));

  const worksheet = XLSX.utils.json_to_sheet(dataToExport);
  worksheet['!cols'] = [
    { wch: 22 }, { wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 25 },
    { wch: 8 }, { wch: 8 }, { wch: 22 }, { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 22 }, { wch: 18 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Bumpers Checklist PCP");

  XLSX.writeFile(workbook, `Metalrib_PCP_Cadastro_Bumpers_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportGeraisXLSX(items: GeralItem[]) {
  if (items.length === 0) return;

  const dataToExport = items.map((item, idx) => {
    const areaUnit = (item.comprimento_mm && item.largura_mm)
      ? Number(((item.comprimento_mm * item.largura_mm) / 1000000).toFixed(4))
      : null;
    let areaTotal: number | null = null;
    if (areaUnit !== null) {
      if (item.unidade === 'm²') {
        const val = Number(item.quantidade) || 0;
        if (val >= 1 && Number.isInteger(val)) {
          areaTotal = Number((areaUnit * val).toFixed(4));
        } else {
          areaTotal = val > 0 ? val : areaUnit;
        }
      } else {
        areaTotal = Number((areaUnit * (item.quantidade || 1)).toFixed(4));
      }
    }

    return {
      'STATUS LANÇAMENTO PCP': '⏳ PENDENTE',
      'Nº DOC / LOTE NOMUS': '',
      'RESPONSÁVEL PCP': '',
      'DATA ENTRADA PCP': '',
      'OBSERVAÇÕES PCP': '',
      'Nº Item': items.length - idx,
      'ID Tag / Barcode': item.id_nomus,
      'Código Item': item.codigo_item,
      'Descrição': item.descricao_item,
      'Comprimento (mm)': item.comprimento_mm || '-',
      'Largura (mm)': item.largura_mm || '-',
      'Espessura (mm)': item.espessura_mm || '-',
      'Área Unitária (m²)': areaUnit !== null ? areaUnit : '-',
      'Área Total (m²)': areaTotal !== null ? areaTotal : '-',
      'Quantidade': item.quantidade,
      'Unidade': item.unidade,
      'Data Cadastro': item.created_at ? new Date(item.created_at).toLocaleString('pt-BR') : '',
      'Operador Coleta': item.operador || 'Operador PCP'
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(dataToExport);
  worksheet['!cols'] = [
    { wch: 22 }, { wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 25 },
    { wch: 8 }, { wch: 18 }, { wch: 18 }, { wch: 32 }, { wch: 16 },
    { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 12 },
    { wch: 10 }, { wch: 20 }, { wch: 18 }
  ];

  // Resumo por código
  const geraisMap: Record<string, { desc: string; totalQty: number; totalM2: number; totalLotes: number; unid: string }> = {};
  items.forEach(g => {
    const code = (g.codigo_item || 'OUTROS').toUpperCase();
    if (!geraisMap[code]) {
      geraisMap[code] = { desc: g.descricao_item || '', totalQty: 0, totalM2: 0, totalLotes: 0, unid: g.unidade || 'UN' };
    }
    const c = g.comprimento_mm || 0;
    const l = g.largura_mm || 0;
    const q = g.quantidade || 1;
    const area = (c > 0 && l > 0) ? ((c * l) / 1000000) * q : 0;
    geraisMap[code].totalQty += q;
    geraisMap[code].totalM2 += area;
    geraisMap[code].totalLotes += 1;
  });

  const summaryGerais = Object.entries(geraisMap)
    .sort((a, b) => b[1].totalM2 - a[1].totalM2)
    .map(([codigo, data], idx) => ({
      'STATUS PCP': '⏳ PENDENTE',
      'Nº': idx + 1,
      'Código Item': codigo,
      'Descrição': data.desc,
      'Total Peças / Itens': data.totalQty,
      'Área Total (m²)': Number(data.totalM2.toFixed(3)),
      'Unidade Padrão': data.unid,
      'Qtd de Lotes': data.totalLotes,
      'Conferência ERP': ''
    }));

  const wsSummaryGerais = XLSX.utils.json_to_sheet(summaryGerais);
  wsSummaryGerais['!cols'] = [
    { wch: 18 }, { wch: 6 }, { wch: 20 }, { wch: 35 }, { wch: 18 }, { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 25 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "1. Checklist Chapas PCP");
  XLSX.utils.book_append_sheet(workbook, wsSummaryGerais, "2. Resumo por Código");

  XLSX.writeFile(workbook, `Metalrib_PCP_Insumos_Chapas_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportBackupJSON(
  perfis: PerfilItem[],
  bumpers: BumperItem[],
  gerais: GeralItem[] = [],
  catalogo: ProductCatalogItem[] = []
) {
  const backupObj = {
    sistema: "Metalrib Coleta PCP",
    versao: "2.7.0",
    data_backup: new Date().toISOString(),
    empresa: "Metalrib Portas Frigoríficas",
    total_perfis: perfis.length,
    total_bumpers: bumpers.length,
    total_gerais: gerais.length,
    total_catalogo: catalogo.length,
    perfis,
    bumpers,
    gerais,
    catalogo
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

export function parseBackupJSON(file: File): Promise<{
  perfis: PerfilItem[];
  bumpers: BumperItem[];
  gerais: GeralItem[];
  catalogo: ProductCatalogItem[];
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        
        const perfis: PerfilItem[] = Array.isArray(data.perfis) ? data.perfis : [];
        const bumpers: BumperItem[] = Array.isArray(data.bumpers) ? data.bumpers : [];
        const gerais: GeralItem[] = Array.isArray(data.gerais) ? data.gerais : [];
        const catalogo: ProductCatalogItem[] = Array.isArray(data.catalogo) ? data.catalogo : [];
        
        resolve({ perfis, bumpers, gerais, catalogo });
      } catch {
        reject(new Error("Arquivo JSON inválido ou corrompido."));
      }
    };
    reader.onerror = () => reject(new Error("Falha ao ler arquivo de backup."));
    reader.readAsText(file);
  });
}

export function exportCatalogXLSX(items: ProductCatalogItem[]) {
  if (items.length === 0) return;

  const dataToExport = items.map(item => ({
    'Código': item.codigo,
    'Descrição Detalhada': item.descricao,
    'Categoria': item.categoria || 'Geral',
    'Unidade Padrão': item.unidade || 'peças',
    'Comprimento Padrão (mm)': item.comprimento_padrao_mm || '',
    'Largura Padrão (mm)': item.largura_padrao_mm || '',
    'Espessura Padrão (mm)': item.espessura_padrao_mm || '',
    'Medida Linear Padrão (mm)': item.medida_padrao_mm || ''
  }));

  const worksheet = XLSX.utils.json_to_sheet(dataToExport);
  worksheet['!cols'] = [
    { wch: 18 },
    { wch: 45 },
    { wch: 16 },
    { wch: 15 },
    { wch: 22 },
    { wch: 20 },
    { wch: 20 },
    { wch: 24 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Catálogo de Produtos");
  XLSX.writeFile(workbook, `Metalrib_Catalogo_Produtos_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function parseCatalogExcel(file: File): Promise<ProductCatalogItem[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (rows.length < 2) {
          throw new Error("A planilha está vazia ou sem linhas de dados.");
        }

        // Find header index
        const headerRow: string[] = (rows[0] || []).map((h: any) => String(h || '').toLowerCase().trim());
        const colCodigo = headerRow.findIndex(h => h.includes('código') || h.includes('codigo') || h.includes('cod'));
        const colDesc = headerRow.findIndex(h => h.includes('descri') || h.includes('nome') || h.includes('item'));
        const colCat = headerRow.findIndex(h => h.includes('categoria') || h.includes('tipo') || h.includes('grupo'));
        const colUnid = headerRow.findIndex(h => h.includes('unidade') || h.includes('unid') || h.includes('un'));
        const colComp = headerRow.findIndex(h => h.includes('comprimento') || h.includes('comp'));
        const colLarg = headerRow.findIndex(h => h.includes('largura') || h.includes('larg'));
        const colEsp = headerRow.findIndex(h => h.includes('espessura') || h.includes('esp'));
        const colMedida = headerRow.findIndex(h => h.includes('medida') || h.includes('linear'));

        if (colCodigo === -1) {
          throw new Error("Não foi possível encontrar a coluna 'Código' na planilha.");
        }

        const items: ProductCatalogItem[] = [];

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;

          const rawCodigo = String(row[colCodigo] || '').trim();
          if (!rawCodigo) continue;

          const rawDesc = colDesc !== -1 && row[colDesc] ? String(row[colDesc]).trim() : rawCodigo;
          const rawCat = colCat !== -1 && row[colCat] ? String(row[colCat]).trim() : 'Geral';
          const rawUnid = colUnid !== -1 && row[colUnid] ? String(row[colUnid]).trim() : 'peças';
          const comp = colComp !== -1 && row[colComp] ? Number(row[colComp]) || undefined : undefined;
          const larg = colLarg !== -1 && row[colLarg] ? Number(row[colLarg]) || undefined : undefined;
          const esp = colEsp !== -1 && row[colEsp] ? Number(row[colEsp]) || undefined : undefined;
          const med = colMedida !== -1 && row[colMedida] ? Number(row[colMedida]) || undefined : undefined;

          items.push({
            id: `imported_${Date.now()}_${i}`,
            codigo: rawCodigo.toUpperCase(),
            descricao: rawDesc,
            categoria: rawCat,
            unidade: rawUnid,
            comprimento_padrao_mm: comp,
            largura_padrao_mm: larg,
            espessura_padrao_mm: esp,
            medida_padrao_mm: med,
            created_at: new Date().toISOString()
          });
        }

        resolve(items);
      } catch (err: any) {
        reject(new Error(err?.message || "Erro ao processar planilha Excel."));
      }
    };
    reader.onerror = () => reject(new Error("Falha ao ler arquivo."));
    reader.readAsArrayBuffer(file);
  });
}
