export type BumperType = 'ID' | 'OP';

export interface PerfilItem {
  id: string | number;
  id_nomus: string;
  codigo_perfil: string;
  descricao_perfil: string;
  medida_mm: number;
  quantidade: number;
  status: string;
  created_at?: string;
  operador?: string;
}

export interface BumperItem {
  id: string | number;
  id_nomus?: string;
  tipo: BumperType;
  codigo: string;
  medida_mm: number;
  quantidade: number;
  created_at?: string;
  operador?: string;
}

export interface GeralItem {
  id: string | number;
  id_nomus: string;
  codigo_item: string;
  descricao_item: string;
  comprimento_mm: number;
  largura_mm: number;
  espessura_mm: number;
  quantidade: number;
  unidade: string;
  created_at?: string;
  operador?: string;
}

export interface ProfileCatalogItem {
  code: string;
  desc: string;
  categoria: string;
  svg: string;
  medidasPadrao?: number[];
}

export interface ProductCatalogItem {
  id: string | number;
  codigo: string;
  descricao: string;
  categoria?: string;
  unidade?: string;
  comprimento_padrao_mm?: number;
  largura_padrao_mm?: number;
  espessura_padrao_mm?: number;
  medida_padrao_mm?: number;
  created_at?: string;
}

export interface AppConfig {
  supabaseUrl: string;
  supabaseKey: string;
  operadorPadrao: string;
  autoImprimirAoSalvar: boolean;
  manterMedidaBumpers: boolean;
  manterMedidaPerfis: boolean;
}

export interface FilterState {
  search: string;
  minMedida: string;
  maxMedida: string;
  sortBy: 'created_at' | 'medida_mm' | 'quantidade' | 'id_nomus' | 'codigo' | 'codigo_item';
  sortOrder: 'asc' | 'desc';
}

