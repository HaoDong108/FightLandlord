export class NetInfoBase {
  /**对象类型 */
  OrderType: number;
  /**数据 */
  JsonData: string;
  /**简单附加数据 */
  Tag: string;

  constructor(order: number, json: string, tag: string = null) {
    this.OrderType = order;
    this.JsonData = json;
    this.Tag = tag;
  }
}

/**出牌对象 */
export class NetPkGroup {
  PlayerID: number;
  Pks: NetPoker[];
}

/**有玩家胜利时亮牌信息 */
export class NetStaData {
  Ply1ID: string;
  Ply1Pks: NetPoker[];
  Ply2ID: string;
  Ply2Pks: NetPoker[];
  Ply3ID: string;
  Ply3Pks: NetPoker[];
  WinPlyID: string;
}

/**扑克键值对 */
export class NetPoker {
  Value: number;
  Flower: number;

  constructor(v?: number, f?: number) {
    this.Value = v;
    this.Flower = f;
  }
}

export class NetPlayer {
  public Name: string;
  public IP: string;
  public PlayerID: string;
  public Mark: string;
  public NextPlayerID: string;
  public LastPlayerID: string;
  public Gender: number;
  public RoleID: number;
  public HeadID: string;
  public IsRoomMaster: boolean;
  public OnReady: boolean;

  constructor(name: string, gender: number, role: number) {
    this.Name = name;
    this.Gender = gender;
    this.RoleID = role;
  }
}

export class NetRoom {
  public Players: NetPlayer[];
  public RoomID: string;
  public BtScore: number;
  public Title: string;
  public OnStart: boolean;
  public MasterName: string;
  public MasterHead: number;
  public NowCount: number;
}

export enum HallOrderType {
  大厅基本数据 = 0,
  进入匹配队列,
  退出匹配队列,
  返回退出结果,
  获取房间列表,
  返回房间列表,
  更新排名信息,
  获取房间成员,
  更新玩家信息,
  房间创建完毕,
  创建房间,
}

export enum RoomOrderType {
  连接到房间 = 100,
  回送房间信息,
  添加玩家,
  开始游戏指令,
  玩家准备,
  玩家退出,
  玩家加入,
  房主切换,
}

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
