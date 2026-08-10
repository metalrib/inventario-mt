import { ProfileCatalogItem } from '../types';

export const CATALOGO_PERFIS: ProfileCatalogItem[] = [
  {
    code: "022.0017",
    desc: "VAI E VEM",
    categoria: "Especiais",
    svg: `<path d="M 10,20 L 10,80 L 90,80 L 90,20 M 20,20 L 20,60 L 80,60 L 80,20" fill="none" stroke="#1b367c" stroke-width="6"/>`,
    medidasPadrao: [1200, 2100, 2400, 3000]
  },
  {
    code: "022.0011",
    desc: "TUBO RETANGULAR (50,80 X 38,10 X 1,58)",
    categoria: "Tubos",
    svg: `<rect x="20" y="10" width="60" height="80" fill="none" stroke="#1b367c" stroke-width="6"/><line x1="20" y1="35" x2="35" y2="35" stroke="#1b367c" stroke-width="6"/><line x1="80" y1="35" x2="65" y2="35" stroke="#1b367c" stroke-width="6"/>`,
    medidasPadrao: [1000, 1500, 2000, 3000, 6000]
  },
  {
    code: "022.0002",
    desc: "EXTERNO (LGT)",
    categoria: "Externos",
    svg: `<path d="M 70,20 L 30,20 L 30,80 L 70,80 M 70,35 L 70,20 M 70,65 L 70,80" fill="none" stroke="#1b367c" stroke-width="6"/>`,
    medidasPadrao: [2000, 2200, 2500]
  },
  {
    code: "022.0004",
    desc: "EXTERNO (HD)",
    categoria: "Externos",
    svg: `<path d="M 70,20 L 30,20 L 30,80 L 70,80 M 70,30 L 70,20 M 70,70 L 70,80" fill="none" stroke="#1b367c" stroke-width="8"/>`,
    medidasPadrao: [2000, 2200, 2500]
  },
  {
    code: "022.0016",
    desc: "PERFIL U (37,30 X 15,00 X 1,58)",
    categoria: "Perfis U",
    svg: `<path d="M 15,30 L 15,75 L 85,75 L 85,30" fill="none" stroke="#1b367c" stroke-width="6"/>`,
    medidasPadrao: [1200, 1800, 2400, 3000]
  },
  {
    code: "022.0015",
    desc: "PERFIL U (25,40 X 25,40 X 3,17)",
    categoria: "Perfis U",
    svg: `<path d="M 20,20 L 20,80 L 80,80 L 80,20" fill="none" stroke="#1b367c" stroke-width="8"/>`,
    medidasPadrao: [1000, 1500, 2000, 3000]
  },
  {
    code: "022.0014",
    desc: "PERFIL L (38,10 X 3,17)",
    categoria: "Cantoneiras L",
    svg: `<path d="M 20,15 L 20,80 L 85,80" fill="none" stroke="#1b367c" stroke-width="8"/>`,
    medidasPadrao: [1000, 1500, 2000, 3000]
  },
  {
    code: "022.0013",
    desc: "PERFIL L (25,40 X 1,58)",
    categoria: "Cantoneiras L",
    svg: `<path d="M 20,20 L 20,80 L 80,80" fill="none" stroke="#1b367c" stroke-width="5"/>`,
    medidasPadrao: [1000, 1500, 2000, 3000]
  },
  {
    code: "022.0012",
    desc: "PERFIL L (19,05 X 1,58)",
    categoria: "Cantoneiras L",
    svg: `<path d="M 25,25 L 25,75 L 75,75" fill="none" stroke="#1b367c" stroke-width="5"/>`,
    medidasPadrao: [1000, 1500, 2000]
  },
  {
    code: "022.0001",
    desc: "OFFICE DOOR DE CORRER (48 X 48)",
    categoria: "Especiais",
    svg: `<rect x="20" y="20" width="60" height="60" fill="none" stroke="#1b367c" stroke-width="6"/><circle cx="35" cy="70" r="6" fill="#1b367c"/><circle cx="65" cy="70" r="6" fill="#1b367c"/>`,
    medidasPadrao: [2000, 2500, 3000]
  },
  {
    code: "022.0003",
    desc: "INTERNO (LGT)",
    categoria: "Internos",
    svg: `<path d="M 10,75 L 35,75 L 35,45 Q 50,20 65,45 L 65,75 L 90,75" fill="none" stroke="#1b367c" stroke-width="6"/>`,
    medidasPadrao: [2000, 2200, 2500]
  },
  {
    code: "022.0005",
    desc: "INTERNO (HD)",
    categoria: "Internos",
    svg: `<path d="M 10,75 L 30,75 L 50,25 L 70,75 L 90,75" fill="none" stroke="#1b367c" stroke-width="7"/>`,
    medidasPadrao: [2000, 2200, 2500]
  },
  {
    code: "022.0006",
    desc: "GUIA INFERIOR",
    categoria: "Guias",
    svg: `<path d="M 15,80 L 85,80 M 35,80 L 50,25 L 70,25 M 70,80 L 70,60 L 35,60" fill="none" stroke="#1b367c" stroke-width="5"/>`,
    medidasPadrao: [1500, 2000, 2500, 3000]
  },
  {
    code: "022.0129",
    desc: "BASE GAXETA U",
    categoria: "Gaxetas",
    svg: `<path d="M 15,70 L 85,70 L 85,50 M 15,50 L 15,70 M 35,70 L 35,55 L 25,55 M 65,70 L 65,55 L 75,55" fill="none" stroke="#1b367c" stroke-width="5"/>`,
    medidasPadrao: [1000, 1500, 2100, 2400]
  },
  {
    code: "022.0129-C",
    desc: "CHATO 12,07 X 3,17 (1/2 X 1/8)",
    categoria: "Barras Chatas",
    svg: `<rect x="15" y="45" width="70" height="10" fill="#1b367c"/>`,
    medidasPadrao: [1000, 2000, 3000, 6000]
  }
];
