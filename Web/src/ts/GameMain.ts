import { BtnSituation, OutDct, RoomMode } from "./Model";
import { GameUi } from "./GameUi";
import Player from "./Player";
import Game from "./Game";
import { NetInfoBase, NetPlayer, NetRoom } from "./NetInfos";
import { RoomOrderType } from "./Model";
import "../css/gamestyle.css";
import Tools from "./Tools";
import Enumerable from "linq";
import $, { type } from "jquery";

var host = window.document.location.host;
var hostip = host.split(":")[0];
var mypid = Tools.getCookie("pid");
var roomid = Tools.getCookie("roomid");
var btScore: number; //房间底分
var ownGamer: Player; //我方玩家
var lastGamer: Player; //上一个玩家
var nextGamer: Player; //下一个玩家
var onStart: boolean = false; //指示是否已经开始游戏
var onReady: boolean = false; //指示我方是否已准备
var game: Game; //进行的游戏对象
var ws: WebSocket;

init();

try {
  // 连接websocket
  ws = new WebSocket("ws://" + hostip + ":8081/RoomChat");
  ws.onopen = wsOnpend;
  ws.addEventListener("message", wsOnMessage);
  // start();
} catch (e) {
  console.log("websocket启动失败");
}

function init() {
  //取消全局鼠标选中以及拖功能
  document.body.ondrag = f;
  document.body.onselectstart = f;
  document.body.ondragstart = f;
  function f() {
    return false;
  }
  GameUi.showWait("等待其他玩家");
  GameUi.eventBinding();
  $("#roomid").text("房间ID:" + roomid);
  eventBinding();
}

/**
 * CallBack-->WebSocket连接成功触发
 */
function wsOnpend() {
  var obj = {
    pid: mypid,
    roomid: Tools.getCookie("roomid"),
  };
  console.log("ws连接成功");
  console.log("玩家ID:" + obj.pid);
  console.log("房间ID:" + obj.roomid);
  var str = JSON.stringify(obj);
  wsSend(str, RoomOrderType.连接到房间);
}

/**
 * CallBack->WebSocket收到消息触发
 * @param e
 */
function wsOnMessage(e: MessageEvent) {
  var bas: NetInfoBase = JSON.parse(e.data);
  var jsonData = bas.JsonData;
  switch (<RoomOrderType>bas.OrderType) {
    case RoomOrderType.回送房间信息: {
      let nr: NetRoom = JSON.parse(jsonData);
      if (nr.RoomMode == RoomMode.Matched) {
        GameUi.hideRoomID();
        GameUi.closemmt();
      } else {
        GameUi.showRoomID();
        GameUi.openmmt();
      }
      btScore = nr.BtScore;
      $(".minScore>span").last().text(btScore);
      //找到我方玩家
      let nown = Enumerable.from(nr.Players).first((w) => w.PlayerID == mypid);
      if (!nown) throw new Error("玩家ID轮空");
      addPlayer(nown);
      //找到上家
      let nlas = nr.Players.find((w) => w.PlayerID == ownGamer.lastPid);
      if (nlas) {
        console.log("上家:" + nlas.Name);
        addPlayer(nlas);
      }
      //找到下家
      let nnex = nr.Players.find((w) => w.PlayerID == ownGamer.nextPid);
      if (nnex) {
        console.log("下家:" + nnex.Name);
        addPlayer(nnex);
      }
      break;
    }
    case RoomOrderType.玩家准备: {
      var p = getPlayer(bas.Tag);
      if (!p) break;
      p.onReady = true;
      if (p.dct != OutDct.bottom) GameUi.showReady(p.dct); //显示对应玩家准备标签
      if (readyCount() == 3) {
        GameUi.showWait("等待服务器开始");
      }
      break;
    }
    case RoomOrderType.玩家退出: {
      var pid = bas.Tag;
      if (pid == mypid) return;
      removePlayer(pid);
      break;
    }
    case RoomOrderType.玩家加入: {
      var ply = <NetPlayer>JSON.parse(jsonData);
      addPlayer(ply);
      break;
    }
    case RoomOrderType.房主切换: {
      var pid = bas.Tag;
      var p = getPlayer(pid);
      if (p) {
        setMaster(p);
      }
      break;
    }
    case RoomOrderType.开始游戏指令: {
      startGame();
      break;
    }
    case RoomOrderType.踢出玩家: {
      let pid = bas.Tag;
      if (pid == ownGamer.playerID) {
        Tools.showMsbox("你已被房主移出房间!\n 即将返回大厅", () => {
          //跳转到大厅
          window.location.href = `http://${hostip}:8080/home.html`;
        });
      }
      removePlayer(pid);
      break;
    }
  }
}

/**
 * CallBack->玩家全部到齐触发
 */
function roomFill() {
  console.log("我方玩家:");
  ownGamer.printInfo();
  console.log("上家:");
  lastGamer.printInfo();
  console.log("下家:");
  nextGamer.printInfo();
}

function eventBinding() {
  $("#btn_ready").on("click", function () {
    if (onReady) return;
    onReady = true;
    $("#btn_ready").html("已准备");
    wsSend("", RoomOrderType.玩家准备);
  });
  $("#ti-lef").on("click", function () {
    if (lastGamer && ownGamer.isRoomMaster) {
      wsSend("", RoomOrderType.踢出玩家, lastGamer.playerID);
    }
  });
  $("#ti-rig").on("click", function () {
    if (nextGamer && ownGamer.isRoomMaster) {
      wsSend("", RoomOrderType.踢出玩家, nextGamer.playerID);
      GameUi.restoreInfo(nextGamer.dct);
    }
  });
}

/**添加玩家到房间 */
function addPlayer(nply: NetPlayer) {
  var ply = new Player(nply);
  if (nply.PlayerID == mypid) {
    ownGamer = ply;
    ownGamer.dct = OutDct.bottom;
    GameUi.setGamerInfo(OutDct.bottom, nply);
    //显示准备按钮
    GameUi.showButton(BtnSituation.准备);
  } else if (nply.PlayerID == ownGamer.lastPid) {
    if (!ownGamer) throw new Error("我方玩家尚未赋值");
    lastGamer = ply;
    lastGamer.dct = OutDct.left;
    ownGamer.last = lastGamer;
    lastGamer.next = ownGamer;
    GameUi.setGamerInfo(OutDct.left, nply);
  } else if (nply.PlayerID == ownGamer.nextPid) {
    if (!ownGamer) throw new Error("我方玩家尚未赋值");
    nextGamer = ply;
    nextGamer.dct = OutDct.right;
    ownGamer.next = nextGamer;
    nextGamer.last = ownGamer;
    //将数据展示到界面
    GameUi.setGamerInfo(OutDct.right, nply);
  }
  if (ply.dct != OutDct.bottom) {
    GameUi.hideWait();
  }
  if (ply.onReady && ply.dct != OutDct.bottom) {
    GameUi.showReady(ply.dct);
  }
  //设置房主
  if (nply.IsRoomMaster) setMaster(ply);
  //满员设置关系并触发事件
  if (ownGamer && lastGamer && nextGamer) {
    lastGamer.last = nextGamer;
    nextGamer.next = lastGamer;
    roomFill();
  }
}

/**根据ID获取房间玩家 */
function getPlayer(pid: string): Player {
  if (ownGamer && ownGamer.playerID == pid) return ownGamer;
  if (lastGamer && lastGamer.playerID == pid) return lastGamer;
  if (nextGamer && nextGamer.playerID == pid) return nextGamer;
  return null;
}

/**删除玩家 */
function removePlayer(pid: string): void {
  var ply = getPlayer(pid);
  if (!ply) return;
  if (lastGamer && pid == lastGamer.playerID) {
    GameUi.restoreInfo(lastGamer.dct);
    lastGamer = null;
  }
  if (nextGamer && pid == nextGamer.playerID) {
    GameUi.restoreInfo(nextGamer.dct);
    nextGamer = null;
  }
}

/**返回房间准备数 */
function readyCount(): number {
  let c = 0;
  if (ownGamer.onReady) c++;
  if (lastGamer.onReady) c++;
  if (nextGamer.onReady) c++;
  return c;
}

/**设置房间房主 */
function setMaster(p: Player): void {
  if (p) {
    $("#roommaster").text("房主:" + p.userName);
    if (ownGamer) {
      ownGamer.isRoomMaster = false;
    }
    if (lastGamer) {
      lastGamer.isRoomMaster = false;
    }
    if (nextGamer) {
      nextGamer.isRoomMaster = false;
    }
    p.isRoomMaster = true;
    Tools.showPrompt(p.userName + "成为房主");
  }
}

/**开始游戏 */
function startGame(): void {
  setTimeout(() => {
    GameUi.hiadeReady();
    console.log("隐藏");
  }, 500);
  onStart = true;
  GameUi.hideRoomID();
  GameUi.hideButton();
  GameUi.closemmt();
  onStart = true;
  game = new Game(lastGamer, nextGamer, ownGamer, btScore, ws, () => {
    game = null;
    GameUi.openmmt();
  });
}

/**发送websock数据 */
function wsSend(data: string, type: RoomOrderType, tag: string = "") {
  var bas: NetInfoBase = new NetInfoBase(type, data, tag);
  var json = JSON.stringify(bas);
  ws.send(json);
}
