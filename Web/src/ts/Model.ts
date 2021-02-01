import anime from "animejs";

/** 出牌牌型枚举 */
enum OutPokerType {
  单,
  顺子,
  对子,
  连对,
  三张,
  三带一,
  三带一对,
  飞机,
  飞机带翅膀,
  炸弹,
  四带二,
  王炸,
  Error_Card,
}

/** 牌值枚举 */
enum PokerValue {
  three = 3,
  four,
  five,
  six,
  seven,
  eight,
  nine,
  ten,
  J,
  Q,
  K,
  A,
  two,
  joker_Small,
  joker_Big,
}

/**牌花色 */
enum PokerFlower {
  /**黑桃 */
  spades,
  /**红桃 */
  heart,
  /**梅花 */
  clubs,
  /**方块 */
  dianmond,
}

/**玩家按钮情况 */
enum BtnSituation {
  准备,
  叫分,
  加倍,
  出牌,
  接牌_要的起,
  接牌_要不起,
}

enum GameStage {
  准备阶段,
  叫分阶段,
  出牌阶段,
  接牌阶段,
  结束阶段,
  统计阶段,
}

/**出牌方位 */
enum OutDct {
  left,
  right,
  bottom,
}

export { OutPokerType as OutType, PokerValue, PokerFlower, BtnSituation, OutDct, GameStage };
