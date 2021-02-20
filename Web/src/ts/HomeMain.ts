import { NetPlayer, NetRoom } from "./NetInfos";
import $, { ajax } from "jquery";
import HomeUi from "./HomeUi";
import { NetInfoBase } from "./NetInfos";
import { HallOrderType } from "./Model";
import "../css/homestyle.css";
import Tools from "./Tools";

const host = window.document.location.host;
const hostIp = host.split(":")[0];
var myPlayer: NetPlayer;
var ws: WebSocket = null;
var rktimer: NodeJS.Timeout;
var rmtimer: NodeJS.Timeout;
var rankCycle = 5000; //排名更新周期
var roomsCycle = 3000; //房间信息更新周期
const MAIN_URl = "http://" + hostIp + ":8080/";

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
  HomeUi.addEventLinstener(HomeUi.event_开始匹配, () => {
    sendData("", HallOrderType.进入匹配队列);
  });
  HomeUi.addEventLinstener(HomeUi.event_取消匹配, () => {
    sendData("", HallOrderType.退出匹配队列);
  });
  HomeUi.addEventLinstener(HomeUi.event_信息保存, (e) => {
    let json = JSON.stringify(e);
    sendData(json, HallOrderType.更新玩家信息);
    console.log("信息已发出");
  });
  HomeUi.addEventLinstener(HomeUi.event_创建房间, (params) => {
    let json = JSON.stringify(params);
    sendData(json, HallOrderType.创建房间);
    HomeUi.showLoad("正在创建...");
  });
  HomeUi.addEventLinstener(HomeUi.event_请求房间, () => {
    $(".rooms .loaderbox").show(); //显示加载标签
    $(".rooms .nullroom").hide();
    stopUpdateRank();
    startUpdateRooms();
  });
  HomeUi.addEventLinstener(HomeUi.event_退出房间界面, () => {
    stopUpdateRooms();
    startUpdateRank();
  });
  HomeUi.addEventLinstener(HomeUi.event_进入房间界面, (rid: string) => {
    $.ajax({
      url: MAIN_URl + "game.html",
      method: "HEAD",
      data: `roomid=${rid}&pid=${myPlayer.PlayerID}`,
      timeout: 3000,
      error: (xhr) => {
        if (xhr.status == 408) {
          Tools.showPrompt("返回超时");
        }
      },
      statusCode: {
        301: function () {
          Tools.showPrompt("该房间已销毁");
        },
        200: function () {
          Tools.setCookie("pid", myPlayer.PlayerID);
          Tools.setCookie("roomid", rid);
          window.location.href = `http://${hostIp}:8080/game.html?pid=${myPlayer.PlayerID}&roomid=${rid}`;
        },
      },
    });
  });
}

/**Callback->成功连接websocket时触发 */
function playerConnect(e: Event) {
  var pid = Tools.getCookie("pid");
  console.log("发起的pid" + pid);
  sendData("", HallOrderType.请求大厅数据, pid);
  console.log("玩家已经连接");
  startUpdateRank();
}

/**Callback->收到数据触发*/
function onData(e: MessageEvent<string>) {
  let bas = <NetInfoBase>JSON.parse(e.data);
  let data = bas.JsonData;
  switch (bas.OrderType) {
    case HallOrderType.返回大厅数据: {
      var obj = JSON.parse(data);
      let pinfo: NetPlayer = obj.Player;
      let flogin: boolean = obj.IsFirstLogin;
      myPlayer = pinfo;
      setHallData(pinfo);
      Tools.setCookie("pid", pinfo.PlayerID);
      if (flogin) HomeUi.showChangeInfoPanel();
      break;
    }
    case HallOrderType.房间创建完毕: {
      let obj = JSON.parse(data);
      Tools.setCookie("roomid", obj.roomid);
      window.location.href = `http://${hostIp}:8080/game.html?pid=${obj.pid}&roomid=${obj.roomid}`;
      break;
    }
    case HallOrderType.推送房间列表: {
      var roms = <NetRoom[]>JSON.parse(bas.JsonData);
      $(".rooms .table").html("");
      $(".rooms .loaderbox").hide();
      if (roms.length > 0) {
        $(".rooms .nullroom").hide();
        roms.forEach((r) => {
          HomeUi.addRoom(r.RoomID, r.MasterName, r.NowCount, r.BtScore, r.MasterHead);
        });
      } else {
        $(".rooms .nullroom").show();
      }
      break;
    }
    case HallOrderType.推送排名信息: {
      var rks: NetPlayer[] = JSON.parse(data);
      setRankPanel(rks);
    }
  }
}

//Callback->ws断开时触发
function onClose(e: CloseEvent) {
  Tools.showMsbox("服务器连接已断开！\n 错误码:" + e.code);
  console.log("错误码:" + e.code + "   断开原因:" + e.reason);
}

//CallBack->到达排名更新周期时触发
function onGetRank() {
  sendData("", HallOrderType.请求排名信息);
}

//CallBack->到达房间更新周期时触发
function onGetRooms() {
  sendData("", HallOrderType.请求房间列表);
}

/**启动排名更新 */
function startUpdateRank() {
  sendData("", HallOrderType.请求排名信息);
  rktimer = setInterval(onGetRank, rankCycle);
}

/**停止排名更新 */
function stopUpdateRank() {
  if (rktimer) {
    clearTimeout(rktimer);
  }
}

/**启动房间更新 */
function startUpdateRooms() {
  sendData("", HallOrderType.请求房间列表);
  rmtimer = setInterval(onGetRooms, roomsCycle);
}

/**停止房间更新 */
function stopUpdateRooms() {
  if (rmtimer) {
    clearInterval(rmtimer);
  }
}

/**发送数据*/
function sendData(json: string, type: HallOrderType, tag: string = "") {
  if (ws.readyState !== WebSocket.OPEN) return;
  let base = new NetInfoBase(type, json, tag);
  let str = JSON.stringify(base);
  ws.send(str);
}

/**设置大厅基本数据 */
function setHallData(ply: NetPlayer) {
  Tools.setCookie("pid", ply.PlayerID);
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
