import { NetPlayer } from "./NetInfos";
import $ from "jquery";
import HomeUi from "./HomeUi";
import { NetInfoBase, HallOrderType } from "./NetInfos";
import "../css/homestyle.css";
import Tools from "./Tools";

const host = window.document.location.host;
const hostIp = host.split(":")[0];
var myPlayer;
var ws: WebSocket = null;

HomeUi.init();
init();

function init() {
  ws = new WebSocket("ws://" + hostIp + ":8081/HallChat");
  ws.onopen = playerConnect;
  ws.onmessage = onData;
  ws.onclose = onClose;
  eventbind();
}

function eventbind() {
  HomeUi.addEventLinstener(HomeUi.Event_开始匹配, () => {
    sendData("", HallOrderType.进入匹配队列);
  });
  HomeUi.addEventLinstener(HomeUi.Event_取消匹配, () => {
    sendData("", HallOrderType.退出匹配队列);
  });
  HomeUi.addEventLinstener(HomeUi.Event_信息保存, (e) => {
    let json = JSON.stringify(e);
    sendData(json, HallOrderType.更新玩家信息);
    console.log("信息已发出");
  });
  HomeUi.addEventLinstener(HomeUi.Event_创建房间, (e) => {});
}

/**Callback->成功连接websocket时触发 */
function playerConnect(e: Event) {
  console.log("玩家已经连接");
}

/**Callback->收到数据触发*/
function onData(e: MessageEvent<string>) {
  let base = <NetInfoBase>JSON.parse(e.data);
  let data = base.JsonData;
  console.log(base);

  switch (base.OrderType) {
    case HallOrderType.大厅基本数据: {
      var obj = JSON.parse(data);
      let pinfo: NetPlayer = obj.Player;
      let rank: NetPlayer[] = obj.Rank;
      let flogin: boolean = obj.IsFirstLogin;
      myPlayer = pinfo;
      setHallData(pinfo);
      setRankPanel(rank);
      if (flogin) HomeUi.showChangeInfoPanel();
      break;
    }
    case HallOrderType.匹配成功: {
      let obj = JSON.parse(data);
      Tools.setCookie("pid", obj.pid);
      Tools.setCookie("roomid", obj.roomid);
      console.log("匹配成功!");
      window.location.href = `http://${hostIp}:8080/game.html?pid=${obj.pid}&roomid=${obj.roomid}`;
    }
  }
}

function onClose(e: CloseEvent) {
  console.log("大厅连接已断开");
  console.log("错误码:" + e.code + "   断开原因:" + e.reason);
}

/**发送数据*/
function sendData(json: string, type: HallOrderType) {
  let base = new NetInfoBase(type, json);
  let str = JSON.stringify(base);
  ws.send(str);
}

/**设置大厅基本数据 */
function setHallData(ply: NetPlayer) {
  $("#pname").text(ply.Name);
  $("#pip").text(ply.IP);
  $("#phead").attr("src", "../static/img/HeadImgs/an" + ply.HeadID + ".png");
  $(".moneytext>span").text(Tools.markUnitConver(parseInt(ply.Mark)));
  $("#prole").attr("src", "../static/img/Roles/role" + ply.RoleID + ".png");
  $("#psex")
    .removeClass("icon-nan")
    .removeClass("icon-nv")
    .addClass(ply.Gender == 0 ? "icon-nan" : "icon-nv");
}

/**设置排名信息 */
function setRankPanel(rks: NetPlayer[]) {
  $(".rank .they").html("");
  console.log(rks);
  for (let i = 0; i < rks.length; i++) {
    let p = rks[i];
    let item = ` <div class="head flex-center">
    <img src="../static/img/HeadImgs/an${p.HeadID}.png" />
   </div>
   <div class="info flex-center">
    <div class="name"><span>${p.Name}</span></div>
    <div class="moy flex-center"><span>${Tools.markUnitConver(parseInt(p.Mark))}</span></div>
  </div>
  <div class="no">No.${i + 1}</div>`;
    let div = document.createElement("div");
    div.className = "rkitem";
    div.innerHTML = item;
    $(".rank .they").append(div);
    //如果发现我的排名则更新
    if (p.PlayerID == myPlayer.PlayerID) {
      $("#myrank").text(i + 1);
    }
  }
}
