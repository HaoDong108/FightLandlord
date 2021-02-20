/** 出牌牌型枚举 */
export enum OutPokerType {
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
export enum PokerValue {
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
export enum PokerFlower {
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
export enum BtnSituation {
  准备,
  叫分,
  加倍,
  出牌,
  接牌_要的起,
  接牌_要不起,
}

/**游戏阶段 */
export enum GameStage {
  准备阶段,
  叫分阶段,
  出牌阶段,
  接牌阶段,
  结束阶段,
  统计阶段,
}

/**出牌方位 */
export enum OutDct {
  left,
  right,
  bottom,
}

/**房间模式 */
export enum RoomMode {
  /**匹配模式 */
  Matched,
  /**房间模式 */
  Room,
}

/**大厅指令 */
export enum HallOrderType {
  请求大厅数据 = 0,
  返回大厅数据,
  进入匹配队列,
  退出匹配队列,
  返回退出结果,
  获取房间成员,
  更新玩家信息,
  房间创建完毕,
  请求进入房间,
  请求房间列表,
  推送房间列表,
  请求排名信息,
  推送排名信息,
  创建房间,
}

/**房间指令 */
export enum RoomOrderType {
  连接到房间 = 100,
  回送房间信息,
  添加玩家,
  开始游戏指令,
  玩家准备,
  玩家退出,
  玩家加入,
  踢出玩家,
  房主切换,
}

/**局内指令 */
export enum GameOrderType {
  空 = 200,
  玩家已准备,
  出牌,
  发我方手牌,
  发地主牌,
  回送玩家信息,
  不要,
  有其他玩家叫分,
  指定玩家叫分,
  有玩家叫分,
  计时滴答,
  设置地主,
  有玩家胜出,
  倍数更新,
}
