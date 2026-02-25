/**
 * 囚徒健身 - 六艺十式数据模型
 * 每艺 10 式：1～3 初级，4～6 中级，7～9 高级，10 最终技
 */

export type ArtId =
  | 'pushup'
  | 'squat'
  | 'pullup'
  | 'legraise'
  | 'bridge'
  | 'handstand';

export interface ArtStep {
  /** 式序号 1-10 */
  level: number;
  /** 名称 */
  name: string;
  /** 阶段：beginner | intermediate | advanced | master */
  stage: 'beginner' | 'intermediate' | 'advanced' | 'master';
}

export interface Art {
  id: ArtId;
  name: string;
  nameEn: string;
  steps: ArtStep[];
}

const steps = (
  names: string[],
  stageSplit: [number, number, number] = [3, 6, 9]
): ArtStep[] =>
  names.map((name, i) => {
    const level = i + 1;
    let stage: ArtStep['stage'] = 'beginner';
    if (level <= stageSplit[0]) stage = 'beginner';
    else if (level <= stageSplit[1]) stage = 'intermediate';
    else if (level <= stageSplit[2]) stage = 'advanced';
    else stage = 'master';
    return { level, name, stage };
  });

/** 六艺十式完整配置 */
export const SIX_ARTS: Art[] = [
  {
    id: 'pushup',
    name: '俯卧撑',
    nameEn: 'Pushup',
    steps: steps([
      '墙壁俯卧撑',
      '上斜俯卧撑',
      '膝盖俯卧撑',
      '半俯卧撑',
      '标准俯卧撑',
      '窄距俯卧撑',
      '偏重俯卧撑',
      '单臂半俯卧撑',
      '杠杆俯卧撑',
      '单臂俯卧撑',
    ]),
  },
  {
    id: 'squat',
    name: '深蹲',
    nameEn: 'Squat',
    steps: steps([
      '肩靠墙深蹲',
      '折刀深蹲',
      '支撑深蹲',
      '半深蹲',
      '标准深蹲',
      '窄距深蹲',
      '偏重深蹲',
      '单腿半深蹲',
      '单腿辅助深蹲',
      '单腿深蹲',
    ]),
  },
  {
    id: 'pullup',
    name: '引体向上',
    nameEn: 'Pullup',
    steps: steps([
      '垂直引体',
      '水平引体',
      '折刀引体',
      '半引体向上',
      '标准引体向上',
      '窄距引体向上',
      '偏重引体向上',
      '单臂半引体',
      '单臂辅助引体',
      '单臂引体向上',
    ]),
  },
  {
    id: 'legraise',
    name: '举腿',
    nameEn: 'Leg Raise',
    steps: steps([
      '坐姿屈膝',
      '平卧抬膝',
      '平卧屈举腿',
      '平卧直举腿',
      '悬垂屈膝',
      '悬垂直举腿',
      '平卧蛙举腿',
      '悬垂蛙举腿',
      '悬垂半举腿',
      '悬垂举腿',
    ]),
  },
  {
    id: 'bridge',
    name: '桥',
    nameEn: 'Bridge',
    steps: steps([
      '短桥',
      '直桥',
      '高低桥',
      '顶桥',
      '半桥',
      '标准桥',
      '下行桥',
      '上行桥',
      '合桥',
      '铁板桥',
    ]),
  },
  {
    id: 'handstand',
    name: '倒立撑',
    nameEn: 'Handstand Pushup',
    steps: steps([
      '靠墙顶立',
      '乌鸦式',
      '靠墙倒立',
      '半倒立撑',
      '标准倒立撑',
      '窄距倒立撑',
      '偏重倒立撑',
      '单臂半倒立撑',
      '杠杆倒立撑',
      '单臂倒立撑',
    ]),
  },
];

export const ART_IDS: ArtId[] = SIX_ARTS.map((a) => a.id);

export function getArt(id: ArtId): Art {
  const art = SIX_ARTS.find((a) => a.id === id);
  if (!art) throw new Error(`Unknown art: ${id}`);
  return art;
}

export function getStep(artId: ArtId, level: number): ArtStep | undefined {
  return getArt(artId).steps.find((s) => s.level === level);
}
