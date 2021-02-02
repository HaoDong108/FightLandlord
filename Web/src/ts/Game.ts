import { PokerValue, PokerFlower, OutType, BtnSituation, OutDct, GameStage } from "./Model";
import PokerGroup from "./PokerGroup";
import Poker from "./Poker";
import { GameUi } from "./GameUi";
import Player from "./Player";
import anime from "animejs";
import $ from "jquery";
import Enumerable from "../lib/linq.js";
import { NetPkGroup, NetPlayer, NetPoker, NetInfoBase, GameOrderType, NetStaData } from "./NetInfos";
import { EventEmitter } from "events";
import Tools from "./Tools";

class Game {
  public event_GameOver: string = "GameOver";

  private _multiple: number = 1; //倍数
  private btScore: number = 1; //底分
  private _landLord: Player; //地主玩家
  private p_my: Player;
  private p_lef: Player;
  private p_rig: Player;
  private landPks: Poker[]; //地主牌
  private activity: Player; //活动玩家
  private lastSendPly: Player; //上一次出牌的玩家
  private lastGroup: Poker[]; //上一家的出牌
  private event: EventEmitter = new EventEmitter();
  private timeOutEventName: string = "timeOut";
  private gameStage: GameStage = GameStage.准备阶段;
  private bigofGroups: PokerGroup[]; //可提示牌组
  private promptIndex: number = 0; //提示牌组游标
  private plef_count: number = 17; //玩家左剩余手牌
  private prig_count: number = 17; //玩家右剩余手牌
  private pmy_count: number = 17; //我方剩余手牌
  private ws: WebSocket;

  set plcount(value: number) {
    this.plef_count = value;
    $(".pokerNum-left>i").text(value.toString());
    if (this.plef_count <= 2) GameUi.showWringLamp(OutDct.left);
  }
  get plcount() {
    return this.plef_count;
  }

  set prcount(value: number) {
    this.prig_count = value;
    $(".pokerNum-right>i").text(value.toString());
    if (this.prig_count <= 2) GameUi.showWringLamp(OutDct.right);
  }
  get prcount() {
    return this.prig_count;
  }

  set pmcount(value: number) {
    this.pmy_count = value;
    if (this.pmy_count <= 2) GameUi.showWringLamp(OutDct.bottom);
  }
  get pmcount() {
    return this.pmy_count;
  }

  constructor(plast: Player, pnext: Player, pmy: Player, btScore: number, ws: WebSocket, overcallback?: () => void) {
    this.btScore = btScore;
    this.ws = ws;
    var tis = this;
    if (overcallback) {
      this.event.once(this.event_GameOver, overcallback);
    }
    ws.addEventListener("message", function (e: MessageEvent<string>) {
      tis.onGameOrder(e.data);
    });
    $(".minScore>span:last-child").text(btScore);
    pmy.game = this;
    plast.game = this;
    pnext.game = this;
    this.p_my = pmy;
    this.p_lef = pnext;
    this.p_rig = plast;
    this.init();
  }

  set multiple(value: number) {
    if (value == this._multiple) return;
    this._multiple = value;
    var span = document.getElementsByClassName("multiple")[0].lastElementChild;
    anime({
      targets: span,
      scale: [1.2, 1],
      translateY: 5,
      duration: 600,
      easing: "easeInExpo",
      begin: function () {
        $(span).text(" " + value);
      },
    });
  }
  get multiple() {
    return this._multiple;
  }
  set landLord(p: Player) {
    p.isLand = true;
    this._landLord = p;
    this.setLandEff(p.dct, this.landPks);
  }
  get landLord() {
    return this._landLord;
  }

  private init() {
    var tis = this;
    $("#btn_send").on("click", function () {
      var arr = tis.activity.selectPks;
      if (arr.length == 0) {
        GameUi.showMsg("没有选择手牌");
        return;
      }
      var pg = new PokerGroup(arr);
      if (pg.outType == OutType.Error_Card) {
        GameUi.showMsg("牌型错误");
        return;
      }
      //获取动画手牌对象
      var tags = Enumerable.from(arr)
        .select(function (e) {
          return e.tagElement;
        })
        .toArray();
      if (tis.lastGroup) {
        let grp = new PokerGroup(arr);
        if (!grp.biggerOf(tis.lastGroup)) {
          GameUi.showMsg("出牌不合法");
          return;
        }
      }
      //出牌动画
      anime({
        targets: tags,
        opacity: 0,
        translateY: -200,
        scale: 0.7,
        duration: 200,
        easing: "linear",
        complete: function () {
          anime.set(tags, { translateY: 0, scale: 1 });
          tis.outPoker(OutDct.bottom, arr);
          //发送出牌数据到服务端
          let json = JSON.stringify({
            pks: Poker.pksToNpks(arr),
            type: pg.outType,
          });
          tis.sendBase(GameOrderType.出牌, json);
          tis.activity = tis.p_my.next;
          GameUi.showClock(tis.activity.dct);
          GameUi.hideButton();
          tis.event.removeAllListeners(tis.timeOutEventName);
        },
      });
      tis.p_my.hand.removePks(arr);
      tis.lastGroup = arr;
      tis.pmcount -= arr.length;
      tis.lastSendPly = tis.p_my;
    });

    $("#btn_dont,#btn_unable").on("click", function () {
      //发送出牌数据到服务端
      let json = JSON.stringify({ pks: [], type: OutType.Error_Card });
      tis.sendBase(GameOrderType.出牌, json);
      tis.activity = tis.p_my.next;
      GameUi.showClock(tis.activity.dct);
      GameUi.hideButton();
      GameUi.outMsg("不要", OutDct.bottom);
      tis.p_my.selectPks.forEach((w) => {
        w.onSelect = false;
      });
      tis.event.removeAllListeners(tis.timeOutEventName);
    });

    $("#btn_prompt").on("click", function () {
      if (tis.bigofGroups.length == 0) return;
      let pks = tis.bigofGroups[tis.promptIndex++].pgAsc;
      if (tis.promptIndex >= tis.bigofGroups.length) tis.promptIndex = 0;
      pks.forEach((p) => {
        p.onSelect = true;
      });
      tis.p_my.hand._pkGroup.forEach((p) => {
        if (!Enumerable.from(pks).contains(p)) p.onSelect = false;
      });
    });

    $("#btn_dontCall").on("click", jiaofen);
    $("#btn_one").on("click", jiaofen);
    $("#btn_two").on("click", jiaofen);
    $("#btn_three").on("click", jiaofen);

    /**CallBack->玩家叫分 */
    function jiaofen(e) {
      let tag = <HTMLElement>e.target;
      let id = tag.id;
      var mes;
      var score;
      switch (id) {
        case "btn_dontCall":
          mes = "不叫";
          score = "0";
          break;
        case "btn_one":
          mes = "1分";
          score = "1";
          tis.multiple = 1;
          break;
        case "btn_two":
          mes = "2分";
          score = "2";
          tis.multiple = 2;
          break;
        case "btn_three":
          mes = "3分";
          score = "3";
          tis.multiple = 3;
          break;
      }
      GameUi.outMsg(mes, OutDct.bottom);
      GameUi.hideButton();
      GameUi.hideClock(true);
      tis.sendBase(GameOrderType.有玩家叫分, null, score);
    }

    $("#btn_newGame").on("click", function () {
      GameUi.hideWLPanel();
    });

    $("#btn_return").on("click", function () {
      GameUi.hideWLPanel();
    });
    this.sendBase(GameOrderType.玩家已准备, "");
  }

  /**发送Json数据包 */
  private sendBase(od: GameOrderType, json: string = "", tag: string = "") {
    let info = new NetInfoBase(od, json, tag);
    this.ws.send(JSON.stringify(info));
  }

  /**CallBack->收到数据 */
  private onGameOrder(mes: string) {
    let bas = <NetInfoBase>JSON.parse(mes);
    let jsonData = bas.JsonData;
    switch (bas.OrderType) {
      case GameOrderType.出牌: {
        let obj = JSON.parse(bas.JsonData);
        let sendply = this.idToPlayer(obj.PlayerID);
        let npks = <NetPoker[]>obj.OutPks;
        let pks = Poker.npksToPks(npks);
        //如果没有牌信息则说明不要
        if (pks.length == 0) {
          GameUi.outMsg("不要", sendply.dct);
          //如果下一个玩家还是上一个出牌的玩家,则将其出牌区清空
          if (this.lastSendPly == sendply.next) {
            let dct = sendply.next.dct;
            $(dct == OutDct.left ? ".theyOutbox .lef" : dct == OutDct.right ? ".theyOutbox .rig" : ".myOutbox").html("");
          }
        } else {
          this.lastSendPly = sendply; //设置上一个出牌的玩家
          this.lastGroup = pks; // 设置上一组出牌牌组
          this.outPoker(sendply.dct, pks);
          //更新玩家剩余牌数
          if (sendply.dct == OutDct.left) this.plcount -= pks.length;
          if (sendply.dct == OutDct.right) this.prcount -= pks.length;
        }
        GameUi.showClock(sendply.next.dct); //显示倒计时时钟到下一个玩家

        this.activity = sendply.next; //设置活动玩家

        //判断下一家出牌玩家是否为我方
        if (sendply.next == this.p_my) {
          //如果上一次出牌的玩家是我自己则说明其他玩家都选择了不要,进入出牌阶段
          if (this.lastSendPly == this.p_my) {
            this.lastGroup = null;
            GameUi.showButton(BtnSituation.出牌);
            this.setStage(GameStage.出牌阶段);
            this.bigofGroups = null;
          } else {
            this.bigofGroups = this.p_my.hand.getBiggerOfGroups(new PokerGroup(this.lastGroup));
            this.promptIndex = 0;
            //如果提示牌组长度为0则说明要不起
            if (this.bigofGroups.length > 0) GameUi.showButton(BtnSituation.接牌_要的起);
            else GameUi.showButton(BtnSituation.接牌_要不起);
            this.setStage(GameStage.接牌阶段);
          }
        }
        break;
      }

      case GameOrderType.发我方手牌: {
        var npks = <NetPoker[]>JSON.parse(bas.JsonData);
        var pks = Poker.npksToPks(npks);
        var pg = new PokerGroup(pks);
        this.p_my.hand = pg;
        this.addMyPokers(pg.pgDsc);
        break;
      }

      case GameOrderType.指定玩家叫分: {
        // tag:被指定的玩家ID
        var obj = JSON.parse(jsonData);
        var ply = this.idToPlayer(obj.PlayerID);
        var min = obj.Min;
        this.activity = ply;
        GameUi.showClock(ply.dct);
        if (ply.isMy) GameUi.showButton(BtnSituation.叫分, min);
        break;
      }

      case GameOrderType.计时滴答: {
        //tag:剩余秒数
        let tik = bas.Tag;
        if (Number.parseInt(tik) <= 0) {
          this.timeOutHandle();
          this.event.emit(this.timeOutEventName);
        }
        GameUi.setTik(tik);
        break;
      }

      case GameOrderType.有其他玩家叫分: {
        let obj = JSON.parse(bas.JsonData);
        let ply = this.idToPlayer(obj.PlayerID);
        let score = Number.parseInt(obj.Score);
        if (score > 0) this.multiple = score; //倍数=叫分倍数
        GameUi.outMsg(score == 0 ? "不叫" : score + "分", ply.dct);
        break;
      }

      case GameOrderType.设置地主: {
        let obj = JSON.parse(bas.JsonData);
        let ply = this.idToPlayer(obj.PlayerID);
        let pks = <NetPoker[]>obj.LandPks;
        GameUi.hideClock();
        ply.isLand = true;
        //如果是我方为地主则立即进入出牌阶段
        if (ply.dct == OutDct.bottom) {
          this.setStage(GameStage.出牌阶段);
          GameUi.showButton(BtnSituation.出牌);
          this.pmcount = 20; //设置显示手牌数
        } else if (ply.dct == OutDct.left) this.plcount = 20;
        else this.prcount = 20;
        this.activity = ply;
        this.landPks = Poker.npksToPks(pks);
        this.landPks.forEach((p) => (p.isLandPoker = true));
        GameUi.showClock(ply.dct);
        this.landLord = ply;
        break;
      }

      case GameOrderType.有玩家胜出: {
        let info = <NetStaData>JSON.parse(bas.JsonData);
        this.statistics(info);
        this.event.emit(this.event_GameOver);
      }

      case GameOrderType.倍数更新: {
        let m = parseInt(bas.Tag);
        if (m) {
          this.multiple = m;
        }
      }
    }
  }

  /**设置当前游戏阶段 */
  private setStage(stage: GameStage) {
    if (this.gameStage != stage) this.gameStage = stage;
  }

  /** 阶段超时处理 */
  private timeOutHandle() {
    let ply = this.activity; //获取当前正在出牌的玩家
    this.activity = ply.next; //设置活动玩家为其下家
    //间隔一秒后移动闹钟到下一家
    setTimeout(() => {
      GameUi.showClock(ply.next.dct);
    }, 1000);
    //玩家超时行为会在服务器处理后发送,所以只需做超时后的本地界面操作
    if (ply.dct != OutDct.bottom) return;
    GameUi.hideButton();
    switch (this.gameStage) {
      case GameStage.叫分阶段: {
        GameUi.outMsg("不叫", OutDct.bottom);
        break;
      }
      case GameStage.出牌阶段: {
        //出牌阶段必须出牌,所以超时会自动打出最小牌
        let out = ply.hand.pgAsc.splice(0, 1); //获取最小牌
        this.outPoker(OutDct.bottom, out); //打出最小牌
        this.lastSendPly = ply;
        this.lastGroup = out;
        GameUi.hideButton();
        ply.hand.removePks(out); //删除最小牌
        break;
      }
      case GameStage.接牌阶段: {
        GameUi.outMsg("不要", OutDct.bottom);
        break;
      }
    }
  }

  /**
   * 出牌到界面
   * @param dct 出牌方位
   * @param pks 牌内容
   * @param isShow 仅将牌添加到牌区中(用于玩家结束时亮牌)
   **/
  public outPoker(dct: OutDct, pks: Poker[], isShow: boolean = false) {
    if (!isShow) $(".outbox>li").remove(); //如果非展示手牌,则将其他出牌区清空
    var ul: HTMLUListElement;
    switch (dct) {
      case OutDct.left:
        ul = <HTMLUListElement>document.getElementsByClassName("theyOutbox")[0].firstElementChild;
        break;
      case OutDct.right:
        ul = <HTMLUListElement>document.getElementsByClassName("theyOutbox")[0].lastElementChild;
        break;
      case OutDct.bottom:
        ul = <HTMLUListElement>document.getElementsByClassName("myOutbox")[0];
        break;
    }
    ul.innerHTML = "";
    var obj = {
      x: 2,
      y: 2,
      s: 15,
    };
    pks.forEach(function (e: Poker) {
      $(e.tagElement.firstElementChild).removeClass("handpk").addClass("outpk");
      e.onSelect = false;
      ul.appendChild(e.tagElement);
    });
    anime({
      targets: [dct == OutDct.left ? ".theyOutbox>.lef>li" : dct == OutDct.right ? ".theyOutbox>.rig>li" : ".myOutbox>li", obj],
      scale: [1.2, 1],
      s: [15, 0],
      x: 0,
      y: 0,
      easing: "easeInExpo",
      duration: 300,
      opacity: 1,
      update: function () {
        $(".outbox>li>.pk-box").css("box-shadow", obj.x + "px " + obj.y + "px " + obj.s + "px black");
      },
    });
    if (isShow) return;
    switch (PokerGroup.checkOutType(pks)) {
      case OutType.连对:
        GameUi.showLiandui();
        break;
      case OutType.顺子:
        GameUi.showSunzi();
        break;
      case OutType.飞机:
      case OutType.飞机带翅膀:
        GameUi.showPanel();
        break;
      case OutType.炸弹:
        GameUi.showZadan(dct);
        break;
      case OutType.王炸:
        GameUi.showHuojian();
        break;
    }
  }

  /**分数结算(有玩家手牌出完时调用) */
  private statistics(info: NetStaData) {
    //获取玩家对象
    let ply1 = this.idToPlayer(info.Ply1ID);
    let ply2 = this.idToPlayer(info.Ply2ID);
    let ply3 = this.idToPlayer(info.Ply3ID);
    //获取胜利玩家
    let winply = this.idToPlayer(info.WinPlyID);
    //获取各玩家剩余手牌
    let pks1 = Poker.npksToPks(info.Ply1Pks);
    let pks2 = Poker.npksToPks(info.Ply2Pks);
    let pks3 = Poker.npksToPks(info.Ply3Pks);
    //如果胜利玩家是农民且我方也是农民则也判定为胜利
    let iswin = winply == this.p_my || (!winply.isLand && !this.p_my.isLand); //是否胜利
    let sumScore = this.multiple * this.btScore; //结算分数
    let sub = this.p_my.isLand ? sumScore * 2 : sumScore; //如果是地主翻倍
    let oldmark = this.p_my.mark; //原本分数
    //结算玩家剩余分数
    if (winply.isLand) {
      winply.mark += sumScore * 2;
      winply.last.mark -= sumScore;
      winply.next.mark -= sumScore;
    } else {
      //如果赢家是农民
      winply.mark += sumScore;
      //如果上家是地主则扣双倍，下家则是农民
      if (winply.last.isLand) {
        winply.last.mark -= sumScore * 2;
        winply.next.mark += sumScore;
      } else {
        winply.last.mark += sumScore;
        winply.next.mark -= sumScore * 2;
      }
    }
    $("#money-lef").text(Tools.markUnitConver(this.p_lef.mark));
    $("#money-rig").text(Tools.markUnitConver(this.p_rig.mark));
    $("#money-btm").text(Tools.markUnitConver(this.p_my.mark));
    //隐藏计时器
    GameUi.hideClock();
    //隐藏按钮
    GameUi.hideButton();
    this.event.removeAllListeners();
    //显示“打完啦”动画
    GameUi.showOutFinish(winply.dct);
    //显示玩家剩余手牌
    setTimeout(() => {
      //显示农民/地主胜利标签
      GameUi.showWLFlg(iswin, this.p_my.isLand);
      $(".myPkList").html("");
      this.outPoker(ply1.dct, pks1, true);
      this.outPoker(ply2.dct, pks2, true);
      this.outPoker(ply3.dct, pks3, true);
    }, 2000);
    //延迟显示面板
    setTimeout(() => {
      GameUi.showWLPanel(this.btScore, this.multiple, Math.abs(sub), oldmark, iswin);
    }, 6000);
  }

  /**ID转玩家 */
  private idToPlayer(id: string) {
    if (this.p_my.playerID == id) return this.p_my;
    else if (this.p_lef.playerID == id) return this.p_lef;
    else return this.p_rig;
  }

  /**添加扑克到手牌 */
  private addMyPokers(pks: Poker[]) {
    var _this = this;
    var t = 100;
    if (pks)
      pks.forEach(function (p, i) {
        var s = t;
        setTimeout(function () {
          _this.addOnePoker(p);
        }, s);
        t += 100;
      });
  }

  private addOnePoker(p: Poker) {
    var n = 0;
    if ($(".myPkList").children("#" + p.elementID).length == 0) {
      $(".myPkList").append(p.tagElement);
    }
    p.tagElement.onmousedown = function (e) {
      if (n > 0) return;
      if (e.buttons != 1) return;
      n++;
      p.onSelect = !p.onSelect;
      setTimeout(function () {
        n = 0;
      }, 200);
    };
    p.tagElement.onmouseenter = function (e) {
      if (e.buttons != 1) return;
      p.onSelect = !p.onSelect;
      anime({
        targets: p.tagElement,
        translateY: p.onSelect ? -35 : 0,
        easing: "easeOutElastic(6,2)",
        duration: 400,
      });
    };
  }

  /**展示地主动画,添加手牌*/
  private setLandEff(dct: OutDct, landpk: Poker[]) {
    var img;
    var tis = this;
    if (dct == OutDct.bottom) {
      img = $(".name-own>img");
      anime.set(img.get(), { rotateY: 180 });
    } else if (dct == OutDct.left) {
      img = $(".name-left>img");
      anime.set(img.get(), { rotateY: 180 });
    } else {
      img = $(".name-right>img");
    }
    setLandlordPokers(); //设置顶部地主牌内容
    var p = getDistance(dct); //获取帽子偏移参数
    hatMoveTo(p.sl, p.st, p.x, p.y); //展示地主帽子动画,
    headEff(); //头像切换动画
    addPoker(); //将地主牌添加到手牌
    function setLandlordPokers() {
      var faces = document.getElementsByClassName("front");
      for (var i = 0; i < faces.length; i++) {
        var e = faces[i];
        var p_1 = landpk[i].tagElement;
        e.innerHTML = p_1.innerHTML;
        e.firstElementChild.className = "pk-box threepk";
      }
    }
    function headEff() {
      anime({
        targets: img.get(0),
        scale: 0,
        easing: "easeInBack",
        duration: 600,
        delay: 2000,
        complete: function () {
          anime({
            targets: img.get(0),
            scale: 1,
            scaleY: {
              value: [0.3, 1],
              easing: "easeOutElastic",
              duration: 1500,
            },
            easing: "easeOutBack",
            duration: 1000,
            begin: function () {
              img.attr("src", "../static/img/land.png");
            },
          });
        },
      });
    }
    function getDistance(dct) {
      var point = {
        sl: 0,
        st: 0,
        x: 0,
        y: 0,
      };
      point.sl = (window.innerWidth - 120) / 2;
      point.st = (window.innerHeight - 120) / 2;
      if (dct == OutDct.left) {
        var l = $(".role-left").offset().left;
        var t = $(".role-left").offset().top;
        point.x = l + 10;
        point.y = t - 70;
      } else if (dct == OutDct.right) {
        var l = $(".role-right").offset().left;
        var t = $(".role-right").offset().top;
        point.x = l - 10;
        point.y = t - 70;
      } else {
        var l = $(".role-own").offset().left;
        var t = $(".role-own").offset().top;
        point.x = l + 150;
        point.y = t + 60;
      }
      return point;
    }
    function landCardEff() {
      var dcs = document.getElementsByClassName("lastThree");
      var t = 500;
      var _loop_1 = function (i) {
        var e = dcs[i];
        var p_2 = landpk[i];
        setTimeout(function () {
          e.className = "lastThree nowrol";
          if (dct == OutDct.bottom) {
            var n = p_2.tagElement;
            anime({
              targets: n,
              translateY: [0, -80],
              direction: "alternate",
              easing: "easeOutCirc",
              duration: 400,
              delay: 500,
            });
          }
        }, t);
        t += 500;
      };
      for (var i = 0; i < dcs.length; i++) {
        _loop_1(i);
      }
    }
    function hatMoveTo(startL, startT, x, y) {
      $(".hatam").remove();
      var div = document.createElement("div");
      div.className = "hatam";
      div.innerHTML = '\n <img src="../static/img/lordcap.png" width="90px" height="90px">\n        <div class="anbox">\n            <ul>\n                <li></li>\n                <li></li>\n                <li></li>\n                <li></li>\n                <li></li>\n                <li></li>\n                <li></li>\n                <li></li>\n            </ul>\n        </div>';
      $(".gameRegion").append(div);
      $(div).css("left", startL + "px");
      $(div).css("top", startT + "px");
      var us = $(".anbox>ul").width();
      var lt = Math.abs(Number.parseInt($(".anbox>ul>li").css("top").replace("px", "")));
      var deg = 0;
      $(".anbox>ul>li").each(function (i, li) {
        $(li)
          .css("transform-origin", "50% " + (us / 2 + lt) + "px")
          .css("transform", "rotate(" + deg + "deg) rotateX(-5deg)");
        deg += 45;
      });
      anime({
        targets: ".hatam",
        scale: 0.5,
        left: x + "px",
        top: y + "px",
        easing: "linear",
        duration: 2000,
        delay: 1000,
        complete: function () {
          anime({
            targets: ".hatam>.anbox",
            scale: 0.1,
            easing: "linear",
            duration: 2000,
            complete: function () {
              $(".hatam>.anbox").remove();
            },
          });
        },
      });
    }
    function addPoker() {
      if (dct != OutDct.bottom) {
        landCardEff();
        return;
      }
      var ply = tis.p_my;
      ply.hand.pushPokers(landpk);
      var pks = ply.hand.pgDsc;
      pks.forEach(function (p, i) {
        if (p.isLandPoker) {
          if (i == 0) {
            $(".myPkList").prepend(p.tagElement);
          } else if (i == pks.length - 1) {
            $(".myPkList").append(p.tagElement);
          } else {
            $(pks[i - 1].tagElement).after(p.tagElement);
          }
          tis.addOnePoker(p);
        }
      });
      landCardEff(); //地主牌弹跳
    }
  }
}
export default Game;
