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
  public MasterID: string;
  public MasterName: string;
  public MasterHead: number;
  public NowCount: number;
  public RoomMode: number;
}
