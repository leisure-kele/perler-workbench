/**
 * 生成预置图鉴关卡。
 * 用纯代码绘制几个经典的 8-bit 像素图案（爱心 / 笑脸 / 蘑菇 / 星星 / 小花），
 * 每个图案对应一个 Level，作为演示和图鉴内容。
 */
import { PrismaClient } from "@prisma/client";
import { MARD_BY_ID } from "../lib/bead-palette/mard-168";
import { buildThumbnail } from "../lib/ai/pattern-builder";

const prisma = new PrismaClient();

// 用简单的色号字母映射表来绘制图案
const COLOR_MAP: Record<string, string> = {
  ".": "",               // 空 = 底色（白）
  "W": "MARD-H01",       // 白
  "K": "MARD-H06",       // 黑
  "R": "MARD-H10",       // 大红
  "P": "MARD-H13",       // 粉红
  "p": "MARD-H14",       // 浅粉
  "Y": "MARD-H30",       // 柠黄
  "G": "MARD-H40",       // 草绿
  "g": "MARD-H42",       // 浅绿
  "B": "MARD-H50",       // 天蓝
  "b": "MARD-H52",       // 浅蓝
  "O": "MARD-H20",       // 橙
  "N": "MARD-H72",       // 浅棕
  "n": "MARD-H70",       // 棕
  "A": "MARD-H30",       // 亮黄
  "L": "MARD-H44",       // 薄荷
  "S": "MARD-H91",       // 珊瑚
};

function drawPattern(rows: string[], bg: string = ""): { cells: number[][]; palette: string[]; beadCounts: Record<string, number>; width: number; height: number } {
  const height = rows.length;
  const width = rows[0].length;
  const counts: Record<string, number> = {};
  const paletteOrder: string[] = [];
  const indexOf = new Map<string, number>();

  function useColor(id: string): number {
    if (!indexOf.has(id)) {
      indexOf.set(id, paletteOrder.length);
      paletteOrder.push(id);
    }
    counts[id] = (counts[id] ?? 0) + 1;
    return indexOf.get(id)!;
  }

  const cells: number[][] = [];
  for (let y = 0; y < height; y++) {
    const row: number[] = [];
    for (let x = 0; x < width; x++) {
      const ch = rows[y][x];
      const colorId = COLOR_MAP[ch] || bg;
      if (!colorId) {
        // 缺省填白
        row.push(useColor("MARD-H01"));
      } else {
        row.push(useColor(colorId));
      }
    }
    cells.push(row);
  }

  return { cells, palette: paletteOrder, beadCounts: counts, width, height };
}

// 14x14 爱心
const HEART = [
  "..............",
  "..RRRR..RRRR..",
  ".RRRRRRRRRRRR.",
  ".RRRRRRRRRRRR.",
  ".RRRRRRRRRRRR.",
  ".RRRRRRRRRRRR.",
  "..RRRRRRRRRR..",
  "..RRRRRRRRRR..",
  "...RRRRRRRR...",
  "....RRRRRR....",
  ".....RRRR.....",
  "......RR......",
  "..............",
  "..............",
];

// 14x14 笑脸
const SMILEY = [
  "....YYYYYY....",
  "..YYYYYYYYYY..",
  ".YYYYYYYYYYYY.",
  "YYYKKYYYYKKYYY",
  "YYYKKYYYYKKYYY",
  "YYYYYYYYYYYYYY",
  "YYYYYYYYYYYYYY",
  "YKYYYYYYYYYYKY",
  "YKYYKKKKKKYYKY",
  "YYKKYYYYYYKKYY",
  ".YYKKKKKKKKYY.",
  "..YYYYYYYYYY..",
  "....YYYYYY....",
  "..............",
];

// 16x16 蘑菇
const MUSHROOM = [
  "....KKKKKKKK....",
  "..KKRRRRRRRRKK..",
  ".KRRRWWRRRWWRRK.",
  ".KRRWWWRRWWWRRK.",
  "KRRRRRRRRRRRRRRK",
  "KRRWWWRRRRWWWRRK",
  "KRRWWWRRRRWWWRRK",
  "KRRRRRRRRRRRRRRK",
  ".KRRRRRRRRRRRRK.",
  "..KKRRRRRRRRKK..",
  ".....KWWWWK.....",
  "....KWWWWWWK....",
  "....KWWnnWWK....",
  "....KWWnnWWK....",
  ".....KWWWWK.....",
  "......KKKK......",
];

// 16x16 星星
const STAR = [
  ".......AA.......",
  "......AAAA......",
  "......AAAA......",
  "AAAAAAAAAAAAAAAA",
  ".AAAAAAAAAAAAAA.",
  "..AAAAAAAAAAAA..",
  "...AAAAAAAAAA...",
  "...AAAAAAAAAA...",
  "..AAAAA..AAAAA..",
  ".AAAAA....AAAAA.",
  ".AAAA......AAAA.",
  "AAAA........AAAA",
  "AAA..........AAA",
  "AA............AA",
  "A..............A",
  "................",
];

// 20x20 小花
const FLOWER = [
  "....................",
  "........PPPP........",
  ".......PPPPPP.......",
  "......PPPPPPPP......",
  "....PPP.YYYY.PPP....",
  "...PPPP.YYYY.PPPP...",
  "...PPPP.YYYY.PPPP...",
  "....PPP.YYYY.PPP....",
  "......PPPPPPPP......",
  ".......PPPPPP.......",
  "........PPPP........",
  ".........GG.........",
  ".........GG.........",
  "........GGGG........",
  "......gGGGGGg.......",
  ".....gGGGGGGg.......",
  "......gGGGGg........",
  ".........GG.........",
  ".........GG.........",
  "....................",
];

// 20x20 小草莓
const STRAWBERRY = [
  "....................",
  "........GG..........",
  ".......GGGG.........",
  "......GGGGGG........",
  ".....gGGGGGGg.......",
  "......RRRRRR........",
  ".....RRWRRWRR.......",
  "....RRRRRRRRRR......",
  "...RRRRRRRRRRRR.....",
  "...RRWRRWRRWRRR.....",
  "...RRRRRRRRRRRR.....",
  "....RRWRRRRRWRR.....",
  "....RRRRRRRRRRR.....",
  ".....RRRRRRRRR......",
  ".....RRWRRWRRR......",
  "......RRRRRRR.......",
  ".......RRRRR........",
  "........RRR.........",
  ".........R..........",
  "....................",
];

async function main() {
  const designs = [
    {
      slug: "heart",
      title: "小爱心",
      difficulty: 1,
      order: 1,
      rows: HEART,
      videoTitle: "【抖音精选】5 分钟拼出你的第一个爱心",
    },
    {
      slug: "smiley",
      title: "微笑黄豆",
      difficulty: 1,
      order: 2,
      rows: SMILEY,
      videoTitle: "【抖音精选】两种颜色也能拼笑脸",
    },
    {
      slug: "mushroom",
      title: "马里奥蘑菇",
      difficulty: 2,
      order: 3,
      rows: MUSHROOM,
      videoTitle: "【抖音精选】经典游戏元素入门",
    },
    {
      slug: "star",
      title: "闪亮星星",
      difficulty: 2,
      order: 4,
      rows: STAR,
      videoTitle: "【抖音精选】单色拼豆也能很亮眼",
    },
    {
      slug: "flower",
      title: "桃粉小花",
      difficulty: 3,
      order: 5,
      rows: FLOWER,
      videoTitle: "【抖音精选】春日系配色教程",
    },
    {
      slug: "strawberry",
      title: "一颗草莓",
      difficulty: 3,
      order: 6,
      rows: STRAWBERRY,
      videoTitle: "【抖音精选】水果系列进阶",
    },
  ];

  for (const d of designs) {
    const { cells, palette, beadCounts, width, height } = drawPattern(d.rows);

    // 过滤掉实际未出现在色卡里的 id
    const validPalette = palette.filter((id) => MARD_BY_ID[id]);
    if (validPalette.length !== palette.length) {
      console.warn(`[${d.slug}] 有未知色号被忽略`);
    }

    const thumbnail = await buildThumbnail(cells, palette, 6);

    // 先删除同 slug 的旧数据（cascade 会清 pattern）
    await prisma.level.deleteMany({ where: { slug: d.slug } });

    const pattern = await prisma.pattern.create({
      data: {
        title: d.title,
        width,
        height,
        cells: JSON.stringify(cells),
        palette: JSON.stringify(palette),
        beadCounts: JSON.stringify(beadCounts),
        sourceType: "preset",
        thumbnail,
        ownerId: null,
        isPublic: true,
      },
    });

    await prisma.level.create({
      data: {
        slug: d.slug,
        title: d.title,
        difficulty: d.difficulty,
        order: d.order,
        videoTitle: d.videoTitle,
        videoUrl: null,
        patternId: pattern.id,
      },
    });

    console.log(`✓ ${d.slug} (${width}x${height}, ${validPalette.length} 色)`);
  }

  console.log("\n完成！共生成", designs.length, "个预置关卡。");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
