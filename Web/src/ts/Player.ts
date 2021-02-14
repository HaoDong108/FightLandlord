import { OutDct } from "./Model";
import PokerGroup from "./PokerGroup";
import Game from "./Game";
import Poker from "./Poker";
import { NetPlayer } from "./NetInfos";
class Player {
  /**昵称 */
  public userName: string;
  /**角色人物ID */
  public roleid: number = 1;
  /**头像ID */
  public headid: number = 1;
  /**玩家ID */
  public playerID: string = "-1";
  /**玩家分数(钱币) */
  public mark: number = 0;
  /**性别 0=男,1=女 */
  public gender: number = 0;
  /**玩家手牌 */
  public hand: PokerGroup;
  /**下个玩家 */
  public next: Player;
  /**上个玩家 */
  public last: Player;
  /**指示玩家是否是地主 */
  public isLand: boolean = false;
  /**当局游戏对象*/
  public game: Game;
  /**玩家对应方位 */
  public dct: OutDct;
  /**玩家IP地址 */
  public ip: string;
  /**是否为房主 */
  public isRoomMaster: boolean;
  /**上一个玩家ID */
  public lastPid: string;
  /**下一个玩家ID */
  public nextPid: string;
  /**标识玩家是否已经准备*/
  public onReady: boolean;

  get isMy(): boolean {
    return this.dct == OutDct.bottom;
  }

  constructor(ply: NetPlayer);
  constructor(name: string, sex: number, role: number);
  constructor(arg1: string | NetPlayer, arg2?: number, arg3?: number) {
    if (typeof arg1 == "object") {
      let ply = <NetPlayer>arg1;
      this.userName = ply.Name;
      this.gender = ply.Gender;
      this.mark = parseInt(ply.Mark);
      this.roleid = ply.RoleID;
      this.headid = parseInt(ply.HeadID);
      this.ip = ply.IP;
      this.isRoomMaster = ply.IsRoomMaster;
      this.lastPid = ply.LastPlayerID;
      this.nextPid = ply.NextPlayerID;
      this.onReady = ply.OnReady;
      this.playerID = ply.PlayerID;
    } else {
      this.userName = arg1;
      this.gender = arg2;
      this.roleid = arg3;
    }
  }

  /**获取已经选中的手牌 */
  get selectPks(): Poker[] {
    return this.hand.pgAsc.filter((p) => {
      return p.onSelect == true;
    });
  }

  public printInfo() {
    let str = `
        名称:${this.userName}
        ID:${this.playerID}
        性别:${this.gender == 0 ? "男" : "女"}
        剩余分数:${this.mark}
        方位:${OutDct[this.dct]}
        `;
    console.log(str);
  }
}

export default Player;
