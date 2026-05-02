/**
 * Short bilingual info shown on the back side of a flipped lesson card.
 * Kept to a single short kid-friendly sentence per language so the back
 * face stays readable for ages 2–6.
 */
export interface AnimalInfo {
  en: string;
  zh: string;
  pinyin?: string;
}

export const ANIMAL_INFO: Record<string, AnimalInfo> = {
  Alpaca: { en: "Alpacas are fluffy!", zh: "羊驼毛茸茸！", pinyin: "Yáng tuó máo róng róng" },
  Bear: { en: "Bears love honey!", zh: "熊喜欢蜂蜜！", pinyin: "Xióng xǐ huān fēng mì" },
  Cat: { en: "Cats say meow!", zh: "猫咪喵喵叫！", pinyin: "Māo mī miāo miāo jiào" },
  Dog: { en: "Dogs say woof!", zh: "小狗汪汪叫！", pinyin: "Xiǎo gǒu wāng wāng jiào" },
  Elephant: { en: "Elephants have long trunks!", zh: "大象鼻子长长！", pinyin: "Dà xiàng bí zi cháng cháng" },
  Fish: { en: "Fish swim in water!", zh: "小鱼水里游！", pinyin: "Xiǎo yú shuǐ lǐ yóu" },
  Gorilla: { en: "Gorillas are strong!", zh: "大猩猩很强壮！", pinyin: "Dà xīng xīng hěn qiáng zhuàng" },
  "Handsome Zaven": { en: "Zaven is the best!", zh: "泽文最棒！", pinyin: "Zé wén zuì bàng" },
  "Handsome Xaven": { en: "Xaven is the best!", zh: "夏文最棒！", pinyin: "Xià wén zuì bàng" },
  Hippo: { en: "Hippos love the water!", zh: "河马爱玩水！", pinyin: "Hé mǎ ài wán shuǐ" },
  "Ice Cream": { en: "Ice cream is yummy!", zh: "冰淇淋真好吃！", pinyin: "Bīng qí lín zhēn hǎo chī" },
  Iguana: { en: "Iguanas climb trees!", zh: "鬣蜥会爬树！", pinyin: "Liè xī huì pá shù" },
  Jellyfish: { en: "Jellyfish are wobbly!", zh: "水母软软的！", pinyin: "Shuǐ mǔ ruǎn ruǎn de" },
  Kangaroo: { en: "Kangaroos hop high!", zh: "袋鼠跳得高！", pinyin: "Dài shǔ tiào de gāo" },
  Lion: { en: "Lions roar loud!", zh: "狮子大声吼！", pinyin: "Shī zi dà shēng hǒu" },
  Mommy: { en: "I love mommy!", zh: "我爱妈妈！", pinyin: "Wǒ ài mā ma" },
  Nest: { en: "Birds live in nests!", zh: "小鸟住巢里！", pinyin: "Xiǎo niǎo zhù cháo lǐ" },
  Ouyiii: { en: "Hi Ouyiii!", zh: "你好欧伊！", pinyin: "Nǐ hǎo Ōu yī" },
  Octopus: { en: "Octopuses have eight arms!", zh: "章鱼有八只手！", pinyin: "Zhāng yú yǒu bā zhī shǒu" },
  Panda: { en: "Pandas eat bamboo!", zh: "熊猫吃竹子！", pinyin: "Xióng māo chī zhú zi" },
  Quokka: { en: "Quokkas always smile!", zh: "短尾矮袋鼠爱笑！", pinyin: "Duǎn wěi ǎi dài shǔ ài xiào" },
  "Renee Princesse": { en: "Hello princess!", zh: "你好公主！", pinyin: "Nǐ hǎo gōng zhǔ" },
  Star: { en: "Stars twinkle bright!", zh: "星星闪闪亮！", pinyin: "Xīng xīng shǎn shǎn liàng" },
  Shark: { en: "Sharks have sharp teeth!", zh: "鲨鱼牙齿很尖！", pinyin: "Shā yú yá chǐ hěn jiān" },
  Turtle: { en: "Turtles walk slowly!", zh: "乌龟慢慢爬！", pinyin: "Wū guī màn màn pá" },
  Unicorn: { en: "Unicorns are magic!", zh: "独角兽很神奇！", pinyin: "Dú jiǎo shòu hěn shén qí" },
  Violin: { en: "Violins make music!", zh: "小提琴会唱歌！", pinyin: "Xiǎo tí qín huì chàng gē" },
  Vulture: { en: "Vultures fly very high!", zh: "秃鹫飞得很高！", pinyin: "Tū jiù fēi de hěn gāo" },
  Whale: { en: "Whales are huge!", zh: "鲸鱼真巨大！", pinyin: "Jīng yú zhēn jù dà" },
  Xylophone: { en: "Xylophones go ding!", zh: "木琴叮叮响！", pinyin: "Mù qín dīng dīng xiǎng" },
  Yak: { en: "Yaks live on mountains!", zh: "牦牛住山上！", pinyin: "Máo niú zhù shān shàng" },
  Zebra: { en: "Zebras have stripes!", zh: "斑马有条纹！", pinyin: "Bān mǎ yǒu tiáo wén" },
  // Numbers — short translation only.
  "1": { en: "One!", zh: "一！", pinyin: "Yī" },
  "2": { en: "Two!", zh: "二！", pinyin: "Èr" },
  "3": { en: "Three!", zh: "三！", pinyin: "Sān" },
  "4": { en: "Four!", zh: "四！", pinyin: "Sì" },
  "5": { en: "Five!", zh: "五！", pinyin: "Wǔ" },
  "6": { en: "Six!", zh: "六！", pinyin: "Liù" },
  "7": { en: "Seven!", zh: "七！", pinyin: "Qī" },
  "8": { en: "Eight!", zh: "八！", pinyin: "Bā" },
  "9": { en: "Nine!", zh: "九！", pinyin: "Jiǔ" },
  "10": { en: "Ten!", zh: "十！", pinyin: "Shí" },
};

export function getAnimalInfo(word: string): AnimalInfo | undefined {
  return ANIMAL_INFO[word];
}
