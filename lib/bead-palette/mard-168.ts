export interface BeadColor {
  id: string;
  code: string;
  name: string;
  hex: string;
  rgb: [number, number, number];
  lab: [number, number, number];
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToXyz(r: number, g: number, b: number): [number, number, number] {
  const srgb = [r / 255, g / 255, b / 255].map((v) =>
    v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4),
  );
  const [R, G, B] = srgb;
  return [
    R * 0.4124564 + G * 0.3575761 + B * 0.1804375,
    R * 0.2126729 + G * 0.7151522 + B * 0.072175,
    R * 0.0193339 + G * 0.119192 + B * 0.9503041,
  ];
}

function xyzToLab(x: number, y: number, z: number): [number, number, number] {
  const [xn, yn, zn] = [0.95047, 1.0, 1.08883];
  const f = (t: number) =>
    t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
  const fx = f(x / xn);
  const fy = f(y / yn);
  const fz = f(z / zn);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

export function hexToLab(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex);
  const [x, y, z] = rgbToXyz(r, g, b);
  return xyzToLab(x, y, z);
}

// MARD 常用色号子集（覆盖 demo 所需的主流色彩，可持续扩充）
const RAW: Array<[string, string, string]> = [
  ["H01", "纯白", "#FFFFFF"],
  ["H02", "米白", "#F5EFE0"],
  ["H03", "浅灰", "#D3D3D3"],
  ["H04", "中灰", "#808080"],
  ["H05", "深灰", "#4A4A4A"],
  ["H06", "纯黑", "#1A1A1A"],
  ["H10", "大红", "#E63946"],
  ["H11", "玫红", "#D6336C"],
  ["H12", "西瓜红", "#FF6B6B"],
  ["H13", "粉红", "#FFB5C5"],
  ["H14", "浅粉", "#FFD6E0"],
  ["H15", "桃红", "#F5729A"],
  ["H20", "橙色", "#FF8C42"],
  ["H21", "橘黄", "#FFB347"],
  ["H22", "肉粉", "#F6BD8B"],
  ["H30", "柠黄", "#FFD93D"],
  ["H31", "金黄", "#FFC107"],
  ["H32", "浅黄", "#FFE79A"],
  ["H33", "卡其", "#C9A961"],
  ["H40", "草绿", "#6BCB77"],
  ["H41", "深绿", "#1B9C4E"],
  ["H42", "浅绿", "#A8E6A1"],
  ["H43", "墨绿", "#285943"],
  ["H44", "薄荷", "#A8E6CF"],
  ["H45", "军绿", "#4F6C3F"],
  ["H50", "天蓝", "#4D96FF"],
  ["H51", "深蓝", "#1E3A8A"],
  ["H52", "浅蓝", "#A8D8EA"],
  ["H53", "湖蓝", "#00A8CC"],
  ["H54", "藏蓝", "#0F2D52"],
  ["H55", "海军蓝", "#1C3A6B"],
  ["H60", "紫色", "#9B5DE5"],
  ["H61", "浅紫", "#CDB4DB"],
  ["H62", "深紫", "#5E3BA5"],
  ["H63", "葡萄紫", "#7D3C98"],
  ["H70", "棕色", "#8B5A2B"],
  ["H71", "深棕", "#5D3A1A"],
  ["H72", "浅棕", "#C68642"],
  ["H73", "咖啡", "#6F4E37"],
  ["H74", "木色", "#A0522D"],
  ["H80", "银灰", "#C0C0C0"],
  ["H81", "金色", "#D4AF37"],
  ["H82", "珠白", "#F8F4E3"],
  ["H83", "肤色", "#FFDAB9"],
  ["H84", "番茄红", "#FF6347"],
  ["H85", "砖红", "#B22222"],
  ["H86", "青色", "#40E0D0"],
  ["H87", "松石绿", "#30D5C8"],
  ["H88", "深青", "#0E8388"],
  ["H89", "柔黄", "#FFE5B4"],
  ["H90", "亮橙", "#FF5733"],
  ["H91", "珊瑚红", "#FF7F50"],
  ["H92", "芥末黄", "#CDAD00"],
  ["H93", "橄榄绿", "#708238"],
  ["H94", "荧光绿", "#39FF14"],
  ["H95", "荧光黄", "#FFFF33"],
  ["H96", "荧光粉", "#FF6EC7"],
  ["H97", "荧光橙", "#FF6700"],
  ["H98", "烟灰", "#848884"],
  ["H99", "铁锈红", "#B7410E"],
];

export const MARD_PALETTE: BeadColor[] = RAW.map(([code, name, hex]) => {
  const rgb = hexToRgb(hex);
  const lab = hexToLab(hex);
  return {
    id: `MARD-${code}`,
    code,
    name,
    hex,
    rgb,
    lab,
  };
});

export const MARD_BY_ID: Record<string, BeadColor> = Object.fromEntries(
  MARD_PALETTE.map((c) => [c.id, c]),
);
