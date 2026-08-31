/**
 * 叶卦的纯规则核心。
 * 约定：数组按初爻到上爻（自下而上）排列；1 为阳，0 为阴。
 */

export const TRIGRAMS = Object.freeze([
  Object.freeze({ bits: "111", name: "乾", pinyin: "qián", element: "天 / 金", number: 1 }),
  Object.freeze({ bits: "110", name: "兑", pinyin: "duì", element: "泽 / 金", number: 2 }),
  Object.freeze({ bits: "101", name: "离", pinyin: "lí", element: "火", number: 3 }),
  Object.freeze({ bits: "100", name: "震", pinyin: "zhèn", element: "雷 / 木", number: 4 }),
  Object.freeze({ bits: "011", name: "巽", pinyin: "xùn", element: "风 / 木", number: 5 }),
  Object.freeze({ bits: "010", name: "坎", pinyin: "kǎn", element: "水", number: 6 }),
  Object.freeze({ bits: "001", name: "艮", pinyin: "gèn", element: "山 / 土", number: 7 }),
  Object.freeze({ bits: "000", name: "坤", pinyin: "kūn", element: "地 / 土", number: 8 }),
]);

export const HEXAGRAMS = Object.freeze([
  ["乾为天", "qián wéi tiān", "䷀"], ["坤为地", "kūn wéi dì", "䷁"], ["水雷屯", "shuǐ léi tún", "䷂"], ["山水蒙", "shān shuǐ méng", "䷃"],
  ["水天需", "shuǐ tiān xū", "䷄"], ["天水讼", "tiān shuǐ sòng", "䷅"], ["地水师", "dì shuǐ shī", "䷆"], ["水地比", "shuǐ dì bǐ", "䷇"],
  ["风天小畜", "fēng tiān xiǎo chù", "䷈"], ["天泽履", "tiān zé lǚ", "䷉"], ["地天泰", "dì tiān tài", "䷊"], ["天地否", "tiān dì pǐ", "䷋"],
  ["天火同人", "tiān huǒ tóng rén", "䷌"], ["火天大有", "huǒ tiān dà yǒu", "䷍"], ["地山谦", "dì shān qiān", "䷎"], ["雷地豫", "léi dì yù", "䷏"],
  ["泽雷随", "zé léi suí", "䷐"], ["山风蛊", "shān fēng gǔ", "䷑"], ["地泽临", "dì zé lín", "䷒"], ["风地观", "fēng dì guān", "䷓"],
  ["火雷噬嗑", "huǒ léi shì kè", "䷔"], ["山火贲", "shān huǒ bì", "䷕"], ["山地剥", "shān dì bō", "䷖"], ["地雷复", "dì léi fù", "䷗"],
  ["天雷无妄", "tiān léi wú wàng", "䷘"], ["山天大畜", "shān tiān dà chù", "䷙"], ["山雷颐", "shān léi yí", "䷚"], ["泽风大过", "zé fēng dà guò", "䷛"],
  ["坎为水", "kǎn wéi shuǐ", "䷜"], ["离为火", "lí wéi huǒ", "䷝"], ["泽山咸", "zé shān xián", "䷞"], ["雷风恒", "léi fēng héng", "䷟"],
  ["天山遁", "tiān shān dùn", "䷠"], ["雷天大壮", "léi tiān dà zhuàng", "䷡"], ["火地晋", "huǒ dì jìn", "䷢"], ["地火明夷", "dì huǒ míng yí", "䷣"],
  ["风火家人", "fēng huǒ jiā rén", "䷤"], ["火泽睽", "huǒ zé kuí", "䷥"], ["水山蹇", "shuǐ shān jiǎn", "䷦"], ["雷水解", "léi shuǐ jiě", "䷧"],
  ["山泽损", "shān zé sǔn", "䷨"], ["风雷益", "fēng léi yì", "䷩"], ["泽天夬", "zé tiān guài", "䷪"], ["天风姤", "tiān fēng gòu", "䷫"],
  ["泽地萃", "zé dì cuì", "䷬"], ["地风升", "dì fēng shēng", "䷭"], ["泽水困", "zé shuǐ kùn", "䷮"], ["水风井", "shuǐ fēng jǐng", "䷯"],
  ["泽火革", "zé huǒ gé", "䷰"], ["火风鼎", "huǒ fēng dǐng", "䷱"], ["震为雷", "zhèn wéi léi", "䷲"], ["艮为山", "gèn wéi shān", "䷳"],
  ["风山渐", "fēng shān jiàn", "䷴"], ["雷泽归妹", "léi zé guī mèi", "䷵"], ["雷火丰", "léi huǒ fēng", "䷶"], ["火山旅", "huǒ shān lǚ", "䷷"],
  ["巽为风", "xùn wéi fēng", "䷸"], ["兑为泽", "duì wéi zé", "䷹"], ["风水涣", "fēng shuǐ huàn", "䷺"], ["水泽节", "shuǐ zé jié", "䷻"],
  ["风泽中孚", "fēng zé zhōng fú", "䷼"], ["雷山小过", "léi shān xiǎo guò", "䷽"], ["水火既济", "shuǐ huǒ jì jì", "䷾"], ["火水未济", "huǒ shuǐ wèi jì", "䷿"],
].map((item) => Object.freeze(item)));

// 每个六位模式均按初爻到上爻排列，数组下标即文王序（0-based）。
export const KING_WEN_BITS = Object.freeze([
  "111111", "000000", "100010", "010001", "111010", "010111", "010000", "000010",
  "111011", "110111", "111000", "000111", "101111", "111101", "001000", "000100",
  "100110", "011001", "110000", "000011", "100101", "101001", "000001", "100000",
  "100111", "111001", "100001", "011110", "010010", "101101", "001110", "011100",
  "001111", "111100", "000101", "101000", "101011", "110101", "001010", "010100",
  "110001", "100011", "111110", "011111", "000110", "011000", "010110", "011010",
  "101110", "011101", "100100", "001001", "001011", "110100", "101100", "001101",
  "011011", "110110", "010011", "110010", "110011", "001100", "101010", "010101",
]);

const TRIGRAM_BY_BITS = new Map(TRIGRAMS.map((trigram) => [trigram.bits, trigram]));
const HEXAGRAM_INDEX_BY_BITS = new Map(KING_WEN_BITS.map((bits, index) => [bits, index]));

function assertBits(bits) {
  if (typeof bits !== "string" || !/^[01]{6}$/.test(bits)) {
    throw new TypeError("六爻必须是由 0/1 组成的 6 位字符串（自下而上）");
  }
}

export function frontsToBits(fronts, { frontIsYang = true } = {}) {
  if (!Array.isArray(fronts) || fronts.length !== 6) {
    throw new RangeError("必须提供 6 片叶子的正反面状态");
  }
  if (typeof frontIsYang !== "boolean") {
    throw new TypeError("frontIsYang 必须是布尔值");
  }
  if (!fronts.every((front) => typeof front === "boolean")) {
    throw new TypeError("每片叶子的状态必须是布尔值：true=正面，false=反面");
  }
  return fronts.map((front) => (front === frontIsYang ? "1" : "0")).join("");
}

export function bitsToTrigrams(bits) {
  assertBits(bits);
  const lower = TRIGRAM_BY_BITS.get(bits.slice(0, 3));
  const upper = TRIGRAM_BY_BITS.get(bits.slice(3, 6));
  return { bits, lower, upper };
}

export function lookupHexagram(bits) {
  assertBits(bits);
  const index = HEXAGRAM_INDEX_BY_BITS.get(bits);
  if (index === undefined) throw new Error(`未找到六爻模式：${bits}`);
  const [name, pinyin, symbol] = HEXAGRAMS[index];
  const { lower, upper } = bitsToTrigrams(bits);
  return Object.freeze({ index, number: index + 1, name, pinyin, symbol, bits, lower, upper });
}

export function resolveHexagram(fronts, options) {
  const bits = frontsToBits(fronts, options);
  return lookupHexagram(bits);
}

export function invertBits(bits) {
  assertBits(bits);
  return bits.replace(/[01]/g, (bit) => (bit === "1" ? "0" : "1"));
}

